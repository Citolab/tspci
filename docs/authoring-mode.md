# Authoring mode: a PCI that configures itself

Status: proposal with a working prototype (tspci `feat/authoring-descriptor`, tspci-examples
`tspci-color-proportions`, qti-construction `feat/pci-record-responses`). Nothing here changes QTI delivery.

## The problem

Some settings of a PCI cannot be edited as a text field, a number or a colour. The colour-proportions PCI asks the
candidate to colour parts of a shape; the shape itself is the setting. An authoring system cannot know how to draw
it. The PCI does: it already has the drawing code. So the PCI gets a second mode, for the item author, and the
authoring system only hosts it.

## Summary

1. The PCI marks the settings it fills itself with `"editor": "pci"` in `src/config.json`. The build lists them in
   `dist/authoring.json` under `authoring`, with an optional button label and size from `package.json`
   (`config.tspci.authoring`).
2. Next to `getInstance`, the object the PCI registers with `qtiCustomInteractionContext` has an optional
   `getAuthoringInstance(dom, configuration)`. It returns `{ getConfig(), validate?(), destroy?() }`.
3. The authoring system shows a "Configure…" button for a PCI whose descriptor has `authoring`. The button opens a
   dialog with a sandboxed iframe. A small host page (the shim) in that iframe loads the PCI's module, calls
   `getAuthoringInstance`, and talks to the dialog by postMessage. Done asks the PCI for `getConfig()` and writes
   the managed values as `data-` attributes, the same way a typed setting is written. Cancel writes nothing.
   TAO's creator (tspci-tao) has the same button but calls the method directly, without iframe or messages.
4. Delivery stays as it is. A player sees ordinary `data-` attributes and calls `getInstance`, nothing else.

## 1. The descriptor

`src/config.json`:

```json
{
  "colors": { "default": "#dc2626, #2563eb, #16a34a", "editor": "colorList" },
  "partition": {
    "default": "",
    "editor": "pci",
    "label": { "en": "Shape to colour", "nl": "Vorm om te kleuren" }
  }
}
```

`package.json` (optional, only for the button and the dialog size):

```json
"config": { "tspci": { "authoring": { "label": { "en": "Draw the shape…", "nl": "Vorm tekenen…" }, "width": 960, "height": 760 } } }
```

`dist/authoring.json` (generated):

```jsonc
{
  "descriptorVersion": "0",
  "properties": {
    "colors": { "editor": "colorList", "default": "#dc2626, #2563eb, #16a34a" },
    "partition": { "editor": "pci", "default": "", "label": { "en": "Shape to colour", "nl": "Vorm om te kleuren" } }
  },
  "authoring": { "properties": ["partition"], "label": { "en": "Draw the shape…" }, "width": 960, "height": 760 }
}
```

- `"editor": "pci"` is set per property, like every other editor. A system that does not know `pci` falls back to a
  text field, which is already the rule for unknown editors. The value is still an ordinary string.
- `authoring.properties` is derived from those properties. An authoring system reads one list and does not have to
  scan the properties. Done writes only these names (see "Trust" below).
- `config.tspci.authoring` without any `pci` property is a build warning. The build does not check that the bundle
  really has `getAuthoringInstance`, because it cannot see that. The host reports a missing method when it opens the
  dialog.
- `descriptorVersion` stays `"0"`, because every field is additive and optional.

## 2. The runtime API on the PCI

```ts
// @citolab/tspci types: the QTI 3 PCI (getInstance) extended with an authoring mode
interface IMSpciAuthoringFactory<T> extends IMSpciFactory<T> {
  getAuthoringInstance(dom: HTMLElement, configuration: PciAuthoringConfiguration<T>): PciAuthoringInstance;
}
interface PciAuthoringConfiguration<T> {
  properties: Partial<T>;          // the item's data- properties now (all of them, as strings)
  language?: string;               // the authoring system's UI language
  onready?: (instance: PciAuthoringInstance) => void;
  onchange?: () => void;           // after every change by the author
}
interface PciAuthoringInstance {
  getConfig(): Record<string, string>;   // the managed properties, as data- attribute strings
  validate?(): string[];                 // what keeps Done from finishing; [] = fine
  destroy?(): void;
}
```

The colour-proportions PCI implements it in a few lines (`src/index.tsx`):

