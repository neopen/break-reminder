# 别坐了（HealthClock）打包与发布指南

> 适用版本：`v0.5.8`（Electron 41 + electron-builder 26）
> 适用平台：Windows / macOS / Linux
> 说明：本文件位于 `docs/` 目录，已被 `electron-builder.yml` 排除，不会进入安装包。

---

## 1. 打包原理：先从源码到安装包

本项目的打包不是"直接把 src 塞进 electron-builder"，而是分成两步：

```text
src/main + src/preload + src/renderer
        │  npm run build（scripts/js/build.js，纯文件拷贝）
        ▼
dist/main + dist/preload + dist/renderer
        │  electron-builder（按 electron-builder.yml 白名单收集）
        ▼
release/
├─ win-unpacked/                    解包目录（可直接运行调试）
├─ HealthClock-0.5.8-x64-Setup.exe        安装版（NSIS）
├─ HealthClock-0.5.8-x64-Portable.exe     便携版
└─ HealthClock-0.5.8-x64-Setup.exe.blockmap
```

因此有两个必须记住的结论：

1. **任何源码改动后都必须先 `npm run build`**，否则打进安装包的仍是旧 `dist/`。
2. **安装包里只有 `dist/`**（外加 `package.json`）。`electron-builder.yml` 的 `files` 是严格白名单，`src/`、`docs/`、`scripts/` 都不会被打包。

打包后的应用结构：

```text
别坐了.exe
resources/
├─ app.asar                 ← dist + package.json
├─ app.asar.unpacked/       ← asarUnpack: **/*.node（本项目当前没有 .node）
├─ src/renderer/icons/      ← extraResources 兜底图标
└─ ...
```

---

## 2. 环境准备

### 2.1 基础环境

| 项目 | 要求 | 本机验证方式 |
| --- | --- | --- |
| Node.js | ≥ 18（推荐 20/22 LTS） | `node -v` |
| npm | ≥ 9 | `npm -v` |
| 操作系统 | Windows 10/11 打包 Windows 包；macOS 打包 mac 包；Linux 打包 Linux 包 | — |
| 磁盘 | ≥ 2 GB 可用（`node_modules` + 缓存 + 产物） | — |

> 交叉打包限制：macOS 的 `dmg` 只能在 macOS 上构建；Linux 的 `deb/rpm` 建议在 Linux（或 Docker）中构建。Windows 包可以在 Windows 上直接构建。

### 2.2 安装依赖

```powershell
npm install
```

`postinstall` 会自动执行 `electron-builder install-app-deps`，为本机 Electron 版本准备原生依赖。

首次 `npm install` 会下载约 143 MB 的 Electron 二进制（已缓存在本机，后续打包不再重复下载）。

### 2.3 国内网络加速

项目根目录 `.npmrc` 已配置镜像：

```ini
registry=https://registry.npmmirror.com/
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

依赖经常下载失败时，清理缓存后重装：

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron\Cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache" -ErrorAction SilentlyContinue
npm install
```

### 2.4 各平台工具链

- **Windows**：无需额外工具。electron-builder 会自动下载 NSIS 与 winCodeSign（走上面的镜像）。
- **macOS**：安装 Xcode Command Line Tools（`xcode-select --install`）。生成 `dmg` 依赖系统自带工具。
- **Linux**：
  - `deb`：`sudo apt install -y dpkg fakeroot`
  - `rpm`：`sudo apt install -y rpm`
  - `AppImage`：`sudo apt install -y libfuse2`（运行 AppImage 时需要）

---

## 3. 打包前检查清单

- [ ] `package.json` 的 `version` 已更新（见 9.1 关于 `v` 前缀的说明）
- [ ] 已执行 `npm run build`，`dist/main/main.js`、`dist/renderer/index.html` 存在
- [ ] 图标文件齐全：`src/renderer/icons/icon-256.png`、`icon-512.icns`（macOS）
- [ ] 正在运行的旧版本已退出（否则 `release\win-unpacked` 被占用，打包会报 `Access is denied`）
- [ ] 需要发布时，准备好 `GH_TOKEN`（见第 9 章）

