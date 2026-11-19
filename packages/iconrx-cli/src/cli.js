#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import {
  DEFAULTS,
  POPULAR_SETS,
  downloadIcon,
  fetchCollections,
  filterCollections,
  listIcons,
  normalizeDir,
  normalizeSize,
  parseSize,
  searchIcons,
} from "./core.js";

const USE_COLOR = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const ansi = (code) => (s) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = ansi("2");
const bold = ansi("1");
const cyan = ansi("36");
const green = ansi("32");
const red = ansi("31");

class CancelledError extends Error { }

const HELP = `
${bold("iconrx")} ${dim("— download Iconify icons as local .svg files")}

${bold("Commands:")}
  add <icons...>      Download icons into your project
  search <query>      Search icons in your default set (or --all)
  list                List icons in your project
  init                Configure defaults in package.json

${bold("Options:")}
  -o, --out <path>    Output folder ${dim(`(default: ${DEFAULTS.dir})`)}
  --set <name>        Icon set to use ${dim(`(default: ${DEFAULTS.set})`)}
  --size <size>       Icon size, e.g. 24px, 1.5rem, 1em ${dim(`(default: ${DEFAULTS.size})`)}
  --as <name>         Rename icon (same as icon=name)
  -a, --all           Search across all Iconify sets
  -h, --help          Show help

${bold("Examples:")}
  npx iconrx init
  npx iconrx add menu arrow-right
  npx iconrx add lucide:menu=burger
  npx iconrx add menu --as burger
  npx iconrx search flame
  npx iconrx search flame --all
`;

const VALUE_FLAGS = { "-o": "out", "--out": "out", "--set": "set", "--size": "size" };

function parseArgs(argv) {
  const args = { positional: [], help: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const flag = eq > 0 ? arg.slice(0, eq) : arg;

    if (arg === "-h" || arg === "--help") args.help = true;
    else if (arg === "-a" || arg === "--all") args.all = true;
    else if (VALUE_FLAGS[flag]) {
      const val = eq > 0 ? arg.slice(eq + 1) : argv[++i];
      if (!val) throw new Error(`Missing value for ${flag}`);
      args[VALUE_FLAGS[flag]] = val;
    } else args.positional.push(arg);
  }
  return args;
}

/** Reads the optional "iconrx" field from package.json. */
function readPackageJson() {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    return { pkg, config: pkg.iconrx ?? {} };
  } catch {
    return { pkg: null, config: {} };
  }
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function formatStepDone(label, value) {
  return `${green("✓")} ${dim(label.padEnd(14))} ${value}`;
}

function formatCollectionRow(col, selected = false) {
  const name = truncate(col.name || col.id, 24).padEnd(24);
  const meta = col.total ? `${col.id} · ${col.total.toLocaleString("en-US")}` : col.id;
  return selected ? `${cyan(bold(name))}  ${cyan(meta)}` : `${name}  ${dim(meta)}`;
}

function formatPickedCollection(col) {
  const norm = (s) => s.toLowerCase().replace(/[-_\s]+/g, "");
  return col.name && norm(col.name) !== norm(col.id) ? `${col.id} ${dim(`(${col.name})`)}` : col.id;
}

async function add(tokens, options) {
  // "menu --as burger" -> "menu=burger"
  const specs = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const alias = token === "--as" ? tokens[++i] : token.startsWith("--as=") ? token.slice(5) : null;
    if (alias === null) specs.push(token);
    else if (alias && specs.length) specs[specs.length - 1] += `=${alias}`;
    else throw new Error('"--as" must follow an icon — e.g. npx iconrx add menu --as burger');
  }

  if (!specs.length) throw new Error("Specify at least one icon — e.g. npx iconrx add menu arrow-right");

  // Download in parallel, report in order.
  const results = await Promise.allSettled(
    specs.map((spec) => downloadIcon(options.absDir, spec, options))
  );

  let added = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      const { collection, icon, file } = result.value;
      const relPath = path.relative(process.cwd(), file).replace(/\\/g, "/");
      console.log(`${green("✓")} ${dim(`${collection}:`)}${icon}  ${dim("→")}  ${relPath}`);
      added++;
    } else {
      const msg = result.reason.message;
      const match = msg.match(/^"([^"]+)"/);
      const rawSpec = match?.[1] ?? specs[i].split("=")[0];
      const iconName = rawSpec.includes(":")
        ? rawSpec.split(":", 2)[1]
        : rawSpec.includes("/")
          ? rawSpec.split("/", 2)[1]
          : rawSpec;
      const hint = /not found/i.test(msg) && iconName ? ` ${dim(`— try: npx iconrx search ${iconName}`)}` : "";
      console.error(`${red("✗")} ${msg}${hint}`);
    }
  }
  if (!added) process.exitCode = 1;
}

