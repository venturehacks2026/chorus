import logging
import re
import uuid

from app.compiler.edge_builder import build_edges
from app.compiler.node_compiler import compile_nodes
from app.compiler.structural_analysis import analyze_structure
from app.compiler.validator import calculate_coverage_score, validate_dag
from app.config import settings
from app.db.client import get_supabase

logger = logging.getLogger(__name__)


def compile_sop_to_asd(sop: dict, skill_id: str | None = None) -> dict:
    db = get_supabase()
    sop_id = sop["id"]
    sop_text = sop["raw_text"]
    content_hash = sop["content_hash"]

    # Check if ASD already exists for this SOP (recompile case)
    existing = db.table("agent_skill_documents").select("*").eq("sop_id", sop_id).execute()

    if existing.data:
        asd_record = existing.data[0]
        asd_id = asd_record["id"]
        new_version = asd_record["current_version"] + 1
        skill_id = asd_record["skill_id"]
    else:
        asd_id = str(uuid.uuid4())
        new_version = 1

        # Generate skill_id if not provided, ensuring uniqueness
        if not skill_id:
            title_slug = re.sub(r"[^a-z0-9]+", "_", sop["title"].lower()).strip("_")
            base_skill_id = f"{title_slug}_v1"
            skill_id = base_skill_id

            # Check for skill_id collision and append suffix if needed
            collision = db.table("agent_skill_documents").select("id").eq("skill_id", skill_id).execute()
            suffix = 2
            while collision.data:
                skill_id = f"{base_skill_id}_{suffix}"
                collision = db.table("agent_skill_documents").select("id").eq("skill_id", skill_id).execute()
                suffix += 1

    # Get chunk metadata for structural hints
    chunks_result = (
        db.table("document_chunks")
        .select("structural_metadata")
        .eq("sop_id", sop_id)
        .execute()
    )
    chunks_metadata = [c["structural_metadata"] for c in (chunks_result.data or [])]

    logger.info(f"Starting ASD compilation for SOP {sop_id}, skill_id={skill_id}")

    # If this is a new ASD, create the record first in "compiling" status
    if not existing.data:
        db.table("agent_skill_documents").insert({
            "id": asd_id,
            "skill_id": skill_id,
            "sop_id": sop_id,
            "current_version": new_version,
            "status": "compiling",
        }).execute()
    else:
        db.table("agent_skill_documents").update({
            "status": "compiling",
        }).eq("id", asd_id).execute()

    try:
        # Pass 1: Structural Analysis
        logger.info("Pass 1: Structural analysis")
        raw_steps = analyze_structure(sop_text, chunks_metadata)

        # Pass 2: Node Compilation
        logger.info("Pass 2: Node compilation")
        nodes, clarifications = compile_nodes(raw_steps)

        # Pass 3: Edge Construction
        logger.info("Pass 3: Edge construction")
        edges, added_nodes = build_edges(nodes)

        # Merge any added start/end nodes
        if added_nodes:
            nodes.extend(added_nodes)

        # Pass 4: Validation & Enrichment
        logger.info("Pass 4: Validation and enrichment")
        issues = validate_dag(nodes, edges)
        coverage_score = calculate_coverage_score(nodes)

        # Contract generation via multi-agent pipeline (runs async, persists own results)
        logger.info("Triggering contract generation pipeline")
        try:
            from app.contract_gen.pipeline import run_contract_gen_pipeline
            contract_gen_result = run_contract_gen_pipeline(
                asd_id=asd_id,
                asd_nodes=nodes,
                sop_text=sop_text,
            )
            logger.info(f"Contract gen: {contract_gen_result.get('contracts_count', 0)} contracts generated")
        except Exception as e:
            logger.warning(f"Contract generation failed (non-fatal): {e}")
            contract_gen_result = {}
        contracts = []  # pipeline handles its own persistence

        # Determine final status
        has_clarifications = any(n.get("needs_clarification") for n in nodes) or len(clarifications) > 0
        status = "needs_clarification" if has_clarifications else "active"

        # Collect automation gaps
        automation_gaps = [
            n.get("automation_gap_reason", f"Step {n['node_id']} requires human action")
            for n in nodes
            if n.get("is_automation_gap")
        ]

        # Create ASD version
        version_id = str(uuid.uuid4())
        db.table("asd_versions").insert({
            "id": version_id,
            "asd_id": asd_id,
            "version": new_version,
            "sop_content_hash": content_hash,
            "compiled_by": settings.azure_openai_chat_deployment,
        }).execute()

        # Insert nodes
        node_rows = []
        for i, node in enumerate(nodes):
            node_rows.append({
                "id": str(uuid.uuid4()),
                "asd_version_id": version_id,
                "node_id": node["node_id"],
                "type": node["type"],
                "description": node.get("description"),
                "config": node.get("config", {}),
                "confidence_score": node.get("confidence_score"),
                "needs_clarification": node.get("needs_clarification", False),
                "position_index": i,
            })
        if node_rows:
            db.table("asd_nodes").insert(node_rows).execute()

        # Insert edges
        edge_rows = []
        for edge in edges:
            edge_rows.append({
                "id": str(uuid.uuid4()),
                "asd_version_id": version_id,
                "from_node_id": edge["from_node_id"],
                "to_node_id": edge["to_node_id"],
                "edge_type": edge["edge_type"],
                "condition_label": edge.get("condition_label"),
            })
        if edge_rows:
            db.table("asd_edges").insert(edge_rows).execute()

        # Insert clarification requests
        for clarification in clarifications:
            db.table("clarification_requests").insert({
                "id": str(uuid.uuid4()),
                "asd_id": asd_id,
                "node_id": clarification.get("node_id"),
                "question": clarification["question"],
                "context": clarification.get("context"),
                "status": "pending",
            }).execute()

        # Update ASD record
        db.table("agent_skill_documents").update({
            "current_version": new_version,
            "description": f"Compiled from: {sop['title']}",
            "automation_gaps": automation_gaps,
            "automation_coverage_score": coverage_score,
            "status": status,
        }).eq("id", asd_id).execute()

        logger.info(
            f"ASD compilation complete: {len(nodes)} nodes, {len(edges)} edges, "
            f"coverage={coverage_score}, status={status}"
        )

        return {
            "asd_id": asd_id,
            "skill_id": skill_id,
            "version": new_version,
            "status": status,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "automation_coverage_score": coverage_score,
            "automation_gaps": automation_gaps,
            "clarification_count": len(clarifications),
            "contract_count": len(contracts),
            "validation_issues": issues,
        }

    except Exception as e:
        # Mark ASD as failed
        db.table("agent_skill_documents").update({
            "status": "needs_recompile",
        }).eq("id", asd_id).execute()
        raise
