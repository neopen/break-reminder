# 桌面端技术体系（Tauri 2 + Vue 3 + TypeScript）

本目录定义「别坐了」桌面端的新技术底座。Electron 旧线（仓库根目录）暂时保留，
新能力统一在 [`apps/desktop`](../../apps/desktop) 中演进。

## 1. 为什么是 Tauri 2

| 指标 | Electron（现状） | Tauri 2 | 说明 |
| --- | --- | --- | --- |
| Windows 安装包 | 约 97 MB | 约 3–10 MB | 依赖系统 WebView2 |
| 安装后占用 | 约 306 MB | 约 10–20 MB | 不含 WebView2 运行时 |
| 常驻内存 | 约 150–300 MB | 约 50–90 MB | 随窗口数量浮动 |
| UI 复用 | — | 高 | 现有 HTML/CSS/JS 可平移为 Vue |
| 原生能力 | Node.js | Rust + 官方插件 | 全局钩子需自行实现 |

代价是主进程需要 Rust，且全局键盘钩子、空闲检测等能力要按平台实现。

## 2. 目录约定

```text
apps/desktop/
├── index.html               # 主窗口入口
├── lock.html                # 锁屏遮罩入口（多页应用）
├── src/                     # Vue 3 渲染层
│   ├── components/          # 通用 UI 组件（AppButton / AppCard / StatusPill）
│   ├── services/            # 唯一允许调用 invoke 的位置
│   ├── styles/              # tokens.css / base.css / lock.css
│   ├── views/               # 窗口级页面（LockView）
│   ├── App.vue              # 主窗口页面
│   ├── main.ts / lock.ts    # 两个入口
│   └── env.d.ts
├── public/audio/            # 静态资源（提醒音效）
├── scripts/                 # 版本同步、版本校验、音效生成
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs           # 插件注册、命令注册、窗口事件
│   │   ├── commands.rs      # 前端可调用的 IPC 命令
│   │   ├── lock.rs          # 全屏置顶遮罩窗口
│   │   ├── keyboard.rs      # 全局键盘钩子（Windows 已实现）
│   │   ├── tray.rs          # 托盘菜单
│   │   └── state.rs         # 共享状态
│   ├── capabilities/        # 最小权限声明
│   ├── icons/
│   └── tauri.conf.json
└── package.json             # 版本唯一来源
```

约定：

- **新增窗口** = 新 HTML 入口 + Rust 端 `WebviewWindowBuilder` + 在
  `capabilities/default.json` 的 `windows` 中登记。
- **新增原生能力** = Rust 命令 + `services/desktop.ts` 封装；组件不直接 `invoke`。
- **平台差异** 用 `#[cfg(target_os = "...")]` 隔离，非目标平台提供明确的
  “暂不支持”返回，不要静默失败。
- **样式** 只引用 `src/styles/tokens.css` 中的变量，禁止散落硬编码色值。

## 3. UI 规范

- 设计令牌：颜色、圆角、间距、阴影、动效统一在 `src/styles/tokens.css`。
- 组件 API 保持最小：`AppButton`（variant/block/loading）、`AppCard`（title/description +
  badge/body/footer 插槽）、`StatusPill`（tone: ok/warn/off/danger）。
- 语义映射：进行中/成功用 `ok`，待操作/未启用用 `warn`/`off`，失败用 `danger`。
- 可点击元素最小高度 40px，保留 `:focus-visible` 轮廓。
- 文案使用中文、第二人称、动词开头；避免技术术语直接暴露给最终用户。

## 4. 本地开发

依赖：

- Node.js 22+（本仓库用 npm）
- Rust stable + 平台构建工具
  - Windows：Visual Studio Build Tools（C++ 桌面开发工作负载）+ WebView2 Runtime
  - macOS：Xcode Command Line Tools
  - Linux：`libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`patchelf`
- Windows 10 1803+ 通常已自带 WebView2；缺失时安装 Evergreen Runtime。

```bash
# 仓库根目录
npm run desktop:install

# 开发（Vite + Tauri）
npm run desktop:dev

# 仅前端检查 / 构建
npm run desktop:typecheck
npm --prefix apps/desktop run build

