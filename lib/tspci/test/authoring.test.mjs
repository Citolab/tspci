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
  const { descriptor, problems } = buildDescriptor(pkg({ scoring: ["match_correct", "human"] }), {
    mode: { default: "mixed", editor: "enum", options: [{ value: "mixed" }, "single"], label: { en: "Colours" }, $comment: "x" },
  });
  assert.deepEqual(problems, []);
  assert.deepEqual(descriptor.properties.mode, {
    editor: "enum", default: "mixed", options: [{ value: "mixed" }, { value: "single" }], label: { en: "Colours" },
  });
  assert.deepEqual(descriptor.scoring, ["match_correct", "human"]);
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

test("the authoring mode always fills the settings with editor pci; a list of its own is reported, not used", () => {
  const config = {
    audio1Src: { default: "", editor: "pci" },
    audio2Src: { default: "", editor: "pci" },
    volume: { default: "5", editor: "integer" },
  };
  const { descriptor, problems } = buildDescriptor(pkg({ authoring: { properties: ["volume"], label: "Record…" } }), config);
  assert.deepEqual(descriptor.authoring, { label: "Record…", properties: ["audio1Src", "audio2Src"] });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /authoring\.properties is not used/);
});

test("no authoring mode without a pci property; an authoring block alone is reported", () => {
  assert.equal(buildDescriptor(pkg(), { title: "Hi" }).descriptor.authoring, undefined);
  const { descriptor, problems } = buildDescriptor(pkg({ authoring: { label: "Draw" } }), { title: "Hi" });
  assert.equal(descriptor.authoring, undefined);
  assert.match(problems.join("\n"), /nothing to author/);
});

test("a descriptor of profile version 1.0, scored by match_correct by default", () => {
  const { descriptor, problems, errors } = buildDescriptor(pkg(), {});
  assert.deepEqual([problems, errors], [[], []]);
  assert.equal(descriptor.descriptorVersion, "1.0");
  assert.deepEqual(descriptor.scoring, ["match_correct"]);
  assert.equal(descriptor.correctResponse, undefined);
});

test("the correct response can come from the properties", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ scoring: ["match_correct", "human"], correctResponse: "properties" }), {});
  assert.deepEqual(problems, []);
  assert.equal(descriptor.correctResponse, "properties");
});

test("a tool: scoring none, on its own, and no correct response", () => {
  const tool = buildDescriptor(pkg({ scoring: ["none"] }), {});
  assert.deepEqual(tool.problems, []);
  assert.deepEqual(tool.descriptor.scoring, ["none"]);
  const mixed = buildDescriptor(pkg({ scoring: ["none", "match_correct"], correctResponse: "properties" }), {});
  assert.deepEqual(mixed.descriptor.scoring, ["none"]);
  assert.equal(mixed.descriptor.correctResponse, undefined);
  assert.match(mixed.problems.join("\n"), /"none" \(a tool\) is never scored/);
  assert.match(mixed.problems.join("\n"), /a tool has no correct response/);
});

test("custom: the author writes the response processing", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ scoring: ["custom", "human"] }), {});
  assert.deepEqual(problems, []);
  assert.deepEqual(descriptor.scoring, ["custom", "human"]);
});

test("unknown scoring and correct response sources are reported", () => {
  const { descriptor, problems } = buildDescriptor(pkg({ scoring: ["by_hand"], correctResponse: "always" }), {});
  assert.match(problems.join("\n"), /scoring: "by_hand"/);
  assert.match(problems.join("\n"), /correctResponse: "always"/);
  assert.deepEqual(descriptor.scoring, ["match_correct"]);
});

test("a file response can only be scored by a person", () => {
  const response = { cardinality: "record", fields: { audio: { baseType: "file" } } };
  assert.deepEqual(buildDescriptor(pkg({ response, scoring: ["human"] }), {}).problems, []);
  assert.match(buildDescriptor(pkg({ response }), {}).problems.join("\n"), /a file cannot be scored by match_correct/);
});

test("the tspci 2 keys fail the build, with what to write instead", () => {
  const cases = [
    [{ score: ["MATCH_CORRECT", "NONE"] }, /"scoring": \["match_correct","human"\]/],
    [{ role: "tool" }, /"scoring": \["none"\]/],
    [{ role: "tool", score: ["NONE"] }, /"scoring": \["none"\]/],
    // tspci 2: a score of only NONE without a role was a tool; with role question it meant scored by a person
    [{ score: ["NONE"] }, /"scoring": \["none"\]/],
    [{ role: "question", score: ["NONE"] }, /"scoring": \["human"\]/],
    [{ correctResponse: "settings" }, /"settings" is now "properties"/],
    [{ score: ["CUSTOM", "MATCH_CORRECT"] }, /"scoring": \["custom","match_correct"\]/],
  ];
  for (const [tspci, message] of cases) {
    const { errors } = buildDescriptor(pkg(tspci), {});
    assert.equal(errors.length, 1, JSON.stringify(tspci));
    assert.match(errors[0], message);
  }
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
  const { problems } = buildDescriptor(pkg({ scoring: ["none"], response: { cardinality: "single", baseType: "float", tolerance: "range" } }), {});
  assert.equal(problems.length, 1);
  assert.match(problems[0], /a tool is never scored, so a tolerance makes no sense/);
});

test("a record field can depend on the settings (when); editor hints point to answering the PCI", () => {
  const config = { task: { default: "moment", editor: "enum", options: ["moment", "momentAndPlace"] } };
  const fields = (point) => ({ cardinality: "record", fields: { time: { baseType: "float", tolerance: "range" }, point } });
  const ok = buildDescriptor(pkg({ response: fields({ baseType: "point", tolerance: "area", when: { task: ["momentAndPlace"] } }) }), config);
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.descriptor.response.fields.point.when, { task: ["momentAndPlace"] });

  const wrong = buildDescriptor(pkg({ response: fields({ baseType: "point", when: { task: ["somewhere"], mode: ["x"] } }) }), config);
  assert.match(wrong.problems.join("\n"), /when\.task: "somewhere" is not one of its options/);
  assert.match(wrong.problems.join("\n"), /when: "mode" is not a setting in config.json/);

  const hinted = buildDescriptor(pkg({ response: fields({ baseType: "point", editor: "mediaPoint", media: "video", frameField: "time" }) }), config);
  assert.equal(hinted.problems.length, 1);
  assert.match(hinted.problems[0], /editor, media, frameField not in the PCI authoring profile: the author answers the PCI/);
});
