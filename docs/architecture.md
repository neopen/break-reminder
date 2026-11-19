# 架构与路线图

## 1. 技术选型

| 指标           | Electron 旧版 | Tauri 2                        |
| -------------- | ------------- | ------------------------------ |
| Windows 安装包 | 约 97 MB      | 约 3–10 MB                     |
| 安装后占用     | 约 306 MB     | 约 10–20 MB（不含 WebView2）   |
| 常驻内存       | 约 150–300 MB | 约 50–90 MB                    |
| UI 复用        | —             | 高（HTML/CSS/JS → Vue）        |
| 原生能力       | Node.js       | Rust + 官方插件 + 自研平台代码 |

选择 Tauri 的核心理由：复用现有 Web UI 资产，同时把体积和内存降一个数量级。

## 2. 目录职责

```text
src/                        Vue 渲染层
├── components/             基础组件
│   └── features/           业务特性卡片（锁屏测试 / 键盘 / 系统集成 / 更新）
├── composables/            跨组件共享状态（useRuntimeStatus）
├── services/               唯一允许调用 invoke 的位置
├── styles/                 tokens.css / base.css / lock.css
├── types/                  与 Rust 结构体一一对应的类型
├── utils/                  通用工具（describeError）
├── views/                  窗口级页面（LockView）
├── App.vue                 主窗口
└── main.ts / lock.ts       两个 HTML 入口

src-tauri/                  Rust 主进程
├── src/lib.rs              插件注册、命令注册、窗口事件
├── src/commands.rs         前端可调用的 IPC 命令
├── src/lock.rs             全屏置顶遮罩窗口与兜底关闭
├── src/keyboard.rs         Windows 低层键盘钩子
├── src/tray.rs             托盘菜单
├── src/state.rs            共享状态
├── capabilities/           最小权限声明
└── tauri.conf.json
```

## 3. 约定

- **IPC 收敛**：组件不直接 `invoke`，统一走 `src/services/desktop.ts`。
- **类型对齐**：`src/types/desktop.ts` 与 Rust 的 `RuntimeStatus` / `LockConfig` 保持
  `serde(rename_all = "camelCase")` 对应。
- **新增窗口**：新增 HTML 入口 + Rust `WebviewWindowBuilder` + 在
  `capabilities/default.json` 的 `windows` 中登记。
- **新增能力**：Rust 命令 + 服务层封装 + 特性组件，平台差异用 `#[cfg(target_os)]`
  隔离，非目标平台返回明确的“暂不支持”。
- **样式**：只引用 `src/styles/tokens.css` 变量；跨组件布局使用 `hc-*` 工具类。

## 4. UI 规范

- 设计令牌：颜色、圆角、间距、阴影、动效统一在 `tokens.css`。
- 组件 API：`AppButton`（variant / block / loading）、`AppCard`（title / description +
  插槽）、`StatusPill`（ok / warn / off / danger）、`InlineAlert`（ok / warn / danger）。
- 状态语义：成功/运行中用 `ok`，待操作/未启用用 `warn`/`off`，失败用 `danger`。
- 可点击元素最小高度 40px，保留 `:focus-visible` 轮廓。
- 文案使用中文、第二人称、动词开头。

## 5. 原生能力与安全边界

| 能力           | 实现                                                      | 状态                     |
| -------------- | --------------------------------------------------------- | ------------------------ |
| 全屏置顶遮罩   | Tauri 窗口 + 每 2 秒重新断言焦点                          | 已验证                   |
| 倒计时自动关闭 | 前端绝对截止时间 + 窗口自关闭 + Rust `duration + 5s` 兜底 | 已验证                   |
| 全局键盘拦截   | Windows `WH_KEYBOARD_LL`，音量键放行                      | 已验证（Windows）        |
| 音频自动播放   | WebView2 `--autoplay-policy=no-user-gesture-required`     | 已验证                   |
| 系统通知       | `tauri-plugin-notification`                               | 仅安装版生效             |
| 自动更新       | `tauri-plugin-updater` + GitHub Release                   | 链路就绪，待正式发布验证 |
| 防截屏         | Windows `SetWindowDisplayAffinity`                        | 待实现                   |
| 空闲/锁屏/休眠 | 平台事件 / 轮询                                           | 待实现                   |
| 多显示器遮罩   | 每显示器窗口                                              | 待实现                   |

安全边界：

- `Ctrl+Alt+Del`、`Win+L` 是系统安全序列，普通桌面应用无法拦截。
- 锁屏遮罩定位为习惯养成工具，不做对抗性安全隔离。
- 生产 CSP 已启用；新增外部资源时必须同步更新 `tauri.conf.json`。
- 权限遵循最小化原则，新增插件时按需追加 `capabilities`。

## 6. 迁移路线

| 阶段    | 内容                                                                   | 状态   |
| ------- | ---------------------------------------------------------------------- | ------ |
| Phase 1 | 工程底座、托盘、单实例、遮罩、键盘拦截、音频、更新与发布链路           | 已完成 |
| Phase 2 | 提醒引擎、配置与统计持久化、空闲/锁屏/休眠事件、系统锁屏、多显示器遮罩 | 待开始 |
| Phase 3 | macOS/Linux 键盘拦截、防截屏、性能与体积实测、功能对齐                 | 待开始 |
