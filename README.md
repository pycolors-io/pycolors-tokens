# @pycolors/tokens

Shared CSS design tokens and framework-independent native data for PyColors.
The CSS entry point keeps its existing light/dark and Tailwind v4 behavior.
The additive native entry point is prepared for the next minor release;
publication remains a maintainer action.

## CSS usage

```sh
pnpm add @pycolors/tokens
```

Import the stylesheet from your application CSS:

```css
@import "@pycolors/tokens/tokens.css";
```

Toggle a `.dark` class on the document root to select the dark variables.
The stylesheet includes semantic colors, surfaces, borders, radii and the
Tailwind v4 `@theme inline` bridge. Its source values are unchanged by the
addition of native data.

## Native usage

`@pycolors/tokens/native` is an ESM data module with TypeScript declarations.
It imports no React, React Native, DOM, CSS, Node or application runtime.
It does not install fonts, change system settings or manage a theme provider.

```ts
import {
  nativeColors,
  nativePalettes,
  nativeRadiusPreferences,
  nativeSpacing,
  nativeTouchTarget,
  nativeTypography,
  type NativeColors,
} from "@pycolors/tokens/native";

const colors: NativeColors = {
  ...nativeColors.dark,
  ...nativePalettes.monochrome.dark,
};

const buttonStyle = {
  backgroundColor: colors.primary,
  borderRadius: nativeRadiusPreferences.subtle,
  minHeight: nativeTouchTarget,
  paddingHorizontal: nativeSpacing.lg,
  paddingVertical: nativeSpacing.sm,
};
const labelStyle = {
  ...nativeTypography.label,
  color: colors.primaryForeground,
};
```

Data is deeply frozen. Create a local copy to apply consumer overrides rather
than mutating the exported theme. Color roles are typed as strings, allowing
compatible custom palettes.

| Export                              | Contract                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `nativeColors.light`, `.dark`       | The 31 canonical semantic roles converted from `tokens.css`, in camelCase; `elevated` aliases `surfaceElevated`.                              |
| `nativePalettes[id].light`, `.dark` | Complete appearance presets with the same role names. Every preset color and foreground is preserved from the shared Web appearance contract. |
| `nativePaletteOptions`              | Palette IDs, labels and swatches for a consumer-owned selection UI.                                                                           |
| `nativeSpacing`                     | `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl`: 4, 8, 12, 16, 24, 32, 48.                                                                        |
| `nativeRadius`                      | CSS-derived base radii plus native `card`, `modal` and `pill` sizes.                                                                          |
| `nativeRadiusPreferences`           | Shared Web choices: `none: 0`, `subtle: 4`, `medium: 8`, `rounded: 12`, `large: 24`.                                                          |
| `nativeTypography`                  | `caption`, `label`, `body`, `subtitle`, `title`, `display`; each provides `fontSize`, `lineHeight`, `fontWeight`.                             |
| `nativeTouchTarget`                 | Minimum interactive target size: 48 logical units.                                                                                            |
| `nativeMotion`                      | `fast: 120`, `normal: 200`, `slow: 320` milliseconds. Consumers must honor reduced-motion preferences.                                        |
| `nativeTokenSource`                 | Input hashes, source names, color space and conversion algorithm.                                                                             |

Palette IDs are `monochrome`, `pycolors`, `lime-carbon`, `arctic-cyan`,
`coral-signal`, `indigo-ledger`, `emerald-console`, `graphite-atlas`,
`rose-atelier` and `amber-foundry`.

Public types include `NativeColors`, `NativeColorScheme` (`light | dark`),
`NativePaletteName`, `NativeRadiusPreference`, `NativeTypographyRole` and
`NativeTextStyle`. Resolving system appearance, choosing platform fonts and
retaining OS text scaling belong to the application. A rem baseline of 16 is
used for numeric radius conversion; values are native logical units, not
physical pixels.

## Sources and generation

- `tokens.css` remains the canonical public CSS source for `nativeColors`.
- In the monorepo, `config/appearance-presets.json` is the canonical public-safe
  appearance input. Generation copies it byte-for-byte to
  `appearance.snapshot.json` for the standalone public mirror.
- The snapshot is the delivered input when no monorepo exists. Its hash proves
  retained provenance, not freshness against an unavailable upstream repository.
- `native.scales.json` defines the added native spacing, typography, touch and
  motion scales. Base radii come from CSS and appearance preferences.

With Node 24, pnpm 10.32.1 and the declared development dependencies installed:

```sh
pnpm native:generate
pnpm native:check
pnpm lint
pnpm types:check
pnpm test
pnpm build
```

Do not edit `native.js`, `native.d.ts`, `native.provenance.json` or the appearance
snapshot by hand. Generation is deterministic, including formatting. The check
command fails on stale output or unsupported CSS color syntax. The package has
no runtime dependencies; Prettier and TypeScript are development tools only.

CSS aliases, OKLCH colors and the canonical OKLCH `color-mix` expressions are
resolved at generation time. Output uses sRGB `#rrggbb` and `#rrggbbaa`; alpha
is retained. Out-of-gamut colors reduce chroma at constant lightness and hue
using 28 iterations, matching the repository's color-engine approach.
This finite sRGB fallback does not promise identical wide-gamut browser output.
The equations follow [CSS Color 4](https://www.w3.org/TR/css-color-4/) and
[Oklab](https://bottosson.github.io/posts/oklab/).

The provenance file includes source/artifact SHA-256 hashes and an opaque
text/background contrast report. The current 264 measured role pairs meet
4.5:1. Transparent borders, focus visibility, state combinations and actual
native screen-reader/text-scaling behavior still require application validation.
Color contrast alone does not qualify an accessible application.

Tests cover conversion references, premultiplied alpha and hue interpolation,
unchanged preset values, generation drift, deep immutability, the real npm
tarball, independent ESM imports and strict TypeScript consumption without a
DOM or framework library.

## Source-copy delivery and license

An authorized source-copy consumer can retain `native.js`, `native.d.ts`,
`native.provenance.json` and `LICENSE`, with a producer record identifying the
exact package/source version and file hashes. Verify those hashes when copying;
there are no automatic updates. The CSS and snapshot remain available for
auditing the original inputs.

This package is [MIT licensed](./LICENSE). Preserve the copyright and permission
notice in copies or substantial portions of the package.
