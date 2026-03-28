import logging

logger = logging.getLogger(__name__)


def validate_dag(nodes: list[dict], edges: list[dict]) -> list[str]:
    issues: list[str] = []
    node_ids = {n["node_id"] for n in nodes}

    # Check all edge references point to existing nodes
    for edge in edges:
        if edge["from_node_id"] not in node_ids:
            issues.append(f"Edge references non-existent source node: {edge['from_node_id']}")
        if edge["to_node_id"] not in node_ids:
            issues.append(f"Edge references non-existent target node: {edge['to_node_id']}")

    # Check for orphan nodes (no incoming or outgoing edges, excluding start/end)
    nodes_with_outgoing = {e["from_node_id"] for e in edges}
    nodes_with_incoming = {e["to_node_id"] for e in edges}

    for node in nodes:
        nid = node["node_id"]
        ntype = node["type"]
        if ntype not in ("start",) and nid not in nodes_with_incoming:
            issues.append(f"Node {nid} has no incoming edges (orphan)")
        if ntype not in ("end", "error") and nid not in nodes_with_outgoing:
            issues.append(f"Node {nid} has no outgoing edges (dead end)")

    # Check decision nodes have both branches
    for node in nodes:
        if node["type"] == "decision":
            nid = node["node_id"]
            node_edges = [e for e in edges if e["from_node_id"] == nid]
            edge_types = {e["edge_type"] for e in node_edges}
            if "true_branch" not in edge_types:
                issues.append(f"Decision node {nid} missing true_branch edge")
            if "false_branch" not in edge_types:
                issues.append(f"Decision node {nid} missing false_branch edge")

    # Check for cycles (simple DFS)
    adjacency = {}
    for edge in edges:
        adjacency.setdefault(edge["from_node_id"], []).append(edge["to_node_id"])

    visited = set()
    in_stack = set()

    def dfs(node_id: str) -> bool:
        visited.add(node_id)
        in_stack.add(node_id)
        for neighbor in adjacency.get(node_id, []):
            if neighbor in in_stack:
                issues.append(f"Cycle detected involving node: {neighbor}")
                return True
            if neighbor not in visited:
                if dfs(neighbor):
                    return True
        in_stack.discard(node_id)
        return False

    for nid in node_ids:
        if nid not in visited:
            dfs(nid)

    if issues:
        logger.warning(f"DAG validation found {len(issues)} issues: {issues}")
    else:
        logger.info("DAG validation passed")

    return issues


def calculate_coverage_score(nodes: list[dict]) -> float:
    if not nodes:
        return 0.0

    total = len(nodes)
    automatable = sum(
        1
        for n in nodes
        if n["type"] not in ("human_handoff",)
        and not n.get("is_automation_gap", False)
    )
    return round(automatable / total, 2)
