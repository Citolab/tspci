

# @citolab/tspci-tao

[release notes](https://github.com/Citolab/tspci/blob/main/lib/tspci-tao/release-notes.md)

## Features
  - building a package(.zip) to import in TAO
  - configure PCI in TAO
  - set correct response in TAO

This package allows the @citolab/tspci-bundler to create a package which can be imported in the TAO platform.

PCI's can be imported in TAO as a ZIP file. The ZIP generated contains the PCI itself and metadata enabling the PCI to be shown in the TAO creator platform.
Configuration of a PCI can be done by the author because this packager reads the config.json file in the src folder

If scoring can be done with a MATCH_CORRECT (single string comparison) the item author can provide the correct answer in TAO by interaction with the PCI.
This way one PCI can be re-used in different configurations supporting multiple items.

To be able to add an IMS-PCI to the TAO authoring system properties are added to the `package.json`
and implemented lifecycle events that should be implemented in the PCI.

To create this zip file run:

``` sh 
 tspci --target tao
```

## life cycle methods

To be TAO compliant the TAOpci interface should be implemented:

```ts
class App implements IMSpci<PropTypes>, TAOpci {
  // ============== OMMITED IMS IMPLEMENTATION =====================

  // ============== HERE THE EXTRA TAO IMPLEMENTATION =====================
  off = () => {}; // called when setting correct response in tao, if not implemented TAO gives an error
  on = (val) => {};

  // THIS IS USED TO RESTORE THE CORRECT ANSWER IN THE AUTHORING PART OF TAO.
  setResponse = (response: any) => {
    try {
      // this is an example of how a string response can be restored.
      if (response.base && response.base.string) {
        // set the response to the pci
      }
    } catch {
      // ignore
    }
    this.render();
  };

  resetResponse = () => {
    // reset the pci to its initial state
    this.render();
  };

  // RERENDER THE PCI HERE, SO CHANGING CONFIG PROPERTIES IS DIRECTLY VISIBLE IN TAO.
  trigger = (event: string, value: any) => {
    this.config.properties[event] = value;
    this.render();
  };
}
```

## Configuration


### package.json
- typeIdentifier: a field 'typeIdentifier' should be added. This should match the 'typeIdentifier' value in the PCI entry file (The one that implements IMSPci). Only (alpha)numeric values are allowed. This because a hyphen in the identifier causes an error in TAO. To be sure, only alphanumeric are allowed.
- label: used as label in TAO
- short: short name used in TAO to label the PCI where you can drag it in an item.
- score: Array of: "MATCH_CORRECT", "CUSTOM" or "NONE". Can contain one or all three values. The first provided value will be used as default.
  - MATCH_CORRECT: If the item author should be able to set the correct response in TAO; MATCH_CORRECT is the only option. With the MATCH_CORRECT, the item author can interact with the PCI to provide the correct answer. 
  - CUSTOM: "CUSTOM" allows to add custom response processing in TAO. This is needed if a string comparison is not possible. The item author cannot interact with the PCI to provided the correct answer. The correct answer should in the response processing template.
  - NONE: if the PCI is used as a tool and/or scoring is not needed the scoring method should be set to NONE.

![provide scoring for the PCI in TAO](https://github.com/Citolab/tspci/blob/main/lib/tspci-tao/readme-images/score.png)

## icon

Add a svg file with the name {typeIdentifier}.svg in the root of the PCI directory to have a custom icon for the PCI in TAO.

![custom icon](https://github.com/Citolab/tspci/blob/main/lib/tspci-tao/readme-images/icon.png)
