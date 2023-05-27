import "preact/debug";
import { render } from "preact";
import { initStore, Store } from "@citolab/preact-store";

import * as ctx from "qtiCustomInteractionContext";
import Interaction from "./interaction";
import style from "./styles.css";
import { Configuration, IMSpci, QtiVariableJSON } from "@citolab/tspci";
import configProps from "./config.json";
import { IStore } from "@citolab/preact-store";

type PropTypes = typeof configProps;

class App implements IMSpci<PropTypes> {
  typeIdentifier = "myPci"; // typeIdentifier is mandatory for all PCI's
  config: Configuration<PropTypes>; // reference to the interface of the config object which you get when getInstance is called by the player
  state: string; // keep a reference to the state
  shadowdom: ShadowRoot; // Not mandatory, but its wise to create a shadowroot
  store: IStore<StateModel>;

  private logActions: { type: string; payload: unknown }[] = []; // optional logActions

  constructor() {
    ctx && ctx.register(this);
  }

  getInstance = (dom: HTMLElement, config: Configuration<PropTypes>, stateString: string) => {
    config.properties = { ...configProps, ...config.properties }; // merge current props with incoming
    this.config = config;

    const initState: StateModel = stateString ? JSON.parse(stateString).state : { input: 0 };
    this.logActions = stateString ? JSON.parse(stateString).log : [];
    this.store = initStore(this.initialState );
    if (restoredState || logActions) {
      this.store.restoreState(restoredState, logActions);
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
    render(<Interaction config={this.config.properties} dom={this.shadowdom} />, this.shadowdom);
  };

  getState = () =>
    JSON.stringify({
      state: this.store.getState(),
      log: this.logActions,
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
