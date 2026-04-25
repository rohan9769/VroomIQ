import { Car } from "../types";
import { X } from "lucide-react";

interface Props {
  cars: Car[];
  onClose: () => void;
}

const ROWS: { label: string; key: keyof Car; fmt?: (v: unknown) => string }[] = [
  { label: "Price", key: "price", fmt: (v) => `$${(v as number).toLocaleString()}` },
  { label: "Engine", key: "engine" },
  { label: "Horsepower", key: "horsepower", fmt: (v) => `${v} hp` },
  { label: "Torque", key: "torque", fmt: (v) => `${v} lb-ft` },
  { label: "City MPG", key: "mpg_city", fmt: (v) => (v ? `${v} mpg` : "—") },
  { label: "Highway MPG", key: "mpg_highway", fmt: (v) => (v ? `${v} mpg` : "—") },
  { label: "MPGe", key: "mpge", fmt: (v) => (v ? `${v} MPGe` : "—") },
  { label: "Range", key: "range_miles", fmt: (v) => (v ? `${v} mi` : "—") },
  { label: "Drivetrain", key: "drivetrain" },
  { label: "Seating", key: "seating_capacity", fmt: (v) => `${v} passengers` },
  { label: "Cargo", key: "cargo_space_cf", fmt: (v) => `${v} ft³` },
  { label: "Fuel Type", key: "fuel_type" },
  { label: "Body Type", key: "body_type" },
];

export default function ComparisonTable({ cars, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
          <h2 className="font-semibold text-white">Side-by-Side Comparison</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-400 font-medium w-36">Spec</th>
                {cars.map((car) => (
                  <th key={car.id} className="text-left p-4">
                    <p className="text-xs text-gray-400">{car.year}</p>
                    <p className="font-semibold text-white">
                      {car.make} {car.model}
                    </p>
                    <p className="text-xs text-gray-400">{car.trim}</p>
                    <p className="text-blue-400 font-bold mt-1">
                      ${car.price.toLocaleString()}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ label, key, fmt }) => (
                <tr
                  key={key}
                  className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="p-4 text-gray-400 font-medium">{label}</td>
                  {cars.map((car) => {
                    const val = car[key];
                    const display = fmt ? fmt(val) : String(val ?? "—");
                    return (
                      <td key={car.id} className="p-4 text-gray-200">
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Pros */}
              <tr className="border-b border-gray-800">
                <td className="p-4 text-gray-400 font-medium align-top">Pros</td>
                {cars.map((car) => (
                  <td key={car.id} className="p-4 align-top">
                    <ul className="space-y-1">
                      {car.pros.map((p) => (
                        <li key={p} className="text-green-400 text-xs flex gap-1">
                          <span>+</span> {p}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
              {/* Cons */}
              <tr>
                <td className="p-4 text-gray-400 font-medium align-top">Cons</td>
                {cars.map((car) => (
                  <td key={car.id} className="p-4 align-top">
                    <ul className="space-y-1">
                      {car.cons.map((c) => (
                        <li key={c} className="text-red-400 text-xs flex gap-1">
                          <span>−</span> {c}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
