import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import alias from "@rollup/plugin-alias";
import image from "@rollup/plugin-image";
import replace from "@rollup/plugin-replace";
import postcss from "rollup-plugin-postcss";
import commonjs from "@rollup/plugin-commonjs"; // added this when added react-redux, gave an ' 'default' is not exported by node_modules/prop-types/index.js'
import json from "@rollup/plugin-json";

// copy, builtins, globals and litTailwind were added for use in simple bundle tool to make qti players
import copy from "rollup-plugin-copy";  // copying assets to the assets folder in dist ( not for PCI, those assets are bundled )
import builtins from 'rollup-plugin-node-builtins'; // was fix for including pixi for QTI component development, see: https://github.com/rollup/rollup/issues/3230#issuecomment-585416594
import globals from 'rollup-plugin-node-globals'; // was fix for including pixi for QTI component development, see:  https://github.com/rollup/rollup/issues/3230#issuecomment-585416594

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
    globals(),
    builtins(),
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
    postcss({
      extract: false, // not extracting embeds the js in the build, which is what we need for shipping it
      modules: false, // tried modules at first, could work, but not with html in the qti file
      inject: false, // does not inject the imported styles in the head
      extensions: [".css"],
    }),
    copy({
      targets: [
        { src: "src/assets", dest: "dist" }, // copy asses to dist folder
      ],
    }),
    image(), // import images png/svg/gif/jpg and converts to inline code
  ],
};