# @citolab/preact-store

Simple store to manage state using preact.

## Store
The Store class is a simple implementation of a Redux-like store. It provides a way to manage the state of an application, and to dispatch actions that modify the state.

## Usage
To use the Store class, you first need to create an instance of it with an initial state:

```ts 
const store = new Store(initialState);
```

You can then dispatch actions to modify the state:

```ts 
store.dispatch({ type: 'INCREMENT' });
```

You can also subscribe to changes in the state:

```ts 
store.subscribe(state => {
  console.log('New state:', state);
});
```

## API

### Store

```ts 
constructor(initialState: T, restoreData?: { state: T; actions: Action<unknown>[]; })
```

Creates a new ```Store``` instance with the given initial state. If restoreData is provided, it will restore the state and actions from the given data.


```ts
getState(): T
```

Returns the current state of the store.

```ts
getActions(): Action<unknown>[]
```

Returns an array of all the actions that have been dispatched to the store.

```ts
dispatch<P>(action: Action<P>): void
```

Dispatches an action to the store, which will modify the state.

```ts
reset(): void
```
Resets the store to its initial state and clears all actions.

```ts
restoreState(state: T, actions: Action<unknown>[]): void
```
Restores the state and actions of the store from the given data.

```ts
subscribe(listener: Listener<T>): void
```
Subscribes to changes in the state of the store. The listener function will be called whenever the state changes.

```ts
subscribeActions(listener: Listener<Action<unknown>>): void
```
Subscribes to new actions that are dispatched to the store. The listener function will be called whenever a new action is dispatched.

```ts
unsubscribe(listener: Listener<T>): void
```
Unsubscribes a listener from changes in the state of the store.
```ts
unsubscribeAll(): void
```
Unsubscribes all listeners from changes in the state of the store.

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

```IStore<T>```

An interface that defines the methods and properties of a store. It extends the IStore interface, which is a more generic interface that defines the methods and properties of any store.