import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';

const client = new Client({ name: 'zai-smoke', version: '0.1.0' });
try {
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../tools/mcp/stdio.js', import.meta.url))] }));
  const catalog = await client.callTool({ name: 'zai_list_examples', arguments: {} });
  console.log('Templates:', JSON.stringify(catalog.structuredContent, null, 2));
  const plan = await client.callTool({ name: 'zai_create_plan', arguments: { exampleId: 'task-api', projectName: 'team-tasks', goal: 'Build a task API for a small team' } });
  if (plan.isError) throw new Error(JSON.stringify(plan.content));
  console.log('Proposed plan:', JSON.stringify(plan.structuredContent, null, 2));
} finally { await client.close(); }
