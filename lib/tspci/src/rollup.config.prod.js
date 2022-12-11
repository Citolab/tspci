import terser from '@rollup/plugin-terser'
import rollupConfig from "./rollup.config.js";

// PK: WORKADOUND FOR ERROR IN TERSER
// PK: REMOVE when fixed
// PK: see https://github.com/rollup/plugins/issues/1366#issuecomment-1345358157
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
global['__filename'] = __filename;

const newRollupConfig = { 
  ...rollupConfig, 
  output: rollupConfig.output.map((output) => ({ ...output, sourcemap: false })),
  plugins: [...rollupConfig.plugins, terser()],
};

export default newRollupConfig;
