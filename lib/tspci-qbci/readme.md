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

A CycloneDX SBOM of the bundle is copied next to the `.ci` package in `ci-dist/` as
`<name>_<version>.sbom.cdx.json`. Pass `--include-sbom` to also add `sbom.cdx.json` to the package
itself; note that Questify does not expect the extra file, so only do that when a customer asks for it.
Pass `--no-sbom` to skip generating one.
See [@citolab/tspci](https://github.com/Citolab/tspci/tree/main/lib/tspci#sbom) for the configuration.
