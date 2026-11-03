// The descriptor the build writes conforms to the PCI authoring profile: docs/spec/authoring.schema.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import { createRequire } from "module";
import { buildDescriptor } from "../src/authoring.js";

const require = createRequire(import.meta.url);
const Ajv = require("ajv");
const schema = JSON.parse(fs.readFileSync(new URL("../../../docs/spec/authoring.schema.json", import.meta.url), "utf8"));
const validate = new Ajv({ allErrors: true }).compile(schema);
const errors = () => (validate.errors ?? []).map((e) => `${e.dataPath} ${e.message}`).join("; ");

const pkg = (tspci = {}) => ({ name: "my-pci", version: "1.2.0", config: { tspci: { typeIdentifier: "myPci", ...tspci } } });

const projects = {
  "plain settings": [pkg(), { title: "Hi", width: "200", on: "false" }],
  "described settings, an enum": [
    pkg({ scoring: ["match_correct", "human"], correctResponse: "properties" }),
    { mode: { default: "a", editor: "enum", options: ["a", { value: "b", label: { en: "B", nl: "B" } }], hint: "x" } },
  ],
  "a record with margins and a media slot": [
    pkg({
      response: { cardinality: "record", fields: { time: { baseType: "float", tolerance: "range" }, point: { baseType: "point", tolerance: "area" } } },
      markup: { video: { editor: "media", accept: ["video/*"], required: true, element: "video", label: { en: "Video" } } },
    }),
    {},
  ],
  "a tool": [pkg({ scoring: ["none"] }), {}],
  "an authoring mode": [pkg({ authoring: { label: "Draw", width: 900, height: 700 } }), { partition: { default: "", editor: "pci" } }],
};

for (const [name, [packageJson, config]] of Object.entries(projects)) {
  test(`conforms: ${name}`, () => {
    const { descriptor } = buildDescriptor(packageJson, config);
    assert.ok(validate(descriptor), errors());
  });
}

test("conforms: fixed media and split modules", () => {
  const media = [{ name: "intro", file: "media/intro.mp4", mode: "file", type: "video/mp4", element: "video", size: 10 }];
  const modules = [{ name: "three", id: "myPci/modules/three", file: "modules/three.js", version: "1" }];
  const { descriptor } = buildDescriptor(pkg(), {}, media, modules);
  assert.ok(validate(descriptor), errors());
  assert.deepEqual(descriptor.modules, { paths: { "myPci/modules/three": "modules/three" } });
});

test("a tspci 2 descriptor does not conform", () => {
  const old = {
    descriptorVersion: "0", typeIdentifier: "myPci", properties: {}, response: { cardinality: "single", baseType: "string" },
    role: "question", score: ["MATCH_CORRECT"],
  };
  assert.equal(validate(old), false);
});

test("what the schema refuses", () => {
  const base = () => buildDescriptor(pkg(), {}).descriptor;
  const cases = {
    "none with other scoring": { ...base(), scoring: ["none", "human"] },
    "a record with a base type": { ...base(), response: { cardinality: "record", baseType: "string", fields: { a: { baseType: "string" } } } },
    "a single response without a base type": { ...base(), response: { cardinality: "single" } },
    "a media file outside the PCI": { ...base(), media: { x: { file: "../secret.png", type: "image/png", element: "img" } } },
    "a module path with a scheme": { ...base(), modules: { paths: { lib: "https://cdn/lib" } } },
    "an enum without options": { ...base(), properties: { m: { editor: "enum", default: "a" } } },
  };
  for (const [name, descriptor] of Object.entries(cases)) assert.equal(validate(descriptor), false, name);
});

test("the example in the spec conforms", () => {
  const spec = fs.readFileSync(new URL("../../../docs/spec/README.md", import.meta.url), "utf8");
  const example = spec.match(/```json\n(\{\n  "descriptorVersion"[\s\S]*?)\n```/);
  assert.ok(example, "no example descriptor in docs/spec/README.md");
  assert.ok(validate(JSON.parse(example[1])), errors());
});
