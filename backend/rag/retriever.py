from qdrant_client import QdrantClient
from qdrant_client.models import (
    Filter, FieldCondition, MatchValue, Range,
    MatchAny, Document,
)
from config import QDRANT_URL, QDRANT_API_KEY, QDRANT_LOCAL_PATH, COLLECTION_NAME

EMBED_MODEL = "BAAI/bge-small-en-v1.5"


def _make_client() -> QdrantClient:
    if QDRANT_URL:
        return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
    return QdrantClient(path=QDRANT_LOCAL_PATH)


def _build_filter(
    min_price: int | None = None,
    max_price: int | None = None,
    body_type: str | None = None,
    fuel_type: str | None = None,
    year_min: int | None = None,
    year_max: int | None = None,
    makes: list[str] | None = None,
    min_horsepower: int | None = None,
) -> Filter | None:
    conditions = []

    if min_price is not None or max_price is not None:
        conditions.append(FieldCondition(
            key="price",
            range=Range(gte=min_price, lte=max_price)
        ))

    if body_type:
        conditions.append(FieldCondition(
            key="body_type",
            match=MatchValue(value=body_type.lower())
        ))

    if fuel_type:
        conditions.append(FieldCondition(
            key="fuel_type",
            match=MatchValue(value=fuel_type.lower())
        ))

    if year_min is not None or year_max is not None:
        conditions.append(FieldCondition(
            key="year",
            range=Range(gte=year_min, lte=year_max)
        ))

    if makes:
        conditions.append(FieldCondition(
            key="make",
            match=MatchAny(any=[m.title() for m in makes])
        ))

    if min_horsepower is not None:
        conditions.append(FieldCondition(
            key="horsepower",
            range=Range(gte=min_horsepower)
        ))

    return Filter(must=conditions) if conditions else None


class CarRetriever:
    def __init__(self):
        self.client = _make_client()

    def search(
        self,
        query: str,
        limit: int = 5,
        min_price: int | None = None,
        max_price: int | None = None,
        body_type: str | None = None,
        fuel_type: str | None = None,
        year_min: int | None = None,
        year_max: int | None = None,
        makes: list[str] | None = None,
        min_horsepower: int | None = None,
    ) -> list[dict]:
        query_filter = _build_filter(
            min_price=min_price,
            max_price=max_price,
            body_type=body_type,
            fuel_type=fuel_type,
            year_min=year_min,
            year_max=year_max,
            makes=makes,
            min_horsepower=min_horsepower,
        )

        results = self.client.query_points(
            collection_name=COLLECTION_NAME,
            query=Document(text=query, model=EMBED_MODEL),
            query_filter=query_filter,
            limit=limit,
            with_payload=True,
        ).points

        return [r.payload for r in results if r.payload]

    def get_by_ids(self, car_ids: list[str]) -> list[dict]:
        records, _ = self.client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=Filter(
                must=[FieldCondition(key="id", match=MatchAny(any=car_ids))]
            ),
            limit=len(car_ids),
            with_payload=True,
        )
        payload_map = {r.payload["id"]: r.payload for r in records if r.payload}
        return [payload_map[cid] for cid in car_ids if cid in payload_map]
