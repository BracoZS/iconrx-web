export type { IconName } from "./icons";

export type IconData = {
  attrs: Record<string, string>;
  innerHTML: string;
};

// Change this path if you store your .svg files in another folder (default: src/assets/icons)
const rawIcons = import.meta.glob<string>("/src/assets/icons/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const ALLOWED_SVG_ATTRS = new Set([
  "viewBox",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
]);

function parseSvg(raw: string): IconData {
  const cleaned = raw
    .replace(/<\?xml[\s\S]*?\?>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const svgTagMatch = cleaned.match(/<svg\b([^>]*)>/i);
  const rawAttrs = svgTagMatch?.[1] ?? "";

  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  for (const match of rawAttrs.matchAll(attrRegex)) {
    const key = match[1];
    const value = match[2] ?? match[3] ?? "";
    if (ALLOWED_SVG_ATTRS.has(key)) {
      attrs[key] = value;
    } else if (key.toLowerCase() === "viewbox") {
      attrs.viewBox = value;
    }
  }

  if (!attrs.viewBox) {
    attrs.viewBox = "0 0 24 24";
  }

  // Smart rule: has fill or stroke? Use it; otherwise, fall back to currentColor / none
  if (!attrs.fill) {
    attrs.fill = attrs.stroke ? "none" : "currentColor";
  }

  // Basic cleanup for downloaded SVGs (not a full sanitizer for untrusted user input)
  const innerHTML = cleaned
    .replace(/<svg\b[^>]*>|<\/svg>/gi, "")
    .replace(/<script\b[^>]*\/>|<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/\s(?:xlink:)?href\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "")
    .trim();

  return { attrs, innerHTML };
}

export const iconMap: Record<string, IconData> = Object.fromEntries(
  Object.entries(rawIcons).map(([path, svg]) => {
    const name = path.split(/[\\/]/).pop()!.replace(/\.svg$/i, "");
    return [name, parseSvg(svg)];
  })
);

export const fallback: IconData = {
  attrs: {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "red",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  },
  innerHTML: `<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>`,
};

// In DEV mode, updates ./icons.d.ts in this same folder with the actual SVG names
if (
  import.meta.env.DEV &&
  import.meta.env.SSR &&
  typeof process !== "undefined" &&
  process.versions?.node
) {
  Promise.all([
    import(/* @vite-ignore */ "node:fs"),
    import(/* @vite-ignore */ "node:url"),
    import(/* @vite-ignore */ "node:path"),
  ])
    .then(([fs, url, path]) => {
      const dtsPath = import.meta.url.startsWith("file:")
        ? url.fileURLToPath(new URL("./icons.d.ts", import.meta.url))
        : path.resolve(process.cwd(), import.meta.url.replace(/^\//, ""), "../icons.d.ts");

      const names = Object.keys(iconMap).sort();
      const union = names.length
        ? names.map((n) => JSON.stringify(n)).join(" | ")
        : "string";

      const content = [
        "// Auto-generated in DEV mode by iconMap.ts",
        `export type IconName = ${union};`,
        "",
      ].join("\n");

      const current = fs.existsSync(dtsPath) ? fs.readFileSync(dtsPath, "utf-8") : "";
      // Only write when changed to avoid triggering a file watcher loop
      if (current !== content) {
        fs.writeFileSync(dtsPath, content, "utf-8");
      }
    })
    .catch(() => {
      // Silently ignore if the environment does not allow writing
    });
}
