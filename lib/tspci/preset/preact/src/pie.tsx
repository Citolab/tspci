import type { PciProperties } from "@citolab/tspci";
import configProps from "./config.json";

type PropTypes = PciProperties<typeof configProps>;

/** Settings arrive as strings (they are data- attributes) and an author may type anything: parse and clamp them. */
const toInt = (value: string, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};

/** A circle of `segments` equal slices, the first `colored` ones filled, clockwise from the top. */
export const Pie = ({ config }: { config: PropTypes }) => {
  // the limits match the min/max in config.json
  const segments = toInt(config.segments, 10, 2, 24);
  const colored = toInt(config.colored, 0, 0, segments);
  const size = toInt(config.size, 200, 100, 400);
  const c = size / 2; // centre
  const r = c - 4; // leave room for the outline
  const point = (i: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / segments;
    return `${(c + r * Math.cos(angle)).toFixed(2)} ${(c + r * Math.sin(angle)).toFixed(2)}`;
  };

  // role="img" + aria-label: a screen reader reads one description instead of a list of paths.
  // Translate the label when your items are not in English.
  return (
    <svg
      className="h-auto max-w-full drop-shadow-md"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`A circle in ${segments} equal slices, ${colored} of them coloured`}
    >
      {Array.from({ length: segments }, (_, i) => (
        <path
          key={i}
          className={i < colored ? "stroke-white stroke-2" : "fill-slate-200 stroke-white stroke-2"}
          fill={i < colored ? config.color || "#3b82f6" : undefined}
          d={`M ${c} ${c} L ${point(i)} A ${r} ${r} 0 0 1 ${point(i + 1)} Z`}
        />
      ))}
    </svg>
  );
};
