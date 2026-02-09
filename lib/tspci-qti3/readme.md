# @citolab/tspci-qti3

Builds a QTI 3 package zip that contains:
- 1 assessment item with identifier `ITM-PCI`
- 1 assessment test with a single testPart, section, and the item reference
- a QTI 3 manifest

## Usage

1. Add the target:

```sh
npm run tspci -- add --target qti3
```

2. Build the QTI 3 package:

```sh
tspci --target qti3
```

The zip is created in `qti3-dist/` and includes your PCI bundle from `dist/index.js` (or `package.json` `main`).
