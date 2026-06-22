import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const nm = resolve(root, 'node_modules')

function ensureFile(fp, content) {
  const dir = dirname(fp)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(fp)) {
    writeFileSync(fp, content, 'utf-8')
    console.log('Created:', fp)
  }
}

const fixes = [
  {
    pkg: 'magic-string',
    expected: './dist/magic-string.es.mjs',
    cjs: './dist/magic-string.cjs.js',
  },
  {
    pkg: 'redux',
    expected: './dist/redux.mjs',
    cjs: './dist/cjs/redux.cjs',
  },
  {
    pkg: 'redux-thunk',
    expected: './dist/redux-thunk.mjs',
    cjs: './dist/redux-thunk.cjs',
  },
  {
    pkg: 'reselect',
    expected: './dist/reselect.mjs',
    cjs: './dist/cjs/reselect.cjs',
  },
  {
    pkg: 'zod-validation-error',
    expected: './v4/index.mjs',
    cjs: './dist/index.js',
  },
  {
    pkg: '@eslint-community/eslint-utils',
    expected: './index.mjs',
    cjs: './index.js',
  },
  {
    pkg: '@eslint-community/regexpp',
    expected: './index.mjs',
    cjs: './index.js',
  },
]

for (const fix of fixes) {
  const pkgDir = resolve(nm, fix.pkg)
  if (!existsSync(pkgDir)) {
    console.log(`Skipping ${fix.pkg}: not found`)
    continue
  }
  const expectedFile = resolve(pkgDir, fix.expected)
  if (existsSync(expectedFile)) {
    console.log(`Skipping ${fix.pkg}: already exists`)
    continue
  }
  const cjsFull = resolve(pkgDir, fix.cjs)
  const relCjs = fix.cjs.split('/').pop()
  if (existsSync(cjsFull)) {
    const relativePath = fix.expected.includes('/')
      ? './' + fix.cjs.substring(0, fix.cjs.lastIndexOf('/') + 1) + relCjs
      : './' + relCjs
    ensureFile(expectedFile, `import cjs from "${relativePath}";\nexport default cjs;\n`)
    console.log(`  Stub: ${fix.pkg} (${fix.expected})`)
  } else {
    console.log(`  CJS not found for ${fix.pkg}: ${fix.cjs}`)
    // Try to find any cjs in the dist dir
    const distDir = resolve(pkgDir, dirname(fix.expected))
    if (existsSync(distDir)) {
      const files = readdirSync(distDir)
      const cjsFile = files.find(f => f.endsWith('.cjs') || f === 'index.js' || f.includes('.cjs.'))
      if (cjsFile) {
        ensureFile(expectedFile, `import cjs from "./${cjsFile}";\nexport default cjs;\n`)
        console.log(`  Stub (auto): ${fix.pkg} (./${cjsFile})`)
      }
    }
  }
}

// Check @tailwindcss/node
const twNodeDir = resolve(nm, '@tailwindcss', 'node')
const twDistDir = resolve(twNodeDir, 'dist')
const twIndexMjs = resolve(twDistDir, 'index.mjs')
if (existsSync(twDistDir) && !existsSync(twIndexMjs)) {
  const files = readdirSync(twDistDir)
  const cjs = files.find(f => f.endsWith('.cjs'))
  if (cjs) {
    ensureFile(twIndexMjs, `import cjs from "./${cjs}";\nexport default cjs;\n`)
    console.log(`  Stub: @tailwindcss/node (./${cjs})`)
  }
}

console.log('Done')
