#!/usr/bin/env node
/**
 * 一键打包 VSIX 脚本
 * 用法：node scripts/package.js
 *
 * 流程：
 *   1. 检查依赖，缺失则自动 npm install
 *   2. 执行 build（YAML -> JSON）
 *   3. 执行 vsce package
 *   4. 验证产物
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'themes-falcon-vscode.vsix');

function log(tag, msg) {
  console.log(`[${tag}] ${msg}`);
}

function step(n, total, name) {
  console.log(`\n━━━ Step ${n}/${total}: ${name} ━━━`);
}

function run(command, args, opts = {}) {
  log('exec', `${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false, // 关键：不走 shell，避免 .ps1 执行策略拦截
    ...opts,
  });
  if (result.status !== 0) {
    console.error(`\n✗ 执行失败 (exit code ${result.status})`);
    process.exit(result.status || 1);
  }
  return result;
}

// ── Step 1: 检查 Node.js ──────────────────────────────────
step(1, 4, '检查 Node.js 环境');
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  log('ok', `Node.js v${process.versions.node}`);
} else {
  console.error('✗ 无法检测 Node.js 版本');
  process.exit(1);
}

// ── Step 2: 检查/安装依赖 ──────────────────────────────────
step(2, 4, '检查 npm 依赖');
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const hasNodeModules = fs.existsSync(path.join(ROOT, 'node_modules'));
const hasVsce = fs.existsSync(path.join(ROOT, 'node_modules', 'vsce', 'out', 'main.js'));
const hasJsYaml = fs.existsSync(path.join(ROOT, 'node_modules', 'js-yaml'));

if (!hasNodeModules || !hasVsce || !hasJsYaml) {
  log('info', '依赖不完整，开始安装…');
  // 用 node 直接调 npm-cli.js，绕开 npm.cmd / npm.ps1
  const npmCli = findNpmCli();
  if (!npmCli) {
    // 退而求其次走 .cmd
    run('npm.cmd', ['install']);
  } else {
    run(process.execPath, [npmCli, 'install']);
  }
} else {
  log('ok', '依赖已就绪');
}

function findNpmCli() {
  const candidates = [
    // 常见全局安装路径
    path.join(process.execPath.replace(/node\.exe$/, 'node_modules'), 'npm', 'bin', 'npm-cli.js'),
    path.join(process.execPath.replace(/node$/, ''), 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    // AppData
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  return candidates.find(p => fs.existsSync(p));
}

// ── Step 3: 打包 VSIX（vsce 会自动触发 prepublish → npm run build）─
step(3, 3, '构建 + 打包 VSIX');
// 必须走 .cmd shim：node 直接调 vsce/out/main.js 在 Windows 下会静默退出
// vsce.cmd 自带 prepublish 钩子，自动先跑 build 再打包
const vsceCmd = path.join(ROOT, 'node_modules', '.bin', 'vsce.cmd');
if (!fs.existsSync(vsceCmd)) {
  console.error(`✗ vsce.cmd 不存在: ${vsceCmd}`);
  process.exit(1);
}
// 删旧文件，避免 vsce 拒绝覆盖导致的静默问题
if (fs.existsSync(OUTPUT)) {
  log('info', '删除旧 VSIX 避免覆盖冲突…');
  fs.unlinkSync(OUTPUT);
}
run(vsceCmd, ['package', '-o', OUTPUT]);

// ── 验证产物 ────────────────────────────────────────────────
console.log('\n━━━ 验证产物 ━━━');
if (fs.existsSync(OUTPUT)) {
  const stat = fs.statSync(OUTPUT);
  const sizeMB = (stat.size / 1024 / 1024).toFixed(2);
  log('ok', `VSIX 生成成功: ${path.relative(ROOT, OUTPUT)} (${sizeMB} MB)`);
} else {
  console.error('✗ VSIX 文件未生成');
  process.exit(1);
}

console.log('\n✓ 全部完成！');
console.log(`  → 在 Trae CN / VS Code 扩展面板点「…」→ 「从 VSIX 安装…」选择该文件即可`);
