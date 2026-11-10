import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  nativeColors,
  nativePalettes,
  nativePaletteOptions,
  nativeRadiusPreferences,
  nativeTokenSource,
  nativeTouchTarget,
} from "@pycolors/tokens/native";
import {
  contrastRatio,
  cssVariables,
  evaluateColor,
  hexColor,
  mixOklch,
  nativeHex,
} from "../scripts/native-color.mjs";
import {
  generateNative,
  nativeArtifacts,
} from "../scripts/generate-native.mjs";

const directory = fileURLToPath(new URL("../", import.meta.url));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const close = (actual, expected, tolerance = 1e-6) =>
  assert(
    Math.abs(actual - expected) < tolerance,
    `${actual} differs from ${expected}`,
  );

test("sRGB primaries, neutrals and alpha round-trip without a copied color table", () => {
  for (const color of [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffffff",
    "#000000",
    "#0b0b10",
    "#16a34a",
    "#11223344",
  ]) {
    assert.equal(nativeHex(hexColor(color)), color);
  }
  assert.equal(nativeHex(evaluateColor("oklch(1 0 0 / 10%)")), "#ffffff1a");
  assert.equal(nativeHex(evaluateColor("oklch(0 0 0)")), "#000000");
  for (const [expression, expected] of [
    ["oklch(0.6279553606 0.2576833077 29.2338851923)", "#ff0000"],
    ["oklch(0.8664396115 0.2948272403 142.4953388878)", "#00ff00"],
    ["oklch(0.4520137184 0.3132143717 264.0520206381)", "#0000ff"],
  ])
    assert.equal(nativeHex(evaluateColor(expression)), expected);
});

test("OKLCH mixes normalize weights, use the short hue arc and premultiply alpha", () => {
  assert.equal(
    nativeHex(evaluateColor("color-mix(in oklch, #16a34a, transparent 88%)")),
    "#16a34a1f",
  );
  const wrapped = mixOklch(
    { l: 0.5, c: 0.1, h: 350, alpha: 1 },
    { l: 0.5, c: 0.1, h: 10, alpha: 1 },
  );
  close(wrapped.h, 0);
  close(wrapped.l, 0.5);
  close(wrapped.c, 0.1);
  const mixed = mixOklch(
    { l: 0.25, c: 0.1, h: 30, alpha: 0.25 },
    { l: 0.75, c: 0.3, h: 30, alpha: 0.75 },
  );
  close(mixed.l, 0.625);
  close(mixed.c, 0.25);
  close(mixed.alpha, 0.5);
  const normalized = evaluateColor(
    "color-mix(in oklch, #ff0000 20%, #ff0000 20%)",
  );
  close(normalized.alpha, 0.4);
  assert.equal(nativeHex(normalized), "#ff000066");
  const neutral = evaluateColor(
    "color-mix(in oklch, oklch(1 0 0), oklch(0.5 0.1 292))",
  );
  close(neutral.h, 292); // An achromatic color does not introduce an arbitrary hue.
});