```ts
getAuthoringInstance = (dom, config) => {
  let partition = parsePartition({ ...configProps, ...config.properties }.partition);
  const shadow = dom.attachShadow({ mode: "closed" });
  // … render <Authoring initial={partition} onChange={(p) => { partition = p; config.onchange?.(); }} />
  const instance = {
    getConfig: () => ({ partition: serializePartition(partition) }),
    validate: () => authoringProblems(partition, language),
    destroy: () => render(null, host),
  };
  config.onready?.(instance);
  return instance;
};
```

### Why a method next to `getInstance`

We considered these shapes:

| Shape | Verdict |
| --- | --- |
| `getInstance(dom, { …, authoring: true })` | No. A delivery engine builds this configuration, so a flag there could put a candidate into authoring mode, and a PCI that ignores the flag would silently render delivery. It also mixes two return types (an IMS PCI instance or an authoring instance) behind one call. |
| URL flag, global, or a separate "authoring bundle" | No. These add files or globals, and they break the QTI 3 model where one module registers one object. |
| `pci.authoring = { managed: [...], start(dom, config) }` | Workable, but it duplicates the managed list, which the descriptor already holds and the host needs *before* it loads any code (to show the button). |
| **`getAuthoringInstance(dom, config)` on the registered object** | **Chosen.** It follows the QTI 3 pattern exactly: the module registers one object with `qtiCustomInteractionContext`, and that object has `getInstance`. Support is detected by `typeof pci.getAuthoringInstance === "function"`. Delivery engines never call it. The descriptor says *what* is managed (static, readable without running code), and the method is *how* (only runs when a host asks). |

The method takes no `state` argument (there is nothing to resume), and it has no `onReady` third argument.
`configuration.onready` mirrors `getInstance`'s `onready`, so PCIs that build their UI asynchronously can signal when
it is ready.

### Why Done/Cancel are in the host, not in the PCI

The PCI never calls `postMessage` and never shows Done/Cancel. The host owns the dialog: its buttons, Escape, focus
and the decision to write. So:

- a PCI developer writes plain functions and can test them without an iframe (the tspci dev page does exactly that);
- every PCI's dialog looks and behaves the same in one authoring system;
- the host asks for the configuration once (`getConfig()` on Done), and `onchange` is only a hint (for example to
  warn about unsaved work).

## 3. The host side: shim and messages

The authoring system runs the PCI in `<iframe srcdoc sandbox="allow-scripts">`, with **no** `allow-same-origin`.
The PCI's code then has an opaque origin. It cannot read the editor's DOM, cookies, sessionStorage token or API.
The shim page (`@citolab/tspci/src/authoring-frame.js`, `authoringFrameHtml({ requireJsUrl })`; qti-construction has
the same page in `features/pci/authoringFrame.ts`) does this:

```
frame → host   pci-authoring:hello                       the page listens
host → frame   pci-authoring:init { moduleUrl, typeIdentifier, properties, language }
               (shim: define qtiCustomInteractionContext, require the module; register → getAuthoringInstance)
frame → host   pci-authoring:ready | pci-authoring:change | pci-authoring:error { message }
host → frame   pci-authoring:request-config              the author pressed Done
frame → host   pci-authoring:config { config, problems }
```

Every message carries `version: 1` (`AUTHORING_PROTOCOL_VERSION`, type `PciAuthoringProtocolVersion`). It goes up only
for a change the other side cannot handle; a new optional field keeps it. The shim checks the host's version on `init`
and the host checks the shim's on `hello`. On a mismatch the shim answers with `pci-authoring:error` and loads nothing,
and the host shows an error instead of a dialog that half works.

Both sides check `event.source`: the dialog only listens to its own iframe, and the shim only listens to its parent.
Messages are posted with target `"*"` because a sandboxed frame has no origin to target. The payload never
contains secrets: the module URL is a signed, time-limited file URL that the preview already uses.

**Trust.** The host writes only the names in `authoring.properties`, as strings, through the same function the
settings form uses (`setPciProperty`). A PCI cannot add other attributes, change the markup or the response.

**Undo.** Done is one editor change (`updateInteraction`), so it should undo in one step. This is not verified in the prototype.
Undo *inside* the authoring UI is the PCI's own concern (the pilot has an Undo button).

### TAO: the same API, called directly

