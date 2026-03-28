import httpx

from app.ingestion.pdf import (
    CONDITIONAL_PATTERN,
    NUMBERED_STEP_PATTERN,
    ParsedDocument,
    Section,
)


async def fetch_notion_page(
    page_id: str,
    api_key: str,
    title: str | None = None,
) -> ParsedDocument:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        # Get page title
        page_resp = await client.get(
            f"https://api.notion.com/v1/pages/{page_id}",
            headers=headers,
        )
        page_resp.raise_for_status()
        page_data = page_resp.json()

        if not title:
            props = page_data.get("properties", {})
            for prop in props.values():
                if prop.get("type") == "title":
                    title_parts = prop.get("title", [])
                    title = "".join(t.get("plain_text", "") for t in title_parts)
                    break
            title = title or "Untitled Notion Page"

        # Get blocks (content)
        blocks_resp = await client.get(
            f"https://api.notion.com/v1/blocks/{page_id}/children?page_size=100",
            headers=headers,
        )
        blocks_resp.raise_for_status()
        blocks = blocks_resp.json().get("results", [])

    return _parse_blocks(blocks, title, page_id)


def _parse_blocks(blocks: list[dict], title: str, page_id: str) -> ParsedDocument:
    sections: list[Section] = []
    current_section: Section | None = None
    raw_parts: list[str] = []

    heading_types = {
        "heading_1": 1,
        "heading_2": 2,
        "heading_3": 3,
    }

    for block in blocks:
        block_type = block.get("type", "")

        if block_type in heading_types:
            if current_section:
                sections.append(current_section)
            text = _extract_rich_text(block.get(block_type, {}).get("rich_text", []))
            current_section = Section(
                header=text,
                content="",
                level=heading_types[block_type],
                markers={},
            )
            raw_parts.append(text)
        elif block_type in (
            "paragraph",
            "bulleted_list_item",
            "numbered_list_item",
            "to_do",
        ):
            text = _extract_rich_text(block.get(block_type, {}).get("rich_text", []))
            if not text:
                continue
            if current_section is None:
                current_section = Section(
                    header="", content="", level=0, markers={}
                )
            current_section.content += text + "\n"
            raw_parts.append(text)

            if block_type == "numbered_list_item":
                current_section.markers["has_numbered_steps"] = True
            if CONDITIONAL_PATTERN.search(text):
                current_section.markers["has_conditionals"] = True

    if current_section:
        sections.append(current_section)

    return ParsedDocument(
        title=title,
        sections=sections,
        raw_text="\n".join(raw_parts),
        metadata={"page_id": page_id, "source_type": "notion"},
    )


def _extract_rich_text(rich_text: list[dict]) -> str:
    return "".join(rt.get("plain_text", "") for rt in rich_text)
