# IconRx

Lightweight SVG icon tooling. Your icons live as real, clean `.svg` files in your project: no huge `@iconify-json/*` packs in `node_modules`.

| Package | What it does | Use it |
| :--- | :--- | :--- |
| [`iconrx`](./packages/iconrx-cli) | Framework-agnostic CLI: search and download 200,000+ Iconify icons as local `.svg` files | `npx iconrx add menu` |
| [`astro-iconrx`](./packages/astro-iconrx) | Astro integration + `<Icon />` component (Astro and Svelte), auto-download in dev, TS autocomplete | `pnpm astro add astro-iconrx` |
| [`astro-local/icon`](./templates/astro-local/icon) | Copy-paste version: self-contained `icon/` folder, no integration | Drop into `src/components/icon/` |

## Quick start (Astro)

```bash
pnpm astro add astro-iconrx
npx iconrx add menu user simple-icons:astro
```

```astro
---
import { Icon } from "astro-iconrx/components";
---

<Icon name="menu" size={24} />
<Icon name="simple-icons:astro" />
```

Both packages share the optional `"iconrx"` config in your `package.json` (`npx iconrx init`).

## License

MIT
