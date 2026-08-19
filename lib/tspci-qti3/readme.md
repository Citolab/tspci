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

A CycloneDX SBOM of the bundle is copied next to the zip as
`qti3-pci-<typeIdentifier>_<version>.sbom.cdx.json`. QTI has no resource type for a bill of materials,
so it is not part of the package unless you pass `--include-sbom`, which adds `sbom.cdx.json` to the
package and references it in the manifest as `webcontent`, or `--no-sbom` to skip generating one. See
[@citolab/tspci](https://github.com/Citolab/tspci/tree/main/lib/tspci#sbom) for the configuration.
