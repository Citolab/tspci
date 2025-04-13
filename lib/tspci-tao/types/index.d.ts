export interface TAOpci {
  on: (value) => void; // TAO specific
  off: () => void; // else TAO gave a javascript error

  resetResponse?: () => void;
  trigger?: (event: string, value: any) => void;
  // All below are specific to TAO items, looks like we do not have to use them, keeping for ref
  /*
  gettypeIdentifier?: () => string;
  initialize?: (id, dom, config, assetManager) => void;
  trigger?: (event: string, value: any) => void;
  resetResponse?: () => void;
  setResponse?: (response) => void;
  setSerializedState?: (serializedState) => void;
  getSerializedState?: () => string;
  */
}