# Chorus Ingestion API Reference

**Base URL:** `http://localhost:8100`
**Docs:** `http://localhost:8100/docs` (Swagger UI)

## Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

## SOP Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/sops/text` | Ingest a plain text / natural language SOP |
| `POST` | `/api/v1/sops/upload` | Upload a file (PDF, DOCX, TXT) |
| `POST` | `/api/v1/sops/confluence` | Fetch and ingest from a Confluence URL |
| `POST` | `/api/v1/sops/notion` | Fetch and ingest from a Notion page ID |
| `GET` | `/api/v1/sops/{sop_id}` | Get SOP metadata and chunk count |
| `GET` | `/api/v1/sops` | List all SOPs |

## ASD Compilation & Retrieval

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/asds/compile/{sop_id}` | Trigger SOP-to-ASD compilation (returns 202) |
| `GET` | `/api/v1/asds/{asd_id}` | Get full ASD with nodes and edges (latest version) |
| `GET` | `/api/v1/asds` | List all ASDs |
| `GET` | `/api/v1/asds/{asd_id}/versions` | List all versions of an ASD |
| `GET` | `/api/v1/asds/{asd_id}/versions/{version}` | Get a specific ASD version |

## Clarifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/clarifications/asd/{asd_id}` | List clarifications for an ASD |
| `POST` | `/api/v1/clarifications/{id}/resolve` | Resolve a clarification request |

## Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/search/chunks` | Semantic search over document chunks |

## Drift Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/drift/check/{sop_id}` | Re-hash source and compare for drift |
| `POST` | `/api/v1/drift/recheck/{sop_id}` | Re-fetch source and check for changes |
