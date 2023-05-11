export type ActionType = "SET_INPUT";

export type StateModel = { input: number };

export const actions = [
  {
    type: "SET_INPUT" as ActionType,
    action: (state: StateModel, { input }: { input: number }) => {
      return {...state, input };
    },
  },
];
