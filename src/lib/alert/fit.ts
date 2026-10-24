/** Largest font size (<= max, >= min) whose measured width fits maxWidth. */
export function fitFontSize(measure: (size: number) => number, maxWidth: number, max: number, min: number) {
  const w = measure(max);
  if (w <= maxWidth) return max;
  return Math.max(min, Math.floor((max * maxWidth) / w));
}

export function sanitizeUser(raw: string | null | undefined) {
  const s = (raw ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40);
  return s || "Wanderer";
}
