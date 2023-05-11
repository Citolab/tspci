import { Configuration, IMSpci, QtiVariableJSON } from "@citolab/tspci";
import * as ctx from "qtiCustomInteractionContext";
import configProps from "./config.json";
import style from "./styles.css"; // import and bundle this style file ( you can use tailwind and nested css )
import procenten from "./assets/procenten.png"; // image types are bundled inside the js
// Configuration
type PropTypes = typeof configProps;

class Pci implements IMSpci<PropTypes> {
  typeIdentifier = "###___PCI_NAME___###"; // typeIdentifier is mandatory for all PCI's
  config: Configuration<PropTypes>; // reference to the interface of the config object which you get when getInstance is called by the player
  state: string; // keep a reference to the state
  shadowdom: ShadowRoot | Element; // Not mandatory, but its wise to create a shadowroot

  constructor() {
    ctx && ctx.register(this); // we assume the qtiCustomInteractionContext is avaible due to the import above
  }

  // First in the lifecycle of a PCI, this method is called with the domElement ( usually qti-interaction-markup ) where we can add our dom tree.
  // config is the configuration object which has an onready
  getInstance = (dom: HTMLElement, config: Configuration<any>, state: string) => {
    config.properties = { ...configProps, ...config.properties }; // merge current props with incoming
    this.config = config;
    this.state = state ? state : "";

    this.shadowdom = dom.attachShadow({ mode: "closed" });
    this.render();

    config.onready(this);
  };

  private render = () => {
    this.shadowdom.addEventListener("change", (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      this.state = value;
    });
    this.shadowdom.innerHTML = `<div class="pci-container">
      <h1>${this.config.properties.title}</h1>
      <div class="body">
        <img width="${+this.config.properties.width}" height="${+this.config.properties.height}" src="${procenten}" />
      </div>
      <div class="interaction">
        <label for="tentacles">${this.config.properties.prompt}</label>
        <input type="number" value="${this.state}" min="0" max="100">%
      </div>
    </div>`;
    const css = document.createElement("style");
    css.innerHTML = style;
    this.shadowdom.appendChild(css);
  };

  getResponse = () => {
    const response = (this.state === null || this.state === undefined) ? undefined : { base: { integer: this.state }} as QtiVariableJSON;
    return response;
  };

  getState = () => this.state.toString();
}

export default new Pci();