一键自检：

```powershell
node -e "const p=require('./package.json');console.log('version='+p.version)"
Test-Path dist\main\main.js, dist\renderer\index.html
Get-Process | Where-Object { $_.Path -like '*health-clock-app*' } | Select-Object Id,ProcessName,Path
```

---

## 4. 三种打包方式

### 4.1 方式一：npm scripts（推荐日常使用）

`package.json` 已内置脚本：

| 命令 | 作用 | 产物 |
| --- | --- | --- |
| `npm run build` | 只做源码拷贝，生成 `dist/` | `dist/` |
| `npm run dist` | 构建 + 按 `electron-builder.yml` 默认目标打包 | Windows: `Setup.exe` + `Portable.exe` |
| `npm run dist:win` | 构建 + Windows x64 打包 | 同上 |
| `npm run dist:portable` | 只打便携版 | `HealthClock-<version>-x64-Portable.exe` |
| `npm run dist:win32` | Windows 32 位 | ia32 产物 |
| `npm run dist:mac` | macOS（默认架构） | `dmg` + `zip` |
| `npm run dist:mac:arm64` | macOS Apple Silicon | arm64 产物 |
| `npm run dist:linux` | Linux | `deb` + `rpm` + `AppImage` |
| `npm run dist:all` | 三平台（需对应平台工具链，实际很少在单机完成） | 全部 |
| `npm run clean` | 删除 `dist/` 与 `release/` | — |

常用示例：

```powershell
# Windows 安装版 + 便携版
npm run dist:win

# 只打便携版
npm run dist:portable
```

### 4.2 方式二：批处理脚本（自动归档日志，排错首选）

`scripts/` 下有三个脚本，特点是：自动关闭正在运行的旧版本、自动清理 `dist`/`release`、把完整输出写入 `logs/build_*.log`、结束后输出 asar 清单。

| 脚本 | 用途 | 日志文件 |
| --- | --- | --- |
| `scripts/electron-win-all.bat` | 便携版 + NSIS 安装版 | `logs/build_all_<时间戳>.log` |
| `scripts/electron-win-nsis.bat` | 只打 NSIS 安装版 | `logs/build_nsis_<时间戳>.log` |
| `scripts/electron-win-portable.bat` | 只打便携版 | `logs/build_portable_<时间戳>.log` |

使用方式（在项目根目录）：

```powershell
.\scripts\electron-win-all.bat
```

脚本会依次执行：检测并关闭运行中的旧版本 → 清理 → `npm run build` → `npx electron-builder` → `npx asar list`，任何一步失败会暂停并提示日志路径。

> 脚本启动时会用 `taskkill` 关闭所有 `别坐了.exe` 进程（避免 `release\win-unpacked` 被占用）；若 `release` 仍无法删除，会直接报错退出，此时请手动从托盘退出应用后重试。

### 4.3 方式三：手动命令（需要自定义参数时）

```powershell
# 只解包，不生成安装包（最快，用于验证 asar 内容）
npx electron-builder --win --x64 --dir

# 输出到自定义目录，避免占用 release\
npx electron-builder --win --x64 --dir "-c.directories.output=release-check"

# 强制只打 NSIS（不带 --publish 时也会尝试隐式发布，见 9.3）
npx electron-builder --win --x64 --config.win.target=nsis --publish never

# 打便携版
npx electron-builder --win --x64 --config.win.target=portable --publish never
```

> PowerShell 下 `-c.xxx=yyy` 这类参数必须加引号，否则会被解析成文件名（报 `ENOENT ... .directories.output=...`）。

---

## 5. Windows 产物详解

### 5.1 产物清单与命名

默认输出 `release/`（`directories.output`），x64、当前版本 `0.5.8` 时：

