/**
 * 版本单一来源：package.json
 * 同步到 src-tauri/tauri.conf.json 与 src-tauri/Cargo.toml。
 *
 * 用法：
 *   npm version minor     # npm 自动触发 postversion -> 本脚本
 *   npm run version:sync  # 手动同步
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as prettier from 'prettier'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = resolve(appRoot, 'package.json')
const tauriConfigPath = resolve(appRoot, 'src-tauri/tauri.conf.json')
const cargoPath = resolve(appRoot, 'src-tauri/Cargo.toml')

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

async function main() {
  const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

  const { version } = readJson(packagePath)
  if (typeof version !== 'string' || !version) {
    throw new Error('package.json 缺少有效的 version 字段')
  }

  const tauriConfig = readJson(tauriConfigPath)
  const previousTauriVersion = tauriConfig.version
  tauriConfig.version = version

  // 与 Prettier 保持一致，避免 version 同步后 format:check 失败。
  const prettierOptions = await prettier.resolveConfig(tauriConfigPath)
  const formattedConfig = await prettier.format(JSON.stringify(tauriConfig, null, 2), {
    ...prettierOptions,
    parser: 'json',
  })
  writeFileSync(tauriConfigPath, formattedConfig)

  const cargoSource = readFileSync(cargoPath, 'utf8')
  const cargoOutput = replaceCargoVersion(cargoSource, version)
  writeFileSync(cargoPath, cargoOutput)

  if (previousTauriVersion === version && cargoOutput === cargoSource) {
    console.log(`[version] 所有文件已是 ${version}，无需修改`)
    return
  }

  console.log(`[version] 已同步 ${previousTauriVersion} -> ${version}`)
  console.log('[version]  - src-tauri/tauri.conf.json')
  console.log('[version]  - src-tauri/Cargo.toml')
}

function replaceCargoVersion(source, nextVersion) {
  const packageStart = source.indexOf('[package]')
  if (packageStart === -1) {
    throw new Error('Cargo.toml 中找不到 [package] 段')
  }

  const nextSection = source.indexOf('\n[', packageStart + '[package]'.length)
  const packageEnd = nextSection === -1 ? source.length : nextSection
  const packageSection = source.slice(packageStart, packageEnd)

  const versionPattern = /^version\s*=\s*"[^"]*"/m
  if (!versionPattern.test(packageSection)) {
    throw new Error('Cargo.toml 的 [package] 段中找不到 version 字段')
  }

  const replaced = packageSection.replace(versionPattern, `version = "${nextVersion}"`)
  return source.slice(0, packageStart) + replaced + source.slice(packageEnd)
}
