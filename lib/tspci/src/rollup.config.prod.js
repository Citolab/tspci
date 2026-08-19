import terser from '@rollup/plugin-terser'
import rollupConfig from "./rollup.config.js";
import { sbom } from "./rollup-plugin-sbom.js";

// PK: WORKADOUND FOR ERROR IN TERSER
// PK: REMOVE when fixed
// PK: see https://github.com/rollup/plugins/issues/1366#issuecomment-1345358157
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
global['__filename'] = __filename;

const cliPackageJson = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(__filename), "../package.json"), "utf-8")
);

const newRollupConfig = {
  ...rollupConfig,
  output: rollupConfig.output.map((output) => ({ ...output, sourcemap: false })),
  // sbom() runs after terser so it hashes the code that is actually delivered
  plugins: [...rollupConfig.plugins, terser(), sbom({ cliPackageJson })],
};

export default newRollupConfig;
