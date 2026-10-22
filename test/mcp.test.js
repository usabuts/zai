import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { get } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startHttpServer } from '../tools/mcp/http.js';

async function exercise(transport) {
  const client = new Client({ name: 'zai-integration-test', version: '0.1.0' });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.equal(tools.length, 3);
    assert(tools.every(tool => tool.annotations.readOnlyHint === true));
    const catalog = await client.callTool({ name: 'zai_list_examples', arguments: {} });
    assert.equal(catalog.isError, undefined);
    assert(catalog.structuredContent.examples.some(x => x.id === 'task-api'));
    const detail = await client.callTool({ name: 'zai_get_example', arguments: { exampleId: 'task-api' } });
    assert.equal(detail.structuredContent.example.id, 'task-api');
    const plan = await client.callTool({ name: 'zai_create_plan', arguments: { exampleId: 'task-api', projectName: '任务管理', goal: 'A team task API' } });
    assert.equal(plan.structuredContent.status, 'proposed');
    assert.equal(plan.structuredContent.projectName, '任务管理');
    assert.equal(plan.structuredContent.steps.length, detail.structuredContent.example.steps.length);
    const missing = await client.callTool({ name: 'zai_get_example', arguments: { exampleId: 'does-not-exist' } });
    assert.equal(missing.isError, true);
    assert.equal(JSON.parse(missing.content[0].text).code, 'EXAMPLE_NOT_FOUND');
    const invalid = await client.callTool({ name: 'zai_create_plan', arguments: { exampleId: 'task-api', projectName: ' ', goal: 'x' } });
    assert.equal(invalid.isError, true);
    const resources = await client.listResources();
    assert(resources.resources.some(x => x.uri === 'zai://guide/getting-started'));
    const resource = await client.readResource({ uri: 'zai://guide/getting-started' });
    assert.equal(resource.contents[0].mimeType, 'text/markdown');
    const prompt = await client.getPrompt({ name: 'zai-plan-project', arguments: { goal: 'A local notes app' } });
    assert.equal(prompt.messages[0].role, 'user');
  } finally { await client.close(); }
}

test('stdio: discovery, valid/invalid calls, resources and prompts', async () => {
  await exercise(new StdioClientTransport({ command: process.execPath, args: [fileURLToPath(new URL('../tools/mcp/stdio.js', import.meta.url))] }));
});

test('HTTP: same protocol behavior, malformed requests, and local origin restrictions', async () => {
  const listener = await startHttpServer(0);
  const base = `http://127.0.0.1:${listener.address().port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal((await health.json()).status, 'ok');
    await exercise(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const blocked = await fetch(`${base}/mcp`, { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(blocked.status, 403);
    // Node fetch normalizes Host; use the HTTP client to exercise the actual wire header.
    const invalidHostStatus = await new Promise((resolve, reject) => {
      const request = get(`${base}/health`, { headers: { Host: 'untrusted.example' } }, response => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      request.on('error', reject);
    });
    assert.equal(invalidHostStatus, 403);
    const invalidJson = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(invalidJson.status, 400);
    const unsupported = await fetch(`${base}/mcp`);
    assert.equal(unsupported.status, 405);
  } finally { await new Promise(resolve => listener.close(resolve)); }
});
