import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { itemXml, itemScoring, pciFiles, qtiPackage, zip } from "../src/index.js";

const descriptor = (extra = {}) => ({
  descriptorVersion: "1.0",
  typeIdentifier: "pauseVideo",
  version: "1.0.0",
  label: { en: "Pause the video", nl: "Pauzeer de video" },
  properties: {
    task: { editor: "enum", default: "moment", options: [{ value: "moment" }] },
    maxPlays: { editor: "integer", default: "0" },
  },
  markup: { video: { editor: "media", accept: ["video/*"] }, poster: { element: "img" } },
  response: { cardinality: "single", baseType: "float" },
  scoring: ["match_correct", "human"],
  media: {
    intro: { file: "media/intro.mp4", type: "video/mp4", element: "video", size: 10 },
    photo: { file: "media/photo.png", type: "image/png", element: "img", size: 10 },
    evil: { file: "../../secret.js", type: "text/javascript", element: "object" },
  },
  modules: { paths: { "pauseVideo/modules/three": "modules/three", cdn: "https://cdn/lib" } },
  ...extra,
});

test("the files next to the module: module, descriptor, fixed media, further modules; nothing outside its folder", () => {
  assert.deepEqual(pciFiles(descriptor()), ["index.js", "authoring.json", "media/intro.mp4", "media/photo.png", "modules/three.js"]);
});

test("properties are data- attributes in kebab-case, the defaults filled in", () => {
  const xml = itemXml(descriptor(), { properties: { maxPlays: "3" } });
  assert.match(xml, / data-task="moment" data-max-plays="3"/);
  assert.match(xml, /custom-interaction-type-identifier="pauseVideo"/);
  assert.match(xml, /title="Pause the video"/);
});

test("the author's files are marked with their slot, the PCI's own media hidden after them", () => {
  const xml = itemXml(descriptor(), {
    resolve: (f) => `../pci/${f}`,
    slots: { video: { src: "../assets/bunny.mp4" }, poster: { src: "p.png", alt: "A poster" } },
  });
  const markup = xml.match(/<qti-interaction-markup>(.*)<\/qti-interaction-markup>/)[1];
  assert.equal(
    markup,
    '<video data-pci-slot="video" src="../assets/bunny.mp4"></video>' +
      '<img data-pci-slot="poster" src="p.png" alt="A poster"/>' +
      '<video data-pci-media="intro" class="qti-hidden" src="../pci/media/intro.mp4" preload="none"></video>' +
      '<img data-pci-media="photo" class="qti-hidden" src="../pci/media/photo.png" alt=""/>'
  );
  assert.doesNotMatch(xml, /secret/);
});

test("the module and the further modules, without .js; no module from outside the PCI", () => {
  const xml = itemXml(descriptor(), { resolve: (f) => `../resources/pci/${f}` });
  assert.match(xml, /<qti-interaction-module id="pci" primary-path="..\/resources\/pci\/index"><\/qti-interaction-module>/);
  assert.match(xml, /<qti-interaction-module id="pauseVideo\/modules\/three" primary-path="..\/resources\/pci\/modules\/three">/);
  assert.doesNotMatch(xml, /cdn/);
});

test("scoring: match_correct writes the template and the correct response; human marks the outcome; none nothing", () => {
  const matched = itemXml(descriptor(), { correct: "4.5" });
  assert.match(matched, /<qti-correct-response><qti-value>4.5<\/qti-value><\/qti-correct-response>/);
  assert.match(matched, /<qti-match>/);
  const human = itemXml(descriptor(), { scoring: "human" });
  assert.match(human, /base-type="float" external-scored="human"/);
  assert.doesNotMatch(human, /<qti-response-processing>/);
  const tool = itemXml(descriptor({ scoring: ["none"] }), { scoring: "match_correct" });
  assert.doesNotMatch(tool, /<qti-response-processing>|external-scored/);
});

test("the scoring of an item: what the descriptor offers, else its first", () => {
  assert.equal(itemScoring(descriptor()), "match_correct");
  assert.equal(itemScoring(descriptor(), "human"), "human");
  assert.equal(itemScoring(descriptor(), "custom"), "match_correct");
});

const pauseVideo = () =>
  descriptor({
    properties: { task: { editor: "enum", default: "momentAndPlace", options: [{ value: "momentAndPlace" }, { value: "moment" }] } },
    response: {
      cardinality: "record",
      fields: {
        time: { baseType: "float", tolerance: "range" },
        point: { baseType: "point", tolerance: "area", when: { task: ["momentAndPlace"] } },
      },
    },
  });

