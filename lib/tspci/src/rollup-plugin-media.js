import chalk from "chalk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MEDIA_ATTRIBUTE, MODULE_URLS } from "./media-runtime.js";
import { resolveMedia } from "./media.js";

const RUNTIME = path.join(path.dirname(fileURLToPath(import.meta.url)), "media-runtime.js");
const TSPCI_ROOT = path.resolve(path.dirname(RUNTIME), "..") + path.sep;
const MODULE_ID = "@citolab/tspci/media";
const VIRTUAL_ID = "\0tspci-media";
const DEFAULT_WARN_SIZE = 1024 * 1024;
const IMAGE_MODULE = /\.(png|jpe?g|gif|svg|webp)$/i;
// a library this big in an oversized bundle is worth a module of its own
const LIBRARY_HINT_SIZE = 100 * 1024;

const kb = (bytes) => `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} kB`;

/**
 * Fixed media (config.tspci.media, see media.js) and the size of the bundle:
 * - `import { media } from "@citolab/tspci/media"` gets the table of this build: data URLs for inline media, paths for
 *   files, which the plugin copies to dist/media;
 * - a banner keeps the URL of the script that loads the bundle, the base of those paths (media-runtime.js);
 * - a bundle above config.tspci.bundle.warnSize (1 MB) is a warning, with what makes it big.
 */
export function media({ projectRoot = process.cwd() } = {}) {
  let packageJson;
  let resolved = [];
  let moduleSizes = [];

  const key = () => `${packageJson.config?.tspci?.typeIdentifier ?? packageJson.name}@${packageJson.version ?? ""}`;

  return {
    name: "tspci-media",

    buildStart() {
      packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
      const { media, problems } = resolveMedia(projectRoot, packageJson);
      for (const problem of problems) this.warn(problem);
      resolved = media;
      this.addWatchFile(path.join(projectRoot, "package.json"));
      for (const m of resolved) this.addWatchFile(m.source);
    },

    resolveId(id) {
      return id === MODULE_ID ? VIRTUAL_ID : null;
    },

    load(id) {
      if (id !== VIRTUAL_ID) return null;
      const table = Object.fromEntries(
        resolved.map((m) => [
          m.name,
          m.mode === "inline" ? { inline: `data:${m.type};base64,${fs.readFileSync(m.source).toString("base64")}` } : { file: m.file },
        ])
      );
      const options = { key: key(), typeIdentifier: packageJson.config?.tspci?.typeIdentifier ?? "" };
      return [
        `import { createMedia } from ${JSON.stringify(RUNTIME)};`,
        `export const MEDIA_ATTRIBUTE = ${JSON.stringify(MEDIA_ATTRIBUTE)};`,
        `export const media = createMedia(${JSON.stringify(table)}, ${JSON.stringify(options)});`,
      ].join("\n");
    },

    // Outside the UMD wrapper: an AMD loader runs the factory later, when document.currentScript is gone.
    banner() {
      if (!resolved.some((m) => m.mode === "file")) return "";
      return `(function(){var s=typeof document!=="undefined"&&document.currentScript;if(s&&s.src){var u=window.${MODULE_URLS}=window.${MODULE_URLS}||{};u[${JSON.stringify(key())}]=s.src;}})();`;
    },

    generateBundle(_, bundle) {
      const chunk = Object.values(bundle).find((output) => output.type === "chunk" && output.isEntry);
      moduleSizes = chunk
        ? Object.entries(chunk.modules).map(([id, info]) => ({ id, size: info.renderedLength }))
        : [];
    },

    writeBundle(options, bundle) {
      const outputDir = options.dir ?? path.dirname(options.file ?? path.join(projectRoot, "dist", "index.js"));
      const files = resolved.filter((m) => m.mode === "file");
      const mediaDir = path.join(outputDir, "media");
      fs.rmSync(mediaDir, { recursive: true, force: true });
      if (files.length) {
        fs.mkdirSync(mediaDir, { recursive: true });
        for (const m of files) fs.copyFileSync(m.source, path.join(outputDir, m.file));
      }

      const warnSize = Number(packageJson.config?.tspci?.bundle?.warnSize ?? DEFAULT_WARN_SIZE);
      // the size that is delivered: a production build (dev and watch builds are not minified)
      if (!warnSize || process.env.ROLLUP_WATCH === "true") return;
      // a library in a module of its own (config.tspci.bundle.modules) cannot be split further
      for (const output of Object.values(bundle)) {
        if (output.type === "asset" && output.fileName.startsWith("modules/") && Buffer.byteLength(output.source) > warnSize) {
          console.warn(chalk.yellow(`${output.fileName} is ${kb(Buffer.byteLength(output.source))}, more than ${kb(warnSize)} (config.tspci.bundle.warnSize): a library of this size cannot be split further.`));
        }
      }
      const chunk = Object.values(bundle).find((output) => output.type === "chunk" && output.isEntry);
      if (!chunk) return;
      const file = path.join(outputDir, chunk.fileName);
      const size = fs.existsSync(file) ? fs.statSync(file).size : Buffer.byteLength(chunk.code);
      if (size <= warnSize) return;
      console.warn(sizeReport({ fileName: chunk.fileName, size, warnSize, moduleSizes, resolved, projectRoot }));
    },
  };
}

