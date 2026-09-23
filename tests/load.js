// Extracts the live <script> block from the shipped HTML and evaluates it in
// a Node vm sandbox, returning the sandbox so tests can call engine functions.

const fs = require('fs');
const vm = require('vm');
const { makeGlobals } = require('./dom-stub');
const { exposeTopLevel } = require('./transform');

function extractScript(html) {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  if (!blocks.length) throw new Error('no inline <script> block found');
  // The simulator has one engine script; take the largest in case others appear.
  return blocks.reduce((a, b) => (b.length > a.length ? b : a));
}

function loadSimulator(htmlPath) {
  const src = exposeTopLevel(extractScript(fs.readFileSync(htmlPath, 'utf8')));
  const ctx = vm.createContext(makeGlobals());
  vm.runInContext(src, ctx, { filename: htmlPath });
  return ctx;
}

module.exports = { loadSimulator, extractScript };
