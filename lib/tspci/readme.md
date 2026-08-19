<h1>
	A modern QTI-PCI development environment creating and testing portable custom interactions
</h1>

<p align="center">
  <img src="https://github.com/Citolab/tspci/blob/main/lib/tspci/tspci-development.png" alt="Typescript Pci Builder">
</p>

[Release notes](https://github.com/Citolab/tspci/blob/main/lib/tspci/release-notes.md)

## ✨ Features <a name="features"></a>

- Use modern tooling like typescript, preact, postcss and tailwind
- Build and bundle your library PCI using only a `package.json`
- Test and develop all your PCI states, configs, responses and lifecycle without uploading
- Develop in live server which directly updates on code changes
- Produces a single bundle .js file to use in any delivery engine that supports the latest IMS PCI standard
- 0 configuration TypeScript support
- Bundles all your css, images and json files.
- Postcss support, use CSS nesting out of the box.
- First class (p)react and tailwind support
- Extension for TAO, configuring icon, label, support for setting correct response and pci-properties
- Generates a CycloneDX SBOM of the components that are actually in your bundle

## 🔧 Installation & Setup

### Cli

The easiest way to setup a pci develop environment is by using the cli.
This will ask a few options, and creates a PCI development environment with an example implementation.

<p align="center">
  <img src="https://github.com/Citolab/tspci/blob/main/lib/tspci/tspci-console.png" alt="Setup using console">
</p>

Run: `npx @citolab/tspci@latest init`

1. It will ask to download the latest version of tspci.
2. If agreed; tspci will be downloaded and started.
3. You should provide a name/identifier for your PCI.
4. You should provide a description.
5. Last option is to choose how you want to build your pci, using tailwind and preact, typescript or javascript

#### Tailwind

Tailwind is a popular css framework and can be used to give a nice look and feel of the PCI. The cli will make sure the css is added; and all build stuff that comes with tailwind is setup.

#### preact

preact is a small version of react. You can develop your PCI using hooks and the render function as you are familiar with in react. When preact is selected the cli will also add a store to manage state. This can easily be used to store all user actions in the PCI, and even replay them.

### specific implementations like TAO.

We also support to create a PCI that can be imported in TAO. Therefor you should use @citolab/tspci-tao.

To add tao using the cli you should run the following command inside your PCI folder:

```sh
  npm run tspci -- add --target tao
```

For more info: [@citolab/tspci-tao](https://github.com/Citolab/tspci/tree/main/lib/tspci-tao)

### QTI 3 package export

You can also export a QTI 3 package zip containing:
- one assessment item with identifier `ITM-PCI`
- one assessment test with a single testPart, section, and that item
- a QTI 3 manifest

To add QTI 3 support using the cli run:

```sh
  npm run tspci -- add --target qti3
```

Then build the package:

```sh
  tspci --target qti3
```

For more info: [@citolab/tspci-qti3](https://github.com/Citolab/tspci/tree/main/lib/tspci-qti3)

### SBOM

Every production build (`tspci`, `tspci --target ...`) writes a [CycloneDX](https://cyclonedx.org/) 1.6
SBOM to `dist/sbom.cdx.json`. When you export a package, a copy is placed next to the package as
`<package-name>.sbom.cdx.json`, so you keep one SBOM per released version.

The SBOM is built from the rollup module graph, so it lists the packages whose code actually ended up
in the bundle. That is different from what `npm sbom`, `cyclonedx-npm` or Syft produce for a PCI: those
read the dependency tree and would list build-time packages (rollup, typescript, tailwind, terser) that
are never delivered, while missing dependencies that got inlined into the bundle.

It also records a SHA-512 hash of the built bundle. A customer who integrates your PCI is the
manufacturer of the complete product and has to do due diligence on integrated third party components;
the hash lets them verify that the SBOM belongs to the bundle they received.

The Cyber Resilience Act asks for an SBOM as part of the technical documentation, not as something you
deliver with the product, so it is not put inside the package by default. Add `--include-sbom` if a
customer wants it in the package anyway:

```sh
  tspci --target qti3 --include-sbom
```

Generating the SBOM needs no flag, it happens on every production build. Use `--no-sbom` to skip it for
a single build, or `config.tspci.sbom.enabled: false` to switch it off for a project:

```sh
  tspci --target qti3 --no-sbom
```

#### Known limitations

The SBOM can only describe what passes through the bundler. It does not cover:

- code loaded at runtime from a CDN (MathJax, MathLive, chart libraries)
- third party code that was copied into your own `src` folder
- the delivery engine itself (`qtiCustomInteractionContext` is external on purpose)

The build warns about the first two when it can detect them (a script url in the bundle or in
`src/index.html`, a path that looks like `src/vendor/...` or a `*.min.js` file). Declare those
components manually so they end up in the SBOM.

#### Configuration

All settings are optional and live in `config.tspci.sbom` in your `package.json`:

```json
{
  "config": {
    "tspci": {
      "typeIdentifier": "myPci",
      "sbom": {
        "supplier": { "name": "Cito", "url": "https://www.cito.nl" },
        "supportPeriodEnd": "2032-12-31",
        "externalReferences": [
          { "type": "vulnerability-disclosure", "url": "https://www.cito.nl/security" },
          { "type": "security-contact", "url": "mailto:security@example.org" }
        ],
        "additionalComponents": [
          {
            "name": "mathjax",
            "version": "3.2.2",
            "license": "Apache-2.0",
            "purl": "pkg:npm/mathjax@3.2.2",
            "externalReferences": [
              { "type": "distribution", "url": "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js" }
            ]
          }
        ]
      }
    }
  }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Set to `false` to skip SBOM generation |
| `fileName` | `sbom.cdx.json` | Name of the generated file |
| `supplier` | `author` from `package.json` | Supplier of the PCI, as name or `{ name, url, contact }` |
| `supportPeriodEnd` | - | Recorded as a property on the PCI component |
| `externalReferences` | - | CycloneDX external references for the PCI, e.g. your disclosure policy |
| `additionalComponents` | `[]` | Components the bundler cannot see, e.g. CDN or vendored code |
| `includeInPackage` | `false` | Always include the SBOM in the exported package |
| `properties` | `[]` | Extra CycloneDX properties on the PCI component |
| `warnings` | `true` | Set to `false` to silence the warnings about gaps |
| `timestamp` | `false` | Include a build timestamp. Off by default so a rebuild of the same sources gives an identical document |

Declaring a component in `additionalComponents` also silences the warning about the matching runtime
url. Set `TSPCI_SBOM_TIMESTAMP=1` to add a timestamp for a single build.

### Manual

1️. **Install** by running: `npm i -D @citolab/tspci`

2️. **Set up** your `package.json`:

`// package.json`

```json
{
  "name": "@citolab/hello-world",
  "description": "Hello world pci",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/types.d.ts",
  "dependencies": {},
  "devDependencies": {
    "@citolab/tspci": "^1.5.6",
    "@citolab/tspci-tao": "^1.0.0",
    "@citolab/tspci-qti3": "^1.0.0"
  },
  "config": {
    "tspci": {
      "typeIdentifier": "helloWorld"
    }
  },
  "scripts": {
    "dev": "tspci --dev",
    "prod": "tspci"
  },
  "source": "src/index.ts"
}
```

Add the following PCI in the src folder `index.ts`

```ts
// src/index.ts
	import { ConfigProperties, IMSpci, IMSpciFactory } from "@citolab/tspci";
	import * as ctx from "qtiCustomInteractionContext";

	class PciInstance implements IMSpci<{}> {
	  typeIdentifier = "HelloWorld"; // same as in package.json
	  private shadowdom: ShadowRoot;

	  constructor(dom: HTMLElement, config: ConfigProperties<{}>, state?: string) {
	    this.shadowdom = dom.attachShadow({ mode: "closed" });
	    this.render();
	    config.onready(this, this.getState());
	  }

	  private render = () => {
	    this.shadowdom.innerHTML = `<div>Hello-World</div>`;
	  };

	  getResponse = () => undefined;
	  getState = () => JSON.stringify({ v: 1 });
	}

	const factory: IMSpciFactory<{}> = {
	  typeIdentifier: "HelloWorld",
	  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
	};

	ctx && ctx.register(factory);
	export default factory;
```

Add this in your root project: `global.d.ts` file

```ts
// global.d.ts
declare module "qtiCustomInteractionContext" {
  const register: { register: (factory: { typeIdentifier: string; getInstance: Function }) => void };
  export = register;
}
```

Add a `tsconfig.json` to your project for type checking

```json
{
  "compilerOptions": {
    "declaration": true,
    "lib": ["es6", "dom", "dom.iterable"],
    "module": "es6",
    "moduleResolution": "node",
    "removeComments": true,
    "sourceMap": true,
    "strict": false,
    "target": "es6",
    "outDir": "./dist",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["**/*"]
}
```

**Try it out** by running `tspci --dev`.

### All CLI Options

```
Usage
	$ tspci <command> [options]

Available Commands
  --dev    -d     Start development server
  --watch  -w     Only watch changes
  --help   -h     Help about commandos
  --target -t     Build production for platform, could be @citolab/tscpi-${target}
  --targetExt -tx Same as -target but reffering to a fully qualified package (not in @citolab)
  init            Init PCI development environment.
  add --target    Add specific implementation to the PCI.
  --include-sbom  Include the generated SBOM in the exported package
  --no-sbom       Do not generate an SBOM for this build

Examples package.json scripts
	$ "dev": "tspci --dev",
	$ "prod": "tspci",
	$ "watch": "tspci --watch",
	$ "package-tao": "tspci --target tao"
```

## 🛣 What's next

Use one of the [examples](https://github.com/Citolab/tspci-examples) to get a headstart

Or read further how we build our PCIs

Our prefered layout of our PCIs

```
your-pci-project
│   package.json       // Definition of your PCI in a standard package.json, TAO adds some props
│   global.d.ts        // Tell typescript qtiCustomInteractionContext is supplied later, adds a shim
│   tsconfig.json      // Typescript configuration, also for type checking your code
│
└───src
│   │   config.json    // Used to configure PCI, and in TAO for authors
│   │   index.ts       // The api for the player and bootstraps your interaction
│   │   interaction.ts // the actual interaction, preferably a main preact component
│   │   store.ts       // definition of the state and all possible state mutations of your pci
│   └───style.css      // css styles, imported by your pci and possible to use tailwind classes
│
│   postcss.config.js  // optionally adds postcss processing of css
│   tailwind.config.js // include tailwind classes
```

### Use JSX

Use (p)react in your PCI's to create interactions and bind your data to HTML

```ts
+ import { h, render } from "preact";

  render(null, this.shadowdom);

  render = () => {
    + render(null, this.shadowdom);
    + render(<Interaction config={this.config.properties} />, this.shadowdom);
  };
```

### Bundle your css

Import and bundle css
Appending css to shadowdom will prevent styles leaking into your player

```ts
+ import style from "./style.css";

  render = () => {
    render(...
    + const css = document.createElement("style");
    + css.innerHTML = style;
    + this.shadowdom.appendChild(css);
    render(...
  };
```

### Use modern css

install autoprefixer

```sh
npm i -D autoprefixer
```

add `postcss.config.js` with autoprefixer

// postcss.config.js

```js
module.exports = {
  plugins: [require("postcss-import"), require("autoprefixer")],
};
```

### Modern UI with existing classes

add tailwind to `postcss.config.js`
and add a `tailwind.config.js`

```js
// postcss.config.js
plugins: [+require("tailwindcss/nesting"), +require("tailwindcss")];
```

```js
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{html,js,ts,jsx,tsx}", "./*.xml"], // html/javascript and typescript, and everything in pci markup
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### Bundle all your images

Images are bundled in the js by importing them in code:
imports JPG, PNG, GIF, SVG, and WebP files

```ts
import procenten from "./assets/procenten.png";
<img src={procenten} />;
```

### Create advanced PCIs with 3D libraries

For example, import threejs to create 3D pci's

```ts
// src/interaction.ts
  import * as THREE from "three";

class VoxelPainterClass {
  private scene: THREE.Scene;
```

### Record user interaction

A store will centralize your PCI state but also all mutations.
This means, this way you could replay everything a user did
And you can use Redux devtools to debug

```ts
// src/index.ts
const [state, dispatch] = useStore<StateModel, ActionType>((type, payload) => {});

dispatch<{ x: number }>("ADD_ACTION", { x: +inputValue });
```

### Let authors configure your PCI in QTI

Use properties in config.json to let authors configure your PCI
Also used in the TAO export for configuring PCIs in TAO
`// src/config.json`

```json
{
  "buttonText": "Calculate",
  "sum1": "$1 * 14 + 1",
  "sum2": "$1 * 2 + 21",
  "tableSize": "4"
}
```

```ts
// src/index.ts
  + import configProps from "./config.json";
  + type PropTypes = typeof configProps;

  // add to types
  + private config: ConfigProperties<PropTypes>;

  // in your factory.getInstance(...) (or instance constructor):
  getInstance = (dom: HTMLElement, config: ConfigProperties<PropTypes>, stateString: string) => {
  + config.properties = { ...configProps, ...config.properties }; // merge our props with the player's
  + this.config = config;

  // destructure props for use in PCI
  + const { sum1, sum2, buttonText, tableSize } = config;

```

### Make use of existing react hooks

```ts
// src/useMousePosition
import { useEffect, useState } from "react";

export const useMousePosition = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const setPosFromEvent = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", setPosFromEvent);
    return () => window.removeEventListener("mousemove", setPosFromEvent);
  }, []);

  return { clientX: position.x, clientY: position.y };
};
```

### Use in TAO

Tao adds some lifecycle methods which you can implement and we supply an extended interfaee on top of the IMS one.

More info, see our extension

- [github](https://github.com/Citolab/tspci/blob/main/lib/tspci-tao)
- [@citolab/tspci-tao](https://www.npmjs.com/package/@citolab/tspci-tao)

If you want your platform to be support, [contact us](mailto://getinspiredbycitolab@gmail.com)

## License

[GPLv3](https://github.com/Citolab/tspci/blob/main/LICENSE)
