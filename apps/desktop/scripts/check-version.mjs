/**
 * 校验 package.json / tauri.conf.json / Cargo.toml 版本一致。
 * CI 在构建前调用，避免产物版本与 Release Tag 不一致。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageVersion = JSON.parse(
  readFileSync(resolve(appRoot, 'package.json'), 'utf8'),
).version
const tauriVersion = JSON.parse(
  readFileSync(resolve(appRoot, 'src-tauri/tauri.conf.json'), 'utf8'),
).version
const cargoVersion = readCargoVersion(
  readFileSync(resolve(appRoot, 'src-tauri/Cargo.toml'), 'utf8'),
)

const versions = {
  'package.json': packageVersion,
  'src-tauri/tauri.conf.json': tauriVersion,
  'src-tauri/Cargo.toml': cargoVersion,
}

const unique = new Set(Object.values(versions))
console.log('[version] 当前版本：')
for (const [file, version] of Object.entries(versions)) {
  console.log(`  ${file}: ${version}`)
}

if (unique.size !== 1) {
  console.error('[version] 版本不一致，请运行 npm run version:sync')
  process.exit(1)
}

console.log(`[version] 版本一致：${packageVersion}`)

function readCargoVersion(source) {
  const packageStart = source.indexOf('[package]')
  if (packageStart === -1) throw new Error('Cargo.toml 中找不到 [package] 段')

  const nextSection = source.indexOf('\n[', packageStart + '[package]'.length)
  const packageSection = source.slice(
    packageStart,
    nextSection === -1 ? source.length : nextSection,
  )
  const match = packageSection.match(/^version\s*=\s*"([^"]*)"/m)
  if (!match) throw new Error('Cargo.toml 的 [package] 段中找不到 version 字段')
  return match[1]
}
