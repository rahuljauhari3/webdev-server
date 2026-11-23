export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new HttpError(400, `${label} is required`);
  return value.trim();
}
export function numeric(value: unknown): number {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim() === "" ||
    !Number.isFinite(Number(value))
  )
    throw new HttpError(400, "Expected a finite number");
  return Number(value);
}
export function boolean(value: unknown): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw new HttpError(400, "Expected true or false");
}
export function calculate(operation: string, a: unknown, b: unknown) {
  const x = numeric(a),
    y = numeric(b);
  switch (operation) {
    case "add":
      return x + y;
    case "subtract":
      return x - y;
    case "multiply":
      return x * y;
    case "divide":
      if (y === 0) throw new HttpError(400, "Cannot divide by zero");
      return x / y;
    default:
      throw new HttpError(400, "Unknown operation");
  }
}
