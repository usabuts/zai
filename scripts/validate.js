import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const pkg = await readJson('package.json');
const ajv = new Ajv2020({ allErrors: true });
for (const [schemaFile, relative] of [
  ['plugin', 'providers/agent-plugins/plugin/plugin.json'],
  ['mcp', 'providers/agent-plugins/plugin/mcp.json']
]) {
  const validate = ajv.compile(await readJson(`schemas/agent-plugins-1.0.0-${schemaFile}.json`));
  assert(validate(await readJson(relative)), `${relative}: ${JSON.stringify(validate.errors)}`);
}
for (const [provider, manifest, mcp] of [
  ['claude', '.claude-plugin/plugin.json', '.mcp.json'],
  ['codex', '.codex-plugin/plugin.json', '.mcp.json'],
  ['cursor', '.cursor-plugin/plugin.json', 'mcp.json'],
  ['agent-plugins', 'plugin.json', 'mcp.json']
]) {
  const prefix = `providers/${provider}/plugin`;
  const data = await readJson(`${prefix}/${manifest}`);
  assert.equal(data.name, 'zai');
  assert.equal(data.version, pkg.version);
  const config = await readJson(`${prefix}/${mcp}`);
  assert.equal(config.mcpServers.zai.url, 'http://127.0.0.1:7331/mcp');
  assert.equal(config.mcpServers.zai.type, provider === 'agent-plugins' ? 'streamable-http' : 'http');
  for (const name of await readdir(path.join(root, prefix, 'skills'))) {
    const skill = await readFile(path.join(root, prefix, 'skills', name, 'SKILL.md'), 'utf8');
    assert(skill.startsWith(`---\nname: ${name}\ndescription: `));
    const refs = [...skill.matchAll(/\]\((references\/[^)]+)\)/g)];
    for (const [, reference] of refs) await readFile(path.join(root, prefix, 'skills', name, reference));
  }
}
const codex = await readJson('providers/codex/plugin/.codex-plugin/plugin.json');
assert.equal(codex.skills, './skills');
assert.equal(codex.mcpServers, './.mcp.json');
for (const manifest of ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json', '.cursor-plugin/marketplace.json']) {
  const marketplace = await readJson(manifest);
  assert.equal(marketplace.name, 'zai-plugins');
  for (const entry of marketplace.plugins) {
    const source = typeof entry.source === 'string' ? entry.source : entry.source.path;
    assert(source.startsWith('./providers/'));
    await readdir(path.join(root, source));
  }
}
console.log('通用 Schema、客户端配置、Skill 引用和市场路径校验通过。');
