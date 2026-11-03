import livereload from "rollup-plugin-livereload";
// PK: not the official npm package, but a copy, needed watch functionality
import { liveServer } from "./rollup-plugin-live-server.js";
import { copyFiles } from "./rollup-plugin-copy-files.js";
import { exportersMiddleware } from "./dev-exporters.js";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
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

// What an exporter writes to dist (its tmp folder, the package, the SBOM next to it) is not a change to reload the
// page for: the dev page is downloading it
const PACKAGE_OUTPUT = /[\/\\]dist[\/\\](tmp([\/\\]|$)|[^\/\\]*\.(zip|ci)$|[^\/\\]+\.sbom\.cdx\.json$)/;

// Configure live server
const livesrvr = liveServer({
  root: path.join(PACKAGE_ROOT_PATH),
  mount: [["/", "./dist"], ...VENDOR_PACKAGES.map((name) => [`/vendor/${name}`, packageDir(name)])],
  open: !process.argv.includes("--no-open"), // `tspci --dev --no-open`: no browser window (CI, a remote machine)
  wait: 500,
  watch: PACKAGE_DIST_PATH,
  ignorePattern: PACKAGE_OUTPUT,
  middleware: [exportersMiddleware(PACKAGE_ROOT_PATH)], // the exporters of the project, for the dev page's Download
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