| 文件 | 说明 | 参考体积 |
| --- | --- | --- |
| `HealthClock-0.5.8-x64-Setup.exe` | NSIS 安装包 | ≈ 89 MB |
| `HealthClock-0.5.8-x64-Portable.exe` | 便携版单文件 | ≈ 89 MB |
| `HealthClock-0.5.8-x64-Setup.exe.blockmap` | 增量更新差分包索引 | < 1 MB |
| `win-unpacked/` | 解包目录，可直接运行 `别坐了.exe` | — |
| `.icon-ico/` | electron-builder 由 PNG 自动生成的 ico 缓存 | — |
| `builder-debug.yml` | 本次打包的最终配置快照，排错时查看 | — |

命名规则来自 `electron-builder.yml`：

```yaml
nsis:
  artifactName: HealthClock-${version}-x64-Setup.${ext}
portable:
  artifactName: HealthClock-${version}-x64-Portable.${ext}
```

`${version}` 取自 `package.json` 的 `version`，electron-builder 会按 semver 规范化（当前 `v0.5.8` → 产物中为 `0.5.8`）。

### 5.2 安装版与便携版差异

| 维度 | NSIS 安装版 | Portable 便携版 |
| --- | --- | --- |
| 安装方式 | 向导式，可改安装目录 | 免安装，双击直接运行 |
| 权限 | `perMachine: false`，按用户安装，无需管理员 | `requestExecutionLevel: user` |
| 快捷方式 | 桌面 + 开始菜单 | 无 |
| 安装后启动 | `runAfterFinish: true` | — |
| 开机自启 | 通过 `app.setLoginItemSettings` 注册 | 同样支持，但路径变化后需重新勾选 |
| 适用场景 | 日常使用、需要开机自启 | 试用、U 盘携带 |

### 5.3 数据与卸载

- 数据目录：`%APPDATA%\HealthClock\`（`name` 字段决定）
  - `User_Data\`：配置、统计等 JSON
  - `Logs\`：主进程日志
- 卸载默认**保留**用户数据（`deleteAppDataOnUninstall: false`）。需要彻底清理时卸载后手动删除 `%APPDATA%\HealthClock`。
- 卸载前请先退出应用，避免文件占用。

### 5.4 图标

`win.icon` 指向 `src/renderer/icons/icon-256.png`，electron-builder 会自动转换为 `.ico`（生成 `.icon-ico` 缓存目录）。
如需替换图标，保持 256×256 PNG（建议同时提供多尺寸），改完删掉 `release/.icon-ico` 再打包。

---

## 6. macOS 打包

### 6.1 构建（必须在 macOS 上）

```bash
npm run dist:mac          # 当前机器架构（Intel → x64，Apple Silicon → arm64）
npm run dist:mac:arm64    # 指定 Apple Silicon
```

产物：`HealthClock-<version>-<arch>.dmg`、`HealthClock-<version>-<arch>.zip`，图标为 `icon-512.icns`，窗口布局在 `dmg.contents` 中配置（左侧应用、右侧 `Applications` 快捷方式）。

### 6.2 签名与公证

当前配置：

```yaml
mac:
  identity: null          # 跳过代码签名
  gatekeeperAssess: false
  hardenedRuntime: true
  entitlementsInherit: entitlements.mac.plist
```

- `identity: null` 适合内部分发。用户首次打开需**右键 → 打开**，或在"系统设置 → 隐私与安全性"中放行。
- 正式对外发布建议配置开发者证书与公证：
  1. 安装 Apple Developer ID Application 证书到钥匙串；
  2. 删除 `identity: null`；
  3. 设置环境变量 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID` 后重新打包，electron-builder 会自动完成 notarize。

### 6.3 已知限制：macOS 键盘拦截

`keyboardBlocker` 会尝试加载 `dist/main/native/mac-keyboard-blocker.node`，仓库中当前**没有**该原生模块，因此 macOS 上会退化为"窗口焦点保持"方案（无法真正屏蔽按键）。需要原生拦截时，需自行编译该 `.node` 并确保被 `asarUnpack` 解包。

---

## 7. Linux 打包

```bash
npm run dist:linux
```

产物（x64）：

