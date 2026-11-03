import fs from "fs";
import path from "path";
import { rollup } from "rollup";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import { fileNameFor, resolveModules } from "./modules.js";

// The build of config.tspci.bundle.modules (see modules.js): the library as an AMD dependency of the bundle, and as a
// module of its own in dist/modules.

/**
 * The plugin. `includedModules()` gives the files the split modules were built from, for the SBOM (they are not in the
 * PCI's own bundle).
 */
export function splitModules({ projectRoot = process.cwd(), minify = () => process.env.ROLLUP_WATCH !== "true" } = {}) {
  let resolved = [];
  const built = new Map(); // name → { key, code, moduleIds }, reused while the library does not change (watch)

  const paths = () => Object.fromEntries(resolved.map((m) => [m.name, m.id]));

  async function build(m) {
    const key = `${m.version}|${resolved.map((r) => r.id).join(",")}|${minify()}`;
    const cached = built.get(m.name);
    if (cached?.key === key) return cached;
    const others = resolved.filter((r) => r !== m).map((r) => r.name);
    const bundle = await rollup({
      // resolved by node-resolve from the project, so the package's ES module entry
      input: m.name,
      external: (id) => others.includes(id),
      onwarn: (warning, warn) => (warning.code === "THIS_IS_UNDEFINED" || warning.code === "CIRCULAR_DEPENDENCY" ? null : warn(warning)),
      plugins: [
        replace({ preventAssignment: true, values: { "process.env.NODE_ENV": JSON.stringify("production") } }),
        resolve({ browser: true, preferBuiltins: false, rootDir: projectRoot }),
        commonjs({ transformMixedEsModules: true }),
        json(),
        ...(minify() ? [terser()] : []),
      ],
    });
    const { output } = await bundle.generate({
      format: "amd",
      exports: "auto",
      interop: "auto",
      paths: paths(),
      sourcemap: false,
    });
    await bundle.close();
    const result = { key, code: output[0].code, moduleIds: Object.keys(output[0].modules) };
    built.set(m.name, result);
    return result;
  }

  return {
    name: "tspci-modules",

    buildStart() {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
      const { modules, problems } = resolveModules(projectRoot, packageJson);
      for (const problem of problems) this.warn(problem);
      resolved = modules;
    },

    // the library is a dependency of the bundle, under its AMD id
    options(options) {
      const names = resolveModules(projectRoot, readPackageJson(projectRoot)).modules.map((m) => m.name);
      if (!names.length) return null;
      const external = options.external;
      return {
        ...options,
        external: (id, ...rest) =>
          names.includes(id) ||
          (typeof external === "function" ? external(id, ...rest) : Array.isArray(external) ? external.includes(id) : external === id),
      };
    },

    outputOptions(output) {
      const modules = resolveModules(projectRoot, readPackageJson(projectRoot)).modules;
      if (!modules.length) return null;
      const ids = Object.fromEntries(modules.map((m) => [m.name, m.id]));
      return {
        ...output,
        paths: { ...(typeof output.paths === "object" ? output.paths : {}), ...ids },
        // the UMD global for a page without AMD: a name that cannot clash
        globals: { ...(typeof output.globals === "object" ? output.globals : {}), ...Object.fromEntries(modules.map((m) => [m.name, `tspci_${fileNameFor(m.name).replace(/[^A-Za-z0-9_]/g, "_")}`])) },
        // a split library is an ES module (default and named exports) or a CommonJS value
        interop: (id) => (Object.values(ids).includes(id) || id in ids ? "auto" : typeof output.interop === "function" ? output.interop(id) : output.interop ?? "default"),
      };
    },

    async generateBundle() {
      for (const m of resolved) {
        const { code } = await build(m);
        this.emitFile({ type: "asset", fileName: m.file, source: code });
      }
    },

    /** The source files of the split modules (absolute paths), for the SBOM. */
    includedModules() {
      return resolved.flatMap((m) => built.get(m.name)?.moduleIds ?? []);
    },

    /** The split modules of the last build. */
    modules() {
      return resolved;
    },
  };
}

function readPackageJson(projectRoot) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
}