The TAO package (`tspci --target tao`, `@citolab/tspci-tao`) has its own host, without the shim and without messages.
When `src/config.json` has `editor: "pci"` settings, the generator adds a button with the authoring label to the
properties form (`{{__ "Draw the shape…"}}`, TAO's i18n, with the English label; "Configure…" without one), above
the first managed setting, and the code behind it to `interaction/creator/widget/states/Question.js`. On click:

1. It opens TAO's modal (`ui/modal`), or a plain overlay if the creator has no such module, with Cancel and Done.
   The PCI's container gets `authoring.width/height`, capped at 70vh (it scrolls beyond that).
2. It requires the runtime module (`<typeIdentifier>/interaction/runtime/js/index`, already loaded for the item)
   and calls `getAuthoringInstance(container, { properties, language, onready })`. `properties` are all settings
   as `interaction.prop(name)` gives them now, as strings; `language` is the `lang` of TAO's page. A module whose
   value has no `getAuthoringInstance` falls back to the hook it registered with TAO's
   `qtiCustomInteractionContext` (`window._pciHooks`). If neither has it, the dialog says so and Done stays off.
3. Done calls `validate()`. Problems are shown and the dialog stays open. Otherwise each name in
   `authoring.properties` that `getConfig()` returns is written as a string with `interaction.prop(name, value)` and
   `interaction.triggerPci(name, value)`, exactly what the form's own fields do, and the text field is updated.
   Cancel, the close button and Escape write nothing. Every way out calls `destroy()`.

Why no iframe here: TAO already runs the PCI's code in its creator page with the same RequireJS (that is how the
item preview renders it), so a sandbox would not keep anything out that is not already in. Calling the method
directly also needs no protocol to keep in step with the other hosts.

The managed text field stays visible below the button. The PCI may not have an authoring mode (an older version of
the module, or one that fails to load), and then the field is the only way to change the setting. It is also how an
author clears the value to get the PCI's default back, or copies a shape from another item. It shows a value nobody
types by hand, but hiding it would make those cases impossible, and Done keeps it in step.

A PCI without `editor: "pci"` settings gets exactly the package it got before: the generator removes its marker
from `Question.js` and adds no button.

## 4. QTI and delivery

There is nothing new in QTI. The result of authoring mode is a `data-` attribute on
`qti-portable-custom-interaction`, here `data-partition="{&quot;width&quot;:512,…}"` (JSON, escaped like any
attribute value). Export, import, revisions and diffs treat it as an ordinary attribute. A player passes it as
`config.properties.partition`, as with every other setting.

## 5. Compatibility

The constraint is that any other authoring system or player that imports the PCI (a normal QTI 3 or TAO package)
must keep working. This is how the design meets it, and how we checked it:

| Requirement | How | Checked |
| --- | --- | --- |
| Delivery works as before with plain `data-` attributes | Delivery reads `data-partition` like any setting. If it is missing, empty or unreadable, the PCI uses the shape it always had (`DEFAULT_PARTITION` is the old SVG, line for line). The response is unchanged too: the same `[{color, percentage}]`, with the same percentages for the same colouring. | `npm run package-qti3`, packaged item as-is (no `data-partition`) in qti-components from the CDN: the default shape renders. Colouring the top half gives `[{"color":"#dc2626","percentage":50}]` and SCORE 1 against a match-correct rule; also colouring the quarter gives 75 % and SCORE 0. |
| Saved states and stored correct responses keep working | Old state ids (`"192"`, `"96"`, …) are mapped to the new part ids on restore. A correct response from before the change is the same string. | A state saved with the old ids restores and reports `[{#2563eb, 25}, {#dc2626, 50}]`. |
| Authoring mode stays dormant | `getAuthoringInstance` is only a method on the registered object. The PCI adds no files, no required attributes and no globals, and the bundle contains no `postMessage`. Messages exist only between a host and *its own* shim page. | `grep postMessage dist/index.js` finds nothing. The package contents are the same as before plus nothing new (`authoring.json` was already there). |
| Extra descriptor fields are optional and ignorable | `authoring` is an extra top-level key. `editor: "pci"` falls back to a text field in systems that do not know it. TAO's form (tspci-tao) adds a "Configure…" button for them and keeps the text field below it (see "TAO" above). | tspci-tao package built: `partition: ""` in `imsPciCreator.js`, the button and the text field in the properties form. The packages of tspci-vanilla-js and tspci-3d-blocks (no `pci` settings) are byte for byte the same as before. qti-construction without the new code would show the generic text field. |
| Only systems that implement the API get "Configure…" | The button needs both `authoring` in the descriptor and a host that implements the shim. The shim reports a PCI without `getAuthoringInstance` as an error, so the button never pretends. | Component test: a frame that reports "no authoring mode" shows the error, and Done stays disabled. |

