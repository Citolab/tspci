import watchAssets from 'rollup-plugin-watch-assets';
// PK: not the official npm package, but a copy, needed watch functinoality
import { liveServer } from "./rollup-plugin-live-server.js";

import path from "path";

const PACKAGE_ROOT_PATH = process.cwd()
const PACKAGE_DIST_PATH = path.join(PACKAGE_ROOT_PATH, "dist")

const livesrvr = liveServer({
  root: path.join(PACKAGE_ROOT_PATH),
  mount: [["/", "./dist"]],
  open: true,
  wait: 500,
  watch: PACKAGE_DIST_PATH
});

const watchassets = watchAssets({ assets: ['./src/**/*.json',  './src/**/*.svg', './src/**/*.png'] })

import rollupConfig from "./rollup.config.js";

const newRollupConfig = {
  ...rollupConfig,
  output: rollupConfig.output.map((output) => ({ ...output, sourcemap: true })),
  plugins: [...rollupConfig.plugins, livesrvr, watchassets],
};

export default newRollupConfig;
