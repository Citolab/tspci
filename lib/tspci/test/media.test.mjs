import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveMedia, mediaDescriptor, mediaModeArgument } from "../src/media.js";
import { buildDescriptor } from "../src/authoring.js";
import { createMedia, MODULE_URLS, slot } from "../src/media-runtime.js";

const project = (files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tspci-media-"));
  for (const [name, size] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), Buffer.alloc(size, 1));
  }
  return root;
};
const pkg = (tspci) => ({ name: "my-pci", version: "1.0.0", config: { tspci: { typeIdentifier: "myPci", ...tspci } } });

test("auto puts small files in the bundle and large ones next to it", () => {
  const root = project({ "src/assets/icon.png": 100, "src/assets/intro.mp4": 20000 });
  const { media, problems } = resolveMedia(root, pkg({ media: { icon: "src/assets/icon.png", intro: { file: "src/assets/intro.mp4" } } }), { mode: null });
  assert.deepEqual(problems, []);
  assert.deepEqual(
    media.map(({ name, file, mode, type, element }) => ({ name, file, mode, type, element })),
    [
      { name: "icon", file: "media/icon.png", mode: "inline", type: "image/png", element: "img" },
      { name: "intro", file: "media/intro.mp4", mode: "file", type: "video/mp4", element: "video" },
    ]
  );
});

test("an entry's mode, the project's mode and --media decide in that order, --media first", () => {
  const root = project({ "a.mp3": 10, "b.mp3": 10 });
  const tspci = { mediaOptions: { mode: "file" }, media: { a: "a.mp3", b: { file: "b.mp3", mode: "inline" } } };
  assert.deepEqual(resolveMedia(root, pkg(tspci), { mode: null }).media.map((m) => m.mode), ["file", "inline"]);
  assert.deepEqual(resolveMedia(root, pkg(tspci), { mode: "inline" }).media.map((m) => m.mode), ["inline", "inline"]);
  assert.equal(mediaModeArgument(["node", "tspci", "--media=file"]), "file");
  assert.equal(mediaModeArgument(["node", "tspci"]), null);
});

test("a missing file, a bad name and an unknown mode are problems", () => {
  const root = project({ "a.png": 10 });
  const { media, problems } = resolveMedia(root, pkg({ media: { gone: "nope.png", "bad name": "a.png", a: { file: "a.png", mode: "huge" } } }), { mode: null });
  assert.equal(problems.length, 3);
  assert.deepEqual(media.map((m) => m.name), ["a"]);
});

test("the descriptor lists only the files, and has no media key without them", () => {
  const root = project({ "a.png": 10, "b.webm": 50000 });
  const { media } = resolveMedia(root, pkg({ media: { a: "a.png", b: "b.webm" } }), { mode: null });
  assert.deepEqual(mediaDescriptor(media), { b: { file: "media/b.webm", type: "video/webm", element: "video", size: 50000 } });
  assert.deepEqual(buildDescriptor(pkg({}), {}, media).descriptor.media, mediaDescriptor(media));
  assert.equal("media" in buildDescriptor(pkg({}), {}, media.filter((m) => m.name === "a")).descriptor, false);
  assert.equal("media" in buildDescriptor(pkg({}), {}).descriptor, false);
});

// a dom with querySelectorAll over elements that have attributes and, like real ones, a resolved src property
const fakeDom = (elements) => ({
  querySelectorAll: () => elements.map((e) => ({ ...e, getAttribute: (name) => e.attributes[name] ?? null })),
});

test("at runtime: inline, then the markup, then next to the module", () => {
  const media = createMedia(
    { icon: { inline: "data:image/png;base64,AA==" }, intro: { file: "media/intro.mp4" } },
    { key: "myPci@1.0.0", typeIdentifier: "myPci" }
  );
  assert.equal(media("icon"), "data:image/png;base64,AA==");

  const dom = fakeDom([{ src: "https://cdn/x/intro.mp4", attributes: { "data-pci-media": "intro" } }]);
  assert.equal(media("intro", dom), "https://cdn/x/intro.mp4");

  globalThis.window = { [MODULE_URLS]: { "myPci@1.0.0": "https://host/pci/index.js" } };
  try {
    assert.equal(media("intro", fakeDom([])), "https://host/pci/media/intro.mp4");
    delete window[MODULE_URLS];
    window.require = { toUrl: (id) => `https://tao/${id}` };
    assert.equal(media("intro"), "https://tao/myPci/interaction/runtime/js/media/intro.mp4");
  } finally {
    delete globalThis.window;
  }
});

test("the copy of src/assets leaves out the fixed media, also in a subfolder", async () => {
  const { copyFiles } = await import("../src/rollup-plugin-copy-files.js");
  const root = project({ "src/assets/logo.png": 10, "src/assets/intro.mp4": 20000, "src/assets/video/clip.webm": 20000 });
  const { media } = resolveMedia(root, pkg({ media: { intro: "src/assets/intro.mp4", clip: "src/assets/video/clip.webm" } }), { mode: null });
  const dist = path.join(root, "dist");
  await copyFiles({ targets: [{ src: path.join(root, "src/assets"), dest: dist }], exclude: media.map((m) => m.source) }).writeBundle();
  assert.ok(fs.existsSync(path.join(dist, "assets/logo.png")));
  assert.ok(!fs.existsSync(path.join(dist, "assets/intro.mp4")));
  assert.ok(!fs.existsSync(path.join(dist, "assets/video/clip.webm")));
});

test("a markup slot is found by its data-pci-slot, not by its tag", () => {
  const dom = fakeDom([
    { src: "a.mp3", attributes: { "data-pci-slot": "audio1" } },
    { src: "b.mp3", attributes: { "data-pci-slot": "audio2" } },
  ]);
  assert.equal(slot("audio2", dom).src, "b.mp3");
  assert.equal(slot("video", dom), null);
  assert.equal(slot("audio1", null), null);
});