- `HealthClock-<version>-x64.deb`
- `HealthClock-<version>-x64.rpm`
- `HealthClock-<version>-x64.AppImage`

关键配置：

| 配置 | 值 | 说明 |
| --- | --- | --- |
| `executableName` | `healthclock` | 可执行文件名（避免中文文件名） |
| `category` | `Utility` | 应用分类 |
| `deb.depends` | `libnotify-bin`、`libgtk-3-0` | Debian 系运行依赖 |
| `rpm.depends` | `libnotify`、`gtk3` | RPM 系运行依赖 |
| `desktop.entry` | 名称/注释/分类 | `Exec`、`Icon` 自动生成，不要手写 |

运行 AppImage 需要 FUSE：`sudo apt install libfuse2`；或者使用 `--appimage-extract` 解包运行。

---

## 8. 产物校验

### 8.1 检查 asar 内容

```powershell
npx asar list release\win-unpacked\resources\app.asar
```

正常情况下应看到 `\dist\main\...`、`\dist\preload\...`、`\dist\renderer\index.html`、`\dist\renderer\lock.html`、`\package.json`，以及 `dist/renderer/icons/*`。若缺少 `index.html` 或入口文件，说明 `npm run build` 未执行或白名单漏项。

只看关键项：

```powershell
npx asar list release\win-unpacked\resources\app.asar | Select-String "index.html|lock.html|main.js|package.json"
```

### 8.2 运行冒烟

直接运行解包版（不安装）：

```powershell
Start-Process "release\win-unpacked\别坐了.exe"
```

检查点：

1. 主窗口正常显示（无白屏）；
2. 托盘图标出现，右键菜单含"稍后提醒 / 跳过本次"；
3. 开始提醒后关闭主窗口，仍能在设定时间弹出提醒；
4. `%APPDATA%\HealthClock\Logs` 有日志且无 `ERROR`。

> 开发态（`npm run dev`）如果遇到 `Error code: 5` 单实例锁失败，是当前终端环境的用户数据目录权限问题，改用：
> `node_modules\electron\dist\electron.exe . --user-data-dir=<可写目录>`；打包后的应用不受影响。

### 8.3 验证版本号

```powershell
(Get-Item "release\win-unpacked\别坐了.exe").VersionInfo.ProductVersion
```

应等于 `package.json` 的 `version`（规范化后的形式）。

---

## 9. 体积、依赖与发布

### 9.1 版本号规范

`package.json` 当前为 `v0.5.8`。electron-builder 会按 semver 处理并去掉前缀（产物名为 `0.5.8`），但建议后续统一写成不带 `v` 的形式：

```json
"version": "0.6.0"
```

原因：

- 自动更新比较依赖严格的 semver；
- 避免产物名出现 `v` 前缀的不确定性；
- Git tag 单独使用 `v0.6.0`（tag 带 `v`，`package.json` 不带），这是社区通行做法。

### 9.2 体积构成与优化

| 手段 | 配置 | 效果 |
| --- | --- | --- |
| 只保留中文语言包 | `electronLanguages: [zh-CN]` | 去掉几十 MB 的 `locales` |
| 最高压缩 | `compression: maximum` | 安装包更小，打包时间更长 |
| 严格白名单 | `files` 只放 `dist/**` | 排除源码、文档、脚本 |
| asar | `asar: true` | 减少小文件 I/O，启动更快 |
| 排除 sourcemap | `!dist/**/*.map` | 体积更小 |
| 移除未使用依赖 | 见 9.2.1 | 效果最明显 |

#### 9.2.1 关于 `node_modules`（重要）

`electron-builder.yml` 中包含：

```yaml
files:
  - '!**/node_modules/**/*'
```

实测打包后的 `app.asar` **不包含 `node_modules`**。因此运行期依赖 `node-global-key-listener`（Windows 全局键盘拦截）不会进入安装包，打包版会退化为"焦点保持"方案：锁屏窗口失焦后会被重新置顶，但无法真正屏蔽按键。

这是有意为之的省体积取舍。若需要打包版也具备真正的按键拦截，二选一：

