import re
from dataclasses import dataclass, field

import fitz


@dataclass
class Section:
    header: str
    content: str
    level: int = 0
    markers: dict = field(default_factory=dict)


@dataclass
class ParsedDocument:
    title: str
    sections: list[Section]
    raw_text: str
    metadata: dict = field(default_factory=dict)


CONDITIONAL_PATTERN = re.compile(
    r"\b(if|then|unless|otherwise|except when|provided that|in the event)\b",
    re.IGNORECASE,
)
NUMBERED_STEP_PATTERN = re.compile(r"^\s*(\d+[\.\)]\s+|[a-z][\.\)]\s+|[-•]\s+)")


def parse_pdf(file_bytes: bytes, filename: str = "") -> ParsedDocument:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    sections: list[Section] = []
    raw_parts: list[str] = []
    current_section: Section | None = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        blocks = page.get_text("dict")["blocks"]

        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                text = "".join(span["text"] for span in line["spans"]).strip()
                if not text:
                    continue

                max_font_size = max(span["size"] for span in line["spans"])
                is_bold = any("bold" in span["font"].lower() for span in line["spans"])
                is_header = max_font_size >= 14 or (max_font_size >= 12 and is_bold)

                if is_header:
                    if current_section:
                        sections.append(current_section)
                    level = 1 if max_font_size >= 16 else 2 if max_font_size >= 14 else 3
                    current_section = Section(
                        header=text, content="", level=level, markers={}
                    )
                else:
                    if current_section is None:
                        current_section = Section(
                            header="", content="", level=0, markers={}
                        )
                    current_section.content += text + "\n"

                    if NUMBERED_STEP_PATTERN.match(text):
                        current_section.markers["has_numbered_steps"] = True
                    if CONDITIONAL_PATTERN.search(text):
                        current_section.markers["has_conditionals"] = True

                raw_parts.append(text)

    if current_section:
        sections.append(current_section)

    page_count = len(doc)
    doc.close()
    raw_text = "\n".join(raw_parts)

    return ParsedDocument(
        title=filename or "Untitled PDF",
        sections=sections,
        raw_text=raw_text,
        metadata={"page_count": page_count, "source_type": "pdf"},
    )
