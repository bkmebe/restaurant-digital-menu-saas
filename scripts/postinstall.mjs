// postinstall.mjs — ensures all packages are correctly installed
// This handles platform-specific quirks where npm install leaves incomplete files

import { existsSync, copyFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function ensureFile(filePath, content) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(filePath)) {
    writeFileSync(filePath, content, 'utf-8')
    console.log(`  [postinstall] Created: ${filePath.replace(root, '.')}`)
  }
}

// Generic ESM stub generator: scans packages with "import" export pointing to missing .mjs
// and creates a CJS-wrapper stub for each
function fixMissingEsmEntries() {
  const nm = resolve(root, 'node_modules')

  const checkPkg = (pkgPath, pkgName) => {
    const pkgJsonPath = resolve(pkgPath, 'package.json')
    if (!existsSync(pkgJsonPath)) return
    try {
      const pkgRaw = readFileSync(pkgJsonPath, 'utf-8')
      const pkg = JSON.parse(pkgRaw)
      const exports = pkg.exports || {}
      const entry = typeof exports === 'object' && exports['.'] ? exports['.'] : {}
      const importPath = entry.import || entry.default || pkg.module
      if (!importPath) return

      const fullPath = resolve(pkgPath, importPath)
      if (existsSync(fullPath)) return // already exists

      // Find the CJS counterpart
      const distDir = dirname(fullPath)
      if (!existsSync(distDir)) return

      const files = readdirSync(distDir)
      const isScoped = (name) => name.startsWith('@')
      // Try multiple patterns - the CJS file may have various naming conventions
      const cjsFile = files.find(f =>
        f.endsWith('.cjs') ||
        f.endsWith('.cjs.js') ||
        f.endsWith('.common.js') ||
        (f.endsWith('.js') && f !== 'index.mjs' && !f.includes('.mjs') && !f.includes('.umd') && !f.includes('.legacy-esm'))
      )
      if (!cjsFile) {
        // Try looking in a 'cjs' subdirectory
        const cjsDir = resolve(distDir, 'cjs')
        if (existsSync(cjsDir)) {
          const cjsFiles = readdirSync(cjsDir)
          const cjsEntry = cjsFiles.find(f => f.endsWith('.cjs') || f.endsWith('.js'))
          if (cjsEntry) {
            ensureFile(fullPath, [
              `import cjs from "./cjs/${cjsEntry}";`,
              `export default cjs;`,
              `export const __esModule = cjs.__esModule;`,
              ``,
            ].join('\n'))
            console.log(`  [postinstall] ESM stub: ${pkgName} → cjs/${cjsEntry}`)
          }
        }
        return
      }

      ensureFile(fullPath, [
        `import cjs from "./${cjsFile}";`,
        `export default cjs;`,
        `export const __esModule = cjs.__esModule;`,
        ``,
      ].join('\n'))
      console.log(`  [postinstall] ESM stub: ${pkgName} (${importPath} → ${cjsFile})`)
    } catch {}
  }

  const scanDir = (dirPath) => {
    if (!existsSync(dirPath)) return
    const entries = readdirSync(dirPath)
    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const full = resolve(dirPath, entry)
      if (!existsSync(full) || !existsSync(resolve(full, 'package.json'))) continue
      if (entry.startsWith('@')) {
        scanDir(full) // scoped packages
      } else {
        checkPkg(full, entry)
      }
    }
  }

  scanDir(nm)
}

// Fix packages whose package.json "main" entry file is missing (npm 11 Windows bug)
function fixMissingMainEntries() {
  const nm = resolve(root, 'node_modules')
  const scanDir = (dirPath) => {
    if (!existsSync(dirPath)) return
    const entries = readdirSync(dirPath)
    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      const full = resolve(dirPath, entry)
      if (!existsSync(full) || !existsSync(resolve(full, 'package.json'))) continue
      if (entry.startsWith('@')) { scanDir(full); continue }
      try {
        const pkg = JSON.parse(readFileSync(resolve(full, 'package.json'), 'utf-8'))
        if (pkg.main) {
          const mainPath = resolve(full, pkg.main)
          if (!existsSync(mainPath)) {
            // Try to find a CJS alternative in the same directory
            const dir = dirname(mainPath)
            if (existsSync(dir)) {
              const files = readdirSync(dir)
              const cjsFile = files.find(f => f.endsWith('.js'))
              if (cjsFile) {
                copyFileSync(resolve(dir, cjsFile), mainPath)
                console.log(`  [postinstall] Fixed missing main: ${entry}/${pkg.main} ← ${cjsFile}`)
              } else if (files.length > 0) {
                copyFileSync(resolve(dir, files[0]), mainPath)
                console.log(`  [postinstall] Fixed missing main: ${entry}/${pkg.main} ← ${files[0]}`)
              }
            }
          }
        }
      } catch {}
    }
  }
  scanDir(nm)
}

