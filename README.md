# @pycolors/tokens

> Production-ready CSS design tokens for building consistent, scalable,
> and modern interfaces across the PyColors ecosystem.

[![npm
version](https://img.shields.io/npm/v/@pycolors/tokens)](https://www.npmjs.com/package/@pycolors/tokens)
[![license](https://img.shields.io/npm/l/@pycolors/tokens)](LICENSE)

------------------------------------------------------------------------

## ✨ Why @pycolors/tokens?

Design tokens are the **foundation of a scalable design system**.

This package provides:

-   🎨 Light + dark themes out of the box
-   🧠 Semantic color variables (`--background`, `--primary`, etc.)
-   ⚡ Tailwind v4 bridge via `@theme inline`
-   🧱 Stable primitives for apps, SaaS, templates, and UI kits
-   🔁 Single source of truth across your monorepo

Perfect for **Next.js**, **React**, **SaaS starters**, and **design
systems**.

------------------------------------------------------------------------

## 📦 Install

``` bash
pnpm add @pycolors/tokens
# or
npm install @pycolors/tokens
# or
yarn add @pycolors/tokens
```

------------------------------------------------------------------------

## 🚀 Quick Start

### Import the tokens CSS

#### Next.js (App Router)

Add to `app/globals.css`:

``` css
@import "@pycolors/tokens/tokens.css";
```

#### Next.js (Pages Router)

``` ts
import "@pycolors/tokens/tokens.css";
```

#### Vite / React

``` ts
import "@pycolors/tokens/tokens.css";
```

You're done ✅\
All semantic variables are now available globally.

------------------------------------------------------------------------

## 🌙 Dark Mode

Tokens rely on a `.dark` class strategy.

``` html
<html class="dark">
```

Toggle it manually or via your theme provider.

------------------------------------------------------------------------

## 🧩 What's Inside

### Core tokens

-   Radius scale
-   Background / foreground
-   Card / popover
-   Primary / secondary
-   Muted / accent
-   Destructive
-   Border / ring

### Dark theme override

Automatic semantic inversion using:

``` css
.dark { ... }
```

### Tailwind v4 Bridge

The package exposes tokens directly to Tailwind:

``` css
@theme inline {
  --color-background: var(--background);
}
```

No extra config required.

------------------------------------------------------------------------

## 🏗 Recommended Architecture

For monorepos:

    packages/
       tokens   ← single source of truth
    apps/
       marketing
       saas
       docs

Avoid redefining colors inside apps --- import tokens instead.

👉 This prevents **design drift** as your product ecosystem scales.

------------------------------------------------------------------------

## 🔄 Versioning

This package follows **Semantic Versioning**:

-   `0.x` → iteration phase (breaking changes possible)
-   `1.0.0` → API stability guaranteed
-   Minor → new tokens
-   Patch → fixes / adjustments

------------------------------------------------------------------------

## 🧠 Pro Tip

Treat tokens as **infrastructure**, not styling.

Most teams refactor tokens too late ---\
high-performing teams centralize them early.

------------------------------------------------------------------------

⚠️ This package is currently in early release (0.x).
Breaking changes may occur until version 1.0.

------------------------------------------------------------------------

## 📄 License

MIT
