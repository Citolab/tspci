# @citolab/preact-store

Simple store to manage state using preact.

## How to start

1. install the package
```sh 
npm i  @citolab/preact-store
```
2. Define a model to store state: 

```ts 
export type StateModel = {
  todos: string[];
};

```
3. Create actions that modify the state: 


```ts
export type ActionType = "ADD_TODO_ACTION";

export const actions = [
  {
    type: "ADD_TODO_ACTION",
    action: (currentState: StateModel, { todo }: { todo: string }) => {
      const newState = { todos: [todo, ...currentState.todos] };
      return newState;
    },
  } as IAction<StateModel, { todo: string }, ActionType>,
];
```

4. Initialize store

```ts
    const callback = (action) => this.logActions.push(action);
    this.store = initStore<StateModel>(actionsToRestore || [], initialState,
     callback);

```

5. Get the state property and dispatch function in the class where the state will be used.

```ts
const [state, dispatch] = useStore<StateModel, ActionType>((type, payload) => {});
```

6. dispatch to change the state:

```ts
dispatch<{ todo: string }>("ADD_TODO_ACTION", { todo: e.target.value });
```

7. cleanup

```ts 
 this.store.cleanup();
```