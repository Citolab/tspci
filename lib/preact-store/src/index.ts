import { useState, useEffect } from "preact/hooks";

let globalState = {};
let listeners = [];
let actions: IAction<unknown, unknown, unknown>[] = [];
let actionSubscription = undefined;
let triggerReplay = 0;

export function useStore<S, A>(
  callback?: (actionIdentifier: A, payload) => void
): [
  S,
  <P>(actionIdentifier: A, payload: P) => void,
  (
    action?: {
      type: string;
      payload: unknown;
      timestamp?: number;
    }[],
    delayMs?: number
  ) => Promise<void>
] {
  const setState = useState(globalState)[1];

  useEffect(() => {
    if (triggerReplay > 0) {
      replay(actions as any[])
    }
  }, [triggerReplay])

  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((li) => li !== setState);
    };
  }, [setState]);

  function dispatch<P>(actionIdentifier: A, payload: P, bypasslisteners = false) {
    const typeActions = actions as IAction<S, unknown, A>[];
    const action = typeActions.find((a) => a.type.toString() === actionIdentifier.toString());
    debugger;
    // get date now in ms
    const timestamp = new Date().getTime();
    payload = { ...payload, timestamp };
    callback && callback(action.type, payload);
    const newState = action.action(globalState as S, payload);

    globalState = { ...globalState, ...newState };

    if (!bypasslisteners) {
      if (actionSubscription) {
        actionSubscription({
          type: actionIdentifier,
          payload: payload,
        });
      }
    }

    for (const listener of listeners) {
      listener(globalState);
    }
  }

  async function replay(replayActions: { type: string; payload: unknown; timestamp?: number }[], speed?: number) {
    for (const action of replayActions) {
      if (action.timestamp) {
        // get difference the action.timestamp and the previous action.timestamp
        const delayMs = action.timestamp - (replayActions[replayActions.indexOf(action) - 1]?.timestamp || 0);
        if (speed) {
          await timeout(delayMs / speed);
        } else {
          await timeout(delayMs);
        }
      }
      dispatch(action.type as unknown as A, action.payload, true);
    }
  }

  return [globalState as S, dispatch, replay];
}

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanupStore() {
  globalState = {};
  listeners = [];
  actions = [];
}

export interface Store<S> {
  cleanup: () => void;
  getState: () => S;
  replay: () => void;
}

export function initStore<S>(
  userActions: IAction<S, unknown, unknown>[],
  initialState: S,
  subscribe?: (action) => void
): Store<S> {
  if (initialState) {
    globalState = { ...globalState, ...initialState };
  }
  actions = [...new Set([...actions, ...userActions])] as IAction<unknown, unknown, unknown>[];

  actionSubscription = subscribe;
  return { getState: () => globalState as S, cleanup: () => cleanupStore(), replay: () => {
    globalState = {...initialState};
    triggerReplay++ 
  }};
}

export interface IAction<S, P, A> {
  type: A;
  action: (currentState: S, payload: P) => S;
}
