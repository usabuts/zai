# Agent Plugins 1.0.0 Schema

这里的 JSON 文件是官方 Schema 的未修改副本：

- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

上游源码：https://github.com/agentplugins/agent-plugins-spec/tree/main/schemas/1.0.0

上游 Schema 使用 Apache-2.0 许可证，详见 `LICENSE-Apache-2.0.txt` 和上游[许可说明](https://github.com/agentplugins/agent-plugins-spec/blob/main/LICENSE.md)。此许可说明仅适用于引入的 Schema 文件。

将公开 Schema 固定保存在仓库中，使 `npm run validate` 在完成 `npm ci` 后可以离线、可重复地运行。Schema 校验检查配置结构；运行时行为由 MCP 集成测试验证。第三方 Schema 和许可证保留原文。
