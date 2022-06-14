## @citolab/questify

Create a zip of the PCI to import into Questify

# run
``` sh 
tspci -target questify 
``` 

## config options

In the package.json of the pci:
- typeIdentifier (required)
- label (if empty, package name will be used)
- width
- height
- scoring: e.g.:

``` json
[
    {
        "string": {
            "label": "Correct answer"
        }
    }
]
```



