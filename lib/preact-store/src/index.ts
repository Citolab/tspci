// a type action with generic T for the payload where T has a property: type
import { useEffect, useState } from 'preact/hooks';
export type Action<P> = {
  type: string;
  payload: P;
  timestamp?: number;
};

export type GenericT<T> = T & { type: string; timestamp?: number };

export type Listener<T> = (state: T) => void;
export type Reducer<T, P> = (state: T, payload: P) => T;


export interface IStore<T> {
  getState(): T;
  getActions(): Action<unknown>[];
  dispatch<P>(action: Action<P>): void;
  restoreState(state: T, actions: Action<unknown>[]): void;
  replay(actions: Action<unknown>[], config?: { speed?: number; animate?: boolean; }): Promise<void>;
  reset(): void;
  addReducer<P>(type: string, reducer: Reducer<T, P>): void;
  subscribe(listener: Listener<T>): void;
  subscribeActions(listener: Listener<Action<unknown>>): void;
  unsubscribeAll(): void;
  unsubscribe(listener: Listener<T>): void;
}

export class Store<T> implements IStore<T> {
  private state: T;
  private listeners: Listener<T>[] = [];
  private actionListeners: Listener<Action<unknown>>[] = [];
  private actions: Action<unknown>[] = [];
  private reducers: { [key: string]: Reducer<T, any> } = {}

  constructor(private initialState: T, restoreData?: {
    state: T;
    actions: Action<unknown>[];
  }) {
    this.state = restoreData?.state || initialState;
    if (restoreData?.actions) {
      this.state = initialState;
      this.actions = restoreData.actions;
      for (const action of this.actions) {
        this.state = this.reduce(this.state, action);
      }
    }

  }

  getState(): T {
    return this.state;
  }

  getActions(): Action<unknown>[] {
    return this.actions;
  }

  dispatch<P>(payload: Action<P>): void {
    const timestamp = Date.now();
    const payloadWithTimestamp = { ...payload, timestamp };
    this.actions.push(payloadWithTimestamp);
    this.state = this.reduce(this.state, payloadWithTimestamp);
    this.notifyListeners(payloadWithTimestamp);
  }

  reset(): void {
    this.state = this.initialState;
    this.actions = [];
  }

  restoreState(state: T, actions: Action<unknown>[]): void {
    this.state = state;
    this.actions = actions;
  }


  async replay(actions: Action<unknown>[], config?: { until?: number; speed?: number; animate?: boolean }): Promise<void> {
    this.reset();
    this.actions = [];
    let previousTimestamp = 0;
   
    // if config.until is not null or undefined but accept 0
    if (config?.until != null) {
      actions = actions.slice(0, config.until);   
    }

    
    for (const action of actions) {
      // get the delay between the previous action and this action in milliseconds
      let delay = config?.animate === false ? 0 : !previousTimestamp ? 0 : action.timestamp - previousTimestamp;

      if (config?.speed) {
        delay /= config.speed;
      }
      await this.timeout(delay);
      this.actions.push(action);
      this.state = this.reduce(this.state, action);
      this.notifyListeners(action);
      previousTimestamp = action.timestamp;
    }
  }

  subscribe(listener: Listener<T>): void {
    this.listeners.push(listener);
    // Immediately notify the listener with the current state
    listener(this.state);
  }

  subscribeActions(listener: Listener<Action<unknown>>): void {
    this.actionListeners.push(listener);
  }

  unsubscribe(listener: Listener<T>): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  unsubscribeAll(): void {
    this.listeners = [];
  }

  addReducer<P>(type: string, reducer: Reducer<T, P>): void {
    this.reducers[type] = reducer;
  }

  private reduce(state: T, action: Action<unknown>): T {
    const reducer = this.reducers[action.type];
    return reducer ? reducer(state, action.payload) : state;
  }

  private notifyListeners(action: Action<unknown>): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
    for (const listener of this.actionListeners) {
      listener(action);
    }
    console.log('Action:', action);
  }

  private timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
}

export function useStore<T>(store: IStore<T>): T {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const listener: Listener<T> = (newState: T) => {
      setState(newState);
    };
    store.subscribe(listener);
    return () => {
      store.unsubscribe(listener);
    };
  }, [store]);

  return state;
}