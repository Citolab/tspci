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

A CycloneDX SBOM of the bundle is included in the package as `resources/pci/sbom.cdx.json`, listed as a
file of the PCI resource in the manifest. QTI has no resource type for a bill of materials, and a
resource that nothing depends on is what manifest driven tooling drops first, so it is a `<file>` of the
existing PCI resource. A copy is also written next to the zip as
`qti3-pci-<typeIdentifier>_<version>.sbom.cdx.json` for your own technical documentation.

Use `--no-include-sbom` to keep it out of the package, or `--no-sbom` to skip generating one. See
[@citolab/tspci](https://github.com/Citolab/tspci/tree/main/lib/tspci#sbom) for the configuration.
