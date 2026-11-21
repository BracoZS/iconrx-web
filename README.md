# IconRx Web

[![iconrx on npm](https://img.shields.io/npm/v/iconrx?label=iconrx)](https://www.npmjs.com/package/iconrx)
[![astro-iconrx on npm](https://img.shields.io/npm/v/astro-iconrx?label=astro-iconrx)](https://www.npmjs.com/package/astro-iconrx)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./packages/astro-iconrx/LICENSE)

Lightweight SVG icon tooling. Your icons live as real, clean `.svg` files in your project: no huge `@iconify-json/*` packs in `node_modules`.

| Package | What it does | Install / Use |
| :--- | :--- | :--- |
| [`iconrx`](./packages/iconrx-cli) | Framework-agnostic CLI: search and download 200,000+ Iconify icons as local `.svg` files | `npx iconrx add icon-name` |
| [`astro-iconrx`](./packages/astro-iconrx) | Astro integration + `<Icon />` component (Astro and Svelte 5), auto-download in dev, TS autocomplete | `pnpm astro add astro-iconrx` |
| [`astro-local/icon`](./templates/astro-local/icon) | Copy-paste version: self-contained `icon/` folder, no integration | Drop into `src/components/icon/` |

## Quick start

### Any framework — CLI only (`iconrx`)

Download `.svg` files directly into any project (React, Vue, Svelte, HTML, etc.):

```bash
npx iconrx add menu user simple-icons:astro
```

### With Astro (`astro-iconrx`)

Install the integration and use `<Icon />` — missing icons auto-download in `astro dev`:

```bash
pnpm astro add astro-iconrx
```

```astro
---
import { Icon } from "astro-iconrx/components";
---

<Icon name="menu" size={24} />
<Icon name="simple-icons:astro" />
```

Inside Svelte 5 islands:

```svelte
<script lang="ts">
  import Icon from "astro-iconrx/svelte";
</script>

<Icon name="menu" class="size-6" />
```

### Drop-in template (`astro-local/icon`)

Prefer zero dependencies? Copy [`templates/astro-local/icon`](./templates/astro-local/icon) into `src/components/icon/`, add `.svg` files with `npx iconrx add`, and import directly:

```astro
---
import Icon from "@/components/icon/Icon.astro"; // or Icon.svelte
---

<Icon name="menu" size={24} />
```

Both `iconrx` and `astro-iconrx` share the optional `"iconrx"` config in your `package.json` (`npx iconrx init`).

## License

MIT Copyright (c) 2026 BracoZS
