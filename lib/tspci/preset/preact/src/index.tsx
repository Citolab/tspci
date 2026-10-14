/*
 * A Portable Custom Interaction (PCI) with Preact, Tailwind and a store.
 *
 * The delivery engine (the player) loads this bundle, which registers a factory with qtiCustomInteractionContext.
 * For every interaction in an item the engine calls factory.getInstance(dom, config, state); the instance renders
 * into `dom` and reports its answer through getResponse().
 *
 * This file is the PCI API; interaction.tsx is the UI, store.ts the state. The demo: "what percentage of the circle
 * is coloured?". The circle is drawn from the settings in src/config.json (pie.tsx); the answer is a whole number,
 * reported as { base: { integer: 30 } } (see config.tspci.response in package.json and AUTHORING.md).
 */
import "preact/debug"; // readable warnings in the browser console while developing
import { render } from "preact";
import { Action, IStore, Listener } from "@citolab/preact-store";
import { ConfigProperties, IMSpci, IMSpciFactory, PciProperties, QtiInteractionChangedDetail, QtiVariableJSON } from "@citolab/tspci";
import * as ctx from "qtiCustomInteractionContext"; // provided by the delivery engine at runtime
import configProps from "./config.json"; // the settings; the build passes only their defaults (AUTHORING.md)
import style from "./styles.css"; // Tailwind, compiled to a string, added to the shadow root below
import Interaction from "./interaction";
import { Actions, StateModel, initStore } from "./store";

// Like every data- attribute, each setting arrives as a string.
type PropTypes = PciProperties<typeof configProps>;

/** What getState() saves: the state and the actions that led to it. */
type PciStoredState = { state: StateModel; log: Action<unknown>[] };

/** The response for the text in the input: a whole number, or undefined while there is no answer. */
function toResponse(value: string): QtiVariableJSON | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined; // nothing answered, nothing reported
  const n = Number(trimmed);
  // One answer, one response: "30", "030" and "30.0" all report 30.
  return Number.isFinite(n) ? { base: { integer: Math.round(n) } } : undefined;
}

/** The input text for a response (setResponse, boundTo) or a correct response (status "solution"). */
function fromResponse(value: unknown): string {
  if (Array.isArray(value)) return fromResponse(value[0]);
  if (value && typeof value === "object") {
    const base = (value as QtiVariableJSON).base;
    return fromResponse(base?.integer ?? base?.float ?? base?.string);
  }
  return value === undefined || value === null ? "" : String(value);
}

class PciInstance implements IMSpci<PropTypes> {
  typeIdentifier = "###___PCI_NAME___###";
  private config: ConfigProperties<PropTypes>;
  private dom: HTMLElement;
  private shadowdom: ShadowRoot;
  private store: IStore<StateModel, Actions> = initStore();
  private customValidity = "";

  constructor(dom: HTMLElement, config: ConfigProperties<PropTypes>, stateString?: string) {
    if (!dom) throw new Error("No DOM Element provided");
    // The item's data- attributes override the defaults from config.json.
    config.properties = { ...(configProps as unknown as PropTypes), ...config.properties };
    this.dom = dom;
    this.config = config;
    // A closed shadow root keeps the item's CSS out and ours (Tailwind) in.
    this.shadowdom = dom.attachShadow({ mode: "closed" });

    // 1. The state from a previous session (whatever getState() returned).
    if (stateString) {
      try {
        const { state, log } = JSON.parse(stateString) as PciStoredState;
        if (typeof state?.value === "string" && Array.isArray(log)) this.store.restoreState(state, log);
      } catch {
        // not ours: start empty
      }
    }
    // 2. A response the engine binds to the interaction (boundTo) wins over the state.
    const boundTo = config.boundTo ?? {};
    const bound = boundTo[config.responseIdentifier] ?? (Object.keys(boundTo).length === 1 ? Object.values(boundTo)[0] : undefined);
    if (bound) this.setResponse(bound);
    // 3. Status "solution": show the correct response of the item instead (AUTHORING.md, "Correct answers").
    if (config.status === "solution") this.showCorrectResponse();

    // From here on, tell the engine when the response changes.
    this.previousResponse = JSON.stringify(this.getResponse() ?? null);
    this.unsubscribe = this.store.subscribe(this.onStoreChange);

    this.render();
    config.onready?.(this, this.getState());
  }

  private previousResponse: string;
  private unsubscribe = () => {};
  private onStoreChange: Listener<StateModel> = () => {
    const response = JSON.stringify(this.getResponse() ?? null);
    if (response === this.previousResponse) return; // subscribe() calls us right away, and not every action changes it
    this.previousResponse = response;
    // composed lets the event cross the shadow root
    const detail: QtiInteractionChangedDetail = {
      interaction: this,
      responseIdentifier: this.config.responseIdentifier,
      valid: this.checkValidity(),
      value: this.getResponse(),
    };
    this.dom.dispatchEvent(new CustomEvent("qti-interaction-changed", { bubbles: true, composed: true, detail }));
  };

  private render = () => {
    const readOnly = ["review", "solution", "closed"].includes(this.config.status ?? "interacting");
    render(
      <>
        <style>{style}</style>
        <Interaction config={this.config.properties} store={this.store} readOnly={readOnly} />
      </>,
      this.shadowdom
    );
    this.input?.setCustomValidity(this.customValidity);
  };

  private get input() {
    return this.shadowdom.querySelector("input");
  }

  /** Only a change is an action: keeps the log (and a replay) clean. */
  private setValue = (value: string) => {
    if (value !== this.store.getState().value) this.store.dispatch({ type: "SET_VALUE", payload: { value } });
  };

  /** Show the correct response the item declares (status "solution"); without one, keep what is there. */
  showCorrectResponse = () => {
    const correct = this.config.responseDeclaration?.correctResponse?.value;
    if (correct !== undefined) this.setValue(fromResponse(correct));
  };

  // ---- the IMS PCI API ----

  getResponse = () => toResponse(this.store.getState().value);

  getState = () => JSON.stringify({ state: this.store.getState(), log: this.store.getActions() } satisfies PciStoredState);

  setResponse = (response: QtiVariableJSON) => this.setValue(fromResponse(response));

  checkValidity = () => this.input?.checkValidity() ?? true;

  reportValidity = () => this.input?.reportValidity() ?? true;

  setCustomValidity = (message: string) => {
    this.customValidity = message ?? "";
    this.input?.setCustomValidity(this.customValidity);
  };

  getCustomValidity = () => this.customValidity;

  /** The engine is done with this instance: unsubscribe and unmount (which also runs the components' cleanups). */
  oncompleted = () => {
    this.unsubscribe();
    render(null, this.shadowdom);
  };
}

const factory: IMSpciFactory<PropTypes> = {
  typeIdentifier: "###___PCI_NAME___###", // the same as config.tspci.typeIdentifier in package.json
  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
};

// Register with the engine: as an AMD module (qtiCustomInteractionContext), or through the global some engines set.
type Context = { register: (factory: IMSpciFactory<PropTypes>) => void };
const engineContext = [ctx as unknown as Context, (globalThis as { qtiCustomInteractionContext?: Context }).qtiCustomInteractionContext].find(
  (c) => typeof c?.register === "function"
);
engineContext?.register(factory);

export default factory;
