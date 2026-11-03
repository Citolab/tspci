import livereload from "rollup-plugin-livereload";
// PK: not the official npm package, but a copy, needed watch functionality
import { liveServer } from "./rollup-plugin-live-server.js";
import { copyFiles } from "./rollup-plugin-copy-files.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import rollupConfig from "./rollup.config.js"; // Make sure this exports an object with `output` and `plugins`

const PACKAGE_ROOT_PATH = process.cwd();
const PACKAGE_DIST_PATH = path.join(PACKAGE_ROOT_PATH, "dist");

// The dev page (public/index.html) loads its libraries from /vendor/<package>, served from tspci's own dependencies, so
// it needs no public CDN and runs the versions in the lockfile: RequireJS, Bootstrap, preact + htm, and qti-components
// (the PCI host, and the RequireJS / bundle / stylesheet it gives the PCI iframe).
const require = createRequire(import.meta.url);
// The folder of an installed package, found the way Node looks for it (the node_modules folders up from here), so a
// package's "exports" (import-only, or without package.json) does not matter.
const packageDir = (name) => {
  const dir = (require.resolve.paths(name) ?? [])
    .map((modules) => path.join(modules, name))
    .find((candidate) => fs.existsSync(path.join(candidate, "package.json")));
  if (!dir) throw new Error(`tspci dev page: ${name} is not installed`);
  return dir;
};
// @citolab/pci-authoring writes the QTI 3 package of the dev page's Download, in the browser
const VENDOR_PACKAGES = ["requirejs", "bootstrap", "preact", "htm", "@citolab/qti-components", "@citolab/pci-authoring"];

// A package built in dist (the TAO zip and its tmp folder) is not a change to reload the page for
const PACKAGE_OUTPUT = /[\/\\]dist[\/\\](tmp([\/\\]|$)|[^\/\\]*\.zip$)/;

// GET /__tspci/tao-package: the TAO package of the project as it is built now, by @citolab/tspci-tao (the same as
// `tspci --target tao`), for the dev page's Download
const projectRequire = createRequire(path.join(PACKAGE_ROOT_PATH, "package.json"));
async function taoPackage(req, res, next) {
  if (req.url !== "/__tspci/tao-package") return next();
  let script;
  try {
    script = projectRequire.resolve("@citolab/tspci-tao/src/createPackage.mjs");
  } catch {
    res.statusCode = 404;
    return res.end("Install @citolab/tspci-tao to build a TAO package: npm i -D @citolab/tspci-tao");
  }
  try {
    const zipPath = await (await import(pathToFileURL(script).href)).bundle();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(zipPath)}"`);
    fs.createReadStream(zipPath).pipe(res);
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error?.message || error));
  }
}

// Configure live server
const livesrvr = liveServer({
  root: path.join(PACKAGE_ROOT_PATH),
  mount: [["/", "./dist"], ...VENDOR_PACKAGES.map((name) => [`/vendor/${name}`, packageDir(name)])],
  open: !process.argv.includes("--no-open"), // `tspci --dev --no-open`: no browser window (CI, a remote machine)
  wait: 500,
  watch: PACKAGE_DIST_PATH,
  ignorePattern: PACKAGE_OUTPUT,
  middleware: [taoPackage],
});

// Configure copy plugin to watch for changes
const watchassets = copyFiles({
  targets: [
    { src: "./src/**/*.json", dest: "dist" },
    { src: "./src/**/*.svg", dest: "dist" },
    { src: "./src/**/*.png", dest: "dist" },
  ],
});

// Modify the existing Rollup config
const newRollupConfig = {
  ...rollupConfig,
  output: rollupConfig.output.map((output) => ({
    ...output,
    sourcemap: true, // Ensure sourcemaps are enabled
  })),
  plugins: [
    ...rollupConfig.plugins, // Keep existing plugins
    watchassets, // Add your custom watch functionality
    livereload({ watch: PACKAGE_DIST_PATH, exclusions: [PACKAGE_OUTPUT] }), // Reload after copying
    livesrvr, // Start the live server
  ],
};

export default newRollupConfig;
