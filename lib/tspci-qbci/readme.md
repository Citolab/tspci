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
