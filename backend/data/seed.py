"""
Run this once to embed all cars and upsert them into Qdrant.
Usage: python data/seed.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Document
from config import QDRANT_URL, QDRANT_API_KEY, QDRANT_LOCAL_PATH, COLLECTION_NAME

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
VECTOR_SIZE = 384


def car_to_document(car: dict) -> str:
    lines = [
        f"{car['year']} {car['make']} {car['model']} {car['trim']}",
        f"Body: {car['body_type']} | Fuel: {car['fuel_type']} | Drivetrain: {car['drivetrain']}",
        f"Price: ${car['price']:,} MSRP",
        f"Engine: {car['engine']} — {car['horsepower']}hp, {car['torque']} lb-ft torque",
    ]

    if car.get("mpg_city"):
        lines.append(f"Fuel Economy: {car['mpg_city']} mpg city / {car['mpg_highway']} mpg highway")
    if car.get("mpge"):
        lines.append(f"Efficiency: {car['mpge']} MPGe | Range: {car.get('range_miles', 'N/A')} miles")

    lines += [
        f"Seating: {car['seating_capacity']} | Cargo: {car['cargo_space_cf']} cu ft",
        "",
        car["description"],
        "",
        f"Pros: {', '.join(car['pros'])}",
        f"Cons: {', '.join(car['cons'])}",
        f"Key Features: {', '.join(car['features'])}",
    ]
    return "\n".join(lines)


def seed():
    cars_path = Path(__file__).parent / "cars.json"
    cars = json.loads(cars_path.read_text())

    if QDRANT_URL:
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
        location = QDRANT_URL
    else:
        client = QdrantClient(path=QDRANT_LOCAL_PATH)
        location = QDRANT_LOCAL_PATH

    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        client.delete_collection(COLLECTION_NAME)
        print(f"Dropped existing collection '{COLLECTION_NAME}'")

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )

    print(f"Seeding {len(cars)} cars into Qdrant ({location})...")

    points = [
        PointStruct(
            id=i,
            payload=car,
            vector=Document(text=car_to_document(car), model=EMBED_MODEL),
        )
        for i, car in enumerate(cars)
    ]

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"Done! {len(cars)} cars indexed in collection '{COLLECTION_NAME}'.")


if __name__ == "__main__":
    seed()
