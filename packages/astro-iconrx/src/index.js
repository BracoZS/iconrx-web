import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULTS } from "iconrx";
import { FALLBACK_ICON, autoFetchIcon, loadIcons, writeTypes } from "./core.js";

const VIRTUAL_ID = "virtual:iconrx";
const RESOLVED_ID = "\0" + VIRTUAL_ID;
const ENDPOINT = "/__iconrx_autofetch";

/** Reads the "iconrx" field from the project's package.json (shared with the CLI). */
function readPackageConfig(/** @type {string} */ root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")).iconrx ?? {};
  } catch {
    return {};
  }
}

/**
 * Source code of `virtual:iconrx`. In build it only contains static icon data.
 * @param {Record<string, import("./core.js").IconData>} icons
 * @param {{ dir: string, absDir: string, set: string, size: string | number, autoFetch: boolean, ssr: boolean }} o
 */
function virtualModule(icons, o) {
  const download = !o.autoFetch
    ? "null"
    : o.ssr
      ? `autoFetchIcon(${JSON.stringify(o.absDir)}, name, ${JSON.stringify(o.set)})`
      : `fetch(${JSON.stringify(ENDPOINT + "?name=")} + encodeURIComponent(name)).then(() => null, () => null)`;

  return `${o.autoFetch && o.ssr ? `import { autoFetchIcon } from "astro-iconrx/core";` : ""}
export const iconMap = ${JSON.stringify(icons)};
export const fallback = ${JSON.stringify(FALLBACK_ICON)};
export const iconrxConfig = ${JSON.stringify({ dir: o.dir, size: o.size })};
const prefix = ${JSON.stringify(o.set + ":")};

// "lucide:menu" -> "menu" (default set), "tabler:bolt" -> "tabler/bolt" (subfolder).
function find(name) {
  if (name.startsWith(prefix)) name = name.slice(prefix.length);
  return iconMap[name] ?? iconMap[name.replace(":", "/")];
}

// Returns the icon data, or a promise when it has to be downloaded (dev only).
function lookup(name) {
  name = String(name ?? "");
  return name ? find(name) ?? ${download} : null;
}

export async function getIcon(name) {
  return (await lookup(name)) ?? null;
}

export function getIconSync(name) {
  const icon = lookup(name);
  return icon instanceof Promise ? null : icon ?? null;
}
`;
}

/** @param {import("./index").IconRxOptions} [options] @returns {import("astro").AstroIntegration} */
export default function iconrx(options = {}) {
  return {
    name: "astro-iconrx",
    hooks: {
      "astro:config:setup": ({ config, command, updateConfig }) => {
        const root = fileURLToPath(config.root);
        // Priority: astro.config options -> package.json "iconrx" -> defaults.
        const pkg = readPackageConfig(root);
        const dir = options.dir ?? pkg.dir ?? DEFAULTS.dir;
        const set = options.set ?? pkg.set ?? DEFAULTS.set;
        const size = options.size ?? pkg.size ?? DEFAULTS.size;
        const autoFetch = (options.autoFetch ?? true) && command === "dev";

        const absDir = path.resolve(root, dir.replace(/^[\\/]+/, ""));
        writeTypes(absDir);

        updateConfig({
          vite: {
            plugins: [
              {
                name: "vite-plugin-astro-iconrx",
                resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
                load(id, opts) {
                  if (id !== RESOLVED_ID) return;
                  return virtualModule(loadIcons(absDir), {
                    dir,
                    absDir,
                    set,
                    size,
                    autoFetch,
                    ssr: Boolean(opts?.ssr),
                  });
                },
                configureServer(server) {
                  // Lets client-side islands (Svelte) request missing icons.
                  if (autoFetch) {
                    server.middlewares.use(ENDPOINT, async (req, res) => {
                      const name = new URL(req.url ?? "", "http://localhost").searchParams.get("name");
                      if (name) await autoFetchIcon(absDir, name, set);
                      res.statusCode = 204;
                      res.end();
                    });
                  }

                  // Any .svg added/removed/edited: refresh types and the icon module.
                  const onChange = (/** @type {string} */ file) => {
                    if (!file.toLowerCase().endsWith(".svg")) return;
                    writeTypes(absDir);
                    const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
                    if (mod) server.moduleGraph.invalidateModule(mod);
                  };

                  server.watcher.add(absDir);
                  server.watcher.on("add", onChange);
                  server.watcher.on("unlink", onChange);
                  server.watcher.on("change", onChange);
                },
              },
            ],
          },
        });
      },
    },
  };
}
