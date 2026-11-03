import fs from "fs";
import path from "path";
import { createRequire } from "module";

// Large libraries in modules of their own, so no single file of the PCI is too big for a delivery platform:
//
//   "config": { "tspci": { "bundle": { "modules": ["three"] } } }
//
// - the PCI's bundle imports the library as an AMD dependency, `<typeIdentifier>/modules/three`, instead of including it;
// - the build writes the library as an AMD module of its own, dist/modules/three.js (minified, its own dependencies
//   included, other split libraries imported the same way);
// - dist/authoring.json lists it under `modules`, so an authoring system writes it in qti-interaction-modules next to
//   the PCI's module: <qti-interaction-module id="myPci/modules/three" primary-path="…/modules/three"/>.
//
// Only the package's main entry is split: `import * as THREE from "three"`. Other files of the package
// ("three/examples/jsm/…") stay in the bundle and import the split module. Split self-contained libraries: a library
// that imports preact would get a copy of its own.
//
// The id starts with the typeIdentifier, which TAO maps to the PCI's folder, and keeps PCIs with different versions of
// a library apart on one page.

export const MODULES_DIR = "modules";

export const fileNameFor = (name) => name.replace(/^@/, "").replace(/[^A-Za-z0-9._-]/g, "_");

/** The split libraries of a project: [{ name, id, file, version }] and the problems found. `tspci --no-split` keeps
 * every library in the bundle for one build. */
export function resolveModules(projectRoot, packageJson, { split = !process.argv.includes("--no-split") } = {}) {
  const tspci = packageJson?.config?.tspci ?? {};
  const names = split ? tspci.bundle?.modules ?? [] : [];
  const problems = [];
  if (!Array.isArray(names)) {
    return { modules: [], problems: ["config.tspci.bundle.modules: a list of package names, e.g. [\"three\"]"] };
  }
  const require = createRequire(path.join(projectRoot, "package.json"));
  const modules = [];
  for (const name of names) {
    if (typeof name !== "string" || !name) {
      problems.push(`config.tspci.bundle.modules: ${JSON.stringify(name)} is not a package name`);
      continue;
    }
    const packageJsonPath = findPackageJson(require, name);
    if (!packageJsonPath) {
      problems.push(`config.tspci.bundle.modules: ${name} is not installed`);
      continue;
    }
    const file = `${MODULES_DIR}/${fileNameFor(name)}.js`;
    modules.push({
      name,
      id: `${tspci.typeIdentifier ?? packageJson.name}/${MODULES_DIR}/${fileNameFor(name)}`,
      file,
      version: JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version ?? "",
    });
  }
  return { modules, problems };
}

// The package.json of an installed package, also when its "exports" hide it.
function findPackageJson(require, name) {
  return (require.resolve.paths(name) ?? [])
    .map((dir) => path.join(dir, name, "package.json"))
    .find((candidate) => fs.existsSync(candidate));
}

/** The `modules` of authoring.json: AMD id → the file relative to the PCI's module. */
export function modulesDescriptor(modules) {
  return Object.fromEntries(modules.map((m) => [m.id, { file: m.file, package: m.name, version: m.version }]));
}
