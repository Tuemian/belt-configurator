const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const outputFile = path.join(projectRoot, 'THIRD_PARTY_NOTICES.txt');

function runLicenseChecker() {
  const command = 'npx --yes license-checker --json --production';
  const result = spawnSync(command, {
    cwd: projectRoot,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `license-checker failed (exit ${result.status})`);
  }

  const raw = (result.stdout || '').replace(/^\uFEFF/, '').trim();
  if (!raw.startsWith('{') || !raw.endsWith('}')) {
    throw new Error('Unexpected output from license-checker');
  }

  return JSON.parse(raw);
}

function toEntries(report) {
  return Object.entries(report)
    .map(([key, value]) => {
      const atIndex = key.lastIndexOf('@');
      const name = atIndex > 0 ? key.slice(0, atIndex) : key;
      const version = atIndex > 0 ? key.slice(atIndex + 1) : '';
      return {
        name,
        version,
        license: value.licenses || 'UNKNOWN',
        repository: value.repository || '',
        publisher: value.publisher || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

function renderNotices(entries) {
  const lines = [];
  lines.push('THIRD PARTY NOTICES');
  lines.push('');
  lines.push('This file lists production third-party dependencies and their declared licenses.');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  for (const entry of entries) {
    lines.push(`Package: ${entry.name}`);
    lines.push(`Version: ${entry.version}`);
    lines.push(`License: ${entry.license}`);
    if (entry.repository) {
      lines.push(`Repository: ${entry.repository}`);
    }
    if (entry.publisher) {
      lines.push(`Publisher: ${entry.publisher}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const report = runLicenseChecker();
  const entries = toEntries(report);
  const content = renderNotices(entries);
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`Created THIRD_PARTY_NOTICES.txt with ${entries.length} entries.`);
}

main();
