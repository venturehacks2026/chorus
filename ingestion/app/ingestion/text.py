import re

from app.ingestion.pdf import (
    CONDITIONAL_PATTERN,
    NUMBERED_STEP_PATTERN,
    ParsedDocument,
    Section,
)

HEADER_PATTERN = re.compile(r"^(#{1,6})\s+(.+)$")
UNDERLINE_HEADER_PATTERN = re.compile(r"^[=\-]{3,}$")


def parse_text(content: str, title: str = "") -> ParsedDocument:
    lines = content.split("\n")
    sections: list[Section] = []
    current_section: Section | None = None

    i = 0
    while i < len(lines):
        line = lines[i].rstrip()

        # Markdown-style header
        md_match = HEADER_PATTERN.match(line)
        if md_match:
            if current_section:
                sections.append(current_section)
            level = len(md_match.group(1))
            current_section = Section(
                header=md_match.group(2).strip(),
                content="",
                level=level,
                markers={},
            )
            i += 1
            continue

        # Underline-style header (text followed by === or ---)
        if (
            i + 1 < len(lines)
            and line.strip()
            and UNDERLINE_HEADER_PATTERN.match(lines[i + 1].strip())
        ):
            if current_section:
                sections.append(current_section)
            level = 1 if lines[i + 1].strip().startswith("=") else 2
            current_section = Section(
                header=line.strip(), content="", level=level, markers={}
            )
            i += 2
            continue

        # Regular content
        if line.strip():
            if current_section is None:
                current_section = Section(
                    header="", content="", level=0, markers={}
                )
            current_section.content += line + "\n"

            if NUMBERED_STEP_PATTERN.match(line):
                current_section.markers["has_numbered_steps"] = True
            if CONDITIONAL_PATTERN.search(line):
                current_section.markers["has_conditionals"] = True

        i += 1

    if current_section:
        sections.append(current_section)

    if not title:
        title = sections[0].header if sections and sections[0].header else "Untitled"

    return ParsedDocument(
        title=title,
        sections=sections,
        raw_text=content,
        metadata={"line_count": len(lines), "source_type": "text"},
    )
