import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Wrench } from "lucide-react";
import { ChatMessage } from "../types";

const TOOL_LABELS: Record<string, string> = {
  search_cars: "Searching inventory...",
  compare_cars: "Comparing cars...",
  get_recommendation: "Generating recommendation...",
  calculate_financing: "Calculating financing...",
};

interface DisplayMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
}

interface Props {
  onCarsFound: (cars: unknown[]) => void;
  onStream: (streamFn: (messages: ChatMessage[]) => AsyncGenerator<unknown>) => void;
  streamChat: (messages: ChatMessage[]) => AsyncGenerator<unknown>;
}

export default function ChatPanel({ onCarsFound, streamChat }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [display, setDisplay] = useState<DisplayMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI car shopping assistant. Tell me what you're looking for — budget, lifestyle, must-haves — and I'll find the perfect car for you.\n\nTry: *\"Find me a reliable SUV under $35k with good fuel economy\"* or *\"What's the best sports car for weekend driving?\"*",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [display]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setDisplay((d) => [...d, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    let assistantText = "";

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
            { role: "tool", content: TOOL_LABELS[event.tool!] ?? `Running ${event.tool}…`, toolName: event.tool },
          ]);
        } else if (event.type === "tool_result") {
          const cars = event.result?.cars;
          if (cars && cars.length > 0) {
            onCarsFound(cars);
          }
        }
      }

      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
    } catch (err) {
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {display.map((msg, i) => {
          if (msg.role === "tool") {
            return (
              <div key={i} className="flex items-center gap-2 text-xs text-blue-400 px-2">
                <Wrench size={12} className="animate-pulse" />
                {msg.content}
              </div>
            );
          }

          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[90%] bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-100 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          );
        })}

        {loading && !display[display.length - 1]?.content && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 p-4">
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
            onClick={send}
            disabled={loading || !input.trim()}
            className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl p-3 transition-colors"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
