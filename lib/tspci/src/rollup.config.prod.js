import terser from '@rollup/plugin-terser'
import rollupConfig from "./rollup.config.js";

const newRollupConfig = { 
  ...rollupConfig, 
  output: rollupConfig.output.map((output) => ({ ...output, sourcemap: false })),
  plugins: [...rollupConfig.plugins, terser()],
};

export default newRollupConfig;
