# @pycolors/tokens

## 1.2.2

### Patch Changes

- 217ab0b: Fix nine production-readiness blockers found in the P0 accessibility and reliability audit:
  - `Input` now visually reflects the `disabled` state instead of relying on an inert `disabled:` utility on a non-form wrapper.
  - `Input` and `Textarea` validation errors are announced live via `role="alert"`, even while the field is already focused.
  - `Input` and `Textarea` no longer let a caller-supplied `aria-invalid`/`aria-errormessage` silently override the computed error state, and a caller-supplied `aria-describedby` is now composed with the field's own helper/error ids instead of replacing them.
  - `Badge`'s `success` and `warning` variants use new, dedicated `--success-foreground` / `--warning-foreground` design tokens (added to `@pycolors/tokens`) that meet WCAG AA contrast, replacing a missing token reference and a stray conflicting text-color class.
  - `Toast` now maps `variant` to Radix's `type` prop so routine `default`/`success` toasts announce politely and only `warning`/`destructive` toasts interrupt assertively; an explicit `type` prop still overrides the default.
  - `TableHead` now defaults to `scope="col"`, overridable with an explicit `scope` (including `"row"`).
  - `Skeleton`'s `aria-hidden="true"` can no longer be silently overridden by a passed-through prop, and its pulse animation now respects `prefers-reduced-motion`.
  - Added an axe-core-based accessibility test suite (`vitest-axe`) covering `Input`, `Textarea`, `Badge`, `Toast`, `Table`, and `Skeleton`, plus regression tests for every fix above.

  Also restores `Card`'s compatibility with React Server Components and static prerendering:
  - `Card` no longer synthesizes an `onKeyDown` handler or injects `role`/`tabIndex` during render. A Server Component can never pass a function prop across the RSC boundary, so the previous implementation broke `next build` for _any_ page that rendered a `Card` from a Server Component (not only `interactive` ones) — this was the root cause of a `pnpm --filter pycolors-marketing build` prerender failure.
  - `interactive` is now purely visual (cursor, hover background, focus-visible ring). Real keyboard/focus/click semantics come from composing `asChild` with a real `<button>` (actions) or a real `<a>`/`Link` (navigation) — both already provide correct behavior natively, so Card no longer needs to recreate it.
  - Migrated the docs' interactive-card examples to the `asChild` + real-element pattern and corrected the accessibility guidance that previously (and incorrectly) claimed a bare `Card interactive` was keyboard-operable on its own.

  All changes are additive or internal; no public props, exports, or types were renamed or removed. `Card`'s `interactive` behavior is a correctness fix (it never reliably worked for Server Components) rather than a new breaking change.

  `@pycolors/tokens` receives the new `--success-foreground` and `--warning-foreground` custom properties (light and dark) and their Tailwind v4 `@theme inline` bridges described above — an additive, backward-compatible token addition.

## 1.2.0

### Minor Changes

- 8ce7ed6: Improve border radius token system with scalable relative sizing.

  Replace fixed pixel radius values with relative rem-based calculations
  driven by a base radius variable for better consistency and scalability.

## 1.1.0

### Minor Changes

- 91e32a3: Introduce a new premium SaaS platform token architecture with:
  - refined semantic surface tokens
  - improved border hierarchy and contrast
  - softer premium shadow system
  - violet-first brand foundation
  - platform, success, and accent semantic color roles
  - improved dark mode consistency
  - new Tailwind v4 theme mappings
  - production-oriented SaaS UI foundations

## 1.0.0

### Patch Changes

- a9672fe: chore: update internal apps to use tokens v1

## 0.3.0

### Minor Changes

- 663af29: Introduce the first public version of @pycolors/tokens.

  Provides semantic CSS design tokens with light and dark themes, built to serve as the foundation of the PyColors design system.

  Includes:
  - semantic color variables
  - radius scale
  - dark mode support
  - Tailwind v4 bridge via @theme inline

  This package establishes the visual contract across the PyColors ecosystem (UI, marketing, starters, SaaS templates).

## 0.2.0

### Minor Changes

- Introduce the first public version of @pycolors/tokens.
  Provides semantic CSS design tokens with light and dark themes, built to serve as the foundation of the PyColors design system.
  Includes:
  - semantic color variables
  - radius scale
  - dark mode support
  - Tailwind v4 bridge via @theme inline
