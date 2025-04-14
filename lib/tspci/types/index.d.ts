// Define the payload structure for the custom event
export interface QtiInteractionChangedDetail {
  interaction: IMSpci<unknown>; // The PCI instance itself
  responseIdentifier: string; // The response identifier provided in the getInstance call
  valid?: boolean; // Optional boolean indicating if checkValidity() returns true
  value?: QtiVariableJSON; // Optional value returned by getResponse()
}

// Define the ConfigProperties interface
export interface ConfigProperties<T> {
  properties: T; // Follows dataset conversion rules (camelCased keys)
  templateVariables: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  contextVariables: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  boundTo: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  responseIdentifier: string; // Unique within interaction scope

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
   *  @method getInstance Create a new instance of this portable custom interaction
   *  Will be called by the qtiCustomInteractionContext
   *  @param {DOM Element} dom - the DOM Element this PCI is being added to
   *  @param {Object} configuration - the configuration to apply to this PCI
   *  @param {String} state - a previous saved state to apply to this instance.
   *  This must have been obtained from a prior call to getState on an
   *  instance of this type (same typeIdentifier)
   */
  getInstance: (dom: HTMLElement, configuration: ConfigProperties<T>, state: string) => void;

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
  setResponse?: (response: QtiVariableJSON) => void; // No IMS specification for this, but best option to set the response when bound to a QTI variable
  destroy?: () => void; // Not used in IMS and not in TAO implementation, so not used here (optional)
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
