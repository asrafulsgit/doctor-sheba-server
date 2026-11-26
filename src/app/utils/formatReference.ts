export function formatReference(value?: string | null): string {
  if (!value) return "-";

  return value.slice(0, 8).toUpperCase();
}