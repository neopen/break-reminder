# 别坐了桌面端（Tauri 2 + Vue 3 + TypeScript）

新一代桌面端基础工程，用于替换 Electron 主进程并验证核心原生能力。

完整的结构约定、UI 规范、版本管理、发布与更新流程见
[`docs/desktop/README.md`](../../docs/desktop/README.md)。

## 快速开始

```bash
# 在仓库根目录
npm run desktop:install

# 开发（Vite + Tauri）
npm run desktop:dev

# 仅前端
npm run desktop:typecheck
npm --prefix apps/desktop run build

# 打包
npm run desktop:build
```

前置依赖：Node.js 22+、Rust stable、平台构建工具（Windows: MSVC Build Tools）、
WebView2 Runtime。

## 常用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 仅启动 Vite（浏览器预览，无原生能力） |
| `npm run desktop:dev` | 启动 Tauri 开发窗口 |
| `npm run build` | 类型检查 + 前端生产构建 |
| `npm run typecheck` | `vue-tsc` 类型检查 |
| `npm run desktop:build` | 打包当前平台 |
| `npm run version:sync` | 同步版本到 Tauri / Cargo |
| `npm run version:check` | 校验三处版本一致 |
| `npm run audio:generate` | 重新生成提醒音效 |

## 本次 Spike 验证项

1. 托盘图标与菜单（显示主窗口 / 锁屏测试 / 键盘拦截 / 退出）
2. 全屏、无边框、置顶、跳过任务栏的提醒遮罩
3. Windows 全局键盘拦截（放行音量键），关闭时自动卸载钩子
4. WebView2 无用户手势自动播放提醒音效
5. 启动时单实例、开机自启、系统通知
6. GitHub Release + `tauri-plugin-updater` 自动更新链路

## 无本地 Rust 环境时

可以手动触发 GitHub Actions 产出未签名、不发布的 Windows 测试 exe：

```bash
gh workflow run desktop-build-test.yml --ref tauri/foundation
```

在 Actions 运行页下载 `healthclock-windows-test-<sha>` artifact，双击运行即可验证原生能力。

## 已知边界

- 全局键盘拦截目前仅实现 Windows；macOS / Linux 返回“暂不支持”。
- `Ctrl+Alt+Del`、`Win+L` 属于系统安全序列，任何桌面框架都无法拦截。
- 防截屏、空闲/锁屏/休眠事件、多显示器遮罩尚未迁移。
