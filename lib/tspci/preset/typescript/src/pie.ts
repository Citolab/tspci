import type { PciProperties } from "@citolab/tspci";
import configProps from "./config.json";

type PropTypes = PciProperties<typeof configProps>;

/** Settings arrive as strings (they are data- attributes) and an author may type anything: parse and clamp them. */
const toInt = (value: string, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};

/** The pie the settings describe; the limits match the min/max in config.json. */
export function pieSettings(p: Partial<PropTypes>) {
  const segments = toInt(p.segments, 10, 2, 24);
  return {
    segments,
    colored: toInt(p.colored, 0, 0, segments),
    size: toInt(p.size, 200, 100, 400),
    color: p.color || "#3b82f6",
  };
}

/** An SVG circle of `segments` equal slices, the first `colored` ones filled, clockwise from the top. */
export function pieSvg(p: PropTypes): string {
  const { segments, colored, size, color } = pieSettings(p);
  const c = size / 2; // centre
  const r = c - 4; // leave room for the outline
  const point = (i: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / segments;
    return `${(c + r * Math.cos(angle)).toFixed(2)} ${(c + r * Math.sin(angle)).toFixed(2)}`;
  };
  const slices = Array.from(
    { length: segments },
    (_, i) =>
      `<path class="slice" d="M ${c} ${c} L ${point(i)} A ${r} ${r} 0 0 1 ${point(i + 1)} Z"${
        i < colored ? ` fill="${escapeHtml(color)}"` : ""
      }/>`
  ).join("");
  // role="img" + aria-label: a screen reader reads one description instead of a list of paths.
  // Translate the label when your items are not in English.
  return `<svg class="pie" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
    role="img" aria-label="A circle in ${segments} equal slices, ${colored} of them coloured">${slices}</svg>`;
}

/** Settings and answers end up in innerHTML: escape them, or an author's "<" breaks the markup. */
export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
