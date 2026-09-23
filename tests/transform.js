// vm only exposes top-level `var` and `function` bindings on the sandbox
// object, not `let`/`const`. The simulator declares every top-level binding
// at column 0 (nested ones are always indented or inline), so rewriting
// line-leading `let`/`const` to `var` exposes exactly the top level.
// This touches the harness's in-memory copy only, never the shipped file.

function exposeTopLevel(src) {
  return src.replace(/^(let|const)(?=\s)/gm, 'var');
}

module.exports = { exposeTopLevel };
