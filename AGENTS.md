# 项目约定

- 项目默认使用简体中文：文档、Skill 指令、插件展示信息、MCP 能力说明、提示模板、示例内容和自行编写的日志使用中文。
- 保留代码标识符、工具名称、配置字段、协议枚举、包名和路径；第三方 Schema 与许可证保持上游原文。
- `skills/` 是 Skill 的唯一维护来源。修改源文件或 `scripts/sync-plugins.js` 后运行 `npm run sync`，不要直接修改 `providers/` 中的生成文件。
- 验证命令为 `npm run check`；MCP 示例体验命令为 `npm run smoke`。