test("a record: the correct value per field, compared within its margin", async () => {
  const { correctFromResponse } = await import("../src/index.js");
  const correct = correctFromResponse({ record: [{ name: "time", base: { float: 4.1 } }, { name: "point", base: { point: [455, 250] } }] });
  assert.deepEqual(correct, { time: "4.1", point: "455 250" });
  const xml = itemXml(pauseVideo(), { correct, margins: { time: 0.5, point: 20 } });
  assert.match(xml, /<qti-correct-response><qti-value field-identifier="time" base-type="float">4.1<\/qti-value><qti-value field-identifier="point" base-type="point">455 250<\/qti-value><\/qti-correct-response>/);
  assert.match(xml, /<qti-and><qti-and><qti-gte><qti-field-value field-identifier="time"><qti-variable identifier="RESPONSE"><\/qti-variable><\/qti-field-value><qti-base-value base-type="float">3.6<\/qti-base-value><\/qti-gte>/);
  assert.match(xml, /<qti-lte><qti-field-value field-identifier="time">.*?<qti-base-value base-type="float">4.6<\/qti-base-value><\/qti-lte>/);
  assert.match(xml, /<qti-inside shape="circle" coords="455,250,20"><qti-field-value field-identifier="point">/);
});

test("a record field whose `when` does not hold is in neither the correct response nor the scoring", async () => {
  const { appliedFields } = await import("../src/index.js");
  assert.deepEqual(appliedFields(pauseVideo()), ["time", "point"]);
  assert.deepEqual(appliedFields(pauseVideo(), { task: "moment" }), ["time"]);
  const xml = itemXml(pauseVideo(), { properties: { task: "moment" }, correct: { time: "4.1", point: "455 250" }, margins: { time: { min: 4, max: 5 } } });
  assert.doesNotMatch(xml, /point/);
  assert.match(xml, /<qti-and><qti-gte><qti-field-value field-identifier="time">.*?>4<\/qti-base-value><\/qti-gte><qti-lte>.*?>5<\/qti-base-value>/);
  // no correct value: nothing to compare, no response processing
  assert.doesNotMatch(itemXml(pauseVideo()), /<qti-response-processing>/);
});

test("a single response: exact without a margin, within it with one", async () => {
  const { correctFromResponse } = await import("../src/index.js");
  assert.equal(correctFromResponse({ base: { integer: 30 } }), "30");
  assert.deepEqual(correctFromResponse({ list: { identifier: ["A", "B"] } }), ["A", "B"]);
  assert.equal(correctFromResponse(undefined), undefined);
  const number = descriptor({ response: { cardinality: "single", baseType: "float", tolerance: "range" } });
  assert.match(itemXml(number, { correct: "0.75" }), /<qti-match><qti-variable identifier="RESPONSE"><\/qti-variable><qti-correct identifier="RESPONSE">/);
  assert.match(itemXml(number, { correct: "0.75", margin: 0.05 }), /<qti-gte><qti-variable identifier="RESPONSE"><\/qti-variable><qti-base-value base-type="float">0.7<\/qti-base-value>/);
  const point = descriptor({ response: { cardinality: "single", baseType: "point", tolerance: "area" } });
  assert.match(itemXml(point, { correct: "3 4", margin: 1 }), /<qti-inside shape="circle" coords="3,4,1"><qti-variable identifier="RESPONSE">/);
});

test("attribute values are escaped", () => {
  const xml = itemXml(descriptor(), { properties: { task: `"<a & b>"` }, interactionAttributes: { "data-base-url": "https://x/?a=1&b=2" } });
  assert.match(xml, /data-task="&quot;&lt;a &amp; b&gt;&quot;"/);
  assert.match(xml, /data-base-url="https:\/\/x\/\?a=1&amp;b=2"/);
});

test("a package: item, test, manifest, the author's files and the PCI's files", () => {
  const files = { "index.js": "define([],function(){})", "authoring.json": "{}", "media/intro.mp4": new Uint8Array([1, 2]) };
  const out = qtiPackage(descriptor(), { files, slots: { video: { name: "My Bunny.mp4", data: new Uint8Array([3]) } }, language: "nl" });
  assert.deepEqual(Object.keys(out), [
    "imsmanifest.xml", "assessmentTest.xml", "items/ITM-PCI.xml", "items/media/My-Bunny.mp4",
    "resources/pci/index.js", "resources/pci/authoring.json", "resources/pci/media/intro.mp4",
  ]);
  assert.match(out["items/ITM-PCI.xml"], /<video data-pci-slot="video" src="media\/My-Bunny.mp4"><\/video>/);
  assert.match(out["items/ITM-PCI.xml"], /src="..\/resources\/pci\/media\/intro.mp4"/);
  assert.match(out["imsmanifest.xml"], /<file href="items\/media\/My-Bunny.mp4"\/>/);
  assert.match(out["imsmanifest.xml"], /type="webcontent" href="resources\/pci\/index.js"/);
  assert.match(out["assessmentTest.xml"], /xml:lang="nl"/);
  assert.throws(() => qtiPackage(descriptor(), { files: {} }), /module index.js is not in files/);
  const withAssets = qtiPackage(descriptor(), { files, itemFiles: { "assets/logo.png": "x", "../escape.png": "y" } });
  assert.equal(withAssets["assets/logo.png"], "x");
  assert.equal(withAssets["../escape.png"], undefined);
  assert.match(withAssets["imsmanifest.xml"], /<file href="assets\/logo.png"\/>/);
});

