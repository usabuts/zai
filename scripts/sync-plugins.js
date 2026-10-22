import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const repository = 'https://github.com/usabuts/zai';
const base = { name: 'zai', version: pkg.version, description: '通过共享 Skill 和 MCP 工具浏览 ZAI 示例并起草实施计划。', author: { name: 'usabuts', url: 'https://github.com/usabuts' }, homepage: repository, repository };
const url = 'http://127.0.0.1:7331/mcp';
const http = { mcpServers: { zai: { type: 'http', url } } };
const portable = { $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', ...base };
const portableMcp = { $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json', mcpServers: { zai: { type: 'streamable-http', url } } };
const output = new Map();
const json = (file, data) => output.set(file, JSON.stringify(data, null, 2) + '\n');

json('providers/claude/plugin/.claude-plugin/plugin.json', base);
json('providers/claude/plugin/.mcp.json', http);
json('providers/codex/plugin/.codex-plugin/plugin.json', {
  ...base, skills: './skills', mcpServers: './.mcp.json',
  interface: { displayName: 'ZAI 示例', shortDescription: '浏览入门模板并起草项目实施计划', defaultPrompt: ['用 ZAI 为名为 team-tasks 的任务 API 制定实施计划'] }
});
json('providers/codex/plugin/.mcp.json', http);
json('providers/cursor/plugin/.cursor-plugin/plugin.json', base);
json('providers/cursor/plugin/mcp.json', http);
json('providers/agent-plugins/plugin/plugin.json', portable);
json('providers/agent-plugins/plugin/mcp.json', portableMcp);
json('.agents/plugins/marketplace.json', {
  name: 'zai-plugins', interface: { displayName: 'ZAI 示例' }, plugins: [{ name: 'zai', source: { source: 'local', path: './providers/codex/plugin' }, policy: { installation: 'AVAILABLE', authentication: 'ON_USE' }, category: 'Developer Tools' }]
});
json('.claude-plugin/marketplace.json', {
  name: 'zai-plugins', description: '包含共享 Skill 和 MCP 工具的可运行 ZAI 示例。', owner: { name: 'usabuts' }, plugins: [{ name: 'zai', description: base.description, version: pkg.version, source: './providers/claude/plugin' }]
});
json('.cursor-plugin/marketplace.json', {
  name: 'zai-plugins', owner: { name: 'usabuts' }, plugins: [{ name: 'zai', description: base.description, source: './providers/cursor/plugin' }]
});

async function filesAt(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesAt(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))).flat();
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

const skillFiles = await filesAt(path.join(root, 'skills'));
for (const provider of ['claude', 'codex', 'cursor', 'agent-plugins']) {
  for (const file of skillFiles) {
    output.set(`providers/${provider}/plugin/skills/${path.relative(path.join(root, 'skills'), file).split(path.sep).join('/')}`, await readFile(file, 'utf8'));
  }
}

let drift = 0;
for (const [relative, expected] of output) {
  const file = path.join(root, relative);
  const actual = await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (actual === expected) continue;
  drift++;
  if (check) console.error(`生成内容已过期： ${relative}`);
  else { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, expected); }
}
// 这些目录由脚本生成；源文件删除后，同步清理旧的 Skill 文件。
for (const provider of ['claude', 'codex', 'cursor', 'agent-plugins']) {
  for (const file of await filesAt(path.join(root, 'providers', provider, 'plugin', 'skills'))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (output.has(relative)) continue;
    drift++;
    if (check) console.error(`已失效的生成文件： ${relative}`);
    else await unlink(file);
  }
}
if (check && drift) process.exitCode = 1;
else console.log(check ? '生成的插件与源文件一致。' : `插件同步完成（${drift} 个文件变更）。`);
