# Authoring: how an authoring system configures and scores this PCI

A PCI does not only run in a test player. An item author places it in an item in an authoring system (such as
qti-construction or TAO), sets it up, and decides what counts as a correct answer. This file explains what the
authoring system learns from your project and what your PCI has to do for it. tspci does the packaging; you only
fill in two files.

## 1. Settings: `src/config.json`

Every key is a setting of your PCI. In an item it becomes a `data-` attribute (`width` → `data-width`), and your PCI
receives it in `config.properties` (always as a string, as attributes are).

A value can be a plain default, as in every tspci project:

```json
{ "title": "Percentages", "width": "200" }
```

or an object with a `default` plus hints for the author's form:

```json
{
  "width": { "default": "200", "editor": "integer", "min": 50, "label": { "en": "Width (px)", "nl": "Breedte (px)" } },
  "mode": {
    "default": "mixed",
    "editor": "enum",
    "options": [
      { "value": "mixed", "label": { "en": "Multiple colours" } },
      { "value": "single", "label": { "en": "One colour" } }
    ]
  },
  "colors": { "default": "#c91a09, #0055bf", "editor": "colorList" }
}
```

| editor | the author gets | value |
| --- | --- | --- |
| `text` | a text field | any text |
| `textarea` | a larger text field | any text |
| `integer`, `number` | a number field (`min`, `max`) | `"200"` |
| `boolean` | a switch | `"true"` / `"false"` |
| `enum` | a dropdown of `options` | one of the option values |
| `color` | a colour picker | `"#4b9f4a"` |
| `colorList` | a list of colour pickers | `"#c91a09, #0055bf"` |
| `hidden` | nothing (set by the system, not the author) | |
| `pci` | a "Configure…" button that opens your PCI's own editor (section 6) | whatever your editor writes, as a string |

A plain value gets an editor from its value: `"true"`/`"false"` a switch, a whole number a number field, the rest a
text field. `label` is one string or one per language. An authoring system that does not know an editor shows a
text field, so a hint never makes a setting unusable.

The build passes **only the defaults** to your PCI, so `import configProps from "./config.json"` keeps working. Type
it with `PciProperties`:

```ts
import { PciProperties } from "@citolab/tspci";
import configProps from "./config.json";
type PropTypes = PciProperties<typeof configProps>; // { width: string; mode: string; ... }
```

## 2. The response: `package.json` → `config.tspci`

```json
"config": {
  "tspci": {
    "typeIdentifier": "myPci",
    "label": "My PCI",
    "response": { "cardinality": "single", "baseType": "integer" },
    "score": ["MATCH_CORRECT", "NONE"]
  }
}
```

- **`response`** is the response variable your PCI fills with `getResponse()`. It must be what your code returns:
  `{ base: { integer: 30 } }` is `single` / `integer`. The package's item declares it, and an authoring system uses it
  for every new item with your PCI.
- **`score`** lists the scoring your PCI is made for: `MATCH_CORRECT` (the response equals the correct one) and/or
  `NONE` (not scored, or scored by a person). TAO offers exactly these. The first one is the default.
- **`correctResponse: "settings"`** says your PCI can tell the correct response from its settings
  (`getCorrectResponse`, section 4). Leave it out when the correct answer is not in the settings.
- **`tolerance`** on a `single` response (or on a record field) says which margin a score rule may give it: `range`
  for an `integer` or `float`, `area` for a `point` (section 4).
- **`role: "tool"`** (or a `score` of only `["NONE"]`) makes your PCI a tool that is never scored (section 5).

A PCI that reports several values (a moment and a position, say) uses one variable with **record** cardinality:
QTI binds a PCI to exactly one response variable, and a record has named fields of their own type.

```json
"response": {
  "cardinality": "record",
  "fields": {
    "time":  { "baseType": "float", "tolerance": "range", "label": { "en": "Moment" } },
    "point": { "baseType": "point", "tolerance": "area",  "label": { "en": "Position" } }
  }
}
```

`getResponse()` then returns `{ record: [{ name: "time", base: { float: 4.1 } }, { name: "point", base: { point: [455, 250] } }] }`.
`tolerance` tells the authoring system what kind of margin a score rule may give a field: `range` (between two
numbers) or `area` (a point inside a shape). Elements the author puts in your `qti-interaction-markup`, such as a
video, go in `markup`: `"markup": { "video": { "editor": "media", "accept": ["video/*"], "required": true } }`.

## 3. What the build makes of it

`tspci` (and `tspci --dev`) writes `dist/authoring.json`, generated from both files, and warns about what an
authoring system could not use (an unknown editor, an enum default that is not one of its options, a record field
without a base type). `tspci --target qti3` puts it in the package next to the bundle, as a file of the PCI resource
(`resources/pci/authoring.json`), like the SBOM; `--no-authoring` leaves it out. `tspci --target tao` builds TAO's
settings form from the same `config.json`.

## 4. Correct answers: what your PCI must do

Authors set the correct answer **by answering your PCI** in a preview ("answer in preview"): whatever `getResponse()`
reports becomes the correct response, or one of several accepted answers. Scoring then compares responses, so:

- **One answer, one response.** Report the meaning, not the route: two ways to build the same thing must give the
  same response (sort lists, round numbers, leave out ids, order and timestamps). A response that differs in a
  detail the author did not mean scores 0.
- **Report the type you declared.** A number as `integer`/`float`, not a JSON string with quotes in it.
- **Nothing answered, nothing reported.** Return `undefined` until the candidate did something.
- **Show a given answer.** `setResponse()` and `boundTo` must restore a response, and with `status: "solution"` your
  PCI receives `responseDeclaration.correctResponse` and should show it (`showCorrectResponse()`); that is how an
  author checks the answer and how a candidate sees it in review.