async function search(terms, options, flags) {
  const rawQuery = terms.join(" ").trim();
  if (!rawQuery) throw new Error("Specify what to search for — e.g. npx iconrx search flame");

  let collection;
  let query = rawQuery;

  if (flags.all) {
    collection = undefined;
  } else if (flags.set) {
    collection = flags.set;
  } else {
    const prefixMatch = rawQuery.match(/^([a-z0-9-]+):(.+)$/i);
    if (prefixMatch) {
      collection = prefixMatch[1].toLowerCase();
      query = prefixMatch[2].trim();
    } else {
      collection = options.set;
    }
  }

  const { icons, total } = await searchIcons(query, { set: collection });
  if (!icons.length) {
    if (collection) {
      console.log(`\nNo icons found for "${query}" in ${collection}.`);
      console.log(dim(`Try all sets: npx iconrx search ${query} --all\n`));
    } else {
      console.log(`\nNo icons found for "${query}".\n`);
    }
    return;
  }

  const scope = collection ? `in ${bold(collection)}` : "across all sets";
  const countLabel =
    icons.length === total
      ? `Found ${total} ${total === 1 ? "icon" : "icons"}`
      : `Showing ${icons.length} of ${total} icons`;
  console.log(`\n${countLabel} for "${query}" ${scope}:\n`);

  icons.forEach((entry) => {
    const colon = entry.indexOf(":");
    if (colon > 0) {
      console.log(`  ${dim(entry.slice(0, colon + 1))}${entry.slice(colon + 1)}`);
    } else {
      console.log(`  ${entry}`);
    }
  });

  const first = icons[0];
  const installTarget = first.startsWith(`${options.rootSet}:`)
    ? first.slice(options.rootSet.length + 1)
    : first;
  console.log(`\nDownload with: npx iconrx add ${installTarget}`);
  if (collection) {
    console.log(dim("Tip: add --all to search across every icon set."));
  }
  console.log("");
}

async function askStep({ question, label, fallback, hint, transform, validate }) {
  let errorMsg = "";

  while (true) {
    const promptHint = hint || `Enter for ${fallback}`;
    const headerLines = [`${cyan("?")} ${bold(question)}  ${dim(`(${promptHint})`)}`];
    if (errorMsg) headerLines.push(`  ${red("!")} ${errorMsg}`);

    process.stdout.write(`${headerLines.join("\n")}\n`);
    const linesToClear = headerLines.length + 1;

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ac = new AbortController();
    let aborted = false;

    rl.on("SIGINT", () => {
      aborted = true;
      ac.abort();
      rl.close();
    });

    let answer;
    try {
      answer = await rl.question(`${cyan("›")} `, { signal: ac.signal });
    } catch (err) {
      if (aborted || err?.name === "AbortError") {
        process.stdout.write(`\x1b[${linesToClear}A\r\x1b[J`);
        throw new CancelledError();
      }
      throw err;
    } finally {
      rl.close();
    }

    const raw = answer.trim() || fallback;

    process.stdout.write(`\x1b[${linesToClear}A\r\x1b[J`);

    if (validate) {
      try {
        validate(raw);
      } catch (err) {
        errorMsg = err.message;
        continue;
      }
    }

    const value = transform ? transform(raw) : raw;
    console.log(formatStepDone(label, value));
    return value;
  }
}

