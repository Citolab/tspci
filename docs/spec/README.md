# PCI Authoring Profile - Proposal 0.1

**An optional profile for QTI 3 Portable Custom Interactions: how a PCI tells an authoring system what it can be
configured with, how it is scored, and how it edits settings that no form field can.**

| | |
| --- | --- |
| Status | Draft for discussion, with a reference implementation (tspci 3) and two conforming authoring systems |
| Builds on | QTI 3.0 Implementation Guide, section 3.7.12 (Portable Custom Interactions) and 6.2.10 (packaging) |
| Schema | [`authoring.schema.json`](authoring.schema.json) (JSON Schema draft-07) |
| Changes from tspci 2 | [`MIGRATION.md`](MIGRATION.md) |

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be read as in RFC 2119.

## 1. Why

QTI 3 defines how a delivery engine runs a PCI. It leaves out how an item author gets the PCI into an item: which
`data-` attributes it reads and what they may contain, which response declaration it needs, how it can be scored, and
which elements of `qti-interaction-markup` it expects. Today that knowledge lives in each PCI's documentation, and each
authoring system has to be taught each PCI by hand. In the Implementation Guide's own example (3.8.2.1), the author must
know that the PCI looks for images with `class="tap"` and reads `data-tap-message` and `data-toggle`.

This profile makes that knowledge machine-readable and adds two optional methods to the object a PCI module registers.
**It changes nothing in delivery.** Everything it defines is either a file next to the module, an optional method a
delivery engine never calls, or a convention for content QTI 3 already has (`data-` attributes,
`qti-interaction-markup`, `qti-interaction-module`). A PCI that conforms is a plain QTI 3 PCI to every player, and an
item written by a conforming authoring system is a plain QTI 3 item.

## 2. Overview

| Part | What | Section |
| --- | --- | --- |
| The descriptor | `authoring.json` next to the PCI's module: properties, response, scoring, markup slots, fixed media, further modules, authoring mode | 3 |
| `getCorrectResponse(properties)` | Optional: the correct response for a set of properties | 4.1 |
| `getAuthoringInstance(dom, configuration)` | Optional: the PCI edits some of its own properties, for the author | 4.2 |
| Markup conventions | How an authoring system writes the author's files and the PCI's own media into `qti-interaction-markup` | 5 |

Conformance classes:

- A **conforming PCI** ships a descriptor that validates against the schema and behaves as the descriptor says.
- A **conforming authoring system** reads the descriptor and writes items as sections 5 and 6 describe. It MAY support
  only part of the profile (for example no authoring mode). It MUST then treat what it does not support as this profile
  says (an unknown editor is a text field, an authoring mode it cannot host leaves the properties as text fields).

## 3. The descriptor

### 3.1 Location

The descriptor is a UTF-8 JSON file named **`authoring.json` in the same folder as the PCI's primary module** (the file
the `primary-path` of the PCI's `qti-interaction-module` points to). In a QTI 3 package it MUST be listed as a `file` of
the `webcontent` resource that holds the module:

```xml
<resource identifier="PCI-myPci-1.2.0" type="webcontent" href="pci/myPci-1.2.0/index.js">
  <file href="pci/myPci-1.2.0/index.js"/>
  <file href="pci/myPci-1.2.0/authoring.json"/>
  <file href="pci/myPci-1.2.0/media/intro.mp4"/>
</resource>
```

A delivery engine ignores the file. All paths in the descriptor are relative to the folder of the primary module.

### 3.2 Top level

| Field | | Meaning |
| --- | --- | --- |
| `descriptorVersion` | required | `"1.0"` |
| `typeIdentifier` | required | The `custom-interaction-type-identifier`, equal to the `typeIdentifier` of the registered object. A globally unique value (`urn:fdc:example.com:2026:pci:pauseVideo`) is RECOMMENDED, as descriptors travel between systems. |
| `version` | | The version of the module. Semver RECOMMENDED. |
| `label` | | The name an author sees. A text (3.3). |
| `properties` | required | The configuration properties (3.4). |
| `response` | required | The response variable the PCI is bound to (3.5). |
| `scoring` | required | How an item with the PCI may be scored (3.6). |
| `correctResponse` | | `"properties"`: the registered object has `getCorrectResponse` (4.1). |
| `markup` | | Slots the author fills in `qti-interaction-markup` (3.7). |
| `media` | | The PCI's own media files (3.8). |
| `modules` | | Further AMD modules of the PCI (3.9). |
| `authoring` | | The PCI has an authoring mode (3.10). |

