# Agent Plugins 1.0.0 schemas

The JSON files are unmodified snapshots of the official schemas:

- https://agent-plugins.org/schemas/1.0.0/plugin.schema.json
- https://agent-plugins.org/schemas/1.0.0/mcp.schema.json

Upstream source: https://github.com/agentplugins/agent-plugins-spec/tree/main/schemas/1.0.0

Upstream schemas are licensed under Apache-2.0; see `LICENSE-Apache-2.0.txt` and the upstream [licensing notice](https://github.com/agentplugins/agent-plugins-spec/blob/main/LICENSE.md). This notice covers the vendored schema files only.

Vendoring these public schemas keeps `npm run validate` reproducible and offline after `npm ci`. Schema validation is structural; runtime behavior is covered separately by the MCP integration tests.
