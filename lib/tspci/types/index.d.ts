// Define the payload structure for the custom event
export interface QtiInteractionChangedDetail {
  interaction: IMSpci<unknown>; // The PCI instance itself
  responseIdentifier: string; // The response identifier provided in the getInstance call
  valid?: boolean; // Optional boolean indicating if checkValidity() returns true
  value?: QtiVariableJSON; // Optional value returned by getResponse()
}

/**
 * Correct response of a response declaration, mirroring qti-correct-response.
 *
 * `value` holds the authored qti-value content: a single value for `single`
 * cardinality, an array of values for every other cardinality.
 */
export interface CorrectResponse {
  value: ResponseType | ResponseType[];
}

/**
 * Response declaration passed into the getInstance configuration, so a PCI can
 * render the correct response itself when it is constructed with status "solution".
 *
 * Mirrors qti-response-declaration with camelCased names. Every field is optional,
 * a delivery engine passes as much or as little as it has, and correctResponse is
 * absent when the response variable has none.
 *
 * See https://github.com/1EdTech/qti-project-management/issues/210
 */
export interface ResponseDeclaration {
  baseType?: BaseType;
  cardinality?: Cardinality;
  correctResponse?: CorrectResponse;
}

/**
 * The properties a PCI receives, for a config.json whose values may carry editor hints
 * (`{ "default": "640", "editor": "integer" }`): the build passes only the defaults, and like every data-
 * attribute they arrive as strings. Use `type PropTypes = PciProperties<typeof configProps>`.
 */
export type PciProperties<T> = { [K in keyof T]: string };

/** A translatable text in the authoring descriptor: one string, or one per language (`{ "en": …, "nl": … }`). */
export type AuthoringText = string | Record<string, string>;

/**
 * How an authoring system edits a data- property (config.json). Unknown editors fall back to a text field.
 * `pci`: the PCI fills it itself in its authoring mode (see IMSpciAuthoringFactory).
 */
export type AuthoringPropertyEditor =
  | "text" | "textarea" | "integer" | "number" | "boolean" | "enum" | "color" | "colorList" | "hidden" | "pci";

export interface AuthoringProperty {
  editor: AuthoringPropertyEditor;
  /** The default, as the data- attribute holds it. */
  default: string;
  label?: AuthoringText;
  /** enum: the values to choose from. */
  options?: { value: string; label?: AuthoringText }[];
  /** integer / number */
  min?: number;
  max?: number;
  [hint: string]: unknown;
}

/** A field of a record response (several values in one response variable). */
export interface AuthoringResponseField {
  baseType: string;
  /** How the authoring system edits the correct value (e.g. "mediaTime", "mediaPoint"); a text field by default. */
  editor?: string;
  label?: AuthoringText;
  /** The kind of margin a score rule may give it: "range" (numbers), "area" (points). */
  tolerance?: AuthoringTolerance;
  [hint: string]: unknown;
}

/**
 * The kind of margin a score rule may give a response: "range" (an integer or float between two values, or within a
 * distance of the correct one), "area" (a point inside a shape, or within a distance of the correct point). The margin
 * itself is response processing in the item, written by the authoring system; the PCI only says which kind fits.
 */
export type AuthoringTolerance = "range" | "area";

/** "question" is scored; a "tool" (a ruler, a protractor, a calculator) never counts towards the score. */
export type PciRole = "question" | "tool";

/**
 * dist/authoring.json, generated from src/config.json and package.json config.tspci, and shipped next to the bundle.
 * See AUTHORING.md.
 */
export interface AuthoringDescriptor {
  descriptorVersion: string;
  typeIdentifier: string;
  version: string;
  label: string;
  properties: Record<string, AuthoringProperty>;
  /** Elements the item puts in qti-interaction-markup, e.g. `{ "video": { "editor": "media", "accept": ["video/*"] } }`. */
  markup: Record<string, { editor: string; element?: string; accept?: string[]; required?: boolean; label?: AuthoringText }>;
  response:
    | { cardinality: "single"; baseType: string; tolerance?: AuthoringTolerance }
    | { cardinality: "multiple" | "ordered"; baseType: string }
    | { cardinality: "record"; fields: Record<string, AuthoringResponseField> };
  /** config.tspci.role; a score of only ["NONE"] makes a tool. */
  role: PciRole;
  /** The response processing templates the PCI is meant for (TAO's score setting), e.g. ["MATCH_CORRECT", "NONE"]. */
  score?: string[];
  /**
   * "settings": the registered object has getCorrectResponse(properties), so an authoring system can fill the correct
   * response from the item's settings (and keep it in line when they change). Never on a tool.
   */
  correctResponse?: "settings";
  /** Present when the PCI has an authoring mode: properties with editor "pci", plus config.tspci.authoring. */
  authoring?: AuthoringMode;
}

