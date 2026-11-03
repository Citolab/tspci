# @citolab/pci-authoring

Write QTI 3 items and packages with a PCI of the [PCI Authoring Profile](../../docs/spec/README.md), as an authoring
system does: the properties as `data-` attributes, the author's files in the markup slots (`data-pci-slot`), the PCI's
fixed media (`data-pci-media`) and further modules, and the scoring. No dependencies; it runs in a browser and in Node.
The tspci dev page and pci-showcase use it for their "QTI 3 package" download.

```js
import { pciFiles, qtiPackage, zip } from "@citolab/pci-authoring";

const descriptor = await (await fetch(`${pciFolder}authoring.json`)).json();
const files = {};
for (const file of pciFiles(descriptor)) files[file] = new Uint8Array(await (await fetch(pciFolder + file)).arrayBuffer());

const bytes = zip(
  qtiPackage(descriptor, {
    files, // the PCI's files, relative to its module
    properties: { task: "moment" }, // one data- attribute each; missing ones get their default
    slots: { video: { name: "bunny.mp4", data: videoBytes } }, // the author's files per markup slot
    correct: "4.5", // the correct response: correctFromResponse(pci.getResponse()) when the author answered
    margin: 0.5, // optional, for a response with tolerance: 4.0 to 5.0 counts as correct
    language: "en",
  })
);
```

| Export | |
| --- | --- |
| `pciFiles(descriptor)` | The files an item needs next to the PCI's module: the module, `authoring.json`, fixed media, further modules |
| `itemXml(descriptor, options)` | The item alone, with `resolve(file)` for where the PCI's files are (a preview passes absolute URLs) |
| `qtiPackage(descriptor, options)` | The files of a package with the item, a test and the manifest: `resources/pci/`, `items/`, `items/media/` |
| `itemProblems(descriptor, { properties, slots, language })` | What keeps the item from being written as set up: a required slot without a file ("Video: choose a file first"), a required property without a value, an enum value not in its options, a number outside `min`/`max`. Check it before `qtiPackage` |
| `zip(files)` | A zip of path → bytes or text (stored, the same bytes for the same files) |
| `itemScoring(descriptor, asked)` | The scoring an item gets: `asked` when offered, else the first of `scoring` |
| `correctFromResponse(response)` | What `getResponse()` reports as correct-response values: `{ base: { integer: 30 } }` → `"30"`, a record → `{ time: "4.1", point: "455 250" }` |
| `appliedFields(descriptor, properties)` | The record fields whose `when` holds for these properties |

**Correct responses and margins.** With `match_correct`, `itemXml`/`qtiPackage` write the correct response and the
response processing: exact (QTI's `match_correct`), or, for a response or record field with `tolerance`, within a
margin: `margin: 0.5` (± 0.5) or `{ min, max }` for a range, a radius for an area (`qti-inside` a circle). A record is
compared field by field (`margins: { time: 0.5, point: 20 }`), only the fields whose `when` holds.
