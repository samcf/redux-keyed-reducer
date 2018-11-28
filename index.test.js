const test = require("tape");
const thunk = require("redux-thunk").default;
const { createStore, applyMiddleware } = require("redux");
const { createKeyedDispatch, bindKeyedActions, createKeyedReducer } = require("./lib/index");

const incrementer = (state = 0, action) => {
    switch (action.type) {
        case "increment":
            return state + 1;
        default:
            return state;
    }
};

test("calling createKeyedReducer with invalid arguments throws errors", assert => {
    const reducerNotFunction = "first argument to be a function";
    const storeKeyNotString = "second argument to be a string";
    const storeKeyEmpty = "second argument to be a non-empty string";
    const tests = [
        { args: [], message: reducerNotFunction },
        { args: [undefined], message: reducerNotFunction },
        { args: [undefined, "foo"], message: reducerNotFunction },
        { args: [undefined, () => {}], message: reducerNotFunction },
        { args: [null], message: reducerNotFunction },
        { args: [null, "foo"], message: reducerNotFunction },
        { args: [null, () => {}], message: reducerNotFunction },
        { args: [() => {}], message: storeKeyNotString },
        { args: [() => {}, 42], message: storeKeyNotString },
        { args: [() => {}, {}], message: storeKeyNotString },
        { args: [() => {}, ""], message: storeKeyEmpty },
        { args: [() => {}, " "], message: storeKeyEmpty },
        { args: [() => {}, "  "], message: storeKeyEmpty },
    ];

    tests.forEach(t =>
        assert.throws(
            () => createKeyedReducer(...t.args),
            new RegExp("(" + t.message + ")"),
            `calling createKeyedReducer(${t.args.join(", ")}) throws an error`));
    assert.end();
});

test("calling createKeyedReducer returns a new reducer function", assert => {
    const reducer = createKeyedReducer(incrementer, "testKeyedReducer");
    assert.equals(typeof reducer, "function", "createKeyedReducer returns a function");
    assert.doesNotThrow(() => createStore(reducer), "calling createStore with a keyed reducer does not throw an error");
    assert.end();
});

test("keyed reducer state is an object", assert => {
    const store = createStore(createKeyedReducer(incrementer, "counter"));
    const state = store.getState();
    assert.equals(typeof state, "object", "keyed reducer state is an object");
    assert.notEquals(typeof state, "array", "keyed reducer state is not an array");
    assert.notEquals(typeof state, "number", "keyed reducer state is not a number");
    assert.notEquals(state, null, "keyed reducer state is not null");
    assert.notEquals(state, undefined, "keyed reducer state is not undefined");
    assert.notEquals(state, void 0, "keyed reducer state is not void 0");
    assert.end();
});

test("keyed reducer state contains an immutable 'default' instance", assert => {
    const store = createStore(createKeyedReducer(incrementer, "counter"));
    assert.deepEquals(store.getState(), { "default": 0 }, "the 'default' state is the initial state of the given reducer");

    store.dispatch({ type: "increment" });
    assert.deepEquals(store.getState(), { "default": 0 }, "the 'default' state cannot be mutated");

    store.dispatch({ type: "unknown" });
    assert.deepEquals(store.getState(), { "default": 0 }, "the 'default' state cannot be mutated");

    assert.end();
});

test("calling bindKeyedActions with invalid arguments throws errors", assert => {
    const tests = [[], [null], [undefined], [""], [42], ["quick brown fox"]];
    tests.forEach(t =>
        assert.throws(
            () => bindKeyedActions(...t),
            `calling bindKeyedActions(${t.join(", ")}) throws an error`));
    assert.end();
});

test("dispatching keyed actions creates a new keyed reducer instance", assert => {
    const store = createStore(createKeyedReducer(incrementer, "counter"));
    const actions = bindKeyedActions(
        { onIncrement: () => ({ type: "increment" }) },
        { counter: "testKey" },
        store.dispatch
    );

    assert.notOk("testKey" in store.getState(), "new instances are not created until a keyed action is dispatched");

    actions.onIncrement();
    assert.equals(Object.keys(store.getState()).length, 2, "one new instance is created after dispatching a keyed action");
    assert.equals(store.getState()["testKey"], 1, "new instances are created and mutated after dispatching a keyed action");
    assert.equals(store.getState()["default"], 0, "the 'default' instance is unaffected after dispatching a keyed action");

    actions.onIncrement();
    assert.equals(store.getState()["testKey"], 2, "existing instances are mutated after dispatching a keyed action");
    assert.end();
});

test("dispatching unkeyed actions runs against every instance of a keyed reducer", assert => {
    const store = createStore(createKeyedReducer(incrementer, "counter"));
    createKeyedDispatch(store.dispatch, { counter: "foo" })({ type: "increment" });
    createKeyedDispatch(store.dispatch, { counter: "foo" })({ type: "increment" });
    createKeyedDispatch(store.dispatch, { counter: "bar" })({ type: "increment" });
    createKeyedDispatch(store.dispatch, { counter: "baz" })({ type: "increment" });
    store.dispatch({ type: "increment" });

    assert.equals(store.getState()["foo"], 3, "the 'foo' instance is incremented three times");
    assert.equals(store.getState()["bar"], 2, "the 'bar' instance is incremented two times");
    assert.equals(store.getState()["baz"], 2, "the 'baz' instance is incremented two times");
    assert.end();
});


test("dispatching unkeyed actions do not run against keyed reducers with 'isKeyRequired'", assert => {
    const store = createStore(createKeyedReducer(incrementer, "counter", { isKeyRequired: true }));
    const actions = bindKeyedActions(
        { onIncrement: () => ({ type: "increment" }) },
        { counter: "testKey" },
        store.dispatch
    );

    actions.onIncrement();
    actions.onIncrement();
    store.dispatch({ type: "increment" });

    assert.equals(store.getState()["testKey"], 2, "the 'testKey' instance is incremented two times");
    assert.end();
});

test("thunk action creators are passed the 'storeKeys' object as its third argument", assert => {
    const store = createStore(createKeyedReducer(incrementer, "counter"), applyMiddleware(thunk));
    const actions = bindKeyedActions({
        onIncrement: () => (dispatch, getState, storeKeys) => {
            assert.ok(typeof storeKeys === "object" && storeKeys !== null, "'storeKeys' value is an object");
            assert.deepEquals(storeKeys, { counter: "testKey" }, "'storeKeys' object is a map of store keys to instance names");
            assert.end();
            dispatch({ type: "increment" });
        }
    }, { counter: "testKey" }, store.dispatch);
    actions.onIncrement();
});
