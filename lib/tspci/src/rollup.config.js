import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import alias from "@rollup/plugin-alias";
import image from "@rollup/plugin-image";
import replace from "@rollup/plugin-replace";
import commonjs from "@rollup/plugin-commonjs"; // added this when added react-redux, gave an ' 'default' is not exported by node_modules/prop-types/index.js'
import json from "@rollup/plugin-json";
import { postcssString } from "./rollup-plugin-postcss-string.js";
import { copyFiles } from "./rollup-plugin-copy-files.js";

import fs from "fs";
import path from "path";

const PACKAGE_ROOT_PATH = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT_PATH, "package.json"), "utf-8"));

export default {
  input: [`${pkg.source}`],
  external: ["qtiCustomInteractionContext"],
  watch: {
    include: "./src/**", // fixme: watch these files, does not support watching the css
    clearScreen: false, // clears the bash log before running
  },
  output: [
    {
      name: `${pkg.name}`,
      file: `${pkg.main}`,
      format: "umd",
      sourcemap: true,
    },
  ],
  plugins: [
    alias({
      // When using third party react libraries, alias them to preact
      entries: [
        { find: "qtiCustomInteractionContext", replacement: "./qtiShim" },
        { find: "react", replacement: "preact/compat" },
        { find: "react-dom/test-utils", replacement: "preact/test-utils" },
        { find: "react-dom", replacement: "preact/compat" },
        { find: "react/jsx-runtime", replacement: "preact/jsx-runtime" },
      ],
    }),
    replace({
      values: {
        "process.env.NODE_ENV": "false", // added this when bundling gave an 'process is not defined' error
      },
    }),
    resolve({
      ignoreGlobal: false,
      include: ["node_modules/**"],
      dedupe: ["preact"],
      browser: true
    }),
    commonjs({ transformMixedEsModules: true }), // preact was imported twice, with require (unistore/preact) and with import (our import), which resulted in 2 preacts in our project
    json(), // used to import config.json
    typescript({
      tsconfig: `${PACKAGE_ROOT_PATH}/tsconfig.json`,
      declarationDir: `${PACKAGE_ROOT_PATH}/dist`
    }),
    postcssString({
      extensions: [".css"],
    }),
    copyFiles({
      targets: [
        { src: "src/assets", dest: "dist" }, // copy asses to dist folder
      ],
    }),
    image(), // import images png/svg/gif/jpg and converts to inline code
  ],
};
