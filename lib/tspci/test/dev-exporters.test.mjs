import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { describeExporters, findExporters, runExporter } from "../src/dev-exporters.js";

/** A project with packages in node_modules: name → { script } (src/createPackage.mjs) or {} (no exporter). */
function project(packages, dependencies = Object.keys(packages)) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tspci-exporters-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "p", devDependencies: Object.fromEntries(dependencies.map((d) => [d, "1"])) }));
  for (const [name, { script }] of Object.entries(packages)) {
    const dir = path.join(root, "node_modules", name);
    fs.mkdirSync(path.join(dir, "src"), { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name, version: "1.0.0" }));
    if (script) fs.writeFileSync(path.join(dir, "src/createPackage.mjs"), script);
  }
  return root;
}

const writes = (file) => `import fs from "fs"; export const bundle = async () => { fs.writeFileSync(${JSON.stringify(file)}, "x"); return ${JSON.stringify(file)}; };`;

test("an exporter is a dependency with src/createPackage.mjs; its label is the button text", async () => {
  const out = path.join(os.tmpdir(), `exported-${process.pid}.zip`);
  const root = project({
    "@citolab/tspci-tao": { script: `export const label = "TAO package"; ${writes(out)}` },
    "my-exporter": { script: writes(out) },
    "not-an-exporter": {},
    "@citolab/tspci": { script: writes(out) },
  });
  assert.deepEqual(findExporters(root).map((e) => e.name), ["@citolab/tspci-tao", "my-exporter"]);
  assert.deepEqual(await describeExporters(root), [
    { name: "@citolab/tspci-tao", label: "TAO package" },
    { name: "my-exporter", label: "my-exporter" },
  ]);
  assert.equal(await runExporter(root, "my-exporter"), out);
});

test("an installed package the project does not depend on is not offered", () => {
  const root = project({ "@citolab/tspci-tao": { script: "export const bundle = () => {};" } }, []);
  assert.deepEqual(findExporters(root), []);
});

test("an exporter that does not say which file it wrote, or an unknown name, is an error", async () => {
  const root = project({ old: { script: "export const bundle = () => { /* writes, returns nothing */ };" } });
  await assert.rejects(runExporter(root, "old"), /did not return the path of the file it wrote/);
  await assert.rejects(runExporter(root, "nope"), /not an exporter of this project/);
});
