"""
Tool definitions and handler for the car-shopping agent.
Each tool maps directly to a retriever call or a pure-Python calculation.
"""
import json
from rag.retriever import CarRetriever
from config import TAVILY_API_KEY

_retriever: CarRetriever | None = None


def _get_retriever() -> CarRetriever:
    global _retriever
    if _retriever is None:
        _retriever = CarRetriever()
    return _retriever


# ── Tool schemas (passed to Claude) ───────────────────────────────────────────

TOOLS = [
    {
        "name": "search_cars",
        "description": (
            "Search the car database using a natural-language query plus optional filters. "
            "Use this when the user asks to find, browse, or look for cars."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language description of what the user wants, e.g. 'reliable family SUV with good fuel economy'"
                },
                "limit": {"type": "integer", "description": "Max results to return (default 4)", "default": 4},
                "min_price": {"type": "integer", "description": "Minimum price in USD"},
                "max_price": {"type": "integer", "description": "Maximum price in USD"},
                "body_type": {
                    "type": "string",
                    "enum": ["sedan", "suv", "truck", "hatchback", "coupe", "convertible", "minivan"],
                    "description": "Vehicle body type"
                },
                "fuel_type": {
                    "type": "string",
                    "enum": ["gasoline", "hybrid", "electric", "diesel"],
                    "description": "Fuel type"
                },
                "year_min": {"type": "integer"},
                "year_max": {"type": "integer"},
                "makes": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of makes to include, e.g. ['Toyota', 'Honda']"
                },
                "min_horsepower": {"type": "integer"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "compare_cars",
        "description": (
            "Retrieve full details for a list of car IDs so they can be compared side-by-side. "
            "Use this when the user wants to compare specific cars."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "car_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of car IDs to compare (e.g. ['toyota-camry-2024-xse', 'honda-accord-2024-sport-hybrid'])"
                }
            },
            "required": ["car_ids"]
        }
    },
    {
        "name": "get_recommendation",
        "description": (
            "Get a personalized car recommendation based on the user's needs, budget, and lifestyle. "
            "Use this when the user asks 'what should I buy?' or 'recommend me a car'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "budget": {"type": "integer", "description": "Max budget in USD"},
                "use_case": {
                    "type": "string",
                    "description": "Primary use case, e.g. 'daily commute', 'family road trips', 'off-road adventures', 'track driving'"
                },
                "must_haves": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Non-negotiable requirements, e.g. ['AWD', 'hybrid', 'third row seating']"
                },
                "nice_to_haves": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Preferred but optional features"
                },
                "passengers": {"type": "integer", "description": "Number of people who regularly ride"},
                "priorities": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "What matters most, e.g. ['fuel economy', 'reliability', 'performance', 'cargo space']"
                }
            },
            "required": ["budget", "use_case"]
        }
    },
    {
        "name": "search_web",
        "description": (
            "Search the internet for up-to-date car information not in the database — "
            "such as full trim lineups, current pricing, recent reviews, recalls, or "
            "any question the database cannot answer. Always prefer database tools first; "
            "use this only when the user asks about details outside the database."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query, e.g. '2024 Honda CR-V all trim levels and prices'"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "calculate_financing",
        "description": "Calculate monthly payment, total cost, and financing breakdown for a car purchase.",
        "input_schema": {
            "type": "object",
            "properties": {
                "car_id": {"type": "string", "description": "ID of the car to finance"},
                "down_payment": {"type": "integer", "description": "Down payment amount in USD (default 20% of price)"},
                "loan_term_months": {
                    "type": "integer",
                    "enum": [24, 36, 48, 60, 72, 84],
                    "description": "Loan term in months (default 60)"
                },
                "credit_score_tier": {
                    "type": "string",
                    "enum": ["excellent", "good", "fair", "poor"],
                    "description": "Approximate credit tier (excellent: 750+, good: 700-749, fair: 650-699, poor: <650)"
                }
            },
            "required": ["car_id"]
        }
    }
]

