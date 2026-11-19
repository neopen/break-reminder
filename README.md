<h1 align="center">别坐了 (HealthClock)</h1>
<h2 align="center">定时提醒 · 拒绝久坐</h2>

<p align="center">
<strong>基于 Tauri 2 + Vue 3 + TypeScript 的健康提醒桌面应用，提供全屏提醒遮罩、全局键盘拦截、系统通知与自动更新。</strong>
</p>

<p align="center">
  <a href="https://github.com/neopen/break-reminder/releases"><img src="https://img.shields.io/github/v/release/neopen/break-reminder?label=Version&color=blue" alt="Version"></a>
  <a href="https://github.com/neopen/break-reminder/releases"><img src="https://img.shields.io/github/downloads/neopen/break-reminder/total?label=Downloads&logo=github&color=blue" alt="Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/Tauri-2-orange" alt="Tauri 2">
</p>

## 简介

「别坐了」通过定时全屏遮罩提醒久坐用户起身活动。项目已从 Electron 迁移到
**Tauri 2 + Vue 3 + TypeScript**：安装包从约 97 MB 降至 3–14 MB，常驻内存显著下降。

当前 1.0 版本完成桌面技术底座与核心原生能力；提醒引擎、配置与统计的完整迁移见
[架构与路线图](docs/architecture.md)。

## 核心能力

- **强制提醒遮罩**：全屏、无边框、置顶、跳过任务栏，倒计时结束自动关闭
- **全局键盘拦截**：Windows 低层键盘钩子，音量键放行，遮罩关闭即恢复
- **声音提示**：WebView 无用户手势自动播放（Windows 通过 WebView2 启动参数启用）
- **系统通知**：安装版可注册 Windows 通知（便携版受系统限制不显示）
- **托盘与单实例**：托盘菜单、开机自启、二次启动聚焦已有窗口
- **自动更新**：GitHub Release + `tauri-plugin-updater`，更新包签名校验

## 界面预览

![主界面](assets/screenshots-1.png)

![锁屏提醒](assets/screenshot-2.png)

## 技术栈

| 层       | 技术                                                       |
| -------- | ---------------------------------------------------------- |
| 桌面容器 | Tauri 2（Rust）                                            |
| 前端     | Vue 3 + TypeScript + Vite                                  |
| UI       | 设计令牌 + 组件化 CSS，双入口（主窗口 / 锁屏）             |
| 原生能力 | 托盘、单实例、自启、通知、更新插件 + 自研 Windows 键盘钩子 |
| 质量     | vue-tsc、ESLint、Prettier、rustfmt、Clippy                 |
| 构建发布 | GitHub Actions，三平台矩阵，NSIS / DMG / AppImage / DEB    |

## 体积与资源

| 构建                                  | 体积           |
| ------------------------------------- | -------------- |
| Windows NSIS 安装包（未签名测试构建） | **3.3 MB**     |
| Windows 便携 exe                      | 14 MB          |
| Electron 旧版安装包 / 安装后          | 97 MB / 306 MB |

安装后实际占用与空载内存待 Windows 正式包实测后补充。

## 快速开始

### 前置依赖

- Node.js 22+
- Rust stable（`rust-toolchain.toml` 会安装 rustfmt / clippy）
- 平台构建工具
  - Windows：Visual Studio Build Tools（C++ 桌面开发）+ WebView2 Runtime
  - macOS：Xcode Command Line Tools
  - Linux：`libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`patchelf`

### 开发与构建

```bash
npm install
npm run tauri dev      # 启动 Tauri 开发窗口
npm run tauri build    # 构建当前平台安装包
```

仅调试前端：

```bash
npm run dev            # 浏览器预览，原生能力禁用
npm run typecheck
npm run lint
npm run build
```

## 目录结构

```text
.
├── .github/workflows/     # CI / Release / 测试包
├── assets/                # README 截图与图标源
├── docs/                  # 架构、开发、发布文档
├── public/audio/          # 提醒音效
├── scripts/               # 版本同步、音效生成
├── src/                   # Vue 渲染层
│   ├── components/        # 基础组件与 features/ 特性卡片
│   ├── composables/       # 跨组件状态与轮询
│   ├── services/          # 唯一允许调用 Tauri invoke 的位置
│   ├── styles/            # tokens / base / lock
│   ├── types/             # 与 Rust 侧对应的类型
│   ├── utils/             # 通用工具
│   ├── views/             # 锁屏窗口页面
│   ├── App.vue
│   ├── main.ts / lock.ts  # 双入口
│   └── env.d.ts
├── src-tauri/             # Rust 主进程
│   ├── src/               # lib / commands / lock / keyboard / tray / state
│   ├── capabilities/      # 最小权限
│   ├── icons/
│   └── tauri.conf.json
├── index.html / lock.html # 多页入口
├── eslint.config.js
├── rust-toolchain.toml / rustfmt.toml
├── package.json           # 版本唯一来源
└── vite.config.ts
```

## 常用命令

| 命令                              | 作用                      |
| --------------------------------- | ------------------------- |
| `npm run tauri dev`               | 启动桌面开发窗口          |
| `npm run tauri build`             | 构建当前平台安装包        |
| `npm run dev`                     | 仅启动 Vite（浏览器预览） |
| `npm run build`                   | 类型检查 + 前端生产构建   |
| `npm run typecheck`               | `vue-tsc` 类型检查        |
| `npm run lint` / `lint:fix`       | ESLint                    |
| `npm run format` / `format:check` | Prettier                  |
| `npm run version:sync`            | 同步版本到 Tauri / Cargo  |
| `npm run version:check`           | 校验三处版本一致          |
| `npm run audio:generate`          | 重新生成提醒音效          |

## 版本与发布

- 版本唯一来源：`package.json`，`npm version` 会自动同步 `tauri.conf.json` 与 `Cargo.toml`
- 正式标签：`vX.Y.Z`，推送后触发三平台构建与 GitHub Release
- 测试标签：`test-*`，仅构建未签名 Windows 安装包，不发布

详细流程、更新密钥与 Secrets 配置见 [发布文档](docs/release.md)。

## 已知限制

- 全局键盘拦截目前仅实现 Windows；macOS（CGEventTap）与 Linux（X11 grab）为后续阶段
- Windows 系统通知仅对已安装应用生效
- `Ctrl+Alt+Del`、`Win+L` 属于系统安全序列，普通桌面应用无法拦截
- macOS 自动更新要求应用完成签名与公证

## 文档

- [架构与路线图](docs/architecture.md)
- [开发指南](docs/development.md)
- [发布与自动更新](docs/release.md)

## 许可证

[MIT](LICENSE) © 2026 neopen