function selectCollection(collections, defaultSet, { online = true } = {}) {
  const MAX_VISIBLE = 8;
  let filter = "";
  let matches = collections;
  let cursor = Math.max(0, collections.findIndex((c) => c.id === defaultSet));
  let renderedLines = 0;

  const render = (warning = "") => {
    if (renderedLines > 0) {
      process.stdout.write(`\x1b[${renderedLines}A\r\x1b[J`);
    }

    const lines = [];
    const hint = online
      ? "(↑↓ move · Enter select)"
      : "(↑↓ move · Enter select · offline, popular sets)";
    lines.push(`${cyan("?")} ${bold("Which icon set do you want to use?")}  ${dim(hint)}`);
    lines.push(`  ${dim("Search:")} ${filter || dim("type to filter...")}`);

    if (!matches.length) {
      lines.push(dim("  No matching sets — edit search or press Backspace"));
    } else {
      const half = Math.floor(MAX_VISIBLE / 2);
      const start = Math.max(0, Math.min(cursor - half, matches.length - MAX_VISIBLE));
      const end = Math.min(matches.length, start + MAX_VISIBLE);

      for (let i = start; i < end; i++) {
        const selected = i === cursor;
        const prefix = selected ? cyan("  ❯ ") : "    ";
        lines.push(`${prefix}${formatCollectionRow(matches[i], selected)}`);
      }

      const hidden = matches.length - (end - start);
      if (hidden > 0) {
        lines.push(dim(`  +${hidden} more — type to search`));
      }
    }

    if (warning) lines.push(`  ${red("!")} ${warning}`);

    process.stdout.write(`${lines.join("\n")}\n`);
    renderedLines = lines.length;
  };

  return new Promise((resolve, reject) => {
    emitKeypressEvents(process.stdin);
    process.stdin.resume();
    process.stdin.setRawMode(true);

    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const onKeypress = (str, key = {}) => {
      if (key.ctrl && key.name === "c") {
        if (renderedLines > 0) {
          process.stdout.write(`\x1b[${renderedLines}A\r\x1b[J`);
        }
        cleanup();
        reject(new CancelledError());
        return;
      }

      if (key.name === "up" || (key.ctrl && key.name === "p")) {
        if (matches.length) cursor = Math.max(0, cursor - 1);
        render();
        return;
      }

      if (key.name === "down" || (key.ctrl && key.name === "n")) {
        if (matches.length) cursor = Math.min(matches.length - 1, cursor + 1);
        render();
        return;
      }

      if (key.name === "return" || key.name === "enter") {
        if (!matches.length) {
          render("Select an icon set before pressing Enter.");
          return;
        }
        const picked = matches[cursor];
        if (renderedLines > 0) {
          process.stdout.write(`\x1b[${renderedLines}A\r\x1b[J`);
        }
        cleanup();
        console.log(formatStepDone("Icon set", formatPickedCollection(picked)));
        resolve(picked.id);
        return;
      }

      if (key.name === "escape") {
        if (filter) {
          filter = "";
          matches = collections;
          cursor = Math.max(0, collections.findIndex((c) => c.id === defaultSet));
          render();
        }
        return;
      }

      if (key.name === "backspace") {
        if (filter.length) {
          filter = filter.slice(0, -1);
          matches = filterCollections(collections, filter);
          cursor = filter ? 0 : Math.max(0, collections.findIndex((c) => c.id === defaultSet));
          render();
        }
        return;
      }

      if (str && !key.ctrl && !key.meta && str >= " ") {
        filter += str;
        matches = filterCollections(collections, filter);
        cursor = 0;
        render();
      }
    };

    process.stdin.on("keypress", onKeypress);
    render();
  });
}

function list({ dir, absDir }) {
  const names = listIcons(absDir);
  if (!names.length) {
    console.log(`\nNo icons in ${dir} yet. Download one with: npx iconrx add menu\n`);
    return;
  }

  const unit = names.length === 1 ? "icon" : "icons";
  console.log(`\n${bold(dir)} ${dim(`(${names.length} ${unit})`)}\n`);
  names.forEach((name) => console.log(`  ${name}`));
  console.log("");
}