/** What makes the bundle big: the inline media, then the largest modules (their size before minifying). */
export function sizeReport({ fileName, size, warnSize, moduleSizes, resolved, projectRoot }) {
  const label = (id) => {
    if (id === VIRTUAL_ID) return "fixed media (config.tspci.media, inline)";
    const clean = id.replace(/^\0/, "").split("?")[0];
    const nodeModules = clean.lastIndexOf(`node_modules${path.sep}`);
    if (nodeModules >= 0) return clean.slice(nodeModules + 13);
    // tspci's own files, also when it is linked from elsewhere
    if (clean.startsWith(TSPCI_ROOT)) return `@citolab/tspci/${path.relative(TSPCI_ROOT, clean)}`;
    return path.relative(projectRoot, clean);
  };
  const largest = [...moduleSizes].sort((a, b) => b.size - a.size).slice(0, 8);
  const images = moduleSizes.filter((m) => IMAGE_MODULE.test(m.id.split("?")[0])).reduce((sum, m) => sum + m.size, 0);
  const inline = resolved.filter((m) => m.mode === "inline");
  const lines = [
    chalk.yellow(`${fileName} is ${kb(size)}, more than ${kb(warnSize)} (config.tspci.bundle.warnSize). Delivery platforms may refuse it.`),
    `  the largest parts (before minifying):`,
    ...largest.map((m) => `    ${kb(m.size).padStart(9)}  ${label(m.id)}`),
  ];
  if (images) lines.push(`  imported images (data URLs): ${kb(images)}; declare them in config.tspci.media to keep them out of the bundle`);
  if (inline.length) {
    lines.push(`  inline fixed media: ${inline.map((m) => `${m.name} (${kb(m.size)})`).join(", ")}; "mode": "file" keeps one out of the bundle`);
  }
  const libraries = largestPackages(moduleSizes).filter((p) => p.size >= LIBRARY_HINT_SIZE);
  if (libraries.length) {
    lines.push(
      `  libraries: ${libraries.map((p) => `${p.name} (${kb(p.size)})`).join(", ")}; ` +
        `"bundle": { "modules": ${JSON.stringify(libraries.map((p) => p.name))} } puts them in modules of their own`
    );
  }
  return lines.join("\n");
}

/** The bundled size per package in node_modules, largest first. */
export function largestPackages(moduleSizes) {
  const sizes = new Map();
  for (const { id, size } of moduleSizes) {
    const clean = id.replace(/^\0/, "").split("?")[0];
    const index = clean.lastIndexOf(`node_modules${path.sep}`);
    if (index < 0) continue;
    const parts = clean.slice(index + 13).split(path.sep);
    const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    sizes.set(name, (sizes.get(name) ?? 0) + size);
  }
  return [...sizes].map(([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size);
}
