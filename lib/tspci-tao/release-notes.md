# 2.11.0

- a CycloneDX SBOM of the bundle is copied next to the zip in `dist/` as `tao-pci-<typeIdentifier>_<version>.sbom.cdx.json`
- `--include-sbom` also adds `sbom.cdx.json` to the package itself, `--no-sbom` skips generating one

_The notes for 2.4.0 up to and including 2.10.0 were reconstructed from the git history afterwards, so
they list the highlights per minor version. Versions without an entry contained no changes for this
package: all packages in this repository are published in lockstep. `CHANGELOG.md` has the complete
list of published versions._

# 2.7.0

- added `setResponse`, so TAO can push a response into the PCI
- added a GPL-3.0 LICENSE file to the package

# 2.6.0

- support for javascript PCIs, with `onCompleted` implemented by default
- replaced the deprecated `fs.rmdir` with `fs.rm`

# 2.4.0

- fixed the destination location of the export

# 2.3.0
- added a script to add TAO support in a PCI that only support the IMS interface.

# 2.0.0

- synchronized versions across tspci libraries
# 1.0.2

- fixed error when trying to remove a folder that did not exist

# 1.0.1

Initial version