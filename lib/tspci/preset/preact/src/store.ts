import { Store } from "@citolab/preact-store";

export type ActionType = "SET_INPUT" | "RESTORE_STATE";
export type StateModel = { input: number | undefined };

export const initStore = (
  initialState: StateModel,
  restoreData?: {
    state: StateModel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: { type: string; payload: any; timestamp?: number }[];
  }
) => {
  const store = new Store<StateModel>(initialState, restoreData);
  store.addReducer<{ input: number | undefined }>("SET_INPUT", (state, { input }) => {
    return { ...state, input };
  });
  return store;
};
