# iconrx

Download [Iconify](https://iconify.design) icons (200,000+) as clean local `.svg` files. Framework-agnostic, zero dependencies.

```bash
npx iconrx add menu user arrow-right
```

## Commands

```bash
npx iconrx add <icons...>     # Download icons into your icons folder
npx iconrx search <term>      # Search icons in your default collection (or --all)
npx iconrx list               # List your local icons
npx iconrx init               # Interactive setup saved in package.json (optional)
```

## Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `-o`, `--out <path>` | Output folder | `src/assets/icons` |
| `--set <name>` | Icon set used when no prefix is given | `lucide` |
| `--size <size>` | `24px` (or `24`), `1.5rem`, `1em`, `100%`... (keeps proportions) | `1em` |
| `--as <name>` | Rename icon (same as `icon=name`) | |
| `-a`, `--all` | Search across all Iconify sets (`search`) | |

## Examples

```bash
# Default collection -> src/assets/icons/menu.svg
npx iconrx add menu

# Other collections go into a subfolder -> src/assets/icons/simple-icons/astro.svg
npx iconrx add simple-icons:astro tabler:bolt

# Rename -> src/assets/icons/burger.svg
npx iconrx add menu --as burger
npx iconrx add lucide:menu=burger

# Custom folder and size
npx iconrx add menu -o public/icons --size 24

# Search in default collection, another collection, or all collections
npx iconrx search flame
npx iconrx search flame --set tabler
npx iconrx search flame --all
```

## Config (optional)

Run `npx iconrx init`, or add it to your `package.json` by hand:

```json
{
  "iconrx": {
    "dir": "src/assets/icons",
    "set": "lucide",
    "size": "1.5rem"
  }
}
```

Priority: CLI flags → `package.json` → defaults.
