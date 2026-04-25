import { Car } from "../types";
import CarCard from "./CarCard";

interface Props {
  cars: Car[];
  selectedIds?: Set<string>;
  onSelect?: (car: Car) => void;
  title?: string;
}

export default function CarGrid({ cars, selectedIds, onSelect, title }: Props) {
  if (cars.length === 0) return null;

  return (
    <div className="mb-6">
      {title && (
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {title}
        </h2>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            selected={selectedIds?.has(car.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
