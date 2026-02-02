import * as ctx from "qtiCustomInteractionContext";
import configProps from "./config.json";
import style from "./styles.css"; // import and bundle this style file ( you can use tailwind and nested css )
import procenten from "./assets/procenten.png"; // image types are bundled inside the js
class PciInstance {
  typeIdentifier = "###___PCI_NAME___###";

  constructor(dom, config, stateString) {
    if (!dom) throw new Error("No DOM Element provided");
    config.properties = { ...configProps, ...config.properties };
    this.dom = dom;
    this.config = config;
    this.shadowdom = dom.attachShadow({ mode: "closed" });

    this.state = { value: "", touched: false, customValidity: "" };
    if (stateString) {
      try {
        const parsed = JSON.parse(stateString);
        this.state.value = typeof parsed?.value === "string" ? parsed.value : "";
        this.state.touched = parsed?.touched === true;
        this.state.customValidity =
          typeof parsed?.customValidity === "string" ? parsed.customValidity : "";
      } catch {
        this.state.value = String(stateString);
        this.state.touched = false;
      }
    }

    const boundResponse =
      (this.config.boundTo && this.config.responseIdentifier
        ? this.config.boundTo[this.config.responseIdentifier]
        : undefined) ||
      (this.config.boundTo && Object.keys(this.config.boundTo).length === 1
        ? this.config.boundTo[Object.keys(this.config.boundTo)[0]]
        : undefined);
    if (boundResponse) {
      this.setResponse(boundResponse);
    }

    this.onChange = (e) => {
      const target = e && e.target;
      if (!target) return;
      const nextValue = typeof target.value === "string" ? target.value : "";
      if (nextValue === this.state.value && this.state.touched) return;
      this.state.value = nextValue;
      this.state.touched = true;
      this.dispatchInteractionChanged();
    };

    this.render();

    if (this.config.onready) {
      this.config.onready(this, this.getState());
    }
  }

  getInputEl = () => this.shadowdom.querySelector("input[type='number']");

  dispatchInteractionChanged = () => {
    const detail = {
      interaction: this,
      responseIdentifier: this.config.responseIdentifier,
      valid: this.checkValidity?.() ?? true,
      value: this.getResponse(),
    };
    const event = new CustomEvent("qti-interaction-changed", {
      bubbles: true,
      cancelable: true,
      detail,
    });
    this.dom.dispatchEvent(event);
  };

  render = () => {
    this.shadowdom.innerHTML = `<div class="pci-container">
      <h1>${this.config.properties.title}</h1>
      <div class="body">
        <img width="${+this.config.properties.width}" height="${+this.config
      .properties.height}" src="${procenten}" />
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
  };

  setResponse = (response) => {
    let next = "";
    if (response && response.base) {
      if (typeof response.base.integer === "number") next = String(response.base.integer);
      else if (typeof response.base.string === "string") next = response.base.string;
    }
    this.state.value = next;
    this.state.touched = true;
    const input = this.getInputEl();
    if (input) input.value = next;
  };

  getResponse = () => {
    if (!this.state.touched) return undefined;
    const trimmed = String(this.state.value == null ? "" : this.state.value).trim();
    if (!trimmed) return undefined;
    const asNumber = Number(trimmed);
    if (!Number.isFinite(asNumber)) return undefined;
    return { base: { integer: Math.trunc(asNumber) } };
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

  setCustomValidity = (message) => {
    this.state.customValidity = message == null ? "" : String(message);
    const input = this.getInputEl();
    if (input) input.setCustomValidity(this.state.customValidity);
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

const factory = {
  typeIdentifier: "###___PCI_NAME___###",
  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
};

const engineContext =
  ctx && typeof ctx.register === "function"
    ? ctx
    : typeof window !== "undefined" && window.qtiCustomInteractionContext
      ? window.qtiCustomInteractionContext
      : undefined;

if (engineContext && typeof engineContext.register === "function") {
  engineContext.register(factory);
}

export default factory;