# 打包当前平台
npm run desktop:build
```

首次 `cargo build` 需要下载并编译 Tauri 依赖，通常 3–8 分钟。

## 5. 版本管理

唯一来源：`apps/desktop/package.json` 的 `version`。

```bash
cd apps/desktop
npm version patch   # 或 minor / major
```

`postversion` 会自动把版本同步到：

- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

也可手动执行：

```bash
npm run version:sync
npm run version:check   # 校验三处版本一致，CI 会执行
```

发布标签使用 `desktop-vX.Y.Z`，与 Electron 旧线的 `vX.Y.Z` 区分，避免过渡期冲突。
Tauri 正式取代 Electron 后，再统一切换为 `vX.Y.Z`。

## 6. 构建与发布

### CI

`.github/workflows/desktop-ci.yml`

- 触发：`apps/desktop/**` 变更的 PR、`tauri/**` 分支 push、手动触发。
- 前端：`npm ci` → 版本校验 → 类型检查 → 生产构建。
- Rust：Windows / macOS / Ubuntu 三平台 `cargo check`。

### Release

`.github/workflows/desktop-release.yml`

- 触发：推送 `desktop-v*.*.*` 标签。
- 矩阵：
  - Windows x64 → NSIS 安装包
  - macOS Universal（arm64 + x64）→ APP + DMG
  - Linux x64 → AppImage + DEB
- `tauri-apps/tauri-action` 负责构建、上传产物、生成 `latest.json` 与 `.sig`、创建 GitHub Release。

发布步骤：

```bash
cd apps/desktop
npm version minor
cd ../..
git add -A
git commit -m "chore(desktop): release 0.8.0"
git tag desktop-v0.8.0
git push origin tauri/foundation --follow-tags
```

> 标签必须打在包含 `apps/desktop` 的提交上；workflow 会校验
> `package.json` 版本与标签一致。

### 必需的 GitHub Secrets

| Secret | 说明 |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | 更新签名私钥内容（本机 `~/.tauri/healthclock.key`） |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 私钥密码；无密码时留空 |

可选（代码签名 / 公证）：

`APPLE_CERTIFICATE`、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_SIGNING_IDENTITY`、
`APPLE_ID`、`APPLE_PASSWORD`、`APPLE_TEAM_ID`、`WINDOWS_CERTIFICATE`、
`WINDOWS_CERTIFICATE_PASSWORD`。在 `desktop-release.yml` 中取消注释后启用。

### 更新签名密钥

本次基础工程已生成一对密钥：

- 私钥：`C:\Users\haeng\.tauri\healthclock.key`（**不要提交**）
- 公钥：已写入 `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`

重新生成：

```bash
cd apps/desktop
npx tauri signer generate -w ~/.tauri/healthclock.key
# 将输出的公钥替换到 tauri.conf.json 的 pubkey
```

> 私钥丢失将无法发布可被旧版本验证的更新。轮换密钥时，已安装的旧版本无法验证
> 新公钥，需要安排一次带过渡公钥的发布或提供手动安装包。

## 7. 自动更新

- 插件：`tauri-plugin-updater` + `tauri-plugin-process`。
- 端点：`https://github.com/neopen/break-reminder/releases/latest/download/latest.json`
- 流程：`check()` → `downloadAndInstall()` → `relaunch()`。
- `bundle.createUpdaterArtifacts: true`，构建时生成 `.sig` 与 updater manifest。
- 仅打包版本可验证更新；`tauri dev` 下检查失败属于预期行为。
- GitHub 的 “latest release” 是端点来源，因此不要只发布 Draft。
- macOS 更新要求应用已签名；未签名构建只能手动安装。

## 8. 权限与安全边界

- `capabilities/default.json` 只授予 `core:default`、更新、重启、通知、自启动权限；
  新增插件能力时按需追加，禁止直接放宽到全部权限。
- 全局键盘拦截（第一阶段）：Windows 低层键盘钩子 `WH_KEYBOARD_LL`，放行音量键。
  macOS（CGEventTap / 辅助功能授权）与 Linux（X11 grab）尚未实现，接口已预留。
- **Ctrl+Alt+Del、Win+L 无法被普通桌面应用拦截**，这是系统安全序列；
  本应用定位为习惯养成工具，不做安全隔离。
- CSP 当前为 `null` 以便本地开发；正式发布前必须收紧（列入发布检查项）。
- 防截屏（Windows `SetWindowDisplayAffinity`）尚未迁移，后续阶段补齐。

## 9. 迁移路线

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| Phase 1 | 工程骨架、托盘、单实例、全屏遮罩、键盘拦截、音频自动播放、更新与发布链路 | 进行中 |
| Phase 2 | 空闲/锁屏/休眠事件、系统锁屏、多显示器遮罩、配置与统计持久化 | 待开始 |
| Phase 3 | 功能对齐、性能与体积实测、移除 Electron、统一 `v*` 标签 | 待开始 |

## 10. 验收清单

- [x] Vue 类型检查与生产构建通过
- [x] 版本三处一致（package.json / tauri.conf.json / Cargo.toml）
- [x] 更新公钥与 GitHub Release 更新端点就绪
- [ ] `cargo check` 三平台通过（需安装 Rust 工具链）
- [ ] 托盘菜单可用
- [ ] 遮罩全屏、置顶并覆盖任务栏
- [ ] 字母键 / Win / Alt+Tab / Alt+F4 被拦截，音量键正常
- [ ] 打包后锁屏页音频自动播放
- [ ] 更新检查与安装闭环
- [ ] 安装包体积、空载内存实测并记录

## 11. 常见问题

- **`cargo: command not found`**：安装 Rust stable 与平台构建工具（Windows 需要
  MSVC Build Tools），重新打开终端。
- **窗口白屏**：确认先执行 `npm run build`，且 `src-tauri/tauri.conf.json` 的
  `frontendDist` 指向 `../dist`。
- **托盘不显示**：确认 `src-tauri/icons/icon.ico` 存在；Linux 需要 AppIndicator
  支持。
- **更新检查报签名错误**：确认 CI 私钥与 `tauri.conf.json` 公钥来自同一密钥对。
- **音频不自动播放**：Windows 已通过 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`
  设置 `--autoplay-policy=no-user-gesture-required`；macOS 后续需要设置
  `mediaTypesRequiringUserActionForPlayback`。
