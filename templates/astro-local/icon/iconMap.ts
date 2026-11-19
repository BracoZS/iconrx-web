import type { IconName } from "./icons";

export type { IconName };

export type IconData = {
  attrs: Record<string, string>;
  innerHTML: string;
};

// Cambia esta ruta si guardas tus .svg en otra carpeta (por defecto: src/assets/icons)
const rawIcons = import.meta.glob("/src/assets/icons/**/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

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

  // Regla inteligente: ¿tiene fill o stroke? Usarlo; si no, fallback a currentColor / none
  if (!attrs.fill) {
    attrs.fill = attrs.stroke ? "none" : "currentColor";
  }

  const innerHTML = cleaned.replace(/<svg\b[^>]*>|<\/svg>/gi, "").trim();

  return { attrs, innerHTML };
}

export const iconMap: Record<string, IconData> = Object.fromEntries(
  Object.entries(rawIcons).map(([path, svg]) => {
    const normalizedPath = path.replace(/\\/g, "/");
    const name = normalizedPath
      .replace(/^.*\/icons\//, "")
      .replace(/\.svg$/i, "");

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

// En modo DEV, actualiza ./icons.d.ts en esta misma carpeta con los nombres reales de los SVGs
if (import.meta.env.DEV && typeof process !== "undefined" && process.versions?.node) {
  Promise.all([import("node:fs"), import("node:url"), import("node:path")]).then(
    ([fs, url, path]) => {
      try {
        const dtsPath = import.meta.url.startsWith("file:")
          ? url.fileURLToPath(new URL("./icons.d.ts", import.meta.url))
          : path.resolve(process.cwd(), import.meta.url.replace(/^\//, ""), "../icons.d.ts");

        const names = Object.keys(iconMap).sort();
        const union = names.length
          ? names.map((n) => JSON.stringify(n)).join(" | ")
          : "string";

        const content = [
          "// Auto-generado en modo DEV por iconMap.ts",
          `export type IconName = ${union};`,
          "",
        ].join("\n");

        const current = fs.existsSync(dtsPath) ? fs.readFileSync(dtsPath, "utf-8") : "";
        if (current !== content) {
          fs.writeFileSync(dtsPath, content, "utf-8");
        }
      } catch {
        // Ignorar silenciosamente si el entorno no permite escritura
      }
    }
  );
}
