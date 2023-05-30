import "preact/debug";
import { render } from "preact";
import { IStore } from "@citolab/preact-store";
import * as ctx from "qtiCustomInteractionContext";
import Interaction from "./interaction";
import style from "./styles.css";
import { Configuration, IMSpci, QtiVariableJSON } from "@citolab/tspci";
import configProps from "./config.json";
import { StateModel, initStore } from "./store";

type PropTypes = typeof configProps;

class App implements IMSpci<PropTypes> {
  typeIdentifier = "###___PCI_NAME___###"; // typeIdentifier is mandatory for all PCI's
  config: Configuration<PropTypes>; // reference to the interface of the config object which you get when getInstance is called by the player
  state: string; // keep a reference to the state
  shadowdom: ShadowRoot; // Not mandatory, but its wise to create a shadowroot
  store: IStore<StateModel>;

  private logActions: { type: string; payload: unknown }[] = []; // optional logActions
  private initialState: StateModel = { input: undefined }; // optional initial state
  constructor() {
    ctx && ctx.register(this);
  }

  getInstance = (dom: HTMLElement, config: Configuration<PropTypes>, stateString: string) => {
    config.properties = { ...configProps, ...config.properties }; // merge current props with incoming
    this.config = config;

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

    this.config.onready && this.config.onready(this);
  };

  render = () => {
    render(null, this.shadowdom);
    const css = document.createElement("style");
    css.innerHTML = style;
    this.shadowdom.appendChild(css);
    render(<Interaction config={this.config.properties} dom={this.shadowdom} store={this.store} />, this.shadowdom);
  };

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
}

export default new App();
