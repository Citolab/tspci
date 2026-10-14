import { Store } from "@citolab/preact-store";

/**
 * The state of the PCI. Every change goes through an action (store.dispatch), and the store keeps the list of actions:
 * getState() saves both, so a session can be restored, and even replayed (store.replay), action by action.
 */
export type StateModel = { value: string }; // the text in the input, also when it is not a number yet
export type ActionType = "SET_VALUE";

export const initialState: StateModel = { value: "" };

export const initStore = (state: StateModel = initialState) => {
  const store = new Store<StateModel>(state);
  store.addReducer<{ value: string }>("SET_VALUE", (current, { value }) => ({ ...current, value }));
  return store;
};
