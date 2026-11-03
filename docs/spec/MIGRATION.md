# Migrating to tspci 3 and the PCI Authoring Profile 1.0

tspci 3 writes `authoring.json` as the PCI Authoring Profile 1.0 describes ([README.md](README.md)). The descriptor
of tspci 2 (`descriptorVersion "0"`) used tspci's own names; 1.0 uses the names of QTI 3 and neutral names in item
markup. This is a hard switch: tspci 3 neither reads nor writes the old names, and the build stops on the old keys,
telling you what to write instead.

What is in a delivered item stays a plain QTI 3 PCI. Only PCIs that use the parts below, and the authoring systems that
read their descriptors, need changes.

## For PCI developers

### 1. `package.json` → `config.tspci`

| tspci 2 | tspci 3 |
| --- | --- |
| `"score": ["MATCH_CORRECT", "NONE"]` (a question) | `"scoring": ["match_correct", "human"]` |
| `"score": ["MATCH_CORRECT"]` | `"scoring": ["match_correct"]` (also the default without `scoring`) |
| `"score": ["CUSTOM", …]` | `"scoring": ["custom", …]` |
| `"score": ["NONE"]`, or `"role": "tool"` | `"scoring": ["none"]` |
| `"role": "question", "score": ["NONE"]` | `"scoring": ["human"]` |
| `"role": …` | removed: `["none"]` is the tool |
| `"correctResponse": "settings"` | `"correctResponse": "properties"` |

The build fails on `score`, `role` and `"correctResponse": "settings"`, and its message gives the `scoring` to write.

`NONE` used to mean "never scored" for a tool and "scored by a person" for a question. The two now have their own values,
`none` and `human`. For TAO nothing changes: `tspci --target tao` turns `match_correct` into TAO's `MATCH_CORRECT`,
`custom` into `CUSTOM` and `human`/`none` into `NONE`.

### 2. The authoring mode

If your PCI has `getAuthoringInstance`, rename two members of the instance it returns:

```diff
 const instance = {
-  getConfig: () => ({ partition: serialize(shape) }),
+  getProperties: () => ({ partition: serialize(shape) }),
   validate: () => problems(shape),
-  destroy: () => render(null, host),
+  oncompleted: () => render(null, host),
 };
```

Hosts of tspci 3 (the dev page, tspci-tao, qti-construction, pci-showcase) call `getProperties` and `oncompleted` only.
A PCI that still has `getConfig` reports nothing on Done.

### 3. Fixed media and markup slots

- The fixed media of `config.tspci.media` are now marked `data-pci-media` (was `data-tspci-media`). `media(name, dom)`
  from `@citolab/tspci/media` looks for the new attribute, so rebuilding with tspci 3 is enough. Items that an authoring
  system wrote with the old attribute need the PCI inserted again (or the attribute renamed), or the PCI falls back to
  the file next to its module.
- The elements an author puts in your markup slots now carry `data-pci-slot="<slot>"`. Find them with the new `slot()`:

  ```ts
  import { slot } from "@citolab/tspci/media";
  const video = slot("video", dom) as HTMLVideoElement | null; // before you render into dom
  ```

  A PCI that finds its slot by tag (`dom.querySelector("video")`) keeps working with one slot of that kind. With two
  (`audio1`, `audio2`), only `slot()` tells them apart.

### 4. Checklist

- [ ] `config.tspci`: `scoring` instead of `score`/`role`, `"correctResponse": "properties"`
- [ ] `getAuthoringInstance`: `getProperties` and `oncompleted`
- [ ] a markup slot: `slot(name, dom)` instead of a tag selector
- [ ] `npm run prod` builds without errors and `dist/authoring.json` has `"descriptorVersion": "1.0"`

## For authoring systems

Read `descriptorVersion`. For `"1.0"`:

| Descriptor 0 (tspci 2) | 1.0 |
| --- | --- |
| `role: "tool"` | `scoring: ["none"]` |
| `role: "question"` + `score: ["NONE"]` | `scoring: ["human"]`: write `external-scored="human"` |
| `score: ["MATCH_CORRECT", …]` | `scoring: ["match_correct", …]`, the first being the default (`CUSTOM` → `custom`) |
| `correctResponse: "settings"` | `correctResponse: "properties"` |
| `modules: { "<id>": { file: "modules/three.js", package, version } }` | `modules: { paths: { "<id>": "modules/three" } }`, a QTI 3 module resolution configuration (no `.js`; package versions are in the SBOM) |

In the item:

| Before | Now |
| --- | --- |
| `<video data-tspci-media="intro" class="qti-hidden" …>` | `<video data-pci-media="intro" class="qti-hidden" …>` |
| `<video src="…">` for the author's file | `<video data-pci-slot="video" src="…">` |

In an authoring mode host (an iframe page or a direct call), call `instance.getProperties()` instead of
`instance.getConfig()`, and `instance.oncompleted()` instead of `instance.destroy()`. The postMessage protocol of the
tspci reference frame is unchanged (version 1): its `pci-authoring:config` message carries what `getProperties()`
returned.

When a version 0 descriptor arrives (a PCI built with tspci 2), an authoring system MAY map it with the tables above. The
reference systems do not: a PCI is rebuilt with tspci 3 and uploaded again.
