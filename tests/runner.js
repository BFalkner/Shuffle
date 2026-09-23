// Minimal synchronous test runner: test(), assert(), approx(), summary().

const results = [];

function test(name, fn) {
  const t0 = Date.now();
  try {
    fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, err: e });
    console.log(`  ✗ ${name}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function approx(actual, expected, tol, msg) {
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(`${msg || 'not approximately equal'}: got ${actual}, expected ${expected} ± ${tol}`);
  }
}

// Prints the failure list and returns true when everything passed.
function summary() {
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  - ${f.name}\n      ${f.err && f.err.message}`);
  }
  return failed.length === 0;
}

module.exports = { test, assert, approx, summary };
