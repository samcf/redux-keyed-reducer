import {
    Action,
    ActionCreatorsMapObject,
    AnyAction,
    bindActionCreators,
    Dispatch,
    Reducer,
} from "redux";

import {
    ThunkAction,
    ThunkDispatch,
} from "redux-thunk";

interface IKeyedState<T> {
    [key: string]: T;
}

interface IStoreKeys {
    [key: string]: string;
}

interface IKeyedReducerOptions {
    isKeyRequired?: boolean;
}

const sentinelAction: Action<"@@ReduxKeyedReducer"> = { type: "@@ReduxKeyedReducer" };
const defaultInstanceKey = "default";
const initialKeyedState = {};

function bindKeyedAction<A extends AnyAction>(action: A, storeKeys: IStoreKeys): A {
    if (typeof action === "function") {
        return action;
    }

    return (Object as any).assign({}, action, {
        meta: (Object as any).assign({}, action.meta, {
            storeKeys: (Object as any).assign({}, getStoreKeys(action), storeKeys),
        }),
    });
}

export function createKeyedDispatch<R, S, E, A extends Action>(
    dispatch: ThunkDispatch<S, E, A>,
    storeKeys: IStoreKeys,
): ThunkDispatch<S, IStoreKeys, A> {
    return (action: A | ThunkAction<R, S, IStoreKeys, A>) => {
        if (typeof action === "function") {
            const d = createKeyedDispatch<R, S, E, A>(dispatch, storeKeys);
            const t = (_: Dispatch<A>, getState: () => S) =>
                action(d, getState, storeKeys);
            return dispatch(t);
        }

        return dispatch(bindKeyedAction(action, storeKeys));
    };
}

export function getStoreKeys(action: AnyAction): IStoreKeys {
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
    storeKeys: IStoreKeys,
    dispatch: ThunkDispatch<S, E, A>,
): ActionCreatorsMapObject<A> {
    return bindActionCreators(actionCreators, createKeyedDispatch(dispatch, storeKeys));
}

export function createKeyedReducer<S, A extends Action = AnyAction>(
    reducer: Reducer<S, A>,
    storeKey: string,
    options: IKeyedReducerOptions = {},
): Reducer<IKeyedState<S>, A> {
    if (!(typeof reducer === "function")) {
        throw new Error("Expected the first argument to be a function.");
    }

    if (typeof storeKey !== "string") {
        throw new Error("Expected the second argument to be a string.");
    }

    if (storeKey.trim() === "") {
        throw new Error("Expected the second argument to be a non-empty string.");
    }

    return function keyedReducer(state = initialKeyedState, action: A): IKeyedState<S> {
        const storeKeys = getStoreKeys(action);
        const nextState = (Object as any).assign({}, state);

        if (!(defaultInstanceKey in nextState)) {
            nextState[defaultInstanceKey] = reducer(undefined, sentinelAction as A);
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
    };
}