# ── APR lookup by credit tier ──────────────────────────────────────────────────
CREDIT_TIERS = {
    "excellent": 5.5,
    "good": 7.5,
    "fair": 12.0,
    "poor": 18.0,
}

# ── Tool handlers ──────────────────────────────────────────────────────────────

def handle_search_cars(args: dict) -> dict:
    results = _get_retriever().search(
        query=args["query"],
        limit=args.get("limit", 4),
        min_price=args.get("min_price"),
        max_price=args.get("max_price"),
        body_type=args.get("body_type"),
        fuel_type=args.get("fuel_type"),
        year_min=args.get("year_min"),
        year_max=args.get("year_max"),
        makes=args.get("makes"),
        min_horsepower=args.get("min_horsepower"),
    )
    return {"cars": results, "count": len(results)}


def handle_compare_cars(args: dict) -> dict:
    cars = _get_retriever().get_by_ids(args["car_ids"])
    return {"cars": cars}


def handle_get_recommendation(args: dict) -> dict:
    budget = args["budget"]
    use_case = args["use_case"]
    must_haves = args.get("must_haves", [])
    priorities = args.get("priorities", [])
    passengers = args.get("passengers", 2)

    # Build a rich search query from the recommendation parameters
    query_parts = [use_case]
    if must_haves:
        query_parts.append(f"must have {', '.join(must_haves)}")
    if priorities:
        query_parts.append(f"prioritizing {', '.join(priorities)}")
    if passengers >= 6:
        query_parts.append("with third row seating or minivan")

    query = " ".join(query_parts)

    results = _get_retriever().search(
        query=query,
        limit=5,
        max_price=budget,
    )
    return {"cars": results, "query_used": query}


def handle_calculate_financing(args: dict) -> dict:
    cars = _get_retriever().get_by_ids([args["car_id"]])
    if not cars:
        return {"error": f"Car '{args['car_id']}' not found"}

    car = cars[0]
    price = car["price"]
    down = args.get("down_payment", round(price * 0.20))
    term = args.get("loan_term_months", 60)
    tier = args.get("credit_score_tier", "good")

    annual_rate = CREDIT_TIERS[tier]
    monthly_rate = annual_rate / 100 / 12
    principal = price - down

    if monthly_rate == 0:
        monthly_payment = principal / term
    else:
        monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** term) / ((1 + monthly_rate) ** term - 1)

    total_paid = down + monthly_payment * term
    total_interest = total_paid - price

    return {
        "car": {"make": car["make"], "model": car["model"], "year": car["year"], "trim": car["trim"], "price": price},
        "financing": {
            "down_payment": down,
            "loan_amount": principal,
            "term_months": term,
            "annual_rate_pct": annual_rate,
            "monthly_payment": round(monthly_payment, 2),
            "total_paid": round(total_paid, 2),
            "total_interest": round(total_interest, 2),
            "credit_tier": tier,
        }
    }


def handle_search_web(args: dict) -> dict:
    if not TAVILY_API_KEY:
        return {"error": "TAVILY_API_KEY not configured"}
    from tavily import TavilyClient
    client = TavilyClient(api_key=TAVILY_API_KEY)
    response = client.search(
        query=args["query"],
        search_depth="basic",
        max_results=5,
        include_answer=True,
    )
    return {
        "answer": response.get("answer", ""),
        "sources": [
            {"title": r.get("title", ""), "url": r.get("url", ""), "content": r.get("content", "")}
            for r in response.get("results", [])
        ],
    }


async def dispatch_tool(name: str, args: dict) -> str:
    handlers = {
        "search_cars": handle_search_cars,
        "compare_cars": handle_compare_cars,
        "get_recommendation": handle_get_recommendation,
        "calculate_financing": handle_calculate_financing,
        "search_web": handle_search_web,
    }
    handler = handlers.get(name)
    if not handler:
        return json.dumps({"error": f"Unknown tool: {name}"})
    result = handler(args)
    return json.dumps(result)
