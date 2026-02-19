import livereload from "rollup-plugin-livereload";
// PK: not the official npm package, but a copy, needed watch functionality
import { liveServer } from "./rollup-plugin-live-server.js";
import { copyFiles } from "./rollup-plugin-copy-files.js";
import path from "path";
import rollupConfig from "./rollup.config.js"; // Make sure this exports an object with `output` and `plugins`

const PACKAGE_ROOT_PATH = process.cwd();
const PACKAGE_DIST_PATH = path.join(PACKAGE_ROOT_PATH, "dist");

// Configure live server
const livesrvr = liveServer({
  root: path.join(PACKAGE_ROOT_PATH),
  mount: [["/", "./dist"]],
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