**方案 A（推荐先修依赖声明）**

`package.json` 中同一包同时出现在 `dependencies` 与 `optionalDependencies`，且版本范围冲突，导致 `npm ls` 报 `ELSPROBLEMS invalid: node-global-key-listener@0.3.0`，electron-builder 收集生产依赖时也会失败：

```json
"dependencies": { "node-global-key-listener": "^0.3.0", "x11": "^2.3.0" },
"optionalDependencies": { "node-global-key-listener": "^0.1.2", "x11": "^2.3.0" }
```

删除 `optionalDependencies` 中的重复项后执行 `npm install`。

**方案 B（显式放行依赖）**

在 `files` 白名单中加入：

```yaml
files:
  - 'dist/main/**/*'
  - 'dist/preload/**/*'
  - 'dist/renderer/**/*'
  - 'node_modules/node-global-key-listener/**/*'
```

打包后确认：

```powershell
npx asar list release\win-unpacked\resources\app.asar | Select-String "node_modules"
```

> 若不想引入该依赖，也可保持现状：功能可用，只是按键拦截能力弱一些。

### 9.3 自动更新与发布

主进程的更新检查（`src/main/utils/updateChecker.js`）会请求 GitHub Releases 并与当前版本比较：

- 仓库：`neopen/active-break-clock`
- 请在 GitHub 上创建 **tag 为 `vX.Y.Z`** 的 Release，并上传安装包；
- 不要把 `package.json` 的版本号写成带 `v` 的格式（见 9.1），否则比较逻辑可能出现偏差。

electron-builder 26 在检测到 CI 环境时会**隐式发布**，未设置 `GH_TOKEN` 时会报：

```text
GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"
```

> 注意：部分 IDE / 终端会自动注入 `CI=true`（本项目的开发终端即如此），导致本地打包也被判定为 CI。此时产物其实已经生成，只是进程退出码为 1。确认当前环境可用 `$env:CI` 查看。

本地打包请加 `--publish never`；CI 发布使用：

```powershell
$env:GH_TOKEN="<你的 token>"
npx electron-builder --win --x64 --publish always
```

> 提示：`electron-builder.yml` 中的 `win.publish` 同时配置了 `github` 与 `bitbucket`，本地不打标签发布时建议显式 `--publish never`，避免误上传。
> 另外产物中的 `.blockmap` 是增量更新用的，上传 Release 时请一并保留。

### 9.4 发布清单

- [ ] 更新 `package.json` 的 `version`（不带 `v`）
- [ ] 更新 README / 更新日志
- [ ] `npm run clean && npm run build`
- [ ] `npm run dist:win`（或 bat 脚本）
- [ ] 安装包安装 + 卸载各验证一次
- [ ] 冒烟：提醒、锁屏、稍后提醒、跳过、开机自启、数据导入导出
- [ ] 打 tag `vX.Y.Z` 并推送
- [ ] 上传 `Setup.exe`、`Portable.exe`、`.blockmap` 到 GitHub Release

---

