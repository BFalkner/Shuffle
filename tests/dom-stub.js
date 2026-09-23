// Fakes just enough of a browser for shuffle-simulator.html's script to run
// in Node. Any DOM object is a permissive stub: every property read returns
// another stub, every call returns a stub, writes are remembered. The engine
// code under test never depends on DOM results, so this only has to not throw.

function makeStub() {
  const store = {};
  const target = function () {};
  return new Proxy(target, {
    get(_, key) {
      if (key in store) return store[key];
      if (key === Symbol.iterator) return function* () {};
      if (key === Symbol.toPrimitive) return () => '';
      if (key === 'then') return undefined; // don't look like a Promise
      if (key === 'length') return 0;
      if (key === 'classList' || key === 'style' || key === 'dataset') return (store[key] = makeStub());
      return makeStub();
    },
    set(_, key, value) { store[key] = value; return true; },
    has() { return true; },
    apply() { return makeStub(); },
    construct() { return makeStub(); },
  });
}

function makeLocalStorage() {
  const data = new Map();
  return {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: k => { data.delete(k); },
    clear: () => data.clear(),
    key: i => Array.from(data.keys())[i] ?? null,
    get length() { return data.size; },
  };
}

function makeDocument() {
  const doc = makeStub();
  doc.querySelectorAll = () => [];
  doc.querySelector = () => null;
  doc.getElementById = () => makeStub();
  doc.createElement = () => makeStub();
  return doc;
}

function makeGlobals() {
  const document = makeDocument();
  const window = makeStub();
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.scrollY = 0;
  return {
    document,
    window,
    localStorage: makeLocalStorage(),
    getComputedStyle: () => makeStub(),
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    // Timers are swallowed: UI debounces must not fire and keep Node alive.
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    console,
    Math, JSON, Date, Array, Object, Set, Map, Number, String, Boolean,
    Symbol, Error, RegExp, Promise, Proxy, Reflect,
    Float64Array, Int32Array, Uint8Array,
    parseInt, parseFloat, isNaN, isFinite,
  };
}

module.exports = { makeGlobals };
