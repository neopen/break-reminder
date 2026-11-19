# 开发指南

## 1. 环境准备

| 依赖    | 要求                                                                                |
| ------- | ----------------------------------------------------------------------------------- |
| Node.js | 22+                                                                                 |
| Rust    | stable（`rust-toolchain.toml` 自动安装 rustfmt / clippy）                           |
| Windows | Visual Studio Build Tools（C++ 桌面开发）+ WebView2 Runtime                         |
| macOS   | Xcode Command Line Tools                                                            |
| Linux   | `libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`patchelf` |

Windows 10 1803+ 通常自带 WebView2；缺失时安装 Evergreen Runtime。

## 2. 安装与启动

```bash
npm install
npm run tauri dev
```

第一次 `cargo build` 需要编译 Tauri 依赖，通常 3–8 分钟。仅调试前端：

```bash
npm run dev          # 浏览器预览，原生能力禁用
npm run typecheck
npm run lint
npm run build
```

## 3. 代码质量

| 命令                                        | 作用                              |
| ------------------------------------------- | --------------------------------- |
| `npm run typecheck`                         | `vue-tsc` 类型检查                |
| `npm run lint` / `npm run lint:fix`         | ESLint（Vue + TS）                |
| `npm run format` / `npm run format:check`   | Prettier                          |
| `cargo fmt` / `cargo fmt --check`           | Rust 格式（在 `src-tauri/` 执行） |
| `cargo clippy --all-targets -- -D warnings` | Rust 静态检查                     |

提交前建议执行：

```bash
npm run format
npm run lint
npm run typecheck
cd src-tauri && cargo fmt && cargo clippy --all-targets -- -D warnings
```

## 4. 版本同步

唯一来源是 `package.json`：

```bash
npm version minor     # 自动触发 postversion 同步
npm run version:sync  # 手动同步到 tauri.conf.json / Cargo.toml
npm run version:check # 校验三处一致
```

## 5. 调试技巧

- 锁屏窗口与主窗口共用一个 Vue 工程，通过 `index.html` / `lock.html` 双入口区分。
- 锁屏页的音频播放结果通过 Tauri event `hc-audio-autoplay` 回传主窗口。
- 键盘钩子状态每 1.5 秒轮询一次；`useRuntimeStatus` 全局只启动一个定时器。
- 没有本地 Rust 工具链时，可推送 `test-*` 标签，由
  [Test Build](../.github/workflows/test-build.yml) 产出未签名 Windows 安装包。

## 6. 常见问题

| 现象                       | 处理                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| `cargo: command not found` | 安装 Rust stable 与平台构建工具，重开终端                         |
| 窗口白屏                   | 确认 `npm run build` 成功，`frontendDist` 指向 `../dist`          |
| 托盘不显示                 | 确认 `src-tauri/icons/icon.ico` 存在；Linux 需要 AppIndicator     |
| 通知不显示                 | 使用 NSIS 安装版；检查系统通知与专注助手设置                      |
| 更新检查失败               | 正式发布前 `latest.json` 不存在，属于预期；确认版本标签与签名密钥 |
| 音频不自动播放             | Windows 需 WebView2 自动播放参数；macOS 后续配置 WKWebView 策略   |
