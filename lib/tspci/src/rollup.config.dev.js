import livereload from "rollup-plugin-livereload";
// PK: not the official npm package, but a copy, needed watch functionality
import { liveServer } from "./rollup-plugin-live-server.js";
import { copyFiles } from "./rollup-plugin-copy-files.js";
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
const VENDOR_PACKAGES = ["requirejs", "bootstrap", "preact", "htm", "@citolab/qti-components"];

// Configure live server
const livesrvr = liveServer({
  root: path.join(PACKAGE_ROOT_PATH),
  mount: [["/", "./dist"], ...VENDOR_PACKAGES.map((name) => [`/vendor/${name}`, packageDir(name)])],
  open: true,
  wait: 500,
  watch: PACKAGE_DIST_PATH,
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
    livereload(PACKAGE_DIST_PATH), // Reload after copying
    livesrvr, // Start the live server
  ],
};

export default newRollupConfig;
