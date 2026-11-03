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
    correct: "4.5", // the correct response, when the scoring is match_correct
    language: "en",
  })
);
```

| Export | |
| --- | --- |
| `pciFiles(descriptor)` | The files an item needs next to the PCI's module: the module, `authoring.json`, fixed media, further modules |
| `itemXml(descriptor, options)` | The item alone, with `resolve(file)` for where the PCI's files are (a preview passes absolute URLs) |
| `qtiPackage(descriptor, options)` | The files of a package with the item, a test and the manifest: `resources/pci/`, `items/`, `items/media/` |
| `zip(files)` | A zip of path → bytes or text (stored, the same bytes for the same files) |
| `itemScoring(descriptor, asked)` | The scoring an item gets: `asked` when offered, else the first of `scoring`; `match_correct` on a record is `human` |