An authoring system MUST ignore fields it does not know, at every level. Such fields MAY appear in later minor versions.

### 3.3 Texts

A text is a string, or an object of strings keyed by BCP 47 language tag (`{ "en": "Width", "nl": "Breedte" }`). An
authoring system picks the author's language, then a language it has, then any.

### 3.4 Properties

Each key is the name of a property **as the PCI receives it** in `configuration.properties`. QTI 3 (3.7.12.7.1) derives
these names from the `data-` attributes by the rules of `element.dataset`, so the authoring system writes the property
`gridDivisions` as `data-grid-divisions`. Names MUST be camelCase (`^[a-z][A-Za-z0-9]*$`), so the mapping goes both
ways.

| Field | | Meaning |
| --- | --- | --- |
| `editor` | required | How the author edits it (table below) |
| `default` | required | The value the PCI uses without the attribute. A string, as every attribute value is. |
| `label`, `hint` | | Texts for the form |
| `unit` | | Shown next to a number (`"px"`) |
| `required` | | The item needs a value |
| `min`, `max` | | For `integer` and `number` |
| `options` | required for `enum` | `[{ "value": "a", "label": … }]` |

| `editor` | The author gets | The value |
| --- | --- | --- |
| `text`, `textarea` | a text field | any text |
| `integer`, `number` | a number field | `"200"`, `"0.5"` |
| `boolean` | a switch | `"true"` or `"false"` |
| `enum` | a choice of `options` | one of the option values |
| `color` | a colour picker | `"#4b9f4a"` |
| `colorList` | a list of colour pickers | `"#c91a09, #0055bf"` |
| `hidden` | nothing: set by the system, not the author | |
| `pci` | the PCI's own editor (4.2), or a text field without it | whatever the PCI's editor writes |

An authoring system MUST show an editor it does not know as a text field. A PCI MUST work with the `default` of every
property whose attribute is missing or unreadable: the item may have been written by hand or by a system that ignores
the descriptor.

### 3.5 Response

The response variable the PCI fills with `getResponse()`, in the terms of a `qti-response-declaration`:

```jsonc
{ "cardinality": "single", "baseType": "integer" }
{ "cardinality": "record", "fields": { "time": { "baseType": "float", "tolerance": "range" },
                                       "point": { "baseType": "point", "tolerance": "area",
                                                  "when": { "task": ["momentAndPlace"] } } } }
```

`cardinality` is `single`, `multiple`, `ordered` or `record`. A record has `fields` and no `baseType` of its own. QTI
binds a PCI to exactly one response variable, so a PCI that reports several values uses a record. A field has:

| Field | | Meaning |
| --- | --- | --- |
| `baseType` | required | Its QTI base type |
| `label` | | A text for the author |
| `tolerance` | | The kind of margin a scoring rule may give it (below) |
| `when` | | The field is only part of the response for these property values: `{ "<property>": ["value", …] }`, every property listed having one of its values. Without `when` the field is always part of it. |

For an item whose properties do not meet a field's `when`, the field is not part of the correct response nor of the
scoring, and the PCI MAY leave it out of its response.

`tolerance` says which kind of margin a scoring rule may give the response (on a `single` response or on a record
field). The margin itself is response processing that the authoring system writes from the author's rule. The PCI only
says which kind fits:

| `tolerance` | Base types | Response processing |
| --- | --- | --- |
| `range` | `integer`, `float` | `qti-gte`/`qti-lte` around a value, or `qti-equal` with `tolerance-mode` |
| `area` | `point` | `qti-inside` a shape |

### 3.6 Scoring

`scoring` lists one or more of the values below, the first being the default the authoring system offers:

