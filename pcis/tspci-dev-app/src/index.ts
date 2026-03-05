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

type PropTypes = typeof configProps;

type PciState = {
  selectedIndex: number;
  touched: boolean;
  customValidity?: string;
};

class PciInstance implements IMSpci<PropTypes> {
  typeIdentifier = "TspciDevApp";
  private config: ConfigProperties<PropTypes>;
  private dom: HTMLElement;
  private state: PciState;
  private clickableImages: HTMLImageElement[] = [];
  private imageClickHandlers: Array<(e: MouseEvent) => void> = [];

  constructor(
    dom: HTMLElement,
    config: ConfigProperties<PropTypes>,
    stateString?: string,
  ) {
    if (!dom) throw new Error("No DOM Element provided");
    config.properties = { ...configProps, ...config.properties };
    this.dom = dom;
    this.config = config;

    const doc = dom.ownerDocument || document;
    const styleEl = doc.createElement("style");
    styleEl.textContent = style;
    doc.head.appendChild(styleEl);

    this.state = { selectedIndex: -1, touched: false };
    if (stateString) {
      try {
        const parsed = JSON.parse(stateString) as Partial<PciState>;
        this.state = {
          selectedIndex:
            typeof parsed.selectedIndex === "number"
              ? parsed.selectedIndex
              : -1,
          touched: parsed.touched === true,
          customValidity:
            typeof parsed.customValidity === "string"
              ? parsed.customValidity
              : undefined,
        };
      } catch {
        this.state = { selectedIndex: -1, touched: false };
      }
    }

    this.initializeFromMarkup();

    if (this.config.onready) {
      this.config.onready(this, this.getState());
    }

    if (this.state.touched && this.state.selectedIndex >= 0) {
      this.dispatchInteractionChanged();
    }
  }

  private initializeFromMarkup() {
    this.bindSelectableImages();
    this.applySelectionUi();
  }

  private bindSelectableImages() {
    this.clearImageListeners();
    this.clickableImages = Array.from(
      this.dom.querySelectorAll("img[data-editable='image']"),
    ) as HTMLImageElement[];
    this.imageClickHandlers = this.clickableImages.map((img, index) => {
      const handler = (event: MouseEvent) => {
        event.preventDefault();
        this.state = { ...this.state, selectedIndex: index, touched: true };
        this.applySelectionUi();
        this.dispatchInteractionChanged();
      };
      img.addEventListener("click", handler);
      return handler;
    });
  }

  private clearImageListeners() {
    this.clickableImages.forEach((img, index) => {
      const handler = this.imageClickHandlers[index];
      if (handler) {
        img.removeEventListener("click", handler);
      }
    });
    this.clickableImages = [];
    this.imageClickHandlers = [];
  }

  private applySelectionUi() {
    this.clickableImages.forEach((img, index) => {
      if (index === this.state.selectedIndex) {
        img.classList.add("pci-selected-image");
      } else {
        img.classList.remove("pci-selected-image");
      }
    });
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

  private indexToIdentifier(index: number): string {
    return String.fromCharCode(65 + index);
  }

  private identifierToIndex(identifier: string): number {
    const normalized = String(identifier || "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) return -1;
    return normalized.charCodeAt(0) - 65;
  }

  setResponse = (response: QtiVariableJSON) => {
    const nextIdentifier =
      typeof response?.base?.string === "string"
        ? response.base.string
        : typeof response?.base?.identifier === "string"
          ? response.base.identifier
          : "";
    const nextIndex = this.identifierToIndex(nextIdentifier);
    this.state = {
      ...this.state,
      selectedIndex: nextIndex >= 0 ? nextIndex : -1,
      touched: nextIndex >= 0,
    };
    this.applySelectionUi();
    this.dispatchInteractionChanged();
  };

  getResponse = () => {
    if (!this.state.touched || this.state.selectedIndex < 0) return undefined;
    return {
      base: { string: this.indexToIdentifier(this.state.selectedIndex) },
    } as QtiVariableJSON;
  };

  getState = () => JSON.stringify(this.state);

  checkValidity = () => {
    const isValid = this.state.selectedIndex >= 0;
    return this.state.customValidity ? false : isValid;
  };

  reportValidity = () => this.checkValidity();

  setCustomValidity = (message: string) => {
    this.state = { ...this.state, customValidity: message };
  };

  getCustomValidity = () => this.state.customValidity ?? "";

  oncompleted = () => {
    this.clearImageListeners();
  };
}

const factory: IMSpciFactory<PropTypes> = {
  typeIdentifier: "TspciDevApp",
  getInstance: (dom, config, state) => new PciInstance(dom, config, state),
};

const engineContext =
  ctx &&
  typeof (ctx as unknown as { register?: unknown }).register === "function"
    ? (ctx as unknown as { register: (f: IMSpciFactory<PropTypes>) => void })
    : typeof window !== "undefined" &&
        (window as unknown as { qtiCustomInteractionContext?: unknown })
          .qtiCustomInteractionContext
      ? ((
          window as unknown as {
            qtiCustomInteractionContext: {
              register: (f: IMSpciFactory<PropTypes>) => void;
            };
          }
        ).qtiCustomInteractionContext as {
          register: (f: IMSpciFactory<PropTypes>) => void;
        })
      : undefined;

if (engineContext) {
  engineContext.register(factory);
}

export default factory;
