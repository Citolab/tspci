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
/** Returned by subscribe and subscribeActions: call it to stop listening. */
export type Unsubscribe = () => void;

/**
 * The actions a store knows, as { type: payload }, e.g. { SET_COLOR: { id: string; color: string }; CLEAR_ALL: null }.
 * With one, dispatch and addReducer only accept those types and payloads. Without one (the default) any action goes.
 */
export type ActionMap = Record<string, unknown>;
type Untyped = Record<string, any>;
/** One of the actions of the map, with its own payload. */
export type ActionOf<M extends ActionMap> = { [K in keyof M & string]: { type: K; payload: M[K]; timestamp?: number } }[keyof M & string];
/** What dispatch accepts: any action for an untyped store, one of the map for a typed store. */
type Dispatchable<M extends ActionMap, P> = string extends keyof M ? Action<P> : ActionOf<M>;

export type SubscribeOptions = {
  /** Call the listener right away with the current state (default true). */
  immediate?: boolean;
};

export type StoreOptions = {
  /**
   * Keep at most this many actions in the log, dropping the oldest. getState() of a PCI usually saves the log,
   * so this bounds its size; but a capped log no longer replays from the initial state.
   */
  maxActions?: number;
};

export interface IStore<T, M extends ActionMap = Untyped> {
  getState(): T;
  getActions(): Action<unknown>[];
  dispatch<P = unknown>(action: Dispatchable<M, P>): void;
  restoreState(state: T, actions: Action<unknown>[]): void;
  replay(actions: Action<unknown>[], config?: { until?: number; speed?: number; animate?: boolean; }): Promise<void>;
  reset(): void;
  addReducer<K extends keyof M & string>(type: K, reducer: Reducer<T, M[K]>): void;
  addReducer<P>(type: string extends keyof M ? string : never, reducer: Reducer<T, P>): void;
  subscribe(listener: Listener<T>, options?: SubscribeOptions): Unsubscribe;
  subscribeActions(listener: Listener<Action<unknown>>): Unsubscribe;
  unsubscribeAll(): void;
  unsubscribe(listener: Listener<T>): void;
  unsubscribeActions(listener: Listener<Action<unknown>>): void;
}

export class Store<T, M extends ActionMap = Untyped> implements IStore<T, M> {
  private state: T;
  private listeners: Listener<T>[] = [];
  private actionListeners: Listener<Action<unknown>>[] = [];
  private actions: Action<unknown>[] = [];
  private reducers: { [key: string]: Reducer<T, any> } = {}

  constructor(private initialState: T, restoreData?: {
    state: T;
    actions: Action<unknown>[];
  }, private options: StoreOptions = {}) {
    this.state = restoreData?.state || initialState;
    if (restoreData?.actions) {
      this.state = initialState;
      this.actions = [...restoreData.actions];
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

  dispatch<P = unknown>(payload: Dispatchable<M, P>): void {
    const timestamp = Date.now();
    const payloadWithTimestamp: Action<unknown> = { ...payload, timestamp };
    this.log(payloadWithTimestamp);
    this.state = this.reduce(this.state, payloadWithTimestamp);
    this.notifyListeners(payloadWithTimestamp);
  }

  /** Back to the initial state, without actions; the state listeners hear about it. */
  reset(): void {
    this.state = this.initialState;
    this.actions = [];
    this.notifyStateListeners();
  }

  /** Sets the state and the log as they are (no reducers run); the state listeners hear about it. */
  restoreState(state: T, actions: Action<unknown>[]): void {
    this.state = state;
    this.actions = [...actions];
    this.notifyStateListeners();
  }


  async replay(actions: Action<unknown>[], config?: { until?: number; speed?: number; animate?: boolean }): Promise<void> {
    this.reset();
    let previousTimestamp = 0;

    // if config.until is not null or undefined but accept 0
    if (config?.until != null) {
      actions = actions.slice(0, config.until);
    }


    for (const action of actions) {
      // get the delay between the previous action and this action in milliseconds
      let delay = config?.animate === false ? 0 : !previousTimestamp ? 0 : (action.timestamp ?? previousTimestamp) - previousTimestamp;

      if (config?.speed) {
        delay /= config.speed;
      }
      await this.timeout(delay);
      this.log(action);
      this.state = this.reduce(this.state, action);
      this.notifyListeners(action);
      previousTimestamp = action.timestamp ?? previousTimestamp;
    }
  }

  subscribe(listener: Listener<T>, options?: SubscribeOptions): Unsubscribe {
    this.listeners.push(listener);
    // By default notify the listener with the current state right away
    if (options?.immediate !== false) {
      listener(this.state);
    }
    return () => this.unsubscribe(listener);
  }

  subscribeActions(listener: Listener<Action<unknown>>): Unsubscribe {
    this.actionListeners.push(listener);
    return () => this.unsubscribeActions(listener);
  }

  unsubscribe(listener: Listener<T>): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  unsubscribeActions(listener: Listener<Action<unknown>>): void {
    const index = this.actionListeners.indexOf(listener);
    if (index !== -1) {
      this.actionListeners.splice(index, 1);
    }
  }

  /** Removes every listener, of the state and of the actions. */
  unsubscribeAll(): void {
    this.listeners = [];
    this.actionListeners = [];
  }

  addReducer<K extends keyof M & string>(type: K, reducer: Reducer<T, M[K]>): void;
  addReducer<P>(type: string extends keyof M ? string : never, reducer: Reducer<T, P>): void;
  addReducer(type: string, reducer: Reducer<T, any>): void {
    this.reducers[type] = reducer;
  }

  private reduce(state: T, action: Action<unknown>): T {
    const reducer = this.reducers[action.type];
    return reducer ? reducer(state, action.payload) : state;
  }

  private log(action: Action<unknown>): void {
    this.actions.push(action);
    const max = this.options.maxActions;
    if (max != null && max >= 0 && this.actions.length > max) {
      this.actions.splice(0, this.actions.length - max);
    }
  }

  private notifyStateListeners(): void {
    // a copy: a listener may unsubscribe while we notify
    for (const listener of [...this.listeners]) {
      listener(this.state);
    }
  }

  private notifyListeners(action: Action<unknown>): void {
    this.notifyStateListeners();
    for (const listener of [...this.actionListeners]) {
      listener(action);
    }
  }

  private timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
}

export function useStore<T, M extends ActionMap = Untyped>(store: IStore<T, M>): T {
  const [state, setState] = useState(store.getState());

  // subscribe calls the listener right away, so a change between the render and this effect is not missed
  useEffect(() => store.subscribe(setState), [store]);

  return state;
}
