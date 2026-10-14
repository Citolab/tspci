# @citolab/preact-store

Simple store to manage state using preact.

## Store
The Store class is a simple implementation of a Redux-like store. It provides a way to manage the state of an application, and to dispatch actions that modify the state.

Every dispatched action is kept, with a timestamp. A PCI usually saves them in `getState()`, next to the state, so you can see (and replay) how a candidate came to an answer.

## Usage
To use the Store class, you first need to create an instance of it with an initial state, and add a reducer for each action:

```ts
const store = new Store({ count: 0 });
store.addReducer<{ by: number }>("INCREMENT", (state, { by }) => ({ ...state, count: state.count + by }));
```

You can then dispatch actions to modify the state:

```ts
store.dispatch({ type: "INCREMENT", payload: { by: 1 } });
```

You can also subscribe to changes in the state:

```ts
const unsubscribe = store.subscribe(state => {
  console.log('New state:', state);
});
```

In a component, `useStore` gives the state and re-renders on every change:

```ts
const { count } = useStore(store);
```

### Typed actions

Pass the actions as `{ type: payload }`, and `dispatch` and `addReducer` only accept those types, each with its own payload:

```ts
type Actions = { INCREMENT: { by: number }; RESET: null };
const store = new Store<{ count: number }, Actions>({ count: 0 });
store.addReducer("INCREMENT", (state, { by }) => ({ ...state, count: state.count + by })); // `by` is a number
store.dispatch({ type: "INCREMENT", payload: { by: 1 } });
store.dispatch({ type: "INCREMENT", payload: null }); // type error
```

Without them (the default) any action goes, as before.

## API

### Store

```ts
constructor(initialState: T, restoreData?: { state: T; actions: Action<unknown>[]; }, options?: { maxActions?: number })
```

Creates a new ```Store``` instance with the given initial state. If restoreData is provided, it will restore the state and actions from the given data.

`maxActions` keeps at most that many actions, dropping the oldest, so the log (and a saved state) does not grow without end. A capped log no longer replays from the initial state.


```ts
getState(): T
```

Returns the current state of the store.

```ts
getActions(): Action<unknown>[]
```

Returns an array of all the actions that have been dispatched to the store.

```ts
dispatch(action: Action<P>): void
```

Dispatches an action to the store, which will modify the state. The state listeners, and then the action listeners, are called.

```ts
reset(): void
```
Resets the store to its initial state and clears all actions. The state listeners are called.

```ts
restoreState(state: T, actions: Action<unknown>[]): void
```
Restores the state and actions of the store from the given data, without running the reducers. The state listeners are called.

```ts
replay(actions: Action<unknown>[], config?: { until?: number; speed?: number; animate?: boolean }): Promise<void>
```
Resets the store and dispatches the actions again, with the time between them (divided by `speed`, or none with `animate: false`), up to action `until`.

```ts
subscribe(listener: Listener<T>, options?: { immediate?: boolean }): () => void
```
Subscribes to changes in the state of the store. The listener function will be called whenever the state changes, and right away with the current state, unless `immediate` is `false`. Returns a function that unsubscribes.

```ts
subscribeActions(listener: Listener<Action<unknown>>): () => void
```
Subscribes to new actions that are dispatched to the store. The listener function will be called whenever a new action is dispatched. Returns a function that unsubscribes.

```ts
unsubscribe(listener: Listener<T>): void
unsubscribeActions(listener: Listener<Action<unknown>>): void
```
Unsubscribes a listener from changes in the state, or from the actions.
```ts
unsubscribeAll(): void
```
Unsubscribes all listeners, of the state and of the actions. Use it when you are done with the store (e.g. `oncompleted` of a PCI), not to reset it: `reset()` and `restoreState()` already tell the listeners.

```ts
addReducer<P>(type: string, reducer: Reducer<T, P>): void
```
Adds a reducer function to the store. The reducer function will be called whenever an action with the given type is dispatched to the store.

```ts
useStore
```
A hook that can be used to subscribe to changes in the state of a store.

## Types


```Action<P>```

A type that represents an action that can be dispatched to the store. It has a type property that identifies the type of the action, and a payload property that contains the data for the action.


```Listener<T>```

A type that represents a listener function that can be subscribed to changes in the state of a store.

```Reducer<T, P>```

A type that represents a reducer function that can be added to a store. It takes the current state of the store and an action payload, and returns a new state.

```IStore<T, M>```

The interface of a store with state `T` and, optionally, the actions `M` (`{ type: payload }`).
