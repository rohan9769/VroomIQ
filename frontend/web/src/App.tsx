import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Car, ChatMessage } from "./types";
import CarGrid from "./components/CarGrid";
import ComparisonTable from "./components/ComparisonTable";
import { streamChat } from "./api/client";
import { BarChart3, Car as CarIcon, Send, Loader2, Wrench } from "lucide-react";

const SUGGESTIONS = [
  "Find me a reliable family SUV under $40k",
  "What's the best EV with long range?",
  "Compare the Toyota Camry vs Honda Accord",
  "Recommend a fun sports car under $45k",
  "Calculate financing for a $35,000 car",
  "Best truck for towing under $55k",
];

const TOOL_LABELS: Record<string, string> = {
  search_cars: "Searching inventory...",
  compare_cars: "Comparing cars...",
  get_recommendation: "Generating recommendation...",
  calculate_financing: "Calculating financing...",
};

interface DisplayMessage {
  role: "user" | "assistant" | "tool" | "cars";
  content: string;
  toolName?: string;
  cars?: Car[];
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [display, setDisplay] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Accumulates all cars ever shown — so selection works across multiple queries
  const [allCars, setAllCars] = useState<Map<string, Car>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [display]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = { role: "user", content: msg };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setDisplay((d) => [...d, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);

    let assistantText = "";
    let pendingCars: Car[] | null = null;
    setDisplay((d) => [...d, { role: "assistant", content: "" }]);

    try {
      for await (const event of streamChat(nextMessages) as AsyncGenerator<{
        type: string;
        content?: string;
        tool?: string;
        result?: { cars?: unknown[] };
      }>) {
        if (event.type === "text" && event.content) {
          assistantText += event.content;
          setDisplay((d) => {
            const copy = [...d];
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
            return copy;
          });
        } else if (event.type === "tool_start" && event.tool) {
          setDisplay((d) => [
            ...d,
            {
              role: "tool",
              content: TOOL_LABELS[event.tool!] ?? `Running ${event.tool}…`,
              toolName: event.tool,
            },
          ]);
        } else if (event.type === "tool_result") {
          const found = (event.result as { cars?: unknown[] })?.cars;
          if (found && found.length > 0) {
            pendingCars = found as Car[];
          }
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);

      // Add cars to display AFTER text finishes streaming.
      // Only show a new card grid if at least one car is new — if Claude is just
      // fetching a previously-shown car to answer a follow-up question, skip the grid.
      if (pendingCars) {
        const batch = pendingCars;
        setAllCars((prev) => {
          const next = new Map(prev);
          batch.forEach((c) => next.set(c.id, c));
          return next;
        });
        const hasNewCars = batch.some((c) => !allCars.has(c.id));
        if (hasNewCars) {
          setDisplay((d) => [...d, { role: "cars", content: "", cars: batch }]);
        }
      }
    } catch {
      setDisplay((d) => {
        const copy = [...d];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return copy;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleCarSelect = (car: Car) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(car.id)) next.delete(car.id);
      else next.add(car.id);
      return next;
    });
  };

  const selectedCars = [...allCars.values()].filter((c) => selectedIds.has(c.id));
  const hasConversation = display.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <CarIcon className="text-blue-400" size={22} />
          <span className="font-bold text-white text-lg tracking-tight">
            Vroom<span className="text-blue-400">IQ</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              <BarChart3 size={15} />
              Compare ({selectedIds.size})
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
          )}
          <a
            href="https://www.linkedin.com/in/rsnayak21/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-blue-400 transition-colors border-l border-gray-700 pl-3"
          >
            Made by <span className="text-gray-300 hover:text-blue-400">Rohan Nayak</span>
          </a>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {!hasConversation ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-16 text-center">
            <CarIcon size={52} className="text-gray-700 mb-5" />
            <h2 className="text-2xl font-semibold text-gray-300 mb-2">
              Find your perfect car
            </h2>
            <p className="text-gray-500 text-sm mb-10 max-w-md">
              Ask anything — budget, lifestyle, fuel type, towing capacity — the AI searches 70 cars
              and recommends the best match for you.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-3 text-gray-300 hover:text-white transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 pt-6 pb-4 space-y-4">
            {display.map((msg, i) => {
              // Car results — full container width, inline in conversation
              if (msg.role === "cars" && msg.cars) {
                return (
                  <div key={i} className="border-t border-gray-800 pt-4 pb-2">
                    {selectedIds.size > 0 && (
                      <p className="text-xs text-gray-500 mb-3 max-w-2xl">
                        {selectedIds.size} car{selectedIds.size > 1 ? "s" : ""} selected — click to
                        deselect, or select 2+ to compare.
                      </p>
                    )}
                    <CarGrid
                      cars={msg.cars}
                      selectedIds={selectedIds}
                      onSelect={handleCarSelect}
                      title={`${msg.cars.length} result${msg.cars.length !== 1 ? "s" : ""}`}
                    />
                  </div>
                );
              }

              // Tool indicator
              if (msg.role === "tool") {
                return (
                  <div key={i} className="max-w-2xl mx-auto w-full flex items-center gap-2 text-xs text-blue-400 px-1">
                    <Wrench size={12} className="animate-pulse" />
                    {msg.content}
                  </div>
                );
              }

              // User bubble
              if (msg.role === "user") {
                return (
                  <div key={i} className="max-w-2xl mx-auto w-full flex justify-end">
                    <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                      {msg.content}
                    </div>
                  </div>
                );
              }

              // Assistant bubble
              return (
                <div key={i} className="max-w-2xl mx-auto w-full flex justify-start">
                  <div className="max-w-[90%] bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-100 prose prose-invert prose-sm">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              );
            })}

            {loading && !display[display.length - 1]?.content && (
              <div className="max-w-2xl mx-auto w-full flex justify-start">
                <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Fixed input bar */}
      <div className="shrink-0 border-t border-gray-800 bg-gray-950 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about any car, budget, or need..."
              rows={1}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 transition-colors max-h-32"
              style={{ fieldSizing: "content" } as React.CSSProperties}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl p-3 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Shift+Enter for new line · Enter to send
          </p>
        </div>
      </div>

      {/* Comparison modal */}
      {showComparison && selectedCars.length >= 2 && (
        <ComparisonTable cars={selectedCars} onClose={() => setShowComparison(false)} />
      )}
    </div>
  );
}