// 1. Fix all missing ESM entries (vitest transitive deps: magic-string, redux, redux-thunk, reselect, etc.)
fixMissingEsmEntries()

// 1b. Fix missing package.json "main" entry files (npm 11 Windows extraction bug)
fixMissingMainEntries()

// 2. @radix-ui/react-compose-refs — fix export names
const composeRefsDir = resolve(root, 'node_modules/@radix-ui/react-compose-refs/dist')
const composeRefsMJS = resolve(composeRefsDir, 'index.mjs')
const composeRefsCJS = resolve(composeRefsDir, 'index.js')
if (existsSync(composeRefsCJS)) {
  ensureFile(composeRefsMJS, [
    'import cjs from "./index.js";',
    'const { composeRefs, useComposedRefs } = cjs;',
    'export { composeRefs, useComposedRefs };',
    'export default cjs;',
    '',
  ].join('\n'))
}

// 3. iceberg-js
const icebergDir = resolve(root, 'node_modules/iceberg-js/dist')
const icebergMJS = resolve(icebergDir, 'index.mjs')
const icebergCJS = resolve(icebergDir, 'index.cjs')
if (existsSync(icebergCJS) && !existsSync(icebergMJS)) {
  ensureFile(icebergMJS, [
    'import cjs from "./index.cjs";',
    'const { IcebergError, IcebergRestCatalog, getCurrentSchema, isDecimalType, isFixedType, parseDecimalType, parseFixedType, typesEqual } = cjs;',
    'export { IcebergError, IcebergRestCatalog, getCurrentSchema, isDecimalType, isFixedType, parseDecimalType, parseFixedType, typesEqual };',
    'export default cjs;',
    '',
  ].join('\n'))
}

// 4. @tailwindcss/node — esm-cache-loader + index.mjs
const twCacheLoader = resolve(root, 'node_modules/@tailwindcss/node/dist/esm-cache.loader.mjs')
if (!existsSync(twCacheLoader)) {
  ensureFile(twCacheLoader, [
    'export function resolve(specifier, context, nextResolve) {',
    '  return nextResolve(specifier, context)',
    '}',
    'export function load(url, context, nextLoad) {',
    '  return nextLoad(url, context)',
    '}',
    '',
  ].join('\n'))
}

// 5. lightningcss — copy native binary to nested location if needed
const lcSrc = resolve(root, 'node_modules/lightningcss-win32-x64-msvc/lightningcss.win32-x64-msvc.node')
const lcDst = resolve(root, 'node_modules/@tailwindcss/node/node_modules/lightningcss/lightningcss.win32-x64-msvc.node')
const lcDstDir = dirname(lcDst)
if (existsSync(lcSrc) && !existsSync(lcDst)) {
  if (!existsSync(lcDstDir)) mkdirSync(lcDstDir, { recursive: true })
  copyFileSync(lcSrc, lcDst)
  console.log(`  [postinstall] Copied: lightningcss binary to nested location`)
}

// 6. @tailwindcss/oxide — copy native binary to package dir if needed
const oxSrc = resolve(root, 'node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node')
const oxDst = resolve(root, 'node_modules/@tailwindcss/oxide/tailwindcss-oxide.win32-x64-msvc.node')
if (existsSync(oxSrc) && !existsSync(oxDst)) {
  copyFileSync(oxSrc, oxDst)
  console.log(`  [postinstall] Copied: oxide binary to package dir`)
}

// 7. Create PWA icons if they don't exist
const iconsDir = resolve(root, 'public/icons')
if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true })
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for (const size of sizes) {
  const iconPath = resolve(iconsDir, `icon-${size}.png`)
  if (!existsSync(iconPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#000"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="${Math.round(size * 0.4)}" font-family="sans-serif">RDM</text></svg>`
    writeFileSync(iconPath, svg, 'utf-8')
    console.log(`  [postinstall] Created: icons/icon-${size}.png`)
  }
}
for (const size of [192, 512]) {
  const iconPath = resolve(iconsDir, `icon-${size}-maskable.png`)
  if (!existsSync(iconPath)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#000" rx="${Math.round(size * 0.15)}"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="${Math.round(size * 0.4)}" font-family="sans-serif">RDM</text></svg>`
    writeFileSync(iconPath, svg, 'utf-8')
    console.log(`  [postinstall] Created: icons/icon-${size}-maskable.png`)
  }
}

console.log('  [postinstall] Dependency integrity check complete.')
