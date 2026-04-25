export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  body_type: string;
  fuel_type: string;
  price: number;
  mpg_city?: number;
  mpg_highway?: number;
  mpge?: number;
  range_miles?: number;
  horsepower: number;
  torque: number;
  seating_capacity: number;
  cargo_space_cf: number;
  drivetrain: string;
  engine: string;
  features: string[];
  pros: string[];
  cons: string[];
  description: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SSEEvent {
  type: "text" | "tool_start" | "tool_result" | "done";
  content?: string;
  tool?: string;
  result?: { cars?: Car[]; financing?: FinancingResult; count?: number };
}

export interface FinancingResult {
  monthly_payment: number;
  loan_amount: number;
  down_payment: number;
  term_months: number;
  annual_rate_pct: number;
  total_paid: number;
  total_interest: number;
  credit_tier: string;
}
