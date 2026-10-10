import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

export function generatedAt(sourcePath, outputPath) {
  try {
    const committedAt = execFileSync('git', ['log', '-1', '--format=%cI', '--', sourcePath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    if (committedAt) return committedAt;
  } catch {
    // Fall back to the existing generated timestamp when git cannot provide one.
  }

  if (existsSync(outputPath)) {
    const content = readFileSync(outputPath, 'utf8');
    const match = content.match(/"generatedAt"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  }

  return new Date().toISOString();
}
