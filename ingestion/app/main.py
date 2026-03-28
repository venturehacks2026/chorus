from fastapi import FastAPI

from app.api import asd, clarification, search, sop
from app.drift.detector import router as drift_router

app = FastAPI(
    title="Chorus",
    description="SOP-to-Agent Skill Document platform",
    version="0.1.0",
)

# Mount routers
app.include_router(sop.router)
app.include_router(asd.router)
app.include_router(clarification.router)
app.include_router(search.router)
app.include_router(drift_router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8100, reload=True)
