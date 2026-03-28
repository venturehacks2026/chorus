from dataclasses import dataclass, field

from app.ingestion.pdf import ParsedDocument, Section
from app.llm.client import count_tokens
from app.config import settings


@dataclass
class Chunk:
    content: str
    chunk_index: int
    start_offset: int
    end_offset: int
    structural_metadata: dict = field(default_factory=dict)


def chunk_document(doc: ParsedDocument) -> list[Chunk]:
    chunks: list[Chunk] = []
    chunk_index = 0
    current_offset = 0

    for section in doc.sections:
        section_text = ""
        if section.header:
            section_text += section.header + "\n"
        section_text += section.content.strip()

        if not section_text.strip():
            continue

        # Find offset in raw_text
        start_offset = doc.raw_text.find(
            section.header if section.header else section.content[:50].strip(),
            current_offset,
        )
        if start_offset == -1:
            start_offset = current_offset

        token_count = count_tokens(section_text)

        if token_count <= settings.chunk_max_tokens:
            chunks.append(Chunk(
                content=section_text,
                chunk_index=chunk_index,
                start_offset=start_offset,
                end_offset=start_offset + len(section_text),
                structural_metadata={
                    "section_header": section.header,
                    "level": section.level,
                    **section.markers,
                },
            ))
            chunk_index += 1
        else:
            # Split large sections at paragraph boundaries
            sub_chunks = _split_section(
                section, section_text, start_offset, chunk_index
            )
            chunks.extend(sub_chunks)
            chunk_index += len(sub_chunks)

        current_offset = start_offset + len(section_text)

    return chunks


def _split_section(
    section: Section,
    section_text: str,
    base_offset: int,
    start_index: int,
) -> list[Chunk]:
    paragraphs = section_text.split("\n\n")
    if len(paragraphs) <= 1:
        paragraphs = section_text.split("\n")

    chunks: list[Chunk] = []
    current_content = ""
    current_start = base_offset
    idx = start_index

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        candidate = (current_content + "\n" + para).strip() if current_content else para
        if count_tokens(candidate) > settings.chunk_max_tokens and current_content:
            chunks.append(Chunk(
                content=current_content,
                chunk_index=idx,
                start_offset=current_start,
                end_offset=current_start + len(current_content),
                structural_metadata={
                    "section_header": section.header,
                    "level": section.level,
                    "is_split": True,
                    **section.markers,
                },
            ))
            idx += 1
            # Overlap: include last bit of previous chunk
            overlap_text = _get_overlap(current_content)
            current_content = (overlap_text + "\n" + para).strip() if overlap_text else para
            current_start = current_start + len(current_content)
        else:
            current_content = candidate

    if current_content.strip():
        chunks.append(Chunk(
            content=current_content,
            chunk_index=idx,
            start_offset=current_start,
            end_offset=current_start + len(current_content),
            structural_metadata={
                "section_header": section.header,
                "level": section.level,
                "is_split": True,
                **section.markers,
            },
        ))

    return chunks


def _get_overlap(text: str) -> str:
    words = text.split()
    overlap_size = settings.chunk_overlap_tokens
    if len(words) <= overlap_size:
        return ""
    return " ".join(words[-overlap_size:])
