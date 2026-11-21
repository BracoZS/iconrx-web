# astro-local (copy-paste)

Self-contained Astro `<Icon />` component with zero dependencies.

## Usage

1. Copy the [`icon/`](./icon) folder into your Astro project (for example `src/components/icon/`):
   ```bash
   npx degit <your-user>/<your-repo>/templates/astro-local/icon src/components/icon
   ```
2. Put your `.svg` files in `src/assets/icons/` (by pasting them or using `npx iconrx add menu`). You can change that path in `import.meta.glob` inside `iconMap.ts`.
3. Import and use `<Icon />` in `.astro` or `.svelte` files:
   ```astro
   ---
   import Icon from "../components/icon/Icon.astro";
   ---
   <Icon name="menu" size={24} />
   ```

> When running `astro dev`, `icons.d.ts` updates automatically to give you TypeScript autocomplete for your `.svg` files.

## Tip: Optimize your SVGs

You can clean up and shrink your downloaded SVGs with SVGO:

```bash
npx svgo -f src/assets/icons
```