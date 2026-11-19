import fs from "node:fs";
import path from "node:path";

/** @typedef {{ attrs: Record<string, string>, innerHTML: string }} IconData */

export const DEFAULTS = { dir: "src/assets/icons", set: "lucide", size: "1em" };

export const POPULAR_SETS = [
  { id: "lucide", name: "Lucide" },
  { id: "tabler", name: "Tabler Icons" },
  { id: "heroicons", name: "HeroIcons" },
  { id: "ph", name: "Phosphor" },
  { id: "mdi", name: "Material Design Icons" },
  { id: "material-symbols", name: "Material Symbols" },
  { id: "solar", name: "Solar" },
  { id: "ri", name: "Remix Icon" },
  { id: "mingcute", name: "MingCute Icon" },
  { id: "hugeicons", name: "Huge Icons" },
  { id: "simple-icons", name: "Simple Icons" },
  { id: "bi", name: "Bootstrap Icons" },
  { id: "feather", name: "Feather Icon" },
  { id: "fa6-solid", name: "Font Awesome Solid" },
  { id: "octicon", name: "Octicons" },
  { id: "carbon", name: "Carbon" },
  { id: "ion", name: "IonIcons" },
];

/**
 * Normalizes a project-relative icons folder path.
 * Strips leading slashes so "/myfol" resolves inside the project instead of filesystem root.
 * @param {string} dir
 */
export function normalizeDir(dir) {
  const cleaned = String(dir ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^(?:\.\/)+/, "")
    .replace(/\/+$/, "");
  return cleaned || ".";
}

/** Removes `<?xml?>`, `<!DOCTYPE>` and comments. */
export const cleanSvg = (/** @type {string} */ raw) =>
  raw.replace(/<\?xml[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->/gi, "").trim();

/** Validates a size like `24` (-> `24px`), `32px`, `1.5rem`, `1em` or `100%`. Returns `[number, unit]`. */
export function parseSize(/** @type {string | number} */ size) {
  const match = String(size).trim().match(/^(\d*\.?\d+)(px|em|rem|%)?$/i);
  if (!match || Number(match[1]) <= 0) {
    throw new Error(`Invalid size "${size}". Use e.g. 24px, 1.5rem, or 1em`);
  }
  return [Number(match[1]), (match[2] || "px").toLowerCase()];
}

/** Normalizes a valid size to include an explicit unit (e.g. `24` -> `"24px"`, `"9"` -> `"9px"`). */
export function normalizeSize(/** @type {string | number} */ size) {
  const [num, unit] = parseSize(size);
  return `${num}${unit}`;
}

/** Sets the SVG height to `size` and scales the width to keep the icon's proportions. */
export function resizeSvg(/** @type {string} */ svg, /** @type {string | number} */ size) {
  const [num, unit] = parseSize(size);
  const [, , vw, vh] = (svg.match(/viewBox=["']([^"']+)["']/i)?.[1] ?? "0 0 1 1")
    .split(/[\s,]+/)
    .map(Number);
  const width = `${+(num * (vw / vh || 1)).toFixed(3)}${unit}`;

  return svg.replace(/<svg\b[^>]*>/i, (tag) =>
    tag
      .replace(/\s(?:width|height)=["'][^"']*["']/gi, "")
      .replace(/^<svg/i, `<svg width="${width}" height="${num}${unit}"`)
  );
}

/**
 * Parses `menu`, `tabler:bolt` or `lucide:menu=burger` (alias after "=").
 * Icons from a set other than the default one are stored in a subfolder named after the set.
 * @param {string} spec
 */
export function resolveIconSpec(spec, defaultSet = DEFAULTS.set, rootSet = defaultSet) {
  const [source, alias] = spec
    .trim()
    .split("=")
    .map((part) => part.trim().replace(/\.svg$/i, ""));

  const separator = source.includes(":") ? ":" : source.includes("/") ? "/" : null;
  const [collection, icon] = separator ? source.split(separator, 2) : [defaultSet, source];
  const cleanAlias = alias?.replace(/\\/g, "/").replace(/^\/+/, "");
  const name = cleanAlias || icon;
  const localName =
    cleanAlias?.includes("/") || collection === rootSet ? name : `${collection}/${name}`;

  return { collection, icon, localName };
}

/**
 * Downloads an icon from Iconify and saves it to `absDir`. Throws if it doesn't exist.
 * @param {string} absDir
 * @param {string} spec
 * @param {{ set?: string, rootSet?: string, size?: string | number }} [options]
 */
export async function downloadIcon(absDir, spec, { set = DEFAULTS.set, rootSet = set, size } = {}) {
  const { collection, icon, localName } = resolveIconSpec(spec, set, rootSet);
  const url = `https://api.iconify.design/${encodeURIComponent(collection)}/${encodeURIComponent(icon)}.svg`;

  const res = await fetch(url).catch((err) => {
    throw new Error(`"${collection}:${icon}" download failed (${err.cause?.code ?? err.message})`);
  });
  const text = res.ok ? await res.text() : "";
  if (!text.includes("<svg")) {
    throw new Error(`"${collection}:${icon}" not found (HTTP ${res.status})`);
  }

  const svg = size ? resizeSvg(cleanSvg(text), size) : cleanSvg(text);
  const file = path.join(absDir, `${localName}.svg`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${svg}\n`);

  return { collection, icon, localName, file, svg };
}

/** Icon names in `absDir`, including subfolders (e.g. "simple-icons/astro"). @returns {string[]} */
export function listIcons(/** @type {string} */ absDir) {
  if (!fs.existsSync(absDir)) return [];
  return fs
    .readdirSync(absDir, { recursive: true, encoding: "utf-8" })
    .filter((file) => file.toLowerCase().endsWith(".svg"))
    .map((file) => file.replace(/\\/g, "/").slice(0, -4))
    .sort();
}

/**
 * Searches Iconify. Filters to `prefix`/`set` when provided.
 * @param {string} query
 * @param {number | { limit?: number, set?: string, prefix?: string }} [options]
 * @returns {Promise<{ icons: string[], total: number }>}
 */
export async function searchIcons(query, options = {}) {
  const { limit = 20, set, prefix } =
    typeof options === "number" ? { limit: options } : options;
  const collection = prefix ?? set;
  const params = new URLSearchParams({ query, limit: String(limit) });
  if (collection) params.set("prefix", collection);

  const res = await fetch(`https://api.iconify.design/search?${params}`).catch((err) => {
    throw new Error(`Iconify request failed (${err.cause?.code ?? err.message})`);
  });
  if (!res.ok) throw new Error(`Iconify request failed (HTTP ${res.status})`);
  const { icons = [], total = icons.length } = await res.json();
  return { icons, total };
}

