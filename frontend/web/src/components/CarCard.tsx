import { Car } from "../types";
import { Fuel, Zap, Users, Package, Gauge } from "lucide-react";

const fuelColor: Record<string, string> = {
  electric: "text-blue-400 bg-blue-400/10",
  hybrid: "text-green-400 bg-green-400/10",
  gasoline: "text-orange-400 bg-orange-400/10",
  diesel: "text-yellow-400 bg-yellow-400/10",
};

interface Props {
  car: Car;
  onSelect?: (car: Car) => void;
  selected?: boolean;
}

export default function CarCard({ car, onSelect, selected }: Props) {
  const badge = fuelColor[car.fuel_type] ?? "text-gray-400 bg-gray-400/10";
  const efficiency =
    car.fuel_type === "electric"
      ? `${car.mpge ?? "–"} MPGe · ${car.range_miles ?? "–"}mi range`
      : `${car.mpg_city ?? "–"}/${car.mpg_highway ?? "–"} mpg`;

  return (
    <div
      onClick={() => onSelect?.(car)}
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:border-blue-500/60 hover:bg-gray-800/60 ${
        selected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700/50 bg-gray-900/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-xs text-gray-400">{car.year}</p>
          <h3 className="font-semibold text-white leading-tight">
            {car.make} {car.model}
          </h3>
          <p className="text-sm text-gray-400">{car.trim}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-white">
            ${car.price.toLocaleString()}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge}`}>
            {car.fuel_type}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat icon={<Gauge size={13} />} label="Power" value={`${car.horsepower} hp`} />
        <Stat icon={<Fuel size={13} />} label="Economy" value={efficiency} />
        <Stat icon={<Users size={13} />} label="Seats" value={`${car.seating_capacity}`} />
        <Stat icon={<Package size={13} />} label="Cargo" value={`${car.cargo_space_cf} ft³`} />
      </div>

      {/* Drivetrain + body */}
      <div className="flex gap-2">
        <Tag>{car.drivetrain}</Tag>
        <Tag>{car.body_type}</Tag>
      </div>

      {/* Top pro */}
      {car.pros[0] && (
        <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
          <Zap size={11} />
          {car.pros[0]}
        </p>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-500">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
      {children}
    </span>
  );
}
