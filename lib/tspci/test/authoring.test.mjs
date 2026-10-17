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

test("a question by default; the correct response can come from the settings", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ score: ["MATCH_CORRECT", "NONE"], correctResponse: "settings" }), {});
  assert.deepEqual(problems, []);
  assert.equal(descriptor.role, "question");
  assert.equal(descriptor.correctResponse, "settings");
  assert.equal(buildDescriptor(pkg(), {}).descriptor.correctResponse, undefined);
});

test("a tool: role tool, or a score of only NONE; it gets score NONE and no correct response", () => {
  const byRole = buildDescriptor(pkg({ role: "tool" }), {});
  assert.deepEqual(byRole.problems, []);
  assert.equal(byRole.descriptor.role, "tool");
  assert.deepEqual(byRole.descriptor.score, ["NONE"]);
  const byScore = buildDescriptor(pkg({ score: ["NONE"] }), {});
  assert.equal(byScore.descriptor.role, "tool");
});

test("a tool cannot be scored or have a correct response", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ role: "tool", score: ["MATCH_CORRECT"], correctResponse: "settings" }), {});
  assert.equal(problems.length, 2);
  assert.match(problems.join("\n"), /a tool is never scored/);
  assert.match(problems.join("\n"), /a tool has no correct response/);
  assert.equal(descriptor.correctResponse, undefined);
});

test("unknown role and correct response sources are reported", () => {
  const { problems } = buildDescriptor(pkg({ role: "helper", correctResponse: "always" }), {});
  assert.match(problems.join("\n"), /role: "helper"/);
  assert.match(problems.join("\n"), /correctResponse: "always"/);
});

test("a margin on a single response or a record field, of a kind that fits its base type", () => {
  const ok = [
    { cardinality: "single", baseType: "float", tolerance: "range" },
    { cardinality: "single", baseType: "integer", tolerance: "range" },
    { cardinality: "single", baseType: "point", tolerance: "area" },
    { cardinality: "record", fields: { t: { baseType: "float", tolerance: "range" }, p: { baseType: "point", tolerance: "area" } } },
  ];
  for (const response of ok) {
    const { descriptor, problems } = buildDescriptor(pkg({ response }), {});
    assert.deepEqual(problems, [], JSON.stringify(response));
    assert.deepEqual(descriptor.response, response);
  }
});

test("a margin that does not fit is reported", () => {
  const cases = [
    [{ cardinality: "single", baseType: "string", tolerance: "range" }, /"range" needs a base type integer or float, not string/],
    [{ cardinality: "single", baseType: "float", tolerance: "area" }, /"area" needs a base type point, not float/],
    [{ cardinality: "single", baseType: "float", tolerance: "fuzzy" }, /"fuzzy" is not one of range, area/],
    [{ cardinality: "multiple", baseType: "float", tolerance: "range" }, /only a single response can have one, not multiple/],
    [{ cardinality: "record", fields: { t: { baseType: "float" } }, tolerance: "range" }, /a record has a tolerance per field/],
    [{ cardinality: "record", fields: { t: { baseType: "string", tolerance: "range" } } }, /fields\.t\.tolerance: "range" needs a base type integer or float/],
  ];
  for (const [response, message] of cases) {
    const { problems } = buildDescriptor(pkg({ response }), {});
    assert.equal(problems.length, 1, JSON.stringify(response));
    assert.match(problems[0], message);
  }
});

test("a margin on a tool is reported", () => {
  const { problems } = buildDescriptor(pkg({ role: "tool", response: { cardinality: "single", baseType: "float", tolerance: "range" } }), {});
  assert.equal(problems.length, 1);
  assert.match(problems[0], /a tool is never scored, so a tolerance makes no sense/);
});
