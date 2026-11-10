/** Build-only color evaluator for the syntax used by tokens.css.
 * Oklab equations: https://bottosson.github.io/posts/oklab/
 * Transfer functions/interpolation: https://www.w3.org/TR/css-color-4/
 * Mix normalization: https://www.w3.org/TR/css-color-5/#color-mix
 * This deliberately rejects unsupported CSS instead of guessing a native color.
 */
import assert from "node:assert/strict";

const clamp = (value) => Math.max(0, Math.min(1, value));
const hue = (value) => ((value % 360) + 360) % 360;
const linear = (value) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const gamma = (value) =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
const byte = (value) =>
  Math.round(clamp(value) * 255)
    .toString(16)
    .padStart(2, "0");

export function hexColor(value) {
  assert.match(value, /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i);
  let source = value.slice(1);
  if (source.length < 5)
    source = [...source].map((part) => part + part).join("");
  const rgb = [0, 2, 4].map(
    (index) => parseInt(source.slice(index, index + 2), 16) / 255,
  );
  const [r, g, b] = rgb.map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const axisB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(a, axisB);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.004072046 * s,
    c,
    h: c < 0.000001 ? null : hue((Math.atan2(axisB, a) * 180) / Math.PI),
    alpha: source.length === 8 ? parseInt(source.slice(6), 16) / 255 : 1,
    rgb,
  };
}

export function oklchToRgb({ l: lightness, c, h }) {
  const angle = ((h ?? 0) * Math.PI) / 180;
  const a = c * Math.cos(angle);
  const b = c * Math.sin(angle);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(gamma);
}

/** Preserve lightness/hue and reduce chroma for an sRGB fallback (28 iterations).
 * This matches the repository's color-engine approach, not a browser-dependent
 * wide-gamut rendering or a claim of exact CSS gamut-mapping parity.
 */
export function nativeHex(color) {
  let rgb = color.rgb ?? oklchToRgb(color);
  const inGamut = (channels) =>
    channels.every((value) => value >= -1e-7 && value <= 1 + 1e-7);
  if (!inGamut(rgb)) {
    let low = 0;
    let high = color.c;
    for (let i = 0; i < 28; i++) {
      const c = (low + high) / 2;
      if (inGamut(oklchToRgb({ ...color, c }))) low = c;
      else high = c;
    }
    rgb = oklchToRgb({ ...color, c: low });
  }
  return `#${rgb.map(byte).join("")}${color.alpha < 1 ? byte(color.alpha) : ""}`;
}

function splitArguments(value) {
  let depth = 0;
  let start = 0;
  const parts = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    assert(depth >= 0, "Unbalanced color expression");
    if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  assert.equal(depth, 0, "Unbalanced color expression");
  return [...parts, value.slice(start).trim()];
}

export function mixOklch(first, second, firstWeight = 0.5, secondWeight = 0.5) {
  const total = firstWeight + secondWeight;
  assert(
    total > 0 && firstWeight >= 0 && secondWeight >= 0,
    "Invalid color-mix weights",
  );
  const p = firstWeight / total;
  const q = secondWeight / total;
  const alpha = first.alpha * p + second.alpha * q;
  if (alpha === 0) return { l: 0, c: 0, h: null, alpha: 0 };
  let a = first.h ?? second.h ?? 0;
  let b = second.h ?? first.h ?? 0;
  if (b - a > 180) a += 360;
  else if (b - a < -180) b += 360;
  return {
    l: (first.l * first.alpha * p + second.l * second.alpha * q) / alpha,
    c: (first.c * first.alpha * p + second.c * second.alpha * q) / alpha,
    h: hue(a * p + b * q),
    alpha: alpha * Math.min(total, 1),
  };
}

export function evaluateColor(expression, variables = {}, chain = []) {
  const value = expression.trim();
  if (value.startsWith("#")) return hexColor(value);
  if (value === "transparent") return { l: 0, c: 0, h: null, alpha: 0 };
  const variable = /^var\(--([\w-]+)\)$/.exec(value);
  if (variable) {
    const name = variable[1];
    assert(
      !chain.includes(name),
      `Cyclic CSS color: ${[...chain, name].join(" -> ")}`,
    );
    assert(Object.hasOwn(variables, name), `Unknown CSS color: --${name}`);
    return evaluateColor(variables[name], variables, [...chain, name]);
  }
  const oklch = /^oklch\(([^)]+)\)$/.exec(value);
  if (oklch) {
    const parts = oklch[1].split("/").map((part) => part.trim());
    assert(parts.length <= 2, "Invalid OKLCH alpha component");
    const [components, opacity = "1"] = parts;
    const numbers = components.split(/\s+/);
    assert.equal(numbers.length, 3);
    const numeric = (part, percentage, degrees = false) => {
      assert.match(
        part,
        degrees ? /^-?(?:\d*\.)?\d+(?:deg)?$/ : /^-?(?:\d*\.)?\d+%?$/,
      );
      const n = parseFloat(part) * (part.endsWith("%") ? percentage / 100 : 1);
      assert(Number.isFinite(n));
      return n;
    };
    const l = clamp(numeric(numbers[0], 1));
    const c = Math.max(0, numeric(numbers[1], 0.4));
    const angle = numeric(numbers[2], 360, true);
    return {
      l,
      c,
      h: c < 0.000001 ? null : hue(angle),
      alpha: clamp(numeric(opacity, 1)),
    };
  }
  if (value.startsWith("color-mix(") && value.endsWith(")")) {
    const [space, ...arguments_] = splitArguments(value.slice(10, -1));
    assert.equal(space, "in oklch", "Unsupported color-mix space");
    assert.equal(arguments_.length, 2);
    const entries = arguments_.map((argument) => {
      const match = /^(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/s.exec(argument);
      const weight = match[2] === undefined ? null : Number(match[2]) / 100;
      assert(
        weight === null || (weight >= 0 && weight <= 1),
        "Invalid color-mix percentage",
      );
      return { color: evaluateColor(match[1], variables, chain), weight };
    });
    const p =
      entries[0].weight ??
      (entries[1].weight === null ? 0.5 : 1 - entries[1].weight);
    const q = entries[1].weight ?? 1 - p;
    return mixOklch(entries[0].color, entries[1].color, p, q);
  }
  throw new Error(`Unsupported CSS color expression: ${value}`);
}

export function cssVariables(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const read = (selector) => {
    const block = new RegExp(`${selector}\\s*\\{([^}]+)\\}`).exec(text);
    assert(block, `Missing canonical selector ${selector}`);
    return Object.fromEntries(
      [...block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
        match[1],
        match[2].trim(),
      ]),
    );
  };
  const light = read(":root");
  return { light, dark: { ...light, ...read("\\.dark") } };
}

/** WCAG relative-luminance ratio of opaque sRGB colors. Alpha needs a backdrop. */
export function contrastRatio(first, second) {
  const luminance = (hex) => {
    const color = hexColor(hex);
    assert.equal(color.alpha, 1, "Contrast requires opaque colors");
    const [r, g, b] = color.rgb.map(linear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
