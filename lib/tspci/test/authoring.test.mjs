import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDescriptor, flattenConfig } from "../src/authoring.js";

const pkg = (tspci = {}) => ({ name: "my-pci", version: "1.2.0", config: { tspci: { typeIdentifier: "myPci", ...tspci } } });

test("the bundle gets the defaults, as strings, from plain and described values", () => {
  assert.deepEqual(flattenConfig({ title: "Hi", width: 200, on: true, color: { default: "#ff0000", editor: "color" }, empty: {} }), {
    title: "Hi", width: "200", on: "true", color: "#ff0000", empty: "",
  });
});

test("plain config.json values, as every existing PCI has, get an editor from their value", () => {
  const { descriptor, problems } = buildDescriptor(pkg(), { title: "Hi", width: "200", on: "false" });
  assert.deepEqual(problems, []);
  assert.deepEqual(descriptor.properties, {
    title: { editor: "text", default: "Hi" },
    width: { editor: "integer", default: "200" },
    on: { editor: "boolean", default: "false" },
  });
  assert.deepEqual(descriptor.response, { cardinality: "single", baseType: "string" });
  assert.equal(descriptor.version, "1.2.0");
});

test("described values keep their hints; an enum keeps its options", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ score: ["MATCH_CORRECT", "NONE"] }), {
    mode: { default: "mixed", editor: "enum", options: [{ value: "mixed" }, "single"], label: { en: "Colours" }, $comment: "x" },
  });
  assert.deepEqual(problems, []);
  assert.deepEqual(descriptor.properties.mode, {
    editor: "enum", default: "mixed", options: [{ value: "mixed" }, { value: "single" }], label: { en: "Colours" },
  });
  assert.deepEqual(descriptor.score, ["MATCH_CORRECT", "NONE"]);
});

test("the response shape comes from config.tspci.response, a record with typed fields", () => {
  const response = { cardinality: "record", fields: { time: { baseType: "float" }, point: { baseType: "point", tolerance: "area" } } };
  const { descriptor, problems } = buildDescriptor(pkg({ response }), {});
  assert.deepEqual(problems, []);
  assert.deepEqual(descriptor.response, response);
});

test("reports what an authoring system could not use", () => {
  const { problems } = buildDescriptor({ config: { tspci: { response: { cardinality: "record", fields: { t: {} } } } } }, {
    a: { editor: "slider" },
    b: { editor: "enum", default: "x", options: ["y"] },
  });
  assert.equal(problems.length, 4);
  assert.match(problems.join("\n"), /typeIdentifier/);
  assert.match(problems.join("\n"), /unknown editor "slider"/);
  assert.match(problems.join("\n"), /"x" is not one of the options/);
  assert.match(problems.join("\n"), /fields\.t: baseType is missing/);
});

test("properties the PCI fills itself (editor pci) give the descriptor an authoring mode", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ authoring: { label: { en: "Draw the shape" }, width: 900 } }), {
    partition: { default: "", editor: "pci", label: "Shape" },
    colors: { default: "#ff0000", editor: "colorList" },
  });
  assert.deepEqual(problems, []);
  assert.deepEqual(descriptor.properties.partition, { editor: "pci", default: "", label: "Shape" });
  assert.deepEqual(descriptor.authoring, { properties: ["partition"], label: { en: "Draw the shape" }, width: 900 });
  assert.equal(flattenConfig({ partition: { default: "", editor: "pci" } }).partition, "");
});

test("no authoring mode without a pci property; an authoring block alone is reported", () => {
  assert.equal(buildDescriptor(pkg(), { title: "Hi" }).descriptor.authoring, undefined);
  const { descriptor, problems } = buildDescriptor(pkg({ authoring: { label: "Draw" } }), { title: "Hi" });
  assert.equal(descriptor.authoring, undefined);
  assert.match(problems.join("\n"), /nothing to author/);
});