test("CSS aliases inherit dark overrides and unsupported/cyclic input fails closed", () => {
  const maps = cssVariables(
    ":root { --foreground: #ffffff; --card-foreground: var(--foreground); } .dark { --foreground: #000000; }",
  );
  assert.equal(
    nativeHex(evaluateColor(maps.dark["card-foreground"], maps.dark)),
    "#000000",
  );
  assert.throws(() => evaluateColor("var(--missing)"), /Unknown CSS color/);
  assert.throws(
    () => evaluateColor("var(--a)", { a: "var(--b)", b: "var(--a)" }),
    /Cyclic CSS color/,
  );
  assert.throws(
    () => evaluateColor("hsl(10 50% 50%)"),
    /Unsupported CSS color/,
  );
  for (const invalid of [
    "oklch(1deg 0 0)",
    "oklch(1 0 10%)",
    "oklch(1 0 invalid)",
    "oklch(1 0 0 / 1 / 0)",
  ]) {
    assert.throws(() => evaluateColor(invalid));
  }
  assert.throws(
    () => evaluateColor("color-mix(in srgb, #ffffff, #000000)"),
    /Unsupported color-mix/,
  );
  assert.throws(
    () => evaluateColor("color-mix(in oklch, #ffffff 0%, #000000 0%)"),
    /Invalid color-mix/,
  );
  const mapped = nativeHex({ l: 0.6, c: 0.8, h: 30, alpha: 1 });
  assert.match(mapped, /^#[0-9a-f]{6}$/);
  assert.equal(mapped, nativeHex({ l: 0.6, c: 0.8, h: 30, alpha: 1 }));
  const recovered = hexColor(mapped);
  close(recovered.l, 0.6, 0.005);
  close(recovered.h, 30, 1);
  assert(recovered.c > 0.1 && recovered.c < 0.8);
});

test("native palettes preserve every canonical Web role and metadata byte-for-byte", async () => {
  const contract = JSON.parse(
    await readFile(path.join(directory, "appearance.snapshot.json"), "utf8"),
  );
  assert.deepEqual(
    Object.keys(nativePalettes),
    contract.palettes.map((preset) => preset.value),
  );
  assert.deepEqual(
    nativePaletteOptions,
    contract.palettes.map(({ value, label, swatches }) => ({
      value,
      label,
      swatches,
    })),
  );
  const camel = (role) =>
    role.replace(/-([a-z])/g, (_, character) => character.toUpperCase());
  for (const preset of contract.palettes) {
    for (const scheme of ["light", "dark"]) {
      for (const role of contract.semanticRoles)
        assert.equal(
          nativePalettes[preset.value][scheme][camel(role)],
          preset.modes[scheme][role],
        );
      assert.equal(
        nativePalettes[preset.value][scheme].elevated,
        preset.modes[scheme]["surface-elevated"],
      );
    }
  }
  assert.deepEqual(nativeRadiusPreferences, {
    none: 0,
    subtle: 4,
    medium: 8,
    rounded: 12,
    large: 24,
  });
  assert.equal(nativeTouchTarget, 48);
});

test("color pairs have readable measured contrast without altering the canonical presets", async () => {
  close(contrastRatio("#ffffff", "#000000"), 21);
  close(contrastRatio("#000000", "#ffffff"), 21);
  close(contrastRatio("#123456", "#123456"), 1);
  assert.throws(() => contrastRatio("#ffffff80", "#000000"), /opaque colors/);
  const receipt = JSON.parse(
    await readFile(path.join(directory, "native.provenance.json"), "utf8"),
  );
  assert.equal(receipt.contrast.pairsChecked, 264);
  assert.deepEqual(receipt.contrast.failures, []);
  for (const modes of [nativeColors, ...Object.values(nativePalettes)]) {
    for (const colors of Object.values(modes)) {
      for (const [foreground, background] of [
        ["foreground", "background"],
        ["primaryForeground", "primary"],
        ["mutedForeground", "muted"],
        ["successForeground", "success"],
        ["destructiveForeground", "destructive"],
      ]) {
        assert(contrastRatio(colors[foreground], colors[background]) >= 4.5);
      }
    }
  }
});

test("runtime data is deeply immutable and has no framework, CSS or Node import", async () => {
  assert.throws(() => {
    nativeColors.dark.primary = "#ffffff";
  }, TypeError);
  assert.throws(() => {
    nativePaletteOptions[0].swatches[0] = "#ffffff";
  }, TypeError);
  assert(Object.isFrozen(nativePalettes["arctic-cyan"].dark));
  const source = await readFile(path.join(directory, "native.js"), "utf8");
  assert.doesNotMatch(
    source,
    /\bimport\s|\brequire\s*\(|\bnode:|\b(?:document|window)\b|react-native/,
  );
  assert.equal(
    nativeTokenSource.cssSha256,
    hash(await readFile(path.join(directory, "tokens.css"))),
  );
});

test("generation is deterministic, fresh and reproducible in an independent mirror", async () => {
  const first = await nativeArtifacts();
  const second = await nativeArtifacts();
  assert.deepEqual([...first], [...second]);
  assert.equal(await generateNative({ check: true }), 4);
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "pycolors-native-tokens-"),
  );
  try {
    for (const name of [
      "tokens.css",
      "native.scales.json",
      "appearance.snapshot.json",
      "native.js",
      "native.d.ts",
      "native.provenance.json",
      "scripts",
    ]) {
      await cp(path.join(directory, name), path.join(temporary, name), {
        recursive: true,
      });
    }
    assert.equal(
      await generateNative({
        check: true,
        directory: temporary,
      }),
      4,
    );
    await writeFile(path.join(temporary, "native.js"), "// stale output\n");
    await assert.rejects(
      generateNative({
        check: true,
        directory: temporary,
      }),
      /Stale native token artifact/,
    );
    await generateNative({
      directory: temporary,
    });
    await writeFile(
      path.join(temporary, "tokens.css"),
      (await readFile(path.join(temporary, "tokens.css"), "utf8")).replace(
        "oklch(0.49 0.23 292)",
        "oklch(0.48 0.23 292)",
      ),
    );
    await assert.rejects(
      generateNative({
        check: true,
        directory: temporary,
      }),
      /Stale native token artifact/,
    );
    await assert.rejects(
      generateNative({
        directory: temporary,
        canonicalAppearancePath: path.join(temporary, "missing-canonical.json"),
      }),
      /ENOENT/,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
