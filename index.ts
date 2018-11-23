import Redux, { bindActionCreators } from "redux";
import Thunk from "redux-thunk";

interface StoreKeys {
    [key: string]: string,
}

interface Options {
    isKeyRequired?: boolean,
}

interface LateBoundKeyedAction {
    action: Redux.ActionCreator<any>,
    storeKey: string,
}

interface LateBoundKeyedActions {
    [key: string]: LateBoundKeyedAction,
}

interface KeyedState {
    [key: string]: any
}

const sentinelAction: Redux.Action<"@@redux-keyed-reducer/sentinel-action"> = { type: "@@redux-keyed-reducer/sentinel-action" };
const defaultInstanceKey = "default";
const initialState = {};

function bindKeyedAction(action: Redux.AnyAction, storeKeys: StoreKeys): Redux.AnyAction {
    if (typeof action === 'function') {
        return action;
    }

    const existingKeys = getStoreKeys(action);
    const newStoreKeys = { ...existingKeys, ...storeKeys };
    if (!("meta" in action)) {
        action.meta = { storeKeys: newStoreKeys };
    }

    action.meta.storeKeys = newStoreKeys;
    return action;
}

function createKeyedDispatch(dispatch: any, storeKeys: StoreKeys) {
    return function keyedDispatch(action: any) {
        if (typeof action === "function") {
            return dispatch(function (_: never, getState: any) {
                return action(createKeyedDispatch(dispatch, storeKeys), getState, storeKeys);
            });
        }

        return dispatch(bindKeyedAction(action, storeKeys));
    }
}

export function getStoreKeys(action: Redux.AnyAction): StoreKeys {
    if (!("meta" in action)) {
        return {};
    }

    if (!("storeKeys" in action.meta)) {
        return {};
    }

    return action.meta.storeKeys;
}

export function bindKeyedActions(actionCreators: Redux.ActionCreatorsMapObject, storeKeys: StoreKeys, dispatch: Redux.Dispatch) {
    return bindActionCreators(actionCreators, createKeyedDispatch(dispatch, storeKeys));
}

export function lateBindKeyedActions(lateBoundActionCreators: LateBoundKeyedActions, dispatch: any): Redux.ActionCreatorsMapObject {
    const actionCreators: Redux.ActionCreatorsMapObject = {};
    for (const key in lateBoundActionCreators) {
        const { action, storeKey } = lateBoundActionCreators[key];
        actionCreators[key] =
            instanceName =>
                (...args: any[]) =>
                    createKeyedDispatch(dispatch, { [storeKey]: instanceName })(action(...args));
    }

    return actionCreators;
}

export function createKeyedReducer(reducer: Redux.Reducer, storeKey: string, options: Options = {}): Redux.Reducer {
    if (!(typeof reducer === "function")) {
        throw new Error("Expected the first argument to be a function.");
    }

    if (typeof storeKey !== "string") {
        throw new Error("Expected the second argument to be a string.");
    }

    if (storeKey.trim() === "") {
        throw new Error("Expected the second argument to be a non-empty string.");
    }

    return function keyedReducer(state: KeyedState = initialState, action: Redux.Action): KeyedState {
        const storeKeys = getStoreKeys(action);
        const nextState = { ...state };

        if (!(defaultInstanceKey in nextState)) {
            nextState[defaultInstanceKey] = reducer(undefined, sentinelAction);
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
