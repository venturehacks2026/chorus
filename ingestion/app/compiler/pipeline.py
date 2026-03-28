import logging
import re
import uuid

from app.compiler.contract_extractor import extract_contracts
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

    # Generate skill_id if not provided
    if not skill_id:
        title_slug = re.sub(r"[^a-z0-9]+", "_", sop["title"].lower()).strip("_")
        skill_id = f"{title_slug}_v1"

    # Check if ASD already exists for this SOP
    existing = db.table("agent_skill_documents").select("*").eq("sop_id", sop_id).execute()

    if existing.data:
        asd_record = existing.data[0]
        asd_id = asd_record["id"]
        new_version = asd_record["current_version"] + 1
        skill_id = asd_record["skill_id"]
    else:
        asd_id = str(uuid.uuid4())
        new_version = 1

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

        # Extract contracts
        logger.info("Extracting contracts")
        contracts = extract_contracts(sop_text)

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

        # Insert derived contracts
        for contract in contracts:
            db.table("derived_contracts").insert({
                "id": str(uuid.uuid4()),
                "asd_id": asd_id,
                "contract_name": contract["contract_name"],
                "contract_type": contract["contract_type"],
                "description": contract["description"],
                "source_text": contract.get("source_text"),
                "scope_node_ids": contract.get("scope_node_ids"),
                "status": "draft",
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