async function loadCollectionsForInit() {
  try {
    return { collections: await fetchCollections(), online: true };
  } catch {
    return {
      collections: POPULAR_SETS.map(({ id, name }) => ({ id, name, total: 0, category: "" })),
      online: false,
    };
  }
}

async function init() {
  const { pkg, config } = readPackageJson();
  if (!pkg) throw new Error("No package.json found. Run this in your project root.");

  const defaultDir = normalizeDir(config.dir || DEFAULTS.dir);
  const defaultSet = config.set || DEFAULTS.set;
  let defaultSize = DEFAULTS.size;
  if (config.size) {
    try {
      defaultSize = normalizeSize(config.size);
    } catch {
      defaultSize = DEFAULTS.size;
    }
  }

  let dir;
  let set;
  let size;

  if (process.stdin.isTTY) {
    console.log(`\n${bold("iconrx setup")}\n`);

    dir = await askStep({
      question: "Where should icons be saved?",
      label: "Icons folder",
      fallback: defaultDir,
      hint: `Enter for ${defaultDir}`,
      transform: normalizeDir,
    });

    process.stdout.write(dim("  Loading icon sets..."));
    const { collections, online } = await loadCollectionsForInit();
    process.stdout.write("\r\x1b[K");

    set = await selectCollection(collections, defaultSet, { online });

    size = await askStep({
      question: "Default icon size?",
      label: "Icon size",
      fallback: defaultSize,
      hint: `Enter for ${defaultSize}, or e.g. 24px, 1.5rem`,
      validate: parseSize,
      transform: normalizeSize,
    });

    pkg.iconrx = { dir, set, size };
    fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

    console.log(`\n${green("All set!")} Config saved in ${bold("package.json")}.`);
    console.log(dim("Download your first icon with: npx iconrx add home\n"));
  } else {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const lines = rl[Symbol.asyncIterator]();
    const ask = async (question, fallback, hint = "") => {
      const meta = hint ? `(${fallback} · ${hint})` : `(${fallback})`;
      process.stdout.write(`${question} ${meta}: `);
      return (await lines.next()).value?.trim() || fallback;
    };

    dir = normalizeDir(await ask("Icons folder", defaultDir));
    set = await ask("Icon set", defaultSet);
    size = await ask("Icon size", defaultSize, "e.g. 24px, 1.5rem, 1em");
    rl.close();

    const { collections, online } = await loadCollectionsForInit();
    if (online && !collections.some((c) => c.id === set)) {
      const suggestions = filterCollections(collections, set.slice(0, 3))
        .slice(0, 5)
        .map((c) => c.id);
      const hint = suggestions.length ? ` Did you mean: ${suggestions.join(", ")}?` : "";
      throw new Error(`Unknown icon set "${set}".${hint}`);
    }

    size = normalizeSize(size);

    pkg.iconrx = { dir, set, size };
    fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`\n✓ Saved to package.json:\n${JSON.stringify(pkg.iconrx, null, 2)}\n`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, ...rest] = args.positional;
  if (args.help || !command) return console.log(HELP);
  if (command === "init") return init();

  // Priority: flags -> package.json "iconrx" -> defaults.
  const { config } = readPackageJson();
  const dir = normalizeDir(args.out ?? config.dir ?? DEFAULTS.dir);
  const set = args.set ?? config.set ?? DEFAULTS.set;
  const options = {
    dir,
    absDir: path.resolve(dir),
    set,
    rootSet: config.set || set,
    size: args.size ?? config.size,
  };
  if (options.size) options.size = normalizeSize(options.size);

  if (command === "add") await add(rest, options);
  else if (command === "search") await search(rest, options, args);
  else if (command === "list") list(options);
  else throw new Error(`Unknown command "${command}". Run npx iconrx --help`);
}

main().catch((err) => {
  if (err instanceof CancelledError) {
    console.log(`\n${dim("Setup cancelled.")}\n`);
    process.exitCode = 130;
    return;
  }
  console.error(`${red("✗")} ${err.message}`);
  process.exitCode = 1;
});
