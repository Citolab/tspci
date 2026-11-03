# 3.0.0

- the item is written by `@citolab/pci-authoring` (the PCI Authoring Profile 1.0): every setting as a `data-` attribute,
  fixed media as `data-pci-media`, further modules from `modules.paths`, and the scoring of `config.tspci.scoring`;
  the tspci dev page's "QTI 3 item" writes the same item for its settings and media
- `authoring.json` (tspci 3) is required next to the bundle
- the empty `<div>` (or a `prompt` setting as a `<div>`) is no longer put in the interaction markup; a `prompt`
  setting reaches the PCI as `data-prompt`, like every other setting
- `dist/index.css` and the project's `assets/` folder are in the package as before, the stylesheet as a file of the PCI
  resource
- a warning for what the sample item lacks: a required markup slot or setting
- `bundle()` returns the path of the zip; `label` and `devPage = false` for the tspci dev page

# 2.12.0

- the SBOM is included in the package as `resources/pci/sbom.cdx.json`, listed as a `<file>` of the PCI resource instead of a resource of its own, so manifest driven tooling does not drop it as an unreferenced resource
- `--no-include-sbom` keeps it out of the package

# 2.11.0

- a CycloneDX SBOM of the bundle is copied next to the zip in `qti3-dist/` as `qti3-pci-<typeIdentifier>_<version>.sbom.cdx.json`
- `--include-sbom` also adds `sbom.cdx.json` to the package and references it in the manifest as `webcontent`, `--no-sbom` skips generating one

_These notes were reconstructed from the git history afterwards, so they list the highlights per minor
version. Versions without an entry contained no changes for this package: all packages in this
repository are published in lockstep. `CHANGELOG.md` has the complete list of published versions._

# 2.7.0

- first release: `tspci --target qti3` creates a QTI 3 package zip with one assessment item, one assessment test with a single testPart and section, and a QTI 3 manifest
