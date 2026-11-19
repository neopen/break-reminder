# 发布与自动更新

## 1. 版本策略

- 唯一来源：`package.json` 的 `version`
- `npm version patch|minor|major` 会通过 `postversion` 自动同步：
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
- 发布前执行 `npm run version:check`，CI 也会校验

## 2. 标签约定

| 标签     | 触发                               | 用途                           |
| -------- | ---------------------------------- | ------------------------------ |
| `vX.Y.Z` | `.github/workflows/release.yml`    | 正式发布三平台安装包与更新文件 |
| `test-*` | `.github/workflows/test-build.yml` | 未签名 Windows 测试包，不发布  |

正式发布步骤：

```bash
npm version minor
git add -A
git commit -m "chore(release): 1.1.0"
git tag v1.1.0
git push origin HEAD --follow-tags
```

Workflow 会校验 `package.json` 版本与标签一致。

## 3. CI

`.github/workflows/ci.yml`

- 触发：PR、`main` / `tauri/**` 分支 push、手动触发
- 前端：`npm ci` → 版本校验 → Prettier → ESLint → vue-tsc → Vite 构建
- Rust：Windows / macOS / Ubuntu 三平台 `cargo fmt --check` + `cargo clippy -D warnings`

## 4. 正式发布

`.github/workflows/release.yml`

- 触发：推送 `v*.*.*` 标签
- 矩阵：
  - Windows x64 → NSIS
  - macOS Universal（arm64 + x64）→ APP + DMG
  - Linux x64 → AppImage + DEB
- `tauri-apps/tauri-action` 负责构建、生成 `latest.json` 与 `.sig`、创建 GitHub Release

### 必需的 GitHub Secrets

| Secret                               | 说明                   |
| ------------------------------------ | ---------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | 更新签名私钥内容       |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码；无密码时留空 |

可选代码签名 / 公证：`APPLE_CERTIFICATE`、`APPLE_CERTIFICATE_PASSWORD`、
`APPLE_SIGNING_IDENTITY`、`APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID`、
`WINDOWS_CERTIFICATE`、`WINDOWS_CERTIFICATE_PASSWORD`。在 `release.yml` 中取消注释启用。

## 5. 更新签名密钥

本地已生成一对密钥：

- 私钥：`C:\Users\haeng\.tauri\healthclock.key`（**不要提交**）
- 公钥：已写入 `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`

重新生成：

```bash
npx tauri signer generate -w ~/.tauri/healthclock.key
# 将输出的公钥替换到 tauri.conf.json 的 pubkey
```

> 私钥丢失将无法发布可被旧版本验证的更新。轮换密钥后，旧版本无法验证新公钥，
> 需要过渡发布或提供手动安装包。

## 6. 自动更新

- 端点：`https://github.com/neopen/break-reminder/releases/latest/download/latest.json`
- 流程：`check()` → `downloadAndInstall()` → `relaunch()`
- `bundle.createUpdaterArtifacts: true` 会在构建时生成 `.sig` 与 updater manifest
- 仅打包版本可验证更新；`tauri dev` 下检查失败属于预期
- GitHub 的 “latest release” 是端点来源，不要只发布 Draft
- macOS 更新要求应用已签名；未签名构建只能手动安装

## 7. 测试包

手动触发或推送 `test-*` 标签：

```bash
git tag test-1.0.0.1
git push origin test-1.0.0.1
```

产物包含：

- `src-tauri/target/release/*.exe`（便携版）
- `src-tauri/target/release/bundle/nsis/*.exe`（安装版，验证系统通知）
- `src-tauri/Cargo.lock`（用于提交锁定文件）

测试包关闭 updater 产物，不需要签名密钥。系统通知仅对安装版生效。
