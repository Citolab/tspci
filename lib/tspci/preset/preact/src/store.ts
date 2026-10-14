import { Store } from "@citolab/preact-store";

/**
 * The state of the PCI. Every change goes through an action (store.dispatch), and the store keeps the list of actions:
 * getState() saves both, so a session can be restored, and even replayed (store.replay), action by action.
 */
export type StateModel = { value: string }; // the text in the input, also when it is not a number yet
/** The actions, as { type: payload }: dispatch and addReducer only accept these. */
export type Actions = { SET_VALUE: { value: string } };

export const initialState: StateModel = { value: "" };

export const initStore = (state: StateModel = initialState) => {
  const store = new Store<StateModel, Actions>(state);
  store.addReducer("SET_VALUE", (current, { value }) => ({ ...current, value }));
  return store;
};
