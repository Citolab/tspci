import fs from "fs";
import path from "path";

// Fixed media of a PCI: files that belong to the PCI itself (a tutorial video, sprites), declared in package.json
//
//   "config": { "tspci": {
//     "media": {
//       "intro":  "src/assets/intro.mp4",                                  // inline or file, by size
//       "sprite": { "file": "src/assets/sprite.png", "mode": "inline" }    // always in the bundle
//     },
//     "mediaOptions": { "mode": "auto", "inlineLimit": 8192 }
//   } }
//
// Media an author chooses per item stays in `markup` (slots with editor "media"); these are never shown to an author.
//
//   inline   a data URL in the bundle (index.js grows by a third more than the file)
//   file     dist/media/<name><ext>, listed in authoring.json under `media`; an authoring system places it in the
//            item's qti-interaction-markup (<video data-pci-media="intro" src>), and a package ships it next to the
//            module as well (see media-runtime.js for how the PCI finds it)
//   auto     inline up to inlineLimit bytes, a file above it (the default)
//
// `tspci --media=inline|file|auto` overrides the mode of every entry for one build.

export const MEDIA_MODES = ["auto", "inline", "file"];
export const DEFAULT_INLINE_LIMIT = 8192;
export const MEDIA_DIR = "media";

const TYPES = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".webp": "image/webp", ".avif": "image/avif",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".oga": "audio/ogg", ".m4a": "audio/mp4",
  ".aac": "audio/aac", ".flac": "audio/flac",
  ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg", ".mov": "video/quicktime",
  ".vtt": "text/vtt", ".pdf": "application/pdf", ".json": "application/json", ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
};

export const mediaType = (file) => TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";

/** The element an authoring system writes for a file, by its type; `object` (with `data`) for anything else. */
export function mediaElement(type) {
  const kind = type.split("/")[0];
  if (kind === "image") return "img";
  if (kind === "audio" || kind === "video") return kind;
  return "object";
}

/** The mode of `--media=<mode>`, or null. */
export function mediaModeArgument(argv = process.argv) {
  const arg = argv.find((a) => a.startsWith("--media="));
  return arg ? arg.slice("--media=".length) : null;
}

/**
 * The fixed media of a project: [{ name, source, file, mode, type, element, size }] and the problems found (a missing
 * file, an unknown mode). `file` is the path in dist (media/intro.mp4), relative to the module.
 */
export function resolveMedia(projectRoot, packageJson, { mode: forcedMode = mediaModeArgument() } = {}) {
  const tspci = packageJson?.config?.tspci ?? {};
  const options = tspci.mediaOptions ?? {};
  const inlineLimit = Number.isFinite(Number(options.inlineLimit)) ? Number(options.inlineLimit) : DEFAULT_INLINE_LIMIT;
  const problems = [];
  if (forcedMode && !MEDIA_MODES.includes(forcedMode)) {
    problems.push(`--media=${forcedMode}: unknown mode (one of ${MEDIA_MODES.join(", ")})`);
    forcedMode = null;
  }
  const media = [];
  for (const [name, value] of Object.entries(tspci.media ?? {})) {
    const entry = typeof value === "string" ? { file: value } : value ?? {};
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      problems.push(`config.tspci.media ${name}: a name has letters, digits, - and _ only`);
      continue;
    }
    if (!entry.file) {
      problems.push(`config.tspci.media ${name}: no file`);
      continue;
    }
    const source = path.resolve(projectRoot, entry.file);
    if (!fs.existsSync(source)) {
      problems.push(`config.tspci.media ${name}: ${entry.file} does not exist`);
      continue;
    }
    let mode = forcedMode ?? entry.mode ?? options.mode ?? "auto";
    if (!MEDIA_MODES.includes(mode)) {
      problems.push(`config.tspci.media ${name}: unknown mode "${mode}" (one of ${MEDIA_MODES.join(", ")})`);
      mode = "auto";
    }
    const size = fs.statSync(source).size;
    if (mode === "auto") mode = size <= inlineLimit ? "inline" : "file";
    const type = mediaType(source);
    media.push({
      name,
      source,
      file: `${MEDIA_DIR}/${name}${path.extname(source).toLowerCase()}`,
      mode,
      type,
      element: entry.element ?? mediaElement(type),
      size,
    });
  }
  return { media, problems };
}

/** The `media` of authoring.json: the files an authoring system places in the markup (inline media is in the bundle). */
export function mediaDescriptor(media) {
  return Object.fromEntries(
    media.filter((m) => m.mode === "file").map((m) => [m.name, { file: m.file, type: m.type, element: m.element, size: m.size }])
  );
}
