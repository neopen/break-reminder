# 文档索引

| 文档                            | 内容                                                |
| ------------------------------- | --------------------------------------------------- |
| [架构与路线图](architecture.md) | 技术选型、目录约定、UI 规范、原生能力边界、迁移阶段 |
| [开发指南](development.md)      | 环境准备、常用命令、代码质量、常见问题              |
| [发布与自动更新](release.md)    | 版本策略、标签、CI/Release、更新密钥与 Secrets      |

## 项目速览

- 桌面容器：Tauri 2（Rust）
- 渲染层：Vue 3 + TypeScript + Vite
- 原生能力：托盘、单实例、开机自启、通知、自动更新，以及自研 Windows 低层键盘钩子
- 发布：GitHub Actions 三平台矩阵 + `tauri-plugin-updater`
