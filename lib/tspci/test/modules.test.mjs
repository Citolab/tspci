import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveModules, modulesDescriptor } from "../src/modules.js";
import { buildDescriptor } from "../src/authoring.js";
import { largestPackages } from "../src/rollup-plugin-media.js";

const project = (packages) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tspci-modules-"));
  fs.writeFileSync(path.join(root, "package.json"), "{}");
  for (const [name, version] of Object.entries(packages)) {
    fs.mkdirSync(path.join(root, "node_modules", name), { recursive: true });
    fs.writeFileSync(path.join(root, "node_modules", name, "package.json"), JSON.stringify({ name, version }));
  }
  return root;
};
const pkg = (bundle) => ({ name: "my-pci", version: "1.0.0", config: { tspci: { typeIdentifier: "myPci", bundle } } });

test("a split library gets an AMD id under the typeIdentifier and a file in modules/", () => {
  const root = project({ three: "0.170.0", "@scope/lib": "2.0.0" });
  const { modules, problems } = resolveModules(root, pkg({ modules: ["three", "@scope/lib"] }), { split: true });
  assert.deepEqual(problems, []);
  assert.deepEqual(modules, [
    { name: "three", id: "myPci/modules/three", file: "modules/three.js", version: "0.170.0" },
    { name: "@scope/lib", id: "myPci/modules/scope_lib", file: "modules/scope_lib.js", version: "2.0.0" },
  ]);
  // a module resolution configuration (QTI 3 impl. guide 3.7.12.2): id → path without .js, relative to the PCI's module
  assert.deepEqual(modulesDescriptor(modules).paths["myPci/modules/three"], "modules/three");
  assert.deepEqual(buildDescriptor(pkg({}), {}, [], modules).descriptor.modules, modulesDescriptor(modules));
  assert.equal("modules" in buildDescriptor(pkg({}), {}).descriptor, false);
});

test("a package that is not installed, or no list, is a problem; --no-split keeps everything in the bundle", () => {
  const root = project({ three: "0.170.0" });
  assert.equal(resolveModules(root, pkg({ modules: ["nope"] }), { split: true }).problems.length, 1);
  assert.equal(resolveModules(root, pkg({ modules: "three" }), { split: true }).problems.length, 1);
  assert.deepEqual(resolveModules(root, pkg({ modules: ["three"] }), { split: false }).modules, []);
});

test("the size report adds up a library's files, for the hint", () => {
  const nm = `${path.sep}x${path.sep}node_modules${path.sep}`;
  const sizes = [
    { id: `${nm}three${path.sep}build${path.sep}three.module.js`, size: 800000 },
    { id: `${nm}three${path.sep}examples${path.sep}controls.js`, size: 20000 },
    { id: `${nm}@scope${path.sep}lib${path.sep}index.js`, size: 5000 },
    { id: `${path.sep}x${path.sep}src${path.sep}index.ts`, size: 3000 },
  ];
  assert.deepEqual(largestPackages(sizes), [
    { name: "three", size: 820000 },
    { name: "@scope/lib", size: 5000 },
  ]);
});