| Value | The PCI is | The authoring system writes |
| --- | --- | --- |
| `match_correct` | scored by comparing the response with the correct response | a `qti-correct-response` and response processing equal to the `match_correct` template (or margins, 3.5) |
| `custom` | scored by response processing the author writes, for a rule a comparison cannot express | the author's `qti-response-processing` |
| `human` | scored by a person | `external-scored="human"` on the outcome the PCI contributes to |
| `none` | a tool (a ruler, a calculator): never scored | no response processing for the PCI's response |

`none` MUST NOT be combined with other values. A response with base type `file` (also as a record field) cannot be
compared, so `match_correct` SHOULD NOT be listed for it.

#### 3.6.1 Where the correct response comes from

For `match_correct`, an authoring system needs the item's correct response. The PCI is its own best editor for that:
whatever the author can answer in the PCI, the PCI can report. The profile knows three ways, and they combine:

| Way | The correct value comes from | Compared |
| --- | --- | --- |
| **From the properties** | `getCorrectResponse(properties)` (4.1), when the descriptor has `correctResponse: "properties"`: the answer follows from the settings, such as 3 of 10 slices coloured → 30 | exactly |
| **By answering** | the author answers the PCI in a preview, and its `getResponse()` becomes the correct response (or one of several accepted ones). Every PCI supports this. | exactly |
| **By answering, with a margin** | the author answers the PCI as above; for a response or record field with `tolerance` the author then gives a margin around that value: a range for a number (± a value, or a minimum and a maximum), an area for a point (a radius around it, `qti-inside` a circle) | within the margin |

An authoring system:

- SHOULD fill the correct response from `getCorrectResponse` when the PCI has it, keep it in line when the author changes
  a property, and let the author choose another one. When it returns `undefined` (no single answer for these
  properties), it asks the author to answer;
- MUST otherwise let the author answer the PCI to set the correct response;
- MAY offer a margin for a response or field with `tolerance`, and then writes the response processing of 3.5 instead of
  the exact `match_correct` comparison. It needs nothing else from the PCI: the value comes from answering, and the
  margin is a number.

A PCI does not prescribe how the author enters a correct value. Its own interface, answered in a preview, is that
editor, so a video PCI needs no video editor in the authoring system: the author pauses the video and clicks, and the
PCI reports `{ "time": 4.1, "point": [455, 250] }` in its own units.

### 3.7 Markup slots

Elements the author places in `qti-interaction-markup`, typically a file from the item's media:

```json
"markup": { "video": { "editor": "media", "element": "video", "accept": ["video/*"], "required": true, "label": "Video" } }
```

| Field | Meaning |
| --- | --- |
| `editor` | `media` (the default): a file the author picks. Other values are reserved. |
| `element` | `img`, `audio`, `video` or `object`; without it, what `accept` asks for, else `img` |
| `accept` | as `<input type="file" accept>`: `image/*`, `image/png`, `.svg` |
| `required` | the item needs one |
| `label` | a text for the author |

See 5.1 for how the authoring system writes the element.

### 3.8 Fixed media

Files that belong to the PCI itself, such as a tutorial video or sprites, and that the author never chooses. They live
next to the module:

```json
"media": { "intro": { "file": "media/intro.mp4", "type": "video/mp4", "element": "video", "size": 812345 } }
```

`file` is relative to the module and MUST NOT leave its folder (no scheme, no leading `/`, no `..`). `element` is
`img`, `audio`, `video` or `object`. See 5.2 for how an authoring system places them.

### 3.9 Further modules

Libraries a PCI loads as AMD modules of their own (to keep any single file small), as a **QTI 3 module resolution
configuration** (Implementation Guide 3.7.12.2), with paths relative to the PCI's module and without `.js`:

```json
"modules": { "paths": { "myPci/modules/three": "modules/three" } }
```

An id SHOULD start with the type identifier, so PCIs with different versions of a library do not share one id on a page.
See 5.3.

### 3.10 Authoring mode

```json
"authoring": { "properties": ["partition"], "label": { "en": "Draw the shape…" }, "width": 960, "height": 760 }
```

`properties` lists the properties the PCI's authoring mode (4.2) fills, exactly those with editor `pci`. `label` is the
text of the button that opens it, and `width`/`height` the size in CSS pixels the PCI would like. The authoring system
MAY give less.