## 10. 常见问题排查

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `remove ...\release\win-unpacked\chrome_100_percent.pak: Access is denied` | 上一次打包的程序仍在运行，文件被占用 | 三个 bat 脚本已自动检测并关闭 `别坐了.exe`；手动命令需先退出应用，或换输出目录 `"-c.directories.output=release-check"` |
| `GitHub Personal Access Token is not set ... GH_TOKEN` | electron-builder 检测到 CI 环境（IDE 终端可能自动设置 `CI=true`），触发隐式发布 | 加 `--publish never`；发布时设置 `GH_TOKEN` 并 `--publish always` |
| `ELSPROBLEMS invalid: node-global-key-listener@0.3.0` | `dependencies` 与 `optionalDependencies` 重复且版本冲突 | 删除 `optionalDependencies` 重复项后 `npm install` |
| `npm warn Unknown project config "electron_mirror"` | npm 11 对旧式 `.npmrc` 键的警告 | 非致命。可改用环境变量 `ELECTRON_MIRROR` / `ELECTRON_BUILDER_BINARIES_MIRROR` |
| 打包后白屏 | `dist/` 未生成或路径缺失 | `npm run build` 后重打；确认 `dist/renderer/index.html` 存在 |
| 打包后托盘无图标 | 图标路径不在候选列表 | 确认 `dist/renderer/icons/icon-32.png` 等存在；`favicon.js` 会依次查找 asar 内图标目录 |
| 打包版锁屏无法屏蔽按键 | `node_modules` 未打入 asar | 见 9.2.1 |
| macOS 打开提示"已损坏/无法验证开发者" | 未签名（`identity: null`） | 右键 → 打开；或配置签名与公证 |
| 安装包被 Defender/SmartScreen 拦截 | 未做代码签名 | 正式分发建议购买代码签名证书；内测可点"仍要运行" |
| Electron 下载超时 | 镜像或网络问题 | 清缓存后重装（见 2.3）；确认 `.npmrc` 未被覆盖 |
| `ENOENT ... .directories.output=xxx` | PowerShell 未加引号 | 参数写成 `"-c.directories.output=release-check"` |
| 中文可执行名导致脚本/命令行处理异常 | `productName: 别坐了` 会成为 exe 名 | 需要英文名时把 `productName` 改英文，并在 `linux.executableName` 等处同步 |
| 打包很慢 | `compression: maximum` + 全量收集 | 开发验证用 `--dir`；正式发版再开最高压缩 |

---

## 11. 附录

### 11.1 关键配置速查（electron-builder.yml）

| 字段 | 当前值 | 说明 |
| --- | --- | --- |
| `appId` | `com.neopen.activebreakclock` | 应用唯一标识（通知、快捷方式依赖它） |
| `productName` | `别坐了` | 应用显示名 / exe 名 |
| `directories.output` | `release` | 产物目录 |
| `electronLanguages` | `zh-CN` | 只保留中文语言包 |
| `extraResources` | `src/renderer/icons/**/*` | 图标兜底（asar 内已有，通常不必需） |
| `files` | `dist/**` 白名单 | 决定 asar 内容 |
| `win.target` | `nsis`、`portable` | Windows 双产物 |
| `win.icon` | `icon-256.png` | 自动转 ico |
| `win.asarUnpack` | `**/*.node` | 原生模块解包（当前无） |
| `win.compression` | `maximum` | 最高压缩 |
| `nsis.oneClick` | `false` | 向导式安装 |
| `nsis.perMachine` | `false` | 按用户安装，无需管理员 |
| `nsis.deleteAppDataOnUninstall` | `false` | 卸载保留数据 |
| `mac.identity` | `null` | 跳过签名 |
| `linux.executableName` | `healthclock` | 可执行文件名 |

### 11.2 命令速查

```powershell
# 构建 dist
npm run build

# 清理
npm run clean

# Windows 安装版 + 便携版
npm run dist:win

# 只解包（最快验证）
npx electron-builder --win --x64 --dir --publish never

# 自定义输出目录
npx electron-builder --win --x64 --dir "-c.directories.output=release-check" --publish never

# 查看 asar
npx asar list release\win-unpacked\resources\app.asar

# 查看安装包版本
(Get-Item "release\win-unpacked\别坐了.exe").VersionInfo.ProductVersion

# 运行解包版
Start-Process "release\win-unpacked\别坐了.exe"
```

### 11.3 产物目录对照

| 平台 | 产物 |
| --- | --- |
| Windows x64 | `HealthClock-<version>-x64-Setup.exe`、`HealthClock-<version>-x64-Portable.exe` |
| Windows ia32 | `HealthClock-<version>-ia32-Setup.exe` 等 |
| macOS | `HealthClock-<version>-<arch>.dmg`、`.zip` |
| Linux x64 | `HealthClock-<version>-x64.deb`、`.rpm`、`.AppImage` |

---

维护提示：修改 `electron-builder.yml` 的 `files` / `artifactName` / 目标平台后，请同步更新本文档对应章节。