test("the zip opens with unzip, with every file intact", { skip: !hasUnzip() }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pci-authoring-"));
  const bytes = new Uint8Array(70000).map((_, i) => (i * 31) % 256);
  fs.writeFileSync(path.join(dir, "p.zip"), zip({ "a.txt": "héllo", "dir/b.bin": bytes, "c/": "" }));
  execFileSync("unzip", ["-q", "-t", "p.zip"], { cwd: dir });
  execFileSync("unzip", ["-q", "p.zip", "-d", "out"], { cwd: dir });
  assert.equal(fs.readFileSync(path.join(dir, "out/a.txt"), "utf8"), "héllo");
  assert.deepEqual(new Uint8Array(fs.readFileSync(path.join(dir, "out/dir/b.bin"))), bytes);
  assert.deepEqual(zip({ x: "1" }), zip({ x: "1" }), "the same files give the same bytes");
});

function hasUnzip() {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("what keeps an item from being written: a required slot or property, a value that does not fit", async () => {
  const { itemProblems } = await import("../src/index.js");
  const d = descriptor({
    markup: { video: { editor: "media", required: true, label: { en: "Video", nl: "Video" } }, poster: { element: "img" } },
    properties: {
      task: { editor: "enum", default: "moment", options: [{ value: "moment" }, { value: "place" }] },
      maxPlays: { editor: "integer", default: "0", min: 0, max: 5, label: "Maximum plays" },
      speed: { editor: "number", default: "1" },
      instruction: { editor: "textarea", default: "", required: true, label: { en: "Instruction", nl: "Instructie" } },
    },
  });
  assert.deepEqual(itemProblems(d, { properties: { instruction: "Go" }, slots: { video: true } }), []);
  const problems = itemProblems(d, { properties: { task: "other", maxPlays: "7", speed: "fast" }, language: "nl" });
  assert.deepEqual(problems.map((p) => p.field), ["markup.video", "properties.task", "properties.maxPlays", "properties.speed", "properties.instruction"]);
  assert.deepEqual(problems.map((p) => p.message), [
    "Video: choose a file first",
    'task: "other" is not one of the options',
    "Maximum plays: at most 5",
    'speed: "fast" is not a number',
    "Instructie: fill this in first",
  ]);
  assert.match(itemProblems(d, { properties: { maxPlays: "1.5", instruction: "x" }, slots: { video: 1 } })[0].message, /not a whole number/);
});

test("a slot the authoring mode makes (editor pci) is written like a picked one; a required one needs it first", async () => {
  const { itemProblems } = await import("../src/index.js");
  const d = descriptor({ markup: { drawing: { editor: "pci", element: "img", required: true, label: "Drawing" } } });
  assert.match(itemXml(d, { slots: { drawing: { src: "media/drawing.png" } } }), /<img data-pci-slot="drawing" src="media\/drawing.png"/);
  assert.deepEqual(itemProblems(d).map((p) => p.message), ["Drawing: make it in the authoring mode first"]);
  assert.deepEqual(itemProblems(d, { slots: { drawing: true } }), []);
});

test("template variables: declared with the author's value and bound to the interaction", async () => {
  const { itemProblems } = await import("../src/index.js");
  const d = descriptor({ templateVariables: { seed: { baseType: "integer", required: true }, range: { baseType: "float", cardinality: "multiple" } } });
  const xml = itemXml(d, { templateValues: { seed: "42", range: ["0", "10"] } });
  assert.match(xml, /<qti-template-declaration identifier="seed" cardinality="single" base-type="integer"><qti-default-value><qti-value>42<\/qti-value><\/qti-default-value><\/qti-template-declaration>/);
  assert.match(xml, /identifier="range" cardinality="multiple" base-type="float"><qti-default-value><qti-value>0<\/qti-value><qti-value>10<\/qti-value>/);
  assert.match(xml, /<\/qti-interaction-markup>\s*<qti-template-variable template-identifier="seed"><\/qti-template-variable>\s*<qti-template-variable template-identifier="range">/);
  assert.doesNotMatch(itemXml(d), /qti-template/);
  assert.deepEqual(itemProblems(d).map((p) => p.message), ["seed: give a value first"]);
});