## 4. Factory extensions

A QTI 3 PCI module registers one object with `qtiCustomInteractionContext.register()`, and that object has
`getInstance(dom, configuration, state)`. This profile adds two optional methods to it. A delivery engine never calls
them. An authoring system detects them with `typeof pci.<method> === "function"`.

### 4.1 `getCorrectResponse(properties)`

| | |
| --- | --- |
| **getCorrectResponse(properties)** | The correct response for an item with these properties, for an authoring system that fills `qti-correct-response` and keeps it in line when the author changes a property. Present when the descriptor has `correctResponse: "properties"`. |
| *properties* | The item's properties as `configuration.properties` would have them: strings, keyed by property name. A missing property means its default. |
| returns | The response in the JSON format of Appendix C, exactly what `getResponse()` reports for the correct answer, or `undefined` when these properties have no single correct answer (the authoring system then asks the author). |

It MUST NOT touch the DOM or depend on an instance: it may run in another frame, before any instance exists. Calling
`setResponse(getCorrectResponse(p))` on an instance with properties `p` MUST give that same response from
`getResponse()`. A property that changes the correct answer MUST change what the candidate sees, or the question cannot
be answered.

`getCorrectResponse` is the authoring half of a round trip. Its result becomes the item's `qti-correct-response`. In
delivery, with status `solution`, the delivery engine passes that correct response back to the PCI in
`configuration.responseDeclaration.correctResponse` (agreed by the QTI workgroup, 1EdTech qti-project-management
issue 210: optional, camelCase names, every field optional), and the PCI shows it. The two use different formats:
`getCorrectResponse` returns Appendix C JSON (`{ "base": { "integer": 30 } }`), as `getResponse()` does, while
`responseDeclaration.correctResponse` carries the values (`{ "value": 30 }`). A PCI that shows its solution MUST show
the same answer for both.

### 4.2 `getAuthoringInstance(dom, configuration)`

| | |
| --- | --- |
| **getAuthoringInstance(dom, configuration)** | Renders the PCI's editor for the properties of `authoring.properties` into `dom` and returns an authoring instance. The author edits; the authoring system asks for the properties when the author is done. |
| *dom* | The element to render into, given by the authoring system. |
| *configuration* | The object below. |
| returns | The authoring instance below. |

The *configuration* object:

| Property | |
| --- | --- |
| *properties* | All of the item's properties now, as strings (also the ones the PCI does not edit, so it can show the shape in the item's colours). |
| *language* | *OPTIONAL*. The authoring system's UI language, a BCP 47 tag. |
| *onready* | *OPTIONAL*. Callback the PCI calls with the authoring instance when its editor is ready, as `onready` in `getInstance`. |
| *onchange* | *OPTIONAL*. Callback the PCI calls after every change the author makes. A hint only (for example to warn about unsaved work). |

The authoring instance:

| Member | |
| --- | --- |
| **getProperties()** | The properties of `authoring.properties`, as strings keyed by name. The authoring system writes these, and only these, as `data-` attributes. |
| **validate()** | *OPTIONAL*. A list of texts saying what keeps the properties from being used; an empty list when there is none. The authoring system shows them and does not write while the list is not empty. |
| **oncompleted** | *OPTIONAL*. As on a PCI instance: the authoring system MUST call it before it removes the editor, whether the author finished or cancelled. |

The PCI MUST NOT show its own Done or Cancel buttons and MUST NOT communicate with the authoring system in other ways.
The authoring system owns the dialog and decides when to ask for `getProperties()`. An authoring instance takes no
`state`: there is nothing to resume. Delivery MUST NOT need the authoring mode. Without the properties, or with values it
cannot read, the PCI uses their defaults.

An authoring system SHOULD run the PCI's code in a sandbox, such as an `iframe` with `sandbox="allow-scripts"` and
without `allow-same-origin`, so it cannot reach the editor's session. How the authoring system talks to such a frame is
its own concern and not part of this profile. The tspci repository has a reference page (`authoring-frame.js`).

## 5. Markup conventions

### 5.1 Markup slots

For each slot the author fills, the authoring system writes one element in `qti-interaction-markup`, marked with the
slot's name:

```xml
<qti-interaction-markup>
  <video data-pci-slot="video" src="../assets/bunny.mp4"></video>
</qti-interaction-markup>
```

- The element is the slot's `element` (3.7). `img` gets `src` and an `alt`, `audio` and `video` get `src`, and `object`
  gets `data`.
- `data-pci-slot` MUST be the slot's name. The PCI SHOULD find the element by this attribute, not by its tag, so two
  slots of one kind (`audio1`, `audio2`) can be told apart.
- The file is item content: the authoring system stores, packages and rewrites it like any other media of the item.
- The PCI SHOULD read the elements before it renders into `dom`, since a render may replace them.

### 5.2 Fixed media

For each entry of `media` (3.8), the authoring system writes one hidden element in `qti-interaction-markup`, after the
slots:

```xml
<img data-pci-media="photo" class="qti-hidden" src="../pci/myPci-1.2.0/media/photo.png" alt=""/>
<video data-pci-media="intro" class="qti-hidden" src="../pci/myPci-1.2.0/media/intro.mp4" preload="none"></video>
<object data-pci-media="model" class="qti-hidden" data="../pci/myPci-1.2.0/media/model.glb"></object>
```

- `data-pci-media` MUST be the entry's name. `class="qti-hidden"` (QTI 3 shared vocabulary) keeps it out of sight, as
  the PCI shows it itself.
- `src` (or `data` for `object`) is the file, resolved against the module's location and written relative to the item,
  so every player resolves it and every package carries it.
- When the author moves the item to another version of the PCI, the authoring system MUST replace these elements with
  those of the new version.
- The PCI SHOULD look for `[data-pci-media="<name>"]` first and MAY fall back to resolving the file against its own
  module URL (for players that load the module but keep no markup).

### 5.3 Further modules

For each entry of `modules.paths`, the authoring system writes a `qti-interaction-module` next to the PCI's own:

```xml
<qti-interaction-modules>
  <qti-interaction-module id="pci" primary-path="../pci/myPci-1.2.0/index"/>
  <qti-interaction-module id="myPci/modules/three" primary-path="../pci/myPci-1.2.0/modules/three"/>
</qti-interaction-modules>
```

It MAY instead write the paths into a module resolution configuration that the item references with
`primary-configuration`. Either way, the files go in the package next to the module.

## 6. What an authoring system writes

For a PCI with a descriptor, a conforming authoring system:

1. writes `qti-portable-custom-interaction` with `custom-interaction-type-identifier` = `typeIdentifier`, a
   `qti-interaction-modules` with the PCI's module and its further modules (5.3), and the markup of 5.1 and 5.2;
2. writes each property the author set as a `data-` attribute (3.4), as a string. It MAY leave out a property that
   equals its default;
3. declares the response variable as `response` says (3.5);
4. writes scoring as the author chose from `scoring` (3.6), with the correct response from the author, or from
   `getCorrectResponse` (4.1) when present;
5. writes on Done of an authoring mode only the properties of `authoring.properties` (4.2);
6. puts the module, the descriptor, the fixed media and the further modules in the package as one `webcontent`
   resource that the item depends on (3.1);
7. SHOULD NOT write the item, and SHOULD tell the author why, while a `required` markup slot has no file, a `required`
   property has no value, an `enum` value is not one of its options, or an `integer`/`number` value is not a number or
   lies outside `min`/`max`.

## 7. Example

`authoring.json` of a PCI in which the candidate pauses a video and clicks a moment in it:

