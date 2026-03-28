import httpx
from bs4 import BeautifulSoup

from app.ingestion.pdf import (
    CONDITIONAL_PATTERN,
    NUMBERED_STEP_PATTERN,
    ParsedDocument,
    Section,
)


async def fetch_confluence_page(
    url: str,
    username: str | None = None,
    api_token: str | None = None,
) -> ParsedDocument:
    # Extract base URL and page ID from URL
    # Confluence URLs: .../wiki/spaces/SPACE/pages/PAGE_ID/title
    # or REST: .../rest/api/content/PAGE_ID
    auth = (username, api_token) if username and api_token else None

    async with httpx.AsyncClient() as client:
        # Try REST API expand
        if "/rest/api/content/" in url:
            api_url = url
        else:
            # Attempt to parse page ID from URL path
            parts = url.rstrip("/").split("/")
            page_id = None
            for i, part in enumerate(parts):
                if part == "pages" and i + 1 < len(parts):
                    page_id = parts[i + 1]
                    break
            if not page_id:
                raise ValueError(f"Cannot extract page ID from URL: {url}")

            base = url.split("/wiki/")[0] if "/wiki/" in url else url.split("/pages/")[0]
            api_url = f"{base}/wiki/rest/api/content/{page_id}?expand=body.storage,version"

        response = await client.get(api_url, auth=auth)
        response.raise_for_status()
        data = response.json()

    title = data.get("title", "Untitled Confluence Page")
    html_body = data.get("body", {}).get("storage", {}).get("value", "")

    return _parse_html(html_body, title, url)


def _parse_html(html: str, title: str, source_url: str) -> ParsedDocument:
    soup = BeautifulSoup(html, "html.parser")
    sections: list[Section] = []
    current_section: Section | None = None
    raw_parts: list[str] = []

    for element in soup.descendants:
        if element.name and element.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            if current_section:
                sections.append(current_section)
            level = int(element.name[1])
            text = element.get_text(strip=True)
            current_section = Section(
                header=text, content="", level=level, markers={}
            )
            raw_parts.append(text)
        elif element.name in ("p", "li", "td"):
            text = element.get_text(strip=True)
            if not text:
                continue
            if current_section is None:
                current_section = Section(
                    header="", content="", level=0, markers={}
                )
            current_section.content += text + "\n"
            raw_parts.append(text)

            if NUMBERED_STEP_PATTERN.match(text):
                current_section.markers["has_numbered_steps"] = True
            if CONDITIONAL_PATTERN.search(text):
                current_section.markers["has_conditionals"] = True

    if current_section:
        sections.append(current_section)

    return ParsedDocument(
        title=title,
        sections=sections,
        raw_text="\n".join(raw_parts),
        metadata={"source_url": source_url, "source_type": "confluence"},
    )
