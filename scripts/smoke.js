import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const client = new Client({ name: 'zai-smoke', version: '0.1.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../tools/mcp/stdio.js', import.meta.url))] }));
  const catalog = await client.callTool({ name: 'zai_list_examples', arguments: {} });
  console.log('模板：', JSON.stringify(catalog.structuredContent, null, 2));
  const plan = await client.callTool({ name: 'zai_create_plan', arguments: { exampleId: 'task-api', projectName: 'team-tasks', goal: '为小型团队构建任务 API' } });
  if (plan.isError) throw new Error(JSON.stringify(plan.content));
  console.log('待实施的计划：', JSON.stringify(plan.structuredContent, null, 2));
} finally { await client.close(); }
