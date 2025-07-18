import "preact/debug";
import { render } from "preact";
import { IStore } from "@citolab/preact-store";
import * as ctx from "qtiCustomInteractionContext";
import Interaction from "./interaction";
import style from "./styles.css";
import { ConfigProperties, IMSpci, QtiInteractionChangedDetail, QtiVariableJSON } from "@citolab/tspci";
import configProps from "./config.json";
import { StateModel, initStore } from "./store";

type PropTypes = typeof configProps;

class App implements IMSpci<PropTypes> {
  typeIdentifier = "###___PCI_NAME___###"; // typeIdentifier is mandatory for all PCI's
  config: ConfigProperties<PropTypes>; // reference to the interface of the config object which you get when getInstance is called by the player
  state: string; // keep a reference to the state
  shadowdom: ShadowRoot; // Not mandatory, but its wise to create a shadowroot
  store: IStore<StateModel>;

  private logActions: { type: string; payload: unknown }[] = []; // optional logActions
  private initialState: StateModel = { input: undefined }; // optional initial state
  constructor() {
    if (ctx) {
      ctx.register(this);
    }
  }

  getInstance = (dom: HTMLElement, config: ConfigProperties<PropTypes>, stateString: string) => {
    config.properties = { ...configProps, ...config.properties }; // merge current props with incoming
    this.config = config;
    if (!dom) {
      throw new Error("No DOM Element provided");
    }
    this.logActions = stateString ? JSON.parse(stateString).log : [];
    this.store = initStore(this.initialState);
    try {
      const restoredState = stateString ? JSON.parse(stateString) : null;
      if (restoredState) {
        this.store.restoreState(restoredState?.state, this.logActions);
      }
    } catch (error) {
      console.log(error);
    }
    this.shadowdom = dom.attachShadow({ mode: "closed" });
    this.render();

    // Handle boundTo value if it exists
    if (this.config.boundTo && Object.keys(this.config.boundTo).length > 0) {
      const responseIdentifier = Object.keys(this.config.boundTo)[0];
      const response = this.config.boundTo[responseIdentifier];
      // Only call setResponse if response has valid data
      if (response && response.base !== null) {
        this.setResponse(response);
      }
    }

    // Call onready callback to signal the component is ready
    if (this.config.onready) {
      this.config.onready(this);
    }

    // MOVED: Only subscribe to store changes AFTER everything else is done
    this.store.subscribe(() => {
      const event: QtiInteractionChangedDetail = {
        interaction: this,
        responseIdentifier: this.config.responseIdentifier,
        valid: true,
        value: this.getResponse(),
      };
      // dispatch a custom event to notify the Delivery System that the interaction has changed
      const interactionChangedEvent = new CustomEvent("qti-interaction-changed", {
        detail: event,
      });
      dom.dispatchEvent(interactionChangedEvent);
    });
  };
  render = () => {
    render(null, this.shadowdom);
    const css = document.createElement("style");
    css.innerHTML = style;
    this.shadowdom.appendChild(css);
    render(<Interaction config={this.config.properties} dom={this.shadowdom} store={this.store} />, this.shadowdom);
  };

  setResponse = (response: QtiVariableJSON) => {
    // TODO restore the response
    // Get the actual value by the variable type like:
    // - response?.base?.string or response?.base?.integer
  }


  getState = () =>
    JSON.stringify({
      state: this.store.getState(),
      log: this.store.getActions(),
    });

  getResponse = () => {
    const state = this.store?.getState()?.input || undefined;
    if (state === undefined) return undefined;
    return {
      base: {
        integer: this.store.getState().input,
      },
    } as QtiVariableJSON;
  }
  oncompleted = () => { };
}

export default new App();
