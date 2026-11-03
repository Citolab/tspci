import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { authoringFrameHtml } from "../src/authoring-frame.js";

/** Runs the frame's bootstrap with a fake RequireJS and window; returns what it posted and a way to send it messages. */
function runFrame(factory) {
  const posted = [];
  const listeners = {};
  const modules = {};
  // JSON: objects made in the vm context have its prototypes, which deepEqual tells apart
  const host = { postMessage: (message) => posted.push(JSON.parse(JSON.stringify(message))) };
  const window = { parent: host, addEventListener: (type, fn) => (listeners[type] = fn) };
  const pciDom = { id: "pci" };
  const context = {
    window,
    document: { documentElement: {}, getElementById: () => pciDom },
    define: (name, deps, fn) => (modules[name] = fn()),
    requirejs: Object.assign(
      (ids, ok) => {
        modules.qtiCustomInteractionContext.register(factory);
        ok();
      },
      { config: (c) => (context.requireConfig = c) },
    ),
  };
  const script = /<script>([\s\S]*)<\/script>/.exec(authoringFrameHtml({ requireJsUrl: "https://x/require.js" }))[1];
  vm.runInNewContext(script, context);
  const send = (data) => listeners.message({ source: host, data });
  return { posted, send, context, pciDom };
}

test("the frame says hello, loads the module from init and reports ready", () => {
  let received;
  const { posted, send, context, pciDom } = runFrame({
    getAuthoringInstance: (dom, config) => {
      received = { dom, config };
      config.onready();
      return { getProperties: () => ({ partition: "{}" }) };
    },
  });
  assert.deepEqual(posted, [{ type: "pci-authoring:hello", version: 1 }]);
  send({ type: "pci-authoring:init", version: 1, moduleUrl: "https://lib/signed/index.js", typeIdentifier: "x", properties: { a: "1" }, language: "nl" });
  assert.deepEqual({ ...context.requireConfig.paths }, { pci: "https://lib/signed/index" });
  assert.equal(received.dom, pciDom);
  assert.deepEqual({ ...received.config.properties }, { a: "1" });
  assert.equal(received.config.language, "nl");
  send({ type: "pci-authoring:request-config", version: 1 });
  assert.deepEqual(posted.slice(1), [
    { type: "pci-authoring:ready", version: 1 },
    { type: "pci-authoring:config", version: 1, config: { partition: "{}" }, problems: [] },
  ]);
});

test("the PCI's other modules are mapped by their id, next to the PCI itself", () => {
  const { send, context } = runFrame({ getAuthoringInstance: () => ({ getProperties: () => ({}) }) });
  send({
    type: "pci-authoring:init",
    version: 1,
    moduleUrl: "https://lib/signed/index.js",
    modulePaths: { "myPci/modules/three": "https://lib/signed/modules/three.js" },
    typeIdentifier: "myPci",
    properties: {},
  });
  assert.deepEqual({ ...context.requireConfig.paths }, { "myPci/modules/three": "https://lib/signed/modules/three", pci: "https://lib/signed/index" });
});

test("a PCI without an authoring mode is reported as an error; validation problems go along with the config", () => {
  const { posted, send } = runFrame({ getInstance: () => ({}) });
  send({ type: "pci-authoring:init", version: 1, moduleUrl: "m", properties: {} });
  assert.equal(posted.at(-1).type, "pci-authoring:error");
  assert.match(posted.at(-1).message, /no authoring mode/);

  const second = runFrame({ getAuthoringInstance: () => ({ getProperties: () => ({}), validate: () => ["Draw a line"] }) });
  second.send({ type: "pci-authoring:init", version: 1, moduleUrl: "m", properties: {} });
  second.send({ type: "pci-authoring:request-config", version: 1 });
  assert.deepEqual(second.posted.at(-1), { type: "pci-authoring:config", version: 1, config: {}, problems: ["Draw a line"] });
});

test("a host that speaks another protocol version gets an error and nothing is loaded", () => {
  let called = false;
  const { posted, send, context } = runFrame({ getAuthoringInstance: () => ((called = true), { getProperties: () => ({}) }) });
  send({ type: "pci-authoring:init", version: 2, moduleUrl: "m", properties: {} });
  assert.equal(posted.at(-1).type, "pci-authoring:error");
  assert.match(posted.at(-1).message, /protocol version 2/);
  assert.equal(called, false);
  assert.equal(context.requireConfig, undefined);
});

test("the RequireJS url is escaped into the page", () => {
  assert.match(authoringFrameHtml({ requireJsUrl: 'https://x/r.js?a=1&b="2"' }), /src="https:\/\/x\/r\.js\?a=1&amp;b=&quot;2&quot;"/);
});

test("the files of the authoring mode (getMedia, also a promise) go along with the properties", async () => {
  const drawing = { name: "drawing.png", type: "image/png" };
  const { posted, send } = runFrame({
    getAuthoringInstance: () => ({ getProperties: () => ({ shape: "1" }), getMedia: () => Promise.resolve({ drawing, old: null }) }),
  });
  send({ type: "pci-authoring:init", version: 1, moduleUrl: "m", properties: {} });
  send({ type: "pci-authoring:request-config", version: 1 });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(posted.at(-1), { type: "pci-authoring:config", version: 1, config: { shape: "1" }, media: { drawing, old: null }, problems: [] });
});