/**
 * Fetches available Iconify collections, with popular sets listed first.
 * @returns {Promise<Array<{ id: string, name: string, total: number, category: string }>>}
 */
export async function fetchCollections() {
  const endpoints = [
    "https://api.iconify.design/collections",
    "https://api.simplesvg.com/collections",
  ];
  let data;
  let lastErr;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!data) {
    throw new Error(`Could not fetch Iconify collections (${lastErr?.cause?.code ?? lastErr?.message})`);
  }

  const popularRank = new Map(POPULAR_SETS.map((s, i) => [s.id, i]));

  return Object.entries(data)
    .filter(([, info]) => !info?.hidden)
    .map(([id, info]) => ({
      id,
      name: info?.name ?? id,
      total: info?.total ?? 0,
      category: info?.category ?? "",
    }))
    .sort((a, b) => {
      const ra = popularRank.get(a.id) ?? Infinity;
      const rb = popularRank.get(b.id) ?? Infinity;
      if (ra !== rb) return ra - rb;
      return b.total - a.total;
    });
}

/**
 * Filters collections by id or name, prioritizing exact and prefix id matches.
 * @param {Array<{ id: string, name: string, total: number, category?: string }>} collections
 * @param {string} query
 */
export function filterCollections(collections, query) {
  const q = query.trim().toLowerCase();
  if (!q) return collections;

  const score = (c) => {
    const id = c.id.toLowerCase();
    const name = c.name.toLowerCase();
    if (id === q) return 0;
    if (id.startsWith(q)) return 1;
    if (name.startsWith(q)) return 2;
    if (id.includes(q)) return 3;
    if (name.includes(q)) return 4;
    return -1;
  };

  return collections
    .map((c, idx) => ({ c, s: score(c), idx }))
    .filter(({ s }) => s >= 0)
    .sort((a, b) => a.s - b.s || a.idx - b.idx)
    .map(({ c }) => c);
}
