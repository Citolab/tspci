import "preact/debug";
import { render } from "preact";
import { IStore, Listener } from "@citolab/preact-store";
import * as ctx from "qtiCustomInteractionContext";
import Interaction from "./interaction";
import style from "./styles.css";
import { ConfigProperties, IMSpci, IMSpciFactory, QtiInteractionChangedDetail, QtiVariableJSON } from "@citolab/tspci";
import configProps from "./config.json";
import { StateModel, initStore } from "./store";

type PropTypes = typeof configProps;

type PciStoredState = {
  state: StateModel;
  log: { type: string; payload: unknown; timestamp?: number }[];
};

class PciInstance implements IMSpci<PropTypes> {
  typeIdentifier = "###___PCI_NAME___###";
  private config: ConfigProperties<PropTypes>;
  private dom: HTMLElement;
  private shadowdom: ShadowRoot;
  private store: IStore<StateModel>;
  private storeListener: Listener<StateModel>;
  private previousResponseJson: string = "";
  private initialState: StateModel = { input: undefined };

  constructor(dom: HTMLElement, config: ConfigProperties<PropTypes>, stateString?: string) {
    if (!dom) throw new Error("No DOM Element provided");
    config.properties = { ...configProps, ...config.properties };
    this.dom = dom;
    this.config = config;
    this.shadowdom = dom.attachShadow({ mode: "closed" });

    let restoreData: PciStoredState | undefined;
    if (stateString) {
      try {
        const parsed = JSON.parse(stateString) as Partial<PciStoredState>;
        if (parsed && parsed.state && Array.isArray(parsed.log)) {
          restoreData = { state: parsed.state as StateModel, log: parsed.log as PciStoredState["log"] };
        }
      } catch {
        // ignore
      }
    }

    this.store = initStore(this.initialState);
    if (restoreData) {
      this.store.restoreState(restoreData.state, restoreData.log);
    }

    const boundResponse =
      this.config.boundTo?.[this.config.responseIdentifier] ??
      (this.config.boundTo && Object.keys(this.config.boundTo).length === 1
        ? this.config.boundTo[Object.keys(this.config.boundTo)[0]]
        : undefined);
    if (boundResponse) {
      this.setResponse?.(boundResponse);
    }

    this.render();

    if (this.config.onready) {
      this.config.onready(this, this.getState());
    }

    let isFirst = true;
    this.storeListener = () => {
      if (isFirst) {
        isFirst = false;
        this.previousResponseJson = JSON.stringify(this.getResponse() ?? null);
        return;
      }
      const nextJson = JSON.stringify(this.getResponse() ?? null);
      if (nextJson === this.previousResponseJson) return;
      this.previousResponseJson = nextJson;

      const detail: QtiInteractionChangedDetail = {
        interaction: this,
        responseIdentifier: this.config.responseIdentifier,
        valid: true,
        value: this.getResponse(),
      };
      const evt = new CustomEvent("qti-interaction-changed", {
        bubbles: true,
        cancelable: true,
        detail,
      });
      this.dom.dispatchEvent(evt);
    };
    this.store.subscribe(this.storeListener);
  }

  private render = () => {
    render(null, this.shadowdom);
    const css = document.createElement("style");
    css.innerHTML = style;
    this.shadowdom.appendChild(css);
    render(<Interaction config={this.config.properties} dom={this.shadowdom} store={this.store} />, this.shadowdom);
  };

  setResponse = (response: QtiVariableJSON) => {
    const next =
      typeof response?.base?.integer === "number"
        ? response.base.integer
        : typeof response?.base?.string === "string"
          ? Number(response.base.string)
          : undefined;
    if (typeof next !== "number" || !Number.isFinite(next)) return;
    this.store.dispatch({ type: "SET_INPUT", payload: { input: Math.trunc(next) } });
  };

  getState = () =>
    JSON.stringify({
      state: this.store.getState(),
      log: this.store.getActions(),
    } satisfies PciStoredState);

  getResponse = () => {
    const value = this.store.getState().input;
    if (value === undefined) return undefined;
    return { base: { integer: value } } as QtiVariableJSON;
  };

  oncompleted = () => {
    if (this.storeListener) {
      this.store.unsubscribe(this.storeListener);
    }
    render(null, this.shadowdom);
  };
}

const factory: IMSpciFactory<PropTypes> = {
  typeIdentifier: "###___PCI_NAME___###",
  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
};

const engineContext =
  ctx && typeof (ctx as unknown as { register?: unknown }).register === "function"
    ? (ctx as unknown as { register: (f: IMSpciFactory<PropTypes>) => void })
    : typeof window !== "undefined" && (window as unknown as { qtiCustomInteractionContext?: unknown }).qtiCustomInteractionContext
      ? ((window as unknown as { qtiCustomInteractionContext: { register: (f: IMSpciFactory<PropTypes>) => void } })
          .qtiCustomInteractionContext as { register: (f: IMSpciFactory<PropTypes>) => void })
      : undefined;

if (engineContext) {
  engineContext.register(factory);
}

export default factory;
