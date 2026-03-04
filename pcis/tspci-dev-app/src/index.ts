import {
  ConfigProperties,
  IMSpci,
  IMSpciFactory,
  QtiInteractionChangedDetail,
  QtiVariableJSON,
} from "@citolab/tspci";
import * as ctx from "qtiCustomInteractionContext";
import configProps from "./config.json";
import style from "./styles.css";
import procenten from "./assets/procenten.png";

type PropTypes = typeof configProps;

type PciState = {
  value: string;
  touched: boolean;
  customValidity?: string;
};

class PciInstance implements IMSpci<PropTypes> {
  typeIdentifier = "TspciDevApp";
  private config: ConfigProperties<PropTypes>;
  private dom: HTMLElement;
  private shadowdom: ShadowRoot;
  private state: PciState;
  private onChange: (e: Event) => void;

  constructor(dom: HTMLElement, config: ConfigProperties<PropTypes>, stateString?: string) {
    if (!dom) throw new Error("No DOM Element provided");
    config.properties = { ...configProps, ...config.properties };
    this.dom = dom;
    this.config = config;
    this.shadowdom = dom.attachShadow({ mode: "closed" });

    this.state = { value: "", touched: false };
    if (stateString) {
      try {
        const parsed = JSON.parse(stateString) as Partial<PciState>;
        this.state = {
          value: typeof parsed.value === "string" ? parsed.value : "",
          touched: parsed.touched === true,
          customValidity: typeof parsed.customValidity === "string" ? parsed.customValidity : undefined,
        };
      } catch {
        this.state = { value: typeof stateString === "string" ? stateString : "", touched: false };
      }
    }

    this.onChange = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (!target) return;
      const nextValue = target.value ?? "";
      if (nextValue === this.state.value && this.state.touched) return;
      this.state = { ...this.state, value: nextValue, touched: true };
      this.dispatchInteractionChanged();
    };

    this.render();

    if (this.config.onready) {
      this.config.onready(this, this.getState());
    }
  }

  private getInputEl(): HTMLInputElement | null {
    return this.shadowdom.querySelector("input[type='number']");
  }

  private dispatchInteractionChanged() {
    const detail: QtiInteractionChangedDetail = {
      interaction: this,
      responseIdentifier: this.config.responseIdentifier,
      valid: this.checkValidity?.() ?? true,
      value: this.getResponse(),
    };
    const event = new CustomEvent("qti-interaction-changed", {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail,
    });
    this.dom.dispatchEvent(event);
  }

  private render() {
    this.shadowdom.innerHTML = `<div class="pci-container">
      <h1>${this.config.properties.title}</h1>
      <div class="body">
        <img width="${+this.config.properties.width}" height="${+this.config.properties.height}" src="${procenten}" />
      </div>
      <div class="interaction">
        <label>${this.config.properties.prompt}</label>
        <input type="number" value="${this.state.value}" min="0" max="100">%
      </div>
    </div>`;

    const css = document.createElement("style");
    css.innerHTML = style;
    this.shadowdom.appendChild(css);

    const input = this.getInputEl();
    if (input) {
      if (this.state.customValidity) input.setCustomValidity(this.state.customValidity);
      input.addEventListener("input", this.onChange);
      input.addEventListener("change", this.onChange);
    }
  }

  setResponse = (response: QtiVariableJSON) => {
    const next =
      typeof response?.base?.integer === "number"
        ? String(response.base.integer)
        : typeof response?.base?.string === "string"
          ? response.base.string
          : "";
    this.state = { ...this.state, value: next, touched: true };
    const input = this.getInputEl();
    if (input) input.value = next;
  };

  getResponse = () => {
    // Fallback: if an input event was missed, read the current DOM value directly.
    const input = this.getInputEl();
    const liveValue = input?.value ?? "";
    if ((!this.state.touched || !String(this.state.value ?? "").trim()) && liveValue.trim()) {
      this.state = { ...this.state, value: liveValue, touched: true };
    }

    if (!this.state.touched) return undefined;
    const trimmed = (this.state.value ?? "").toString().trim();
    if (!trimmed) return undefined;
    const asNumber = Number(trimmed);
    if (!Number.isFinite(asNumber)) return undefined;
    return { base: { integer: Math.trunc(asNumber) } } as QtiVariableJSON;
  };

  getState = () => JSON.stringify(this.state);

  checkValidity = () => {
    const input = this.getInputEl();
    if (!input) return undefined;
    return input.checkValidity();
  };

  reportValidity = () => {
    const input = this.getInputEl();
    if (!input) return undefined;
    return input.reportValidity();
  };

  setCustomValidity = (message: string) => {
    this.state = { ...this.state, customValidity: message };
    const input = this.getInputEl();
    if (input) input.setCustomValidity(message);
  };

  getCustomValidity = () => this.state.customValidity ?? "";

  oncompleted = () => {
    const input = this.getInputEl();
    if (input) {
      input.removeEventListener("input", this.onChange);
      input.removeEventListener("change", this.onChange);
    }
  };
}

const factory: IMSpciFactory<PropTypes> = {
  typeIdentifier: "TspciDevApp",
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
