const fs = require('fs');
const path = require('path');

const nm = 'node_modules';

function writeFile(p, content) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, content, 'utf-8');
  console.log('Fixed:', path.relative(nm, p));
}

// magic-string: .mjs in dist/, cjs also in dist/
writeFile(
  path.join(nm, 'magic-string', 'dist', 'magic-string.es.mjs'),
  'import cjs from "./magic-string.cjs.js";\nexport default cjs;\n'
);

// redux: .mjs in dist/, cjs in dist/cjs/
writeFile(
  path.join(nm, 'redux', 'dist', 'redux.mjs'),
  'import cjs from "./cjs/redux.cjs";\nexport default cjs;\n'
);

// reselect: .mjs in dist/, cjs in dist/cjs/
writeFile(
  path.join(nm, 'reselect', 'dist', 'reselect.mjs'),
  'import cjs from "./cjs/reselect.cjs";\nexport default cjs;\n'
);

// redux-thunk: .mjs in dist/, cjs in dist/cjs/
const rtCjsDir = path.join(nm, 'redux-thunk', 'dist', 'cjs');
let rtCjs = null;
if (fs.existsSync(rtCjsDir)) {
  rtCjs = fs.readdirSync(rtCjsDir).find(f => f.endsWith('.js') || f.endsWith('.cjs'));
}
if (rtCjs) {
  writeFile(
    path.join(nm, 'redux-thunk', 'dist', 'redux-thunk.mjs'),
    'import cjs from "./cjs/' + rtCjs + '";\nexport default cjs;\n'
  );
}

// zod-validation-error
const zveDir = path.join(nm, 'zod-validation-error', 'v4');
let zveEntry = null;
if (fs.existsSync(zveDir)) {
  zveEntry = fs.readdirSync(zveDir).find(f => f.endsWith('.js') || f.endsWith('.mjs'));
}
if (zveEntry) {
  writeFile(
    path.join(zveDir, 'index.mjs'),
    'import cjs from "./' + zveEntry + '";\nexport default cjs;\n'
  );
}

console.log('All ESM stubs fixed.');
