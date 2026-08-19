## @citolab/qbci

Create a .ci to import into Questify

# run
``` sh 
tspci --target qbci 
``` 

## config options

In the package.json of the pci:
- config: { tspci: { typeIdentifier: 'yourpciname' }} (required)
- label (if empty, package name will be used)
- config: { tspci: { width: '500' }} (optional, default: 500)
- config: { tspci: { height: '500' }} (optional, default: 500)

## sbom

A CycloneDX SBOM of the bundle is included in the package as `ref/script/sbom.cdx.json`, next to the
bundle it describes, and copied next to the `.ci` package in `ci-dist/` as
`<name>_<version>.sbom.cdx.json` for your own technical documentation.

It is deliberately not registered in `ref/json/manifest.json`: the `script` array drives what the player
loads, and the SBOM is data, not a script.

Use `--no-include-sbom` to keep it out of the package, or `--no-sbom` to skip generating one. See
[@citolab/tspci](https://github.com/Citolab/tspci/tree/main/lib/tspci#sbom) for the configuration.
