# ZAI · Plugin / Skill / MCP 示例

参照 [Stripe AI](https://github.com/stripe/ai) 的组织方式，为 Claude Code、Codex、Cursor 和 Agent Plugins 1.0 提供同一套示例能力。

这是一个可运行的教学项目：列出内置项目模板、读取模板详情、生成实施计划。它不调用付费模型、不接入 Stripe、不创建云资源，也不生成应用代码。生成计划后，你可以另行要求 Agent 按计划实现应用。

## 1. 快速体验 MCP

需要 Node.js 22+ 和 npm。在这个仓库的根目录执行：

```bash
npm ci
npm run smoke
```

`smoke` 使用官方 MCP Client 通过 stdio 启动本地服务，查询模板并生成 `team-tasks` 的示例计划。无需插件安装或账户授权。

启动给各客户端插件连接的 HTTP 服务：

```bash
npm run mcp:http
```

保持终端运行。默认 MCP 地址是 `http://127.0.0.1:7331/mcp`，健康检查是 `http://127.0.0.1:7331/health`。端口可用 `ZAI_PORT` 改变，但同时需要修改生成配置使用的地址并重新同步。

默认只监听本机 IPv4 回环地址，不提供认证。适用于本机 Codex / Claude Code / Cursor；其他机器或云端 ChatGPT 无法访问你机器的 `127.0.0.1`。正式远程部署需要另外配置 HTTPS、认证和服务生命周期。

## 2. 按 Stripe 的方式安装插件

市场名称是 `zai-plugins`，插件名称是 `zai`，作者维护自己的市场；它们没有上架 OpenAI、Anthropic 或 Cursor 官方市场。

### Claude Code

在系统终端执行：

```bash
claude plugin marketplace add usabuts/zai
claude plugin install zai@zai-plugins
```

本地开发也可直接加载完整插件目录：

```bash
claude --plugin-dir ./providers/claude/plugin
```

### Codex

在系统终端执行：

```bash
codex plugin marketplace add usabuts/zai
codex plugin add zai@zai-plugins
```

重启客户端或新建会话，检查插件与 MCP 状态。标准插件安装可能把文件放进用户级插件缓存，不等于把依赖装进当前项目。

若只想在项目里直接配置 MCP，在你自己项目的 `.codex/config.toml` 合并以下内容：

```toml
[mcp_servers.zai]
url = "http://127.0.0.1:7331/mcp"
```

这只配置连接，不会安装 Skill 或启动服务器；项目配置是否加载还取决于客户端的信任设置。不要覆盖已有配置。

### Cursor

在支持仓库安装的 Cursor 中使用 `/add-plugin https://github.com/usabuts/zai`，从市场清单选择 `zai`。团队也可从 Dashboard → Plugins & MCPs 导入这个仓库。

本地测试时，将 `providers/cursor/plugin` **完整复制**到 `~/.cursor/plugins/local/zai/`，然后重新加载 Cursor。客户端版本可能影响入口；这不是 VS Code 扩展的 `.vsix` 安装。

只需 MCP 时，把下面的连接合并到你项目的 `.cursor/mcp.json`，不必安装插件：

```json
{
  "mcpServers": {
    "zai": { "url": "http://127.0.0.1:7331/mcp" }
  }
}
```

### 通用 Agent Plugins 1.0

兼容客户端可加载：

```text
Git 仓库：https://github.com/usabuts/zai
子目录：providers/agent-plugins/plugin
```

该目录包含 `plugin.json`、`mcp.json` 和 `skills/`。安装命令由客户端决定，不存在跨客户端统一的 `plugin install` 命令。

所有插件都连接同一台本地 HTTP MCP；不要同时重复安装同名的独立 Skill 和完整插件，避免重复发现。

## 3. 单独安装 Skill

在目标项目目录使用 Skills CLI：

```bash
npx skills add usabuts/zai --skill zai-project-guide
```

选择目标 Agent。Skill 可独立使用其中的离线参考资料，但安装 Skill 不会注册或启动 MCP。若希望调用在线工具，还需要前面提供的 MCP 连接配置。

## 4. 试用请求与接口

安装后可以对 Agent 说：

> 用 ZAI 示例插件列出模板，然后为 team-tasks 生成一个任务 API 实施计划。

预期过程：`zai_list_examples` → `zai_get_example` → `zai_create_plan`。没有可用 MCP 时，Skill 会明确说明使用了离线目录；离线回答不代表服务器连接成功。

| MCP 能力 | 名称 | 行为 |
|---|---|---|
| Tool | `zai_list_examples` | 返回 `task-api`、`notes-cli` 模板摘要 |
| Tool | `zai_get_example` | 按 ID 返回模板、步骤和验证项目 |
| Tool | `zai_create_plan` | 按模板返回 `status: proposed` 的计划，不创建任何文件或资源 |
| Resource | `zai://guide/getting-started` | 获取使用说明 |
| Prompt | `zai-plan-project` | 获取规划任务的提示模板 |

服务支持 Streamable HTTP 和 stdio。stdio 直接启动命令是 `node /绝对路径/zai/tools/mcp/stdio.js`；配置到客户端时替换成实际路径，不要从插件缓存推导固定路径。

## 5. 目录和同步机制

```text
skills/zai-project-guide/        # 唯一维护的 Skill 与模板目录
tools/mcp/                      # 真正的 MCP 服务实现
providers/
  claude/plugin/                # .claude-plugin/plugin.json + .mcp.json + skills/
  codex/plugin/                 # .codex-plugin/plugin.json + .mcp.json + skills/
  cursor/plugin/                # .cursor-plugin/plugin.json + mcp.json + skills/
  agent-plugins/plugin/         # plugin.json + mcp.json + skills/
.claude-plugin/marketplace.json # Claude 市场入口
.agents/plugins/marketplace.json # Codex 市场入口
.cursor-plugin/marketplace.json # Cursor 市场入口
scripts/sync-plugins.js         # 单源生成各客户端副本
schemas/                       # 固定的官方 Agent Plugins 1.0 Schema 副本
test/mcp.test.js                # 官方 SDK 的真实协议往返测试
```

共享内容保存在本仓库，没有模仿 Stripe 建一个不存在的文档站或公网地址，也没有伪造 `.app.json` 应用 ID。更改 `skills/`、根 `package.json` 的版本或同步脚本，再执行：

```bash
npm run sync
npm run check
```

`sync` 将共享 Skill 和清单生成到四个 provider，清理已从源删除的 Skill 文件；**生成目录不要直接编辑**。`sync:check` 只检查，不修改文件。版本由根 `package.json` 显式维护，不因运行同步脚本自动递增。

GitHub Actions 会检查生成副本、Schema、市场路径，并通过 stdio / HTTP 验证工具发现、正常与错误调用、Resource 和 Prompt；它不会自动提交生成内容或发布官方市场。检验通过只证明本地协议和配置结构，不等于三个客户端已经完成界面安装、授权和渲染验证。

更新发布流程是：修改共享内容 → 调整版本 → `npm run sync` → `npm run check` → 提交到 GitHub → 客户端更新自己的市场并重新加载。Claude 可用 `claude plugin update zai@zai-plugins`；Codex Git 市场刷新可用 `codex plugin marketplace upgrade zai-plugins`。Cursor 的直接 GitHub 安装和团队市场有不同更新行为，请以当前客户端文档为准。

## 6. 与 Stripe 示例的对应关系

| Stripe 的组织 | 本项目 |
|---|---|
| Skills 源内容 | `skills/zai-project-guide/` |
| 各 provider 的插件清单 | `providers/*/plugin/` |
| 同步脚本 | `scripts/sync-plugins.js` |
| Stripe 远程 MCP | 本机运行的 `tools/mcp/`，不是 Stripe 的服务器 |
| 各市场入口 | 本仓库自有 `zai-plugins` 市场 |

参考：[Stripe AI](https://github.com/stripe/ai)、[Agent Skills](https://agentskills.io/specification)、[Agent Plugins](https://agent-plugins.org/)、[OpenAI 插件打包](https://developers.openai.com/plugins/build/plugins)、[Claude 插件清单](https://code.claude.com/docs/en/plugins-reference)、[Cursor 插件规范](https://cursor.com/docs/reference/plugins)。
