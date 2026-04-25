import { useState } from "react";
import { Car, ChatMessage } from "./types";
import ChatPanel from "./components/ChatPanel";
import CarGrid from "./components/CarGrid";
import ComparisonTable from "./components/ComparisonTable";
import { streamChat } from "./api/client";
import { BarChart3, Car as CarIcon } from "lucide-react";

const SUGGESTIONS = [
  "Find me a reliable family SUV under $40k",
  "What's the best EV with long range?",
  "Compare the Toyota Camry vs Honda Accord",
  "Recommend a fun sports car under $45k",
  "Calculate financing for a $35,000 car",
  "Best truck for towing under $55k",
];

export default function App() {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const handleCarsFound = (newCars: unknown[]) => {
    setCars(newCars as Car[]);
  };

  const handleCarSelect = (car: Car) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(car.id)) {
        next.delete(car.id);
      } else {
        next.add(car.id);
      }
      return next;
    });
  };

  const selectedCars = cars.filter((c) => selectedIds.has(c.id));

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <CarIcon className="text-blue-400" size={22} />
          <span className="font-bold text-white text-lg tracking-tight">
            CarShopping<span className="text-blue-400">AI</span>
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
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel — left */}
        <div className="w-[420px] shrink-0 border-r border-gray-800 flex flex-col">
          <ChatPanel
            key={chatKey}
            onCarsFound={handleCarsFound}
            onStream={() => {}}
            streamChat={streamChat as (messages: ChatMessage[]) => AsyncGenerator<unknown>}
          />
        </div>

        {/* Results panel — right */}
        <div className="flex-1 overflow-y-auto">
          {cars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <CarIcon size={48} className="text-gray-700 mb-4" />
              <h2 className="text-xl font-semibold text-gray-400 mb-2">
                Start a conversation
              </h2>
              <p className="text-gray-600 text-sm mb-8 max-w-sm">
                Ask the AI about any car, and results will appear here. Click cards
                to select them for comparison.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="text-left text-sm bg-gray-800/60 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg px-4 py-3 text-gray-300 hover:text-white transition-all"
                    onClick={() => {
                      // Inject suggestion into chat — reset key to force re-mount with pre-filled input
                      const ev = new CustomEvent("suggestion", { detail: s });
                      window.dispatchEvent(ev);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5">
              {selectedIds.size > 0 && (
                <p className="text-xs text-gray-500 mb-4">
                  {selectedIds.size} car{selectedIds.size > 1 ? "s" : ""} selected — click to
                  deselect, or select 2+ to compare.
                </p>
              )}
              <CarGrid
                cars={cars}
                selectedIds={selectedIds}
                onSelect={handleCarSelect}
                title={`${cars.length} result${cars.length !== 1 ? "s" : ""}`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Comparison modal */}
      {showComparison && selectedCars.length >= 2 && (
        <ComparisonTable
          cars={selectedCars}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
