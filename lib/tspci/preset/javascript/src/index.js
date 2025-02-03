import * as ctx from "qtiCustomInteractionContext";
import configProps from "./config.json";
import style from "./styles.css"; // import and bundle this style file ( you can use tailwind and nested css )
import procenten from "./assets/procenten.png"; // image types are bundled inside the js

class Pci {
  /**
   * @constructor
   * @param {string} typeIdentifier - The unique identifier for this PCI type.
   */
  typeIdentifier; // typeIdentifier is mandatory for all PCI's
  config; // reference to the interface of the config object which you get when getInstance is called by the player
  state; // keep a reference to the state
  shadowdom; // Not mandatory, but its wise to create a shadowroot

  constructor() {
    /**
     * @type {string}
     * @description The unique identifier for this PCI type.
     */
    this.typeIdentifier = "###___PCI_NAME___###"; // typeIdentifier is mandatory for all PCI's
    if (ctx) {
      ctx.register(this); // we assume the qtiCustomInteractionContext is avaible due to the import above
    }
  }

  /**
   * @method getInstance
   * @description Creates a new instance of this portable custom interaction.
   * This method will be called by the qtiCustomInteractionContext.
   *
   * @param {HTMLElement} dom - The DOM element to which this PCI is added.
   * @param {Object<ConfigProperties>} config - The configuration to apply to this PCI.
   * @param {string} state - A previously saved state to restore the PCI instance.
   * This state must have been obtained from a prior call to getState for an instance of the same typeIdentifier.
   */
  getInstance = (dom, config, state) => {
    config.properties = { ...configProps, ...config.properties }; // merge current props with incoming
    this.config = config;
    this.state = state ? state : "";

    this.shadowdom = dom.attachShadow({ mode: "closed" });
    this.render();
    const event = {
      interaction: this,
      responseIdentifier: this.config.responseIdentifier,
      valid: true,
      value: this.getResponse(),
    };
    // dispatch a custom event to notify the Delivery System that the interaction has changed
    const interactionChangedEvent = new CustomEvent("qtiInteractionChanged", {
      detail: event,
    });
    this.shadowdom.dispatchEvent(interactionChangedEvent);
  };

  render = () => {
    this.shadowdom.addEventListener("change", (e) => {
      const value = e.target.value;
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

  /**
   * @method getResponse
   * @description Retrieves the value to assign to the bound QTI response variable.
   *
   * @returns {Object} - The response value.
   */
  getResponse = () => {
    const response = this.state === null || this.state === undefined ? undefined : { base: { integer: this.state } };
    return response;
  };

  /**
   * @method getState
   * @description Retrieves the current state of this PCI. This state can be passed to getInstance to restore the instance later.
   *
   * @returns {string} - The current state of the PCI.
   */
  getState = () => this.state.toString();

  /**
   * @method oncompleted
   * @description called when the PCI is completed.
   */
  oncompleted = () => {};
}

export default new Pci();
