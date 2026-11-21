import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULTS } from "iconrx";
import {
  FALLBACK_ICON,
  autoFetchIcon,
  buildTypesContent,
  clearAutoFetchCache,
  loadIcons,
  writeTypesFile,
} from "./core.js";

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

/** Checks whether `file` is inside `dir`. */
function isInDir(/** @type {string} */ dir, /** @type {string} */ file) {
  const rel = path.relative(dir, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Source code of `virtual:iconrx`. In build it only contains static icon data.
 * @param {Record<string, import("./core.js").IconData>} icons
 * @param {{ dir: string, absDir: string, set: string, size: string | number, autoFetch: boolean, ssr: boolean }} o
 */
function virtualModule(icons, o) {
  const clientAutoFetch = o.autoFetch && !o.ssr;
  const download = !o.autoFetch
    ? "null"
    : o.ssr
      ? `autoFetchIcon(${JSON.stringify(o.absDir)}, name, ${JSON.stringify(o.set)})`
      : `requestIcon(name)`;

  return `${o.autoFetch && o.ssr ? `import { autoFetchIcon } from "astro-iconrx/core";` : ""}
export const iconMap = ${JSON.stringify(icons)};
export const fallback = ${JSON.stringify(FALLBACK_ICON)};
export const iconrxConfig = ${JSON.stringify({ dir: o.dir, size: o.size })};
const prefix = ${JSON.stringify(o.set + ":")};
${
  clientAutoFetch
    ? `const pending = new Set();
function requestIcon(name) {
  if (!pending.has(name)) {
    pending.add(name);
    fetch(${JSON.stringify(ENDPOINT + "?name=")} + encodeURIComponent(name)).catch(() => {});
  }
  return null;
}`
    : ""
}
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

/** Invalidates `virtual:iconrx` across all Vite environments (Vite 5 and Vite 6+ Environment API). */
function invalidateVirtualModule(/** @type {any} */ server) {
  if (server.environments) {
    for (const env of Object.values(server.environments)) {
      const mod = env.moduleGraph?.getModuleById(RESOLVED_ID);
      if (mod) env.moduleGraph.invalidateModule(mod);
    }
    return;
  }

  const mod = server.moduleGraph?.getModuleById(RESOLVED_ID);
  if (mod) server.moduleGraph.invalidateModule(mod);
}

/** @param {import("./index.js").IconRxOptions} [options] @returns {import("astro").AstroIntegration} */
export default function iconrx(options = {}) {
  let absDir = "";
  let typesFilePath = "";

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
        const autoFetch = (options.autoFetch ?? pkg.autoFetch ?? true) && command === "dev";

        absDir = path.resolve(root, dir.replace(/^[\\/]+/, ""));

        const refresh = (/** @type {any} */ server, reloadClient = false) => {
          if (typesFilePath) writeTypesFile(typesFilePath, absDir);
          invalidateVirtualModule(server);
          if (reloadClient) {
            server.ws.send({ type: "full-reload", path: "*" });
          }
        };

        updateConfig({
          vite: {
            ssr: {
              noExternal: ["astro-iconrx"],
            },
            optimizeDeps: {
              exclude: ["astro-iconrx", "virtual:iconrx"],
            },
            plugins: [
              {
                name: "vite-plugin-astro-iconrx",
                resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
                load(id, opts) {
                  if (id !== RESOLVED_ID) return;
                  const ssr = Boolean(
                    opts?.ssr || this?.environment?.config?.consumer === "server"
                  );
                  return virtualModule(loadIcons(absDir), {
                    dir,
                    absDir,
                    set,
                    size,
                    autoFetch,
                    ssr,
                  });
                },
                configureServer(server) {
                  // Lets client-side islands (Svelte) request missing icons.
                  if (autoFetch) {
                    server.middlewares.use(ENDPOINT, async (req, res) => {
                      const name = new URL(req.url ?? "", "http://localhost").searchParams.get(
                        "name"
                      );
                      if (name) {
                        const downloaded = await autoFetchIcon(absDir, name, set);
                        if (downloaded) {
                          server.watcher.add(absDir);
                          refresh(server, true);
                        }
                      }
                      res.statusCode = 204;
                      res.end();
                    });
                  }

                  // Any .svg added/removed/edited in absDir: refresh types and the icon module.
                  const onChange = (/** @type {string} */ file, isUnlink = false) => {
                    if (!file.toLowerCase().endsWith(".svg") || !isInDir(absDir, file)) return;
                    if (isUnlink) clearAutoFetchCache();
                    refresh(server, true);
                  };

                  server.watcher.add(absDir);
                  server.watcher.on("add", (file) => onChange(file));
                  server.watcher.on("unlink", (file) => onChange(file, true));
                  server.watcher.on("change", (file) => onChange(file));
                },
              },
            ],
          },
        });
      },

      "astro:config:done": ({ injectTypes }) => {
        if (typeof injectTypes === "function" && absDir) {
          const url = injectTypes({
            filename: "icons.d.ts",
            content: buildTypesContent(absDir),
          });
          typesFilePath = fileURLToPath(url);
        }
      },
    },
  };
}
