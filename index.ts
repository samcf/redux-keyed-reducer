import { Action, ActionCreatorsMapObject, AnyAction, Dispatch, Reducer, bindActionCreators } from "redux";
import { ThunkDispatch, ThunkAction } from "redux-thunk";

interface KeyedState<T> {
    [key: string]: T
}

interface StoreKeys {
    [key: string]: string,
}

interface KeyedReducerOptions {
    isKeyRequired?: boolean,
}

const sentinelAction: Action<"@@ReduxKeyedReducer"> = { type: "@@ReduxKeyedReducer" };
const defaultInstanceKey = "default";
const initialKeyedState = {};

function bindKeyedAction<A extends AnyAction>(action: A, storeKeys: StoreKeys): A {
    if (typeof action === 'function') {
        return action;
    }

    return (<any>Object).assign({}, action, {
        meta: (<any>Object).assign({}, action.meta, {
            storeKeys: (<any>Object).assign({}, getStoreKeys(action), storeKeys)
        })
    });
}

export function createKeyedDispatch<R, S, E, A extends Action>(
    dispatch: ThunkDispatch<S, E, A>,
    storeKeys: StoreKeys
): ThunkDispatch<S, StoreKeys, A> {
    return (action: A | ThunkAction<R, S, StoreKeys, A>) => {
        if (typeof action === "function") {
            const d = createKeyedDispatch<R, S, E, A>(dispatch, storeKeys);
            const t = (_: Dispatch<A>, getState: () => S) =>
                action(d, getState, storeKeys);
            return dispatch(t);
        }

        return dispatch(bindKeyedAction(action, storeKeys));
    };
}

export function getStoreKeys(action: AnyAction): StoreKeys {
    if (!("meta" in action)) {
        return {};
    }

    if (!("storeKeys" in action.meta)) {
        return {};
    }

    return action.meta.storeKeys;
}

export function bindKeyedActions<S, E, A extends Action = AnyAction>(
    actionCreators: ActionCreatorsMapObject<A>,
    storeKeys: StoreKeys,
    dispatch: ThunkDispatch<S, E, A>
): ActionCreatorsMapObject<A> {
    return bindActionCreators(actionCreators, <ThunkDispatch<S, StoreKeys, A>>createKeyedDispatch(dispatch, storeKeys));
}

export function createKeyedReducer<S, A extends Action = AnyAction>(
    reducer: Reducer<S, A>,
    storeKey: string,
    options: KeyedReducerOptions = {}
): Reducer<KeyedState<S>, A> {
    if (!(typeof reducer === "function")) {
        throw new Error("Expected the first argument to be a function.");
    }

    if (typeof storeKey !== "string") {
        throw new Error("Expected the second argument to be a string.");
    }

    if (storeKey.trim() === "") {
        throw new Error("Expected the second argument to be a non-empty string.");
    }

    return function keyedReducer(state = initialKeyedState, action: A): KeyedState<S> {
        const storeKeys = getStoreKeys(action);
        const nextState = (<any>Object).assign({}, state);

        if (!(defaultInstanceKey in nextState)) {
            nextState[defaultInstanceKey] = reducer(undefined, <A>sentinelAction);
        }

        if (storeKey in storeKeys) {
            const instanceName = storeKeys[storeKey];
            nextState[instanceName] = reducer(nextState[instanceName], action);
            return nextState;
        }

        if (options.isKeyRequired) {
            return nextState;
        }

        for (const instanceName in nextState) {
            if (instanceName === defaultInstanceKey) {
                continue;
            }

            nextState[instanceName] = reducer(nextState[instanceName], action);
        }

        return nextState;
    }
}
