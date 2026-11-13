export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatCount(value: string): string {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("id-ID") : value;
}
