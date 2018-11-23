## Redux Keyed Reducer
Maintain multiple instances of the same reducer state.

```sh
npm install redux-keyed-reducer
```

### Usage

```js
import { createStore, combineReducers } from "redux";
import { createKeyedReducer, bindKeyedActions } from "redux-keyed-reducer";

// First, define a new Redux reducer and action creators as usual.
function counter(state = 0, action) {
    switch (action.type) {
        case "increment":
            return state + 1;
        case "decrement":
            return state - 1;
        default:
            return state;
    }
}

function increment() {
    return { type: "increment" };
}

function decrement() {
    return { type: "decrement" };
}

// Then, create a new keyed reducer by calling "createKeyedReducer" with the
// reducer defined above and give it a unique identifier.
const keyedCounter = createKeyedReducer(counter, "counter");

// Use this new keyed reducer as you normally would any other reducer.
const store = createStore(
    combineReducers({ counter: keyedCounter })
);

// Bind new keyed action creators by calling "bindKeyedActions" with an object
// of action creators, the store keys these actions should target, and a
// dispatch function.
const actions = bindKeyedActions(
    { onIncrement: increment, onDecrement: decrement },
    { counter: "testKey" },
    store.dispatch
);

actions.onIncrement();
actions.onIncrement();
actions.onDecrement();

// Examine the state value, notice that the counter reducer state is now an
// object and each value contains the actual counter state. Also note the
// existence of the "default" instance -- this is always present in keyed
// reducer states and will never change; useful for falling back to as a
// default value in selectors.
console.log(store.getState()) // =>
// {
//     "counter": {
//         "default": 0,
//         "testKey": 1,
//     }
// }
```