/** The authoring mode in the descriptor. The authoring system shows one button that opens it. */
export interface AuthoringMode {
  /** The properties the PCI fills itself (editor "pci"), in config.json order. */
  properties: string[];
  /** The text of the button, e.g. `{ "en": "Draw the shape…", "nl": "Vorm tekenen…" }`. */
  label?: AuthoringText;
  /** The size (px) the authoring UI would like; the authoring system may give less. */
  width?: number;
  height?: number;
  [hint: string]: unknown;
}

/**
 * What the authoring system passes to getAuthoringInstance. `properties` are the item's data- properties, all of
 * them (also the ones the PCI does not fill itself, so it can show the shape in the item's colours), as strings.
 */
export interface PciAuthoringConfiguration<T> {
  properties: Partial<T>;
  /** The UI language of the authoring system ("nl", "en"). */
  language?: string;
  /** Call when the authoring UI is ready to be used. */
  onready?: (instance: PciAuthoringInstance) => void;
  /** Call after every change the author makes (the host may enable "Done" or warn about unsaved work). */
  onchange?: () => void;
}

/** A PCI in authoring mode: the author shapes its configuration, the host asks for it when the author is done. */
export interface PciAuthoringInstance {
  /** The managed properties (descriptor authoring.properties) as data- attribute strings; others are ignored. */
  getConfig: () => Record<string, string>;
  /** What keeps the configuration from being used (shown to the author, "Done" waits for an empty list). */
  validate?: () => string[];
  destroy?: () => void;
}


/**
 * postMessage protocol between an authoring system (host) and the sandboxed iframe it runs a PCI's authoring mode in.
 * The frame is the host's own bootstrap page; the PCI itself never posts messages.
 *
 * Every message carries `version`: the protocol version of its sender, 1 for this protocol. It goes up only for a change
 * the other side cannot handle (a new optional field keeps it). The frame checks it on init, the host on hello; a
 * mismatch is reported as an error.
 */
export type PciAuthoringProtocolVersion = 1;

type Versioned<M> = M & { version: PciAuthoringProtocolVersion };

export type PciAuthoringHostMessage = Versioned<
  /** After the frame said hello: what to load and with which properties. */
  | { type: "pci-authoring:init"; moduleUrl: string; typeIdentifier: string; properties: Record<string, string>; language?: string }
  /** The author pressed "Done": reply with pci-authoring:config. */
  | { type: "pci-authoring:request-config" }
>;

export type PciAuthoringFrameMessage = Versioned<
  | { type: "pci-authoring:hello" }
  | { type: "pci-authoring:ready" }
  | { type: "pci-authoring:change" }
  | { type: "pci-authoring:config"; config: Record<string, string>; problems: string[] }
  /** The module did not load, has no getAuthoringInstance, or the host speaks another protocol version. */
  | { type: "pci-authoring:error"; message: string }
>;

// Define the ConfigProperties interface
export interface ConfigProperties<T> {
  properties: T; // Follows dataset conversion rules (camelCased keys)
  templateVariables: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  contextVariables: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  boundTo: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  responseIdentifier: string; // Unique within interaction scope
  responseDeclaration?: ResponseDeclaration; // Optional, carries the correct response when the item declares one

  onready: (interaction: IMSpci<T>, state?: string) => void; // Callback when PCI is fully constructed and ready
  ondone?: (
    interaction: IMSpci<T>,
    response: Record<string, QtiVariableJSON>,
    state: string,
    status?: "interacting" | "closed" | "solution" | "review"
  ) => void; // Optional callback when candidate finishes interaction

  status?: "interacting" | "suspended" | "closed" | "solution" | "review"; // Optional, defaults to "interacting"
}

export interface IMSpci<T> {
  typeIdentifier: string;

  /** @access public
   * @method getResponse
   * @return {Object} - the value to assign to the bound QTI response variable
   */
  getResponse: () => QtiVariableJSON | undefined;

  /** @access public
   * @method getState
   * @return {String} The current state of this PCI. May be passed to
   * getInstance to later restore this PCI instance.
   */
  getState: () => string;
  oncompleted?: () => void;
  checkValidity?: () => boolean | undefined;
  reportValidity?: () => boolean | undefined;
  setCustomValidity?: (message: string) => void;
  getCustomValidity?: () => string;
  setResponse?: (response: QtiVariableJSON) => void; // Not in the QTI 3.0 PCI instance interface, but used by some delivery engines/tools
  destroy?: () => void; // Not used in QTI 3.0, but kept for compatibility
}

export interface IMSpciFactory<T> {
  typeIdentifier: string;
  getInstance: (dom: HTMLElement, configuration: ConfigProperties<T>, state?: string) => IMSpci<T>;
  /**
   * Not part of QTI 3: the correct response for these settings, for an authoring system (config.tspci.correctResponse
   * "settings"). Gets the item's data- properties as strings (a missing one means its default) and returns what
   * getResponse() reports for the correct answer, or undefined when these settings have no single correct answer.
   * Players never call it. It must not touch the DOM: it may run without an instance, in another frame.
   */
  getCorrectResponse?: PciCorrectResponse<T>;
}

/** See IMSpciFactory.getCorrectResponse. */
export type PciCorrectResponse<T> = (properties: Partial<T>) => QtiVariableJSON | undefined;

/**
 * The QTI 3 PCI (the object registered with qtiCustomInteractionContext) extended with an authoring mode:
 * getAuthoringInstance next to getInstance. Delivery engines only know getInstance and never call it, so the PCI works
 * in every QTI 3 player as before; an authoring system that supports it checks
 * `typeof pci.getAuthoringInstance === "function"` and calls it instead of getInstance. See AUTHORING.md, "Authoring mode".
 */
export interface IMSpciAuthoringFactory<T> extends IMSpciFactory<T> {
  getAuthoringInstance: (dom: HTMLElement, configuration: PciAuthoringConfiguration<T>) => PciAuthoringInstance;
}

export interface directedPair {
  destination: string;
  source: string;
}
export interface ResponseInteraction<T> {
  responseIdentifier: string;
  responses: T;
}
export interface ResponseItem<T> {
  item: string;
  interaction: ResponseInteraction<T>;
}
export interface InputResponseFormat<T> {
  item: string;
  interactions: ResponseInteraction<T>[];
}
export interface Calculate {
  calculate: () => ResponseType;
}
export declare type float = number;
export declare type integer = number;
export declare enum BaseType {
  boolean = "boolean",
  directedPair = "directedPair",
  float = "float",
  integer = "integer",
  string = "string",
}
export declare type Multiple = Array<ResponseType>;
export declare type Ordered = Array<ResponseType>;
export declare enum Cardinality {
  multiple = "multiple",
  ordered = "ordered",
  single = "single",
}

// Individual type definitions for different QTI data types

// File type representation
export type QtiFileData = {
  data: string;
  mime: string;
  name?: string;
};

// Possible base types
export type QtiBaseBoolean = boolean;
export type QtiBaseInteger = number;
export type QtiBaseFloat = number;
export type QtiBaseString = string;
export type QtiBasePoint = [number, number];
export type QtiBasePair = [string, string];
export type QtiBaseDirectedPair = [string, string];
export type QtiBaseDuration = string; // ISO 8601 duration format
export type QtiBaseFile = QtiFileData;
export type QtiBaseUri = string;
export type QtiBaseIntOrIdentifier = number | string;
export type QtiBaseIdentifier = string;

// Union of all possible response types for base and list
export type ResponseType = 
  boolean | 
  number | 
  string | 
  QtiBasePair | 
  QtiBasePoint | 
  QtiFileData | 
  Array<boolean | number | string | QtiBasePair | QtiBasePoint | QtiFileData>;

// Record item type
export type QtiRecordItem = {
  name: string;
  base?: QtiBaseTypeJSON | null;
  list?: QtiListTypeJSON | null;
};

// Base type JSON representation
export type QtiBaseTypeJSON = {
  boolean?: QtiBaseBoolean;
  integer?: QtiBaseInteger;
  float?: QtiBaseFloat;
  string?: QtiBaseString;
  point?: QtiBasePoint;
  pair?: QtiBasePair;
  directedPair?: QtiBaseDirectedPair;
  duration?: QtiBaseDuration;
  file?: QtiBaseFile;
  uri?: QtiBaseUri;
  intOrIdentifier?: QtiBaseIntOrIdentifier;
  identifier?: QtiBaseIdentifier;
} | null;

// List type JSON representation
export type QtiListTypeJSON = {
  boolean?: QtiBaseBoolean[];
  integer?: QtiBaseInteger[];
  float?: QtiBaseFloat[];
  string?: QtiBaseString[];
  point?: QtiBasePoint[];
  pair?: QtiBasePair[];
  directedPair?: QtiBaseDirectedPair[];
  duration?: QtiBaseDuration[];
  file?: QtiBaseFile[];
  uri?: QtiBaseUri[];
  intOrIdentifier?: QtiBaseIntOrIdentifier[];
  identifier?: QtiBaseIdentifier[];
} | null;

// Complete QTI Variable JSON type
export declare type QtiVariableJSON = {
  base?: QtiBaseTypeJSON;
  list?: QtiListTypeJSON;
  record?: QtiRecordItem[] | null;
};
