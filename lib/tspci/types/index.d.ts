// Define the payload structure for the custom event
export interface QtiInteractionChangedDetail {
  interaction: IMSpci<ConfigProperties>; // The PCI instance itself
  responseIdentifier: string; // The response identifier provided in the getInstance call
  valid?: boolean; // Optional boolean indicating if checkValidity() returns true
  value?: QtiVariableJSON; // Optional value returned by getResponse()
}

// Define the ConfigProperties interface
export interface ConfigProperties {
  properties: Record<string, string>; // Follows dataset conversion rules (camelCased keys)
  templateVariables: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  contextVariables: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  boundTo: Record<string, QtiVariableJSON>; // Follows structure in Appendix C
  responseIdentifier: string; // Unique within interaction scope

  onready: (interaction: IMSpci<ConfigProperties>, state?: string) => void; // Callback when PCI is fully constructed and ready
  ondone?: (
    interaction: IMSpci<ConfigProperties>,
    response: Record<string, QtiVariableJSON>,
    state: string,
    status?: "interacting" | "closed" | "solution" | "review"
  ) => void; // Optional callback when candidate finishes interaction

  status?: "interacting" | "suspended" | "closed" | "solution" | "review"; // Optional, defaults to "interacting"
}

export interface IMSpci<CustomConfigProperties extends ConfigProperties> {
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
  getInstance: (dom: HTMLElement, configuration: Configuration<CustomConfigProperties>, state: string) => void;

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
  destroy?: () => void; // Not used in IMS and not in TAO implementation, so not used here (optional)
}

export declare type Configuration<T extends ConfigProperties> = {
  onready: () => void;
  properties: T;
};

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
export declare type QtiVariableJSON = {
  [K in "list" | "base"]?: {
    [Ka in "boolean" | "integer" | "float" | "string" | "pair" | "directedPair" | "identifier"]?: ResponseType;
  };
};
export declare type float = number;
export declare type integer = number;
export declare type ResponseType = boolean | directedPair | float | integer | string | ResponseType[];
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
