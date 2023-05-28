import { Store } from "@citolab/preact-store";

export type ActionType = "SET_INPUT" | "RESTORE_STATE";
export type StateModel = { input: number };

export const initStore = (initialState: StateModel, restoreData?: {
  state?: StateModel;
  actions: { type: string; payload: any; timestamp?: number }[];
}) => {
  const store = new Store<StateModel>(initialState, restoreData);
  store.addReducer<{ input: number }>("SET_INPUT", (state, { input }) => {
    return {...state, input };
  });
  return store;
}
