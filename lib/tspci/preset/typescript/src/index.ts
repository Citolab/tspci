/*
 * A Portable Custom Interaction (PCI) in plain TypeScript.
 *
 * The delivery engine (the player) loads this bundle, which registers a factory with qtiCustomInteractionContext.
 * For every interaction in an item the engine calls factory.getInstance(dom, config, state); the instance renders
 * into `dom` and reports its answer through getResponse().
 *
 * The demo: "what percentage of the circle is coloured?". The circle is drawn from the settings in src/config.json
 * (pie.ts); the answer is a whole number, reported as { base: { integer: 30 } } (see config.tspci.response in
 * package.json and AUTHORING.md).
 */
import {
  ConfigProperties,
  IMSpci,
  IMSpciFactory,
  PciProperties,
  QtiInteractionChangedDetail,
  QtiVariableJSON,
} from "@citolab/tspci";
import * as ctx from "qtiCustomInteractionContext"; // provided by the delivery engine at runtime
import configProps from "./config.json"; // the settings; the build passes only their defaults (AUTHORING.md)
import style from "./styles.css"; // bundled as a string, added to the shadow root below
import { escapeHtml, pieSettings, pieSvg } from "./pie";
// Images are bundled too: `import logo from "./assets/logo.png"` gives a data URL for <img src>.

// Like every data- attribute, each setting arrives as a string.
type PropTypes = PciProperties<typeof configProps>;

/** What getState() saves and the constructor restores: the text in the input, also when it is not a number yet. */
type PciState = { value: string };

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
  private state: PciState = { value: "" };
  private customValidity = "";

  constructor(dom: HTMLElement, config: ConfigProperties<PropTypes>, stateString?: string) {
    if (!dom) throw new Error("No DOM Element provided");
    // The item's data- attributes override the defaults from config.json.
    config.properties = { ...(configProps as unknown as PropTypes), ...config.properties };
    this.dom = dom;
    this.config = config;
    // A closed shadow root keeps the item's CSS out and ours in.
    this.shadowdom = dom.attachShadow({ mode: "closed" });

    // 1. The state from a previous session (whatever getState() returned).
    if (stateString) {
      try {
        const parsed = JSON.parse(stateString) as Partial<PciState>;
        this.state = { value: typeof parsed?.value === "string" ? parsed.value : "" };
      } catch {
        // not ours: start empty
      }
    }
    // 2. A response the engine binds to the interaction (boundTo) wins over the state.
    const boundTo = config.boundTo ?? {};
    const bound = boundTo[config.responseIdentifier] ?? (Object.keys(boundTo).length === 1 ? Object.values(boundTo)[0] : undefined);
    if (bound) this.state = { value: fromResponse(bound) };

    this.render();
    // 3. Status "solution": show the correct response of the item instead (AUTHORING.md, "Correct answers").
    if (config.status === "solution") this.showCorrectResponse();

    config.onready?.(this, this.getState());
  }

  /** Read-only when the candidate can no longer answer. */
  private get readOnly() {
    return ["review", "solution", "closed"].includes(this.config.status ?? "interacting");
  }

  private get input() {
    return this.shadowdom.querySelector<HTMLInputElement>("input");
  }

  private render() {
    const p = this.config.properties;
    // <label for> ties the question to the input, so a screen reader reads it and a click on it focuses the input.
    this.shadowdom.innerHTML = `
      <style>${style}</style>
      <div class="pci">
        <h2 class="title">${escapeHtml(p.title)}</h2>
        ${pieSvg(p)}
        <label class="question" for="answer">${escapeHtml(p.question)}</label>
        <div class="answer">
          <input id="answer" type="number" inputmode="numeric" min="0" max="100" step="1" autocomplete="off"
            value="${escapeHtml(this.state.value)}" ${this.readOnly ? "disabled" : ""} />
          <span class="unit">%</span>
        </div>
      </div>`;

    const input = this.input;
    input.setCustomValidity(this.customValidity);
    this.markValidity();
    input.addEventListener("input", this.onInput);
  }

  private onInput = () => {
    this.state = { value: this.input.value };
    this.markValidity();
    // Tell the engine the response changed; composed lets the event cross the shadow root.
    const detail: QtiInteractionChangedDetail = {
      interaction: this,
      responseIdentifier: this.config.responseIdentifier,
      valid: this.checkValidity(),
      value: this.getResponse(),
    };
    this.dom.dispatchEvent(new CustomEvent("qti-interaction-changed", { bubbles: true, composed: true, detail }));
  };

  /** aria-invalid tells assistive technology, and styles.css shows it with a red outline. */
  private markValidity() {
    const input = this.input;
    input.setAttribute("aria-invalid", String(input.value !== "" && !input.checkValidity()));
  }

  /** Show the correct response the item declares (status "solution"); without one, keep what is there. */
  showCorrectResponse = () => {
    const correct = this.config.responseDeclaration?.correctResponse?.value;
    if (correct === undefined) return;
    this.state = { value: fromResponse(correct) };
    this.render();
  };

  // ---- the IMS PCI API ----

  getResponse = () => toResponse(this.state.value);

  getState = () => JSON.stringify(this.state);

  setResponse = (response: QtiVariableJSON) => {
    this.state = { value: fromResponse(response) };
    this.render();
  };

  checkValidity = () => this.input?.checkValidity() ?? true;

  reportValidity = () => this.input?.reportValidity() ?? true;

  setCustomValidity = (message: string) => {
    this.customValidity = message ?? "";
    this.input?.setCustomValidity(this.customValidity);
  };

  getCustomValidity = () => this.customValidity;

  /** The engine is done with this instance: release what you hold (listeners on window, timers, ...). */
  oncompleted = () => {
    this.input?.removeEventListener("input", this.onInput);
  };
}

/**
 * The correct response for a configuration, for authoring systems (config.tspci.correctResponse "settings" in
 * package.json, AUTHORING.md "Correct answers"): they call it whenever the author changes a setting and fill the item's
 * correct response with it. It gets the data- properties as strings (a missing one means its default), uses the same
 * parsing as the drawing, so the two cannot disagree, and returns what getResponse() reports for that answer.
 * Players never call it, and it must not touch the DOM.
 */
function getCorrectResponse(properties: Partial<PropTypes>): QtiVariableJSON | undefined {
  const { segments, colored } = pieSettings({ ...(configProps as unknown as PropTypes), ...properties });
  return { base: { integer: Math.round((colored / segments) * 100) } };
}

const factory: IMSpciFactory<PropTypes> = {
  typeIdentifier: "###___PCI_NAME___###", // the same as config.tspci.typeIdentifier in package.json
  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
  getCorrectResponse,
};

// Register with the engine: as an AMD module (qtiCustomInteractionContext), or through the global some engines set.
type Context = { register: (factory: IMSpciFactory<PropTypes>) => void };
const engineContext = [ctx as unknown as Context, (globalThis as { qtiCustomInteractionContext?: Context }).qtiCustomInteractionContext].find(
  (c) => typeof c?.register === "function"
);
engineContext?.register(factory);

export default factory;