```json
{
  "descriptorVersion": "1.0",
  "typeIdentifier": "urn:fdc:citolab.nl:2026:pci:pauseVideo",
  "version": "1.0.0",
  "label": { "en": "Pause the video", "nl": "Pauzeer de video" },
  "properties": {
    "task": {
      "editor": "enum", "default": "momentAndPlace",
      "options": [{ "value": "momentAndPlace", "label": { "en": "Moment and place" } }, { "value": "moment", "label": { "en": "Moment" } }],
      "label": { "en": "Task" }
    },
    "instruction": { "editor": "textarea", "default": "", "label": { "en": "Instruction above the video" } },
    "maxPlays": { "editor": "integer", "default": "0", "min": 0, "label": { "en": "Maximum plays (0 = no limit)" } }
  },
  "markup": { "video": { "editor": "media", "element": "video", "accept": ["video/*"], "required": true, "label": { "en": "Video" } } },
  "response": {
    "cardinality": "record",
    "fields": {
      "time": { "baseType": "float", "tolerance": "range", "label": { "en": "Moment" } },
      "point": { "baseType": "point", "tolerance": "area", "label": { "en": "Position" }, "when": { "task": ["momentAndPlace"] } }
    }
  },
  "scoring": ["match_correct", "human"],
  "media": { "intro": { "file": "media/intro.mp4", "type": "video/mp4", "element": "video", "size": 812345 } }
}
```

The item an authoring system writes with it:

```xml
<qti-portable-custom-interaction response-identifier="RESPONSE" module="pci"
    custom-interaction-type-identifier="urn:fdc:citolab.nl:2026:pci:pauseVideo"
    data-task="moment" data-instruction="Click when the bunny appears">
  <qti-interaction-modules>
    <qti-interaction-module id="pci" primary-path="../pci/pauseVideo-1.0.0/index"/>
  </qti-interaction-modules>
  <qti-interaction-markup>
    <video data-pci-slot="video" src="../assets/bunny.mp4"></video>
    <video data-pci-media="intro" class="qti-hidden" src="../pci/pauseVideo-1.0.0/media/intro.mp4" preload="none"></video>
  </qti-interaction-markup>
</qti-portable-custom-interaction>
```

## 8. Conformance testing

- A descriptor conforms when it validates against [`authoring.schema.json`](authoring.schema.json) and meets the
  MUSTs in section 3 that a schema cannot express (property defaults that the PCI accepts, `authoring.properties` equal
  to the properties with editor `pci`).
- The reference implementation, tspci 3, checks every descriptor it builds against the schema in its test suite
  (`lib/tspci/test/spec.test.mjs`) and fails the build on what it cannot write.
- Interoperability evidence so far: the same PCIs configured in two authoring systems (qti-construction, pci-showcase),
  exported as QTI 3 packages and played in a third-party player (qti-playground, qti-components), with author-picked and
  fixed media. TAO receives the same PCIs through its own package format (`tspci --target tao`), which this profile
  does not cover.

## 9. Open issues

1. **Reserved `data-` attributes.** QTI 3 passes every `data-` attribute to the PCI as a property. Authoring systems
   and players also put their own there (`data-version`, `data-base-url`), which then reach the PCI and can collide
   with a property of the same name. Should the profile reserve a prefix for system attributes, or ask systems to put
   them elsewhere?
2. **Discovering the descriptor.** It is found next to the primary module (3.1). Should the package manifest point to it
   explicitly, for example as QTI metadata on the PCI's resource?
3. **Files made in authoring mode** (a recording, a drawn image). `getProperties()` returns strings only, so such a file
   ends up as a data URL in an attribute, which no system packages as media. A shape to consider:
   `getProperties()` returning `{ properties, media: { slot: Blob } }`, the authoring system storing each file as item
   media and placing it in that slot (5.1).
4. **Live properties.** The authoring mode gets the other properties once, at the start. Should the authoring system
   call the instance again when the author changes one of them while the editor is open?
5. **Several authoring pages** (`authoring: [{ properties, label }]`) for a PCI with more than one complex setting.
6. **The correct response of a record in delivery.** Issue 210 passes `correctResponse.value` to the PCI, but does not
   say what `value` is for a record (a PCI that reports a moment and a position). Appendix C JSON
   (`{ "record": [...] }`) would fit what `getResponse()` and `getCorrectResponse` already use.
7. **Correct responses that answering cannot produce.** A free-form area drawn on the PCI's own surface, or a set of
   accepted answers the PCI cannot show at once, needs the PCI's interface in authoring. A shape to consider: the
   authoring mode (4.2) also returns a correct response and margins. No PCI needs it yet.
8. **Template variables.** QTI 3 also configures a PCI through `qti-template-variable` (3.7.19.6). The descriptor
   cannot yet say which template variables a PCI reads.