The one behavioural change in delivery is a fix: restoring `getState()` output used to pass the `{ state, log }`
wrapper to the store as if it were the state. It now unwraps it.

## 6. The pilot: colour proportions

- **Authoring.** The author sees a rectangle on squared paper with its parts tinted and labelled with their share
  (1/2, 1/8, …). Dragging draws a horizontal or vertical line, snapped to 1/4, 1/8 or 1/16 of the sides (the "Snap
  lines to" setting, default 1/8). Lines may start on other lines. Clicking a line selects it (Delete removes it). A
  corner handle and two number fields set the size (128–1024 units, steps of 32). There are also Undo, "Remove all
  lines" and "Standard shape". A line that splits nothing is shown dashed in orange, with a note that the candidate
  will not see it. `validate()` refuses a shape with fewer than two parts.
- **Format** (`src/partition.ts`): `{"width":512,"height":768,"snap":8,"lines":[[x1,y1,x2,y2],…]}`, with coordinates
  in sixteenths of the sides for every snap. Changing the snap never moves a line. Parts are found by flood fill over
  16 × 16 cells, so every share is n/256 and the percentages are exact binary fractions (no rounding noise in
  scoring).
- **Delivery** draws the parts and the lines *between different parts* (not the raw lines), so stray lines are
  invisible. The palette, eraser and "Start over" work as before. Parts are focusable and can be painted with
  Enter/Space; this is not browser-tested yet.
- **Response.** Unchanged: colours with their share in percent, sorted, as one string (`single`/`string`).
  `setResponse` and the correct-response view find *a* colouring with those shares (a small backtracking search over
  the parts, largest first), as before.

## 7. What is hard, honestly

- **Two hosts, one protocol.** The shim exists twice now (tspci reference in JS, qti-construction in TS). It is
  small and has tests on both sides, and every message carries the protocol version (section 3), so a host and a shim
  that drift apart say so instead of failing silently.
- **Module loading.** The shim uses RequireJS, like delivery. A PCI that needs `require.config` paths or shims, or
  several modules, needs the same handling as the qti-components loader. The prototype loads one primary module.
- **Signed URLs.** The module URL is time-limited (12 h in qti-construction). A dialog left open longer still works,
  because the module is loaded once at the start.
- **CORS and CSP.** The sandboxed frame loads RequireJS from the app origin and the PCI from the library origin as
  classic scripts, so CORS does not apply. A Content-Security-Policy on the app must allow `frame-src`/`srcdoc` and
  those script origins. qti-construction has no CSP today.
- **Size.** The dialog asks for `authoring.width/height` and caps at 96vw/70vh. The PCI must fit itself. The pilot
  scales its SVG.
- **Accessibility.** The host dialog is accessible (Radix). Inside the frame it is up to the PCI. The pilot has
  labelled controls, numeric size fields and keyboard deletion, but drawing lines still needs a pointer. A
  keyboard way to add a line (pick two grid points) would be the next step.
- **Validation is advisory.** `validate()` runs in the PCI. The item can still be edited by hand (the XML editor),
  so delivery must accept any `data-partition` and fall back to the default when it cannot read it. The pilot does.
- **Bundle size.** The authoring UI ships in the delivery bundle (the pilot's whole `dist/index.js` is 73 KB
  minified). A PCI with a heavy editor could load it lazily in `getAuthoringInstance`.

## 8. Open questions

1. Should the descriptor allow `authoring` without managed properties, for PCIs that only want to *show* a richer
   preview? This proposal says no.
2. Should the PCI also see the item's other settings live while authoring (the colours change, so the preview
   changes)? Today it gets them once at the start.
3. Is one button per PCI enough, or do we need several authoring "pages" (`authoring: [{ properties, label }]`)?
4. TAO has the "Configure…" button now (see "TAO" above), tested with stubbed TAO modules in a browser. Does Done in a
   real TAO creator mark the item as changed and undo in one step, as the form fields do?
