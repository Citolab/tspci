import { test } from "node:test";
import assert from "node:assert/strict";
import postcss from "postcss";
import { shadowRootPropertyDefaults } from "../src/rollup-plugin-postcss-string.js";

const LAYER = "@layerproperties{:host,*,::before,::after,::backdrop{";
const run = (css) => shadowRootPropertyDefaults(postcss.parse(css)).toString().replace(/\s+/g, "");
const layer = (css) => css.slice(css.lastIndexOf(LAYER));

test("copies the initial value of an inherits: false @property into the properties layer", () => {
  const css = run(`@layer properties;
.border { border-style: var(--tw-border-style); border-width: 1px; }
@property --tw-border-style { syntax: "*"; inherits: false; initial-value: solid; }
@property --tw-shadow { syntax: "*"; inherits: false; initial-value: 0 0 #0000; }`);
  assert.ok(css.endsWith(`${LAYER}--tw-border-style:solid;--tw-shadow:00#0000;}}`), css);
});

test("an inherits: false @property without an initial value is reset to initial, so it does not leak into children", () => {
  const css = run(`@property --tw-ring-inset { syntax: "*"; inherits: false; }
@property --tw-ring-color { syntax: "*"; inherits: false; }`);
  assert.equal(layer(css), `${LAYER}--tw-ring-inset:initial;--tw-ring-color:initial;}}`);
});

test("an inherits: true @property is left out, with or without an initial value", () => {
  const css = run(`@property --a { syntax: "*"; inherits: true; initial-value: 1px; }
@property --b { syntax: "*"; inherits: true; }
@property --c { syntax: "*"; inherits: false; initial-value: 0; }`);
  assert.equal(layer(css), `${LAYER}--c:0;}}`);
  assert.equal(shadowRootPropertyDefaults(postcss.parse(`@property --a { syntax: "*"; inherits: true; }`)).toString(), `@property --a { syntax: "*"; inherits: true; }`);
});

test("leaves CSS without @property alone", () => {
  const css = ".a { color: red; }";
  assert.equal(shadowRootPropertyDefaults(postcss.parse(css)).toString(), css);
});
