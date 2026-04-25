#!/usr/bin/env node
import React, { useState, useCallback } from "react";
import { render, Box, Text, useInput, useApp, Static } from "ink";
import TextInput from "ink-text-input";

const API = process.env["API_URL"] ?? "http://localhost:8000";

interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  price: number;
  horsepower: number;
  fuel_type: string;
  body_type: string;
  mpg_city?: number;
  mpg_highway?: number;
  mpge?: number;
  range_miles?: number;
  pros: string[];
  cons: string[];
}

interface Message {
  role: "user" | "assistant" | "status";
  content: string;
  cars?: Car[];
}

async function* streamChat(
  messages: { role: string; content: string }[]
): AsyncGenerator<{ type: string; content?: string; tool?: string; result?: { cars?: Car[] } }> {
  const res = await fetch(`${API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok || !res.body) throw new Error(`API error ${res.status}`);

  const reader = (res.body as unknown as { getReader(): ReadableStreamDefaultReader<Uint8Array> }).getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        yield JSON.parse(raw);
      } catch {}
    }
  }
}

function CarBox({ car }: { car: Car }) {
  const eff =
    car.fuel_type === "electric"
      ? `${car.mpge ?? "–"} MPGe · ${car.range_miles ?? "–"}mi`
      : `${car.mpg_city ?? "–"}/${car.mpg_highway ?? "–"} mpg`;

  return (
    <Box
      borderStyle="round"
      borderColor="blue"
      flexDirection="column"
      paddingX={1}
      marginBottom={1}
      width={60}
    >
      <Box justifyContent="space-between">
        <Text bold color="white">
          {car.year} {car.make} {car.model}
        </Text>
        <Text bold color="yellow">
          ${car.price.toLocaleString()}
        </Text>
      </Box>
      <Text color="gray">{car.trim}</Text>
      <Box gap={2} marginTop={1}>
        <Text color="cyan">{car.horsepower}hp</Text>
        <Text color="gray">·</Text>
        <Text color="green">{eff}</Text>
        <Text color="gray">·</Text>
        <Text color="magenta">{car.drivetrain ?? car.fuel_type}</Text>
      </Box>
      {car.pros[0] && (
        <Text color="greenBright" dimColor>
          + {car.pros[0]}
        </Text>
      )}
    </Box>
  );
}

function App() {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [display, setDisplay] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "CarShopping AI — Ask me anything about cars!\nTry: \"Find a reliable SUV under $35k\" or \"Compare Camry vs Accord\"",
    },
  ]);
  const [loading, setLoading] = useState(false);

  useInput((ch, key) => {
    if (key.ctrl && ch === "c") exit();
  });

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userEntry = { role: "user" as const, content: text };
    const nextMessages = [...messages, userEntry];

    setMessages(nextMessages);
    setDisplay((d) => [...d, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    let assistantText = "";
    const assistantMsg: Message = { role: "assistant", content: "" };

    setDisplay((d) => [...d, assistantMsg]);

    try {
      for await (const event of streamChat(nextMessages)) {
        if (event.type === "text" && event.content) {
          assistantText += event.content;
          setDisplay((d) => {
            const copy = [...d];
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
            return copy;
          });
        } else if (event.type === "tool_start") {
          setDisplay((d) => [
            ...d,
            { role: "status", content: `[tool] ${event.tool ?? ""}…` },
          ]);
        } else if (event.type === "tool_result" && event.result?.cars?.length) {
          setDisplay((d) => {
            const copy = [...d];
            copy[copy.length - 1] = {
              role: "assistant",
              content: assistantText,
              cars: event.result!.cars,
            };
            return copy;
          });
        }
      }
      setMessages((m) => [...m, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setDisplay((d) => {
        const copy = [...d];
        copy[copy.length - 1] = { role: "assistant", content: "Error: " + String(err) };
        return copy;
      });
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="blue">
          CarShopping
        </Text>
        <Text bold color="white">
          AI
        </Text>
        <Text color="gray"> — Ctrl+C to quit</Text>
      </Box>

      {/* Message history */}
      <Static items={display}>
        {(msg, i) => {
          if (msg.role === "user") {
            return (
              <Box key={i} marginBottom={1}>
                <Text color="blue" bold>
                  You:{" "}
                </Text>
                <Text color="white">{msg.content}</Text>
              </Box>
            );
          }
          if (msg.role === "status") {
            return (
              <Box key={i} marginBottom={0}>
                <Text color="yellow" dimColor>
                  {msg.content}
                </Text>
              </Box>
            );
          }
          return (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Box>
                <Text color="green" bold>
                  AI:{" "}
                </Text>
                <Text color="white">{msg.content}</Text>
              </Box>
              {msg.cars &&
                msg.cars.map((car) => <CarBox key={car.id} car={car} />)}
            </Box>
          );
        }}
      </Static>

      {/* Input */}
      <Box borderStyle="single" borderColor={loading ? "yellow" : "blue"} paddingX={1}>
        <Text color="blue">&gt; </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={send}
          placeholder={loading ? "Thinking..." : "Ask about cars..."}
        />
      </Box>
    </Box>
  );
}

render(<App />);
