# 更新签名配置

## 1. 签名链路

Tauri 自动更新使用 minisign 密钥对：

1. CI 使用私钥为安装包生成 `.sig`，并写入 `latest.json`
2. 客户端内置公钥（`src-tauri/tauri.conf.json` → `plugins.updater.pubkey`）
3. 下载更新时校验签名，公私钥不匹配则拒绝安装

因此：

- 私钥只能放在本机安全位置与 GitHub Secrets
- 公钥必须与私钥成对，且已写入配置文件
- 更换密钥会影响已安装客户端的更新能力

## 2. 当前密钥

| 项目     | 位置                                                                  |
| -------- | --------------------------------------------------------------------- |
| 私钥     | `~/.tauri/breakly.key`（Windows：`%USERPROFILE%\.tauri\breakly.key`） |
| 公钥     | `~/.tauri/breakly.key.pub`                                            |
| 内置公钥 | `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`                |

当前密钥为**单行、无密码**文件。`.gitignore` 已包含 `*.key`，不会误提交。

> 请把 `breakly.key` 备份到密码管理器。私钥丢失后，已安装版本将无法验证后续更新。

## 3. 配置 GitHub Secret

仓库：`neopen/break-reminder`。

### 3.1 无密码密钥（当前，只需一个 Secret）

Git Bash：

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY \
  --repo neopen/break-reminder \
  < "$HOME/.tauri/breakly.key"
```

PowerShell：

```powershell
Get-Content "$HOME\.tauri\breakly.key" -Raw |
  gh secret set TAURI_SIGNING_PRIVATE_KEY --repo neopen/break-reminder
```

验证：

```bash
gh secret list --repo neopen/break-reminder
```

应看到 `TAURI_SIGNING_PRIVATE_KEY`。

> 不要创建 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。workflow 中该引用会自动解析为空字符串，
> 对无密码密钥是正确的。

### 3.2 GitHub 网页配置

1. 打开 `https://github.com/neopen/break-reminder/settings/secrets/actions`
2. 点击 **New repository secret**
3. Name 填 `TAURI_SIGNING_PRIVATE_KEY`
4. Secret 填 `breakly.key` 的**完整文件内容**（单行，原样粘贴，不要加引号）
5. 不要使用 `.pub` 文件

### 3.3 带密码密钥（推荐在首次发布前完成）

如果希望私钥本身也受密码保护：

```bash
npx tauri signer generate -w ~/.tauri/breakly-prod.key
# 按提示输入强密码
```

然后：

1. 把新公钥替换到 `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
2. 提交该配置改动
3. 设置两个 Secret：

| Secret                               | 值                   |
| ------------------------------------ | -------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | 新私钥文件内容       |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 生成密钥时设置的密码 |

> 一旦发布过版本，再更换密钥会导致旧版本无法验证新版本。因此应在 `v1.0.0` 之前决定。

## 4. 验证公私钥匹配

不输出私钥的前提下，检查 `.pub` 与配置是否一致：

```bash
node -e "const fs=require('fs'); \
const pub=fs.readFileSync(process.env.HOME+'/.tauri/breakly.key.pub','utf8').trim(); \
const cfg=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8')).plugins.updater.pubkey; \
console.log(pub===cfg ? '公钥匹配' : '公钥不匹配');"
```

输出「公钥匹配」即可。

## 5. 触发正式发布

```bash
git tag v1.0.0
git push origin v1.0.0
```

`Release` workflow 会构建三平台产物并创建 GitHub Release。

检查资产：

```bash
gh release view v1.0.0 --json assets -q '.assets[].name'
```

应包含：

- `Breakly-Setup.exe`（固定文件名，方便直接下载）
- 带版本号的 NSIS 安装包与 `.sig`（自动更新使用）
- macOS APP / DMG
- Linux AppImage / DEB
- `latest.json`（更新清单）

## 6. 密钥轮换

1. 生成新密钥对
2. 更新 `tauri.conf.json` 公钥并提交
3. 更新 GitHub Secrets
4. 发布新版本

注意：旧版本客户端只信任其内置的旧公钥，无法验证新密钥签名的更新。轮换时需要：

- 先用旧密钥发布一个「过渡版本」，其内置公钥已是新公钥
- 再用新密钥发布后续版本
- 或要求旧版本用户手动安装新包

如果私钥泄露，应立即轮换，并准备手动安装包。

## 7. 常见错误

| 现象                                   | 原因与处理                                                         |
| -------------------------------------- | ------------------------------------------------------------------ |
| `TAURI_SIGNING_PRIVATE_KEY is not set` | Secret 未配置、名称拼错，或 workflow 在 fork/其他仓库运行          |
| 签名失败、无法解析密钥                 | 粘贴了 `.pub` 公钥、内容被截断或包含多余引号                       |
| 客户端提示签名校验失败                 | GitHub Secret 与 `tauri.conf.json` 中的公钥不是同一对              |
| `Could not fetch a valid release JSON` | 尚无正式 Release、Release 为 Draft、缺少 `latest.json`，或端点错误 |
| Windows 更新正常、macOS 不行           | macOS 应用未签名 / 未公证                                          |
| 改了密钥后旧版本不更新                 | 旧版本内置旧公钥，需要过渡版本或手动安装                           |

## 8. 安全建议

- 私钥只保存在本机安全位置与 GitHub Secrets，禁止提交到仓库
- 使用带密码的私钥，并在 CI 中通过 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 提供密码
- 定期检查仓库 Secrets 与发布产物签名
- 更换密钥前先准备过渡方案，避免用户停留在无法更新的版本
