from app.ingestion.pdf import ParsedDocument, parse_pdf
from app.ingestion.docx import parse_docx
from app.ingestion.text import parse_text


def parse_document(
    file_bytes: bytes | None = None,
    text_content: str | None = None,
    filename: str = "",
    source_type: str = "text",
    title: str = "",
) -> ParsedDocument:
    if source_type == "pdf" and file_bytes:
        return parse_pdf(file_bytes, filename)
    elif source_type == "docx" and file_bytes:
        return parse_docx(file_bytes, filename)
    elif source_type == "text" and text_content:
        return parse_text(text_content, title=title)
    elif text_content:
        return parse_text(text_content, title=title)
    else:
        raise ValueError(f"Unsupported source_type '{source_type}' or missing content")
