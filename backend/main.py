import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from models import ChatRequest
from agents.orchestrator import stream_agent
from rag.retriever import CarRetriever

app = FastAPI(title="CarShopping API")

_default_origins = "http://localhost:5173,http://localhost:3000"
allowed_origins = os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_retriever: CarRetriever | None = None


def get_retriever() -> CarRetriever:
    global _retriever
    if _retriever is None:
        _retriever = CarRetriever()
    return _retriever


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    async def generate():
        async for chunk in stream_agent(messages):
            yield chunk

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.get("/api/cars/{car_id}")
async def get_car(car_id: str):
    cars = get_retriever().get_by_ids([car_id])
    if not cars:
        raise HTTPException(status_code=404, detail="Car not found")
    return cars[0]


@app.get("/api/cars")
async def list_cars(
    q: str = "",
    body_type: str | None = None,
    fuel_type: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    limit: int = 20,
):
    results = get_retriever().search(
        query=q or "car",
        limit=limit,
        body_type=body_type,
        fuel_type=fuel_type,
        min_price=min_price,
        max_price=max_price,
    )
    return {"cars": results}
