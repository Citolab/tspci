# 2.12.0

- the SBOM is included in the package as `ref/script/sbom.cdx.json`, next to the bundle
- it is deliberately not registered in `ref/json/manifest.json`: the `script` array drives what the player loads and the SBOM is data, not a script
- `--no-include-sbom` keeps it out of the package

# 2.11.0

- a CycloneDX SBOM of the bundle is copied next to the `.ci` package in `ci-dist/` as `<name>_<version>.sbom.cdx.json`
- `--include-sbom` also adds `sbom.cdx.json` to the package itself, `--no-sbom` skips generating one

_The notes for 2.5.0 up to and including 2.10.0 were reconstructed from the git history afterwards, so
they list the highlights per minor version. Versions without an entry contained no changes for this
package: all packages in this repository are published in lockstep. `CHANGELOG.md` has the complete
list of published versions._

# 2.7.0

- added a GPL-3.0 LICENSE file to the package
- updated the development index.html

# 2.6.0

- images can be used with the native `CES.getMedia()` of the player
- media files from the assets folder are copied to `ref/media` and registered in `ref/json/manifest.json`
- a warning is shown when the bundled js file is too large for the player
- replaced the deprecated `fs.rmdir` with `fs.rm`

# 2.5.0

- dropped the `ci` prefix from the package name and export to a separate `ci-dist` folder
- the metadata.json of the PCI is picked up, `typeIdentifier` is also read from `config.tspci` in package.json
- the script folder is created when it does not exist


# 2.1.1
tspci
- support for your own export plugin not in the npm package by using full name of npm path

tspci-qbci
- all media files from the assets folder in your root will be copied to .ref/media
- all found media files will be added in an array .ref/json/manifes.json as media property
- added chalk for some nice warning colors in cli mesages

# 2.0.0

- first release questify builder ci plugin
