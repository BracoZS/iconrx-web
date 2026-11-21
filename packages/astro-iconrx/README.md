# astro-iconrx

Lightweight SVG icon integration for **Astro**:

- **Your `.svg` files live in your project** (no huge `@iconify-json/*` packages in `node_modules`).
- **Auto-download in `astro dev`**: use `<Icon name="flame" />` without `flame.svg` and it's downloaded from Iconify into your icons folder.
- **100% static in `astro build`**: no network calls and no `node:fs` in production.
- **Outline + fill handling**, **automatic a11y**, **`1em` sizing by default** and **TypeScript autocomplete**.
- Works with the [`iconrx`](https://www.npmjs.com/package/iconrx) CLI (`npx iconrx add menu`).

## Install

```bash
pnpm astro add astro-iconrx
```

That's it. It adds the integration to your `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import iconrx from "astro-iconrx";

export default defineConfig({
  integrations: [iconrx()],
});
```

## Options (all optional)

```js
iconrx({
  dir: "src/assets/icons", // where your .svg files live
  set: "lucide",           // Iconify set used when no prefix is given
  size: "1em",             // default icon size ("1.5rem", "24px", 24)
  autoFetch: true,         // auto-download missing icons in `astro dev`
})
```

Missing options are read from the `"iconrx"` field in your `package.json` (the same one the CLI uses, see `npx iconrx init`), so you can configure both in one place:

```json
{
  "iconrx": { "dir": "src/icons", "set": "tabler" }
}
```

Priority: `astro.config` options → `package.json` → defaults.

## Usage

### `.astro` files
```astro
---
import { Icon } from "astro-iconrx/components";
---

<!-- From your default set ("lucide") -> src/assets/icons/flame.svg -->
<Icon name="flame" />

<!-- From another set -> src/assets/icons/simple-icons/astro.svg -->
<Icon name="simple-icons:astro" />

<!-- Accessible icon (adds role="img" and <title>) -->
<Icon name="alert-triangle" title="Warning" />
```

### Sizing

By default icons are `1em`, so they scale with the surrounding text (like an emoji). Override it when needed:

```astro
<Icon name="user" size={24} />          <!-- number = px -->
<Icon name="user" size="1.5rem" />      <!-- any CSS value -->
<Icon name="user" class="size-6" />     <!-- or CSS / Tailwind -->
```

### Svelte 5 islands
```svelte
<script lang="ts">
  import Icon from "astro-iconrx/svelte";
  let open = $state(false);
</script>

<button onclick={() => (open = !open)}>
  <Icon name={open ? "x" : "burger"} size={24} />
</button>
```

## SSR (`output: "server"`) & dynamic names

In `astro build` (including `output: "server"`), every `.svg` in your icons folder is bundled statically—there are no network calls and no `node:fs` at runtime, so it works on any adapter (Node, Vercel, Cloudflare, etc.).

If you pass **dynamic icon names at runtime** (e.g. from a CMS or database: `<Icon name={item.icon} />`), make sure all possible `.svg` files are already in your icons folder **before building** (downloaded during `astro dev`). Any icon not present at build time will render the fallback icon in production instead of fetching from Iconify.

## Autocomplete tip (VS Code)

VS Code doesn't show suggestions inside strings by default. Press `Ctrl+Space` inside `name=""`, or add this to your settings:

```json
"[astro]": { "editor.quickSuggestions": { "strings": "on" } }
```
