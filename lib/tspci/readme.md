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

## 🔧 Installation & Setup

### Cli

The easiest way to setup a pci develop environment is by using the cli.
This will ask a few options, and creates a PCI development environment with an example implementation.

<p align="center">
  <img src="https://github.com/Citolab/tspci/blob/main/lib/tspci/tspci-console.png" alt="Setup using console">
</p>

Run:  ```npx @citolab/tspci@latest init```

1. It will ask to download the latest version of tspci.
2. If agreed; tspci will be downloaded and started. 
3. You should provide a name/identifier for your PCI.
4. You should provide a description.
5. Last option is to add options: tailwind and preact (both are selected by default, for more info; keep reading).

#### Tailwind
Tailwind is a popular css framework and can be used to give a nice look and feel of the PCI. The cli will make sure the css is added; and all build stuff that comes with tailwind is setup.

#### preact
preact is a small version of react. You can develop your PCI using hooks and the render function as you are familiar with in react. When preact is selected the cli will also add a store to manage state. This can easily be used to store all user actions in the PCI, and even replay them.

### specific implementations like TAO.
We also support to create a PCI that can be imported in TAO. Therefor you should use @citolab/tspci-tao.

To add tao using the cli you should run the following command inside your PCI folder:

``` sh
  npm run tspci -- add --target tao
```

For more info: [@citolab/tspci-tao](https://github.com/Citolab/tspci/tree/main/lib/tspci-tao)

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
    "@citolab/tspci-tao": "^1.0.0"
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
import { Configuration, IMSpci } from "@citolab/tspci";
import * as ctx from "qtiCustomInteractionContext";

class Pci implements IMSpci<{}> {
  typeIdentifier = "HelloWorld"; // same as in package.json
  shadowdom: ShadowRoot;

  constructor() {
    ctx && ctx.register(this);
  }

  getInstance = (dom: HTMLElement, config: Configuration<any>, state: string) => {
    this.shadowdom = dom.attachShadow({ mode: "closed" });
    this.render();
    config.onready(this);
  };

  private render = () => {
    this.shadowdom.innerHTML = `<div>Hello-World</div>`;
  };

  getResponse = () => {
    return null;
  };

  getState = () => null;
}
export default new Pci();
```

Add this in your root project: `global.d.ts` file

```ts
// global.d.ts
declare module "qtiCustomInteractionContext" {
  const register: { register: (PortableInteraction) => void };
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
    "esModuleInterop": true,
  },
  "include": ["**/*"],
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
  --target -t     Build production for platform
  init            Init PCI development environment.
  add --target    Add specific implementation to the PCI. 

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

``` sh 
npm i -D autoprefixer
```

add `postcss.config.js` with autoprefixer

// postcss.config.js
```js
module.exports = {
  plugins: [
    require('postcss-import'),
    require('autoprefixer'),
  ]
}
```

### Modern UI with existing classes

add tailwind to `postcss.config.js`
and add a `tailwind.config.js`

```js
// postcss.config.js
  plugins: [
    + require('tailwindcss/nesting'),
    + require('tailwindcss'),
  ];
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
  "sum1" : "$1 * 14 + 1",
  "sum2" : "$1 * 2 + 21",
  "tableSize" : "4"
}
```
```ts
// src/index.ts
  + import configProps from "./config.json";
  + type PropTypes = typeof configProps;

  // add to types
  + private config: Configuration<PropTypes>;

  getInstance = (dom: HTMLElement, config: Configuration<PropTypes>, stateString: string) => {
  + config.properties = { ...configProps, ...config.properties }; // merge our props with players
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

  return { clientX: position.x, clientY: position.y }
};
```

### Use in TAO
Tao adds some lifecycle methods which you can implement and we supply an extended interfaee on top of the IMS one. 

More info, see our extension 
- [github](https://github.com/Citolab/tspci/blob/main/lib/tspci-tao)
- [@citolab/tspci-tao](https://www.npmjs.com/package/@citolab/tspci-tao)

If you want your platform to be support,  [contact us](mailto://getinspiredbycitolab@gmail.com)


## License

 [GPLv3](https://github.com/Citolab/tspci/blob/main/LICENSE)