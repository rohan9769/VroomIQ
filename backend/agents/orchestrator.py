"""
Multi-agent orchestrator using Claude with tool use.
Streams SSE-formatted events back to the caller.
"""
import json
import anthropic
from typing import AsyncIterator
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from agents.tools import TOOLS, dispatch_tool

client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are an expert car shopping assistant with deep knowledge of vehicles, financing, and the automotive market. Your goal is to help users find their perfect car.

You have access to a database of 70 cars with detailed specs, pricing, and reviews, plus live web search. Use your tools proactively:
- Use `search_cars` to find cars matching user criteria — always search before recommending
- Use `compare_cars` when users want a side-by-side comparison
- Use `get_recommendation` when users ask "what should I buy?" or describe their needs
- Use `calculate_financing` when users ask about payments or affordability
- Use `search_web` for anything outside the database: full trim lineups, current pricing, recalls, recent news, or any question the database cannot answer accurately

Guidelines:
- Always use tools to ground your responses in real data — never guess or estimate
- When a user asks about trims, options, or details not in the database, always call `search_web` rather than approximating from memory
- When showing cars, highlight the 2-3 most relevant specs for the user's stated needs
- Be direct and opinionated — users want expert guidance, not a list of options with no recommendation
- If a user's budget is tight, be honest about trade-offs
- Format car names as: Year Make Model Trim (e.g., "2024 Toyota Camry XSE V6")
"""


async def stream_agent(messages: list[dict]) -> AsyncIterator[str]:
    """
    Runs the agentic loop with Claude.
    Yields SSE data strings for each event.
    Uses event.type string (not class name) for compatibility with all SDK versions.
    """
    current_messages = list(messages)

    while True:
        async with client.messages.stream(
            model=CLAUDE_MODEL,
            max_tokens=4096,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            tools=TOOLS,
            messages=current_messages,
        ) as stream:
            tool_uses: list[dict] = []
            current_tool: dict | None = None

            async for event in stream:
                etype = event.type  # use the string type attribute, not class name

                if etype == "content_block_start":
                    block = event.content_block
                    if block.type == "tool_use":
                        current_tool = {"id": block.id, "name": block.name, "input_json": ""}
                        yield _sse({"type": "tool_start", "tool": block.name})

                elif etype == "content_block_delta":
                    delta = event.delta
                    if delta.type == "text_delta":
                        yield _sse({"type": "text", "content": delta.text})
                    elif delta.type == "input_json_delta" and current_tool:
                        current_tool["input_json"] += delta.partial_json

                elif etype == "content_block_stop":
                    if current_tool:
                        tool_uses.append(current_tool)
                        current_tool = None

            final = await stream.get_final_message()

        if final.stop_reason == "end_turn":
            yield _sse({"type": "done"})
            break

        if final.stop_reason == "tool_use" and tool_uses:
            tool_results_content = []

            for tu in tool_uses:
                args = json.loads(tu["input_json"] or "{}")
                result_str = await dispatch_tool(tu["name"], args)
                result_data = json.loads(result_str)

                yield _sse({"type": "tool_result", "tool": tu["name"], "result": result_data})

                tool_results_content.append({
                    "type": "tool_result",
                    "tool_use_id": tu["id"],
                    "content": result_str,
                })

            current_messages.append({"role": "assistant", "content": final.content})
            current_messages.append({"role": "user", "content": tool_results_content})
            tool_uses = []
            continue

        yield _sse({"type": "done"})
        break


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