- **Margins live in the item, not in the PCI.** A time window or an area is response processing
  (`qti-field-value`, `qti-gte`/`qti-lte`, `qti-inside`) that the authoring system writes from the author's rules.
  Your PCI reports the raw answer and only says which kind of margin fits, with `tolerance`: `range` (0,75 ± 0,05) or
  `area` (within 1 of the point (3, 4), in your PCI's own units). Prefer snapping when the answer has steps (a number
  line in quarters): then the exact match already works and nobody needs a margin.

### The correct response from the settings

In a configurable PCI the correct answer usually follows from the settings: 3 of 10 slices coloured → 30. Instead of
letting the author answer your PCI again after every change, export `getCorrectResponse` next to `getInstance`:

```ts
const factory: IMSpciFactory<PropTypes> = {
  typeIdentifier: "myPci",
  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
  // the data- properties as strings (a missing one means its default) → what getResponse() reports for the answer
  getCorrectResponse: (properties) => {
    const { segments, colored } = pieSettings({ ...configProps, ...properties });
    return { base: { integer: Math.round((colored / segments) * 100) } };
  },
};
```

and set `"correctResponse": "settings"` in `config.tspci`. An authoring system that supports it fills the item's
correct response with it and keeps it in line when the author changes a setting; the author can still choose another
answer. Players never call it. Rules:

- **Parse the settings exactly as your drawing does** (share the function), so the correct answer and what the
  student sees cannot disagree.
- **The student must be able to see what is asked.** If a setting changes the correct answer, it must change what the
  student sees before answering (the fraction to place, the coordinates, the number of slices): a "correct value"
  setting that is never shown makes the question unanswerable.
- **Return a response your PCI can show**: `setResponse(getCorrectResponse(p))` on an instance with the same settings
  must give the same `getResponse()`.
- **`undefined` when there is no single answer** for these settings (3/5 on a line in steps of 0.25): the authoring
  system then asks the author.
- **No DOM, no instance**: it may run on its own, in another frame, before any instance exists.

## 5. A tool: never scored

Not every PCI is a question. A ruler, a protractor, a calculator or a scratch number line helps the student, and its
use is never scored. Mark it with `"role": "tool"` (or a `score` of only `["NONE"]`) in `config.tspci`:

```json
"config": { "tspci": { "typeIdentifier": "ruler", "role": "tool", "score": ["NONE"],
  "response": { "cardinality": "single", "baseType": "string" } } }
```

QTI binds every PCI to a response variable, so a tool still has one; it may stay `undefined`, or carry the tool's
state (where the ruler lies) for review. An authoring system shows it as "not scored" and offers no correct answer;
`correctResponse` and `tolerance` make no sense on a tool, and the build warns about them. Everything else still
applies: settings, `getState()` and restore, the read-only statuses, keyboard use.

## 6. Authoring mode: settings your PCI edits itself

Some settings cannot be a text field or a number: a shape, a set of areas, a path. Give such a setting
`"editor": "pci"` and let your PCI edit it. Your PCI then has a second mode, for the item author:

```json
"partition": { "default": "", "editor": "pci", "label": { "en": "Shape to colour" } }
```

In `package.json`, `config.tspci.authoring` can set the button text and the size you would like
(`{ "label": { "en": "Draw the shape…" }, "width": 960, "height": 760 }`). The descriptor then has
`"authoring": { "properties": ["partition"], ... }`.

Next to `getInstance`, the object you register gets a method that an authoring system calls instead. A player never
calls it:

```ts
getAuthoringInstance = (dom: HTMLElement, config: PciAuthoringConfiguration<PropTypes>): PciAuthoringInstance => {
  // render your editor into dom, starting from config.properties; call config.onchange?.() after each change
  const instance = {
    getConfig: () => ({ partition: JSON.stringify(shape) }), // only the "pci" properties, as strings
    validate: () => (shape.parts < 2 ? ["Draw at least one line"] : []), // optional: what keeps Done from finishing
    destroy: () => { /* unmount */ },
  };
  config.onready?.(instance);
  return instance;
};
```

The authoring system runs this in a sandboxed iframe (TAO calls it directly in its creator page) and owns the
Done and Cancel buttons. Done writes what
`getConfig()` returns as `data-` attributes, and delivery reads them like any other setting. Two rules:

- **Delivery must not need authoring mode.** Without the attribute, or with one it cannot read, your PCI uses its
  default. Other players and authoring systems never call `getAuthoringInstance`, and an authoring system that does
  not know `pci` shows the setting as a text field.
- **No messages, no globals.** Your PCI never calls `postMessage`; the authoring system's own page in the iframe does
  that.

`tspci --dev` shows the button in the config panel: it runs your editor in place of the preview, and Done updates
the property. See `docs/authoring-mode.md` in the tspci repository for the protocol and the reasons behind it.

## Checklist

- [ ] every setting in `src/config.json` has a `default`, an `editor` and a `label`
- [ ] `config.tspci.response` matches what `getResponse()` returns
- [ ] `getResponse()` gives the same response for the same answer, and `undefined` without one
- [ ] `setResponse()` / `boundTo` and `status: "solution"` show a given response
- [ ] when the correct answer follows from the settings: `getCorrectResponse` and `"correctResponse": "settings"`, and
      every setting that changes the correct answer is visible to the student
- [ ] a tool: `"role": "tool"`, no correct response
- [ ] `npm run prod` writes `dist/authoring.json` without warnings
- [ ] with an authoring mode: delivery works without the `pci` properties (it uses the defaults)
