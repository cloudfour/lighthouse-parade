import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(repoRoot, 'dist', 'src', 'cli.js');

const { version } = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as { version: string };

/**
 * Runs the *built* CLI the same way a user would, rather than importing the
 * source. This is the only test that exercises the published entry point, so it
 * covers things importing `src/cli.ts` never would: that `tsc` emits a runnable
 * file, that `bin` points somewhere real, and that the `require('../../package.json')`
 * hop in cli.ts still resolves from inside `dist/src/`.
 */
const runCli = async (args: string[], cwd: string) => {
  try {
    const { stdout, stderr } = await execFileAsync('node', [cliPath, ...args], {
      cwd,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const failure = error as { stdout: string; stderr: string; code?: number };
    return {
      stdout: failure.stdout,
      stderr: failure.stderr,
      exitCode: failure.code ?? 1,
    };
  }
};

/**
 * Every case below exits during argument parsing, before any crawling starts,
 * so none of them need network access or Chrome. `cwd` is still pointed at a
 * temp directory because the CLI creates its data directory before validating
 * the glob flags.
 */
describe('lighthouse-parade CLI', () => {
  let tempDir: string;

  beforeAll(async () => {
    // CI only type-checks with `tsc --noEmit`, so nothing else in the suite
    // would notice if the real build broke.
    await execFileAsync('npm', ['run', 'build'], { cwd: repoRoot });
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lighthouse-parade-test-'));
  }, 180_000);

  // Npm symlinks node_modules/.bin straight at the built file, so without a
  // shebang the shell tries to run it and every install method except
  // `node path/to/cli.js` fails with `import: command not found`. The shebang
  // was dropped once already, in an unrelated import reorder, and nothing
  // noticed because no test ran the file as a binary.
  it('starts with a shebang so it can run as a binary', () => {
    const built = fs.readFileSync(cliPath, 'utf8');

    expect(built.split('\n', 1)[0]).toBe('#!/usr/bin/env node');
  });

  it('prints usage when asked for help', async () => {
    const { stdout, exitCode } = await runCli(['--help'], tempDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('lighthouse-parade <url> [dataDirectory]');
  });

  it('reports the version from package.json', async () => {
    const { stdout, exitCode } = await runCli(['--version'], tempDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain(version);
  });

  it('explains what is missing when no URL is given', async () => {
    const { stderr, exitCode } = await runCli([], tempDir);

    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/insufficient arguments/i);
  });

  it('refuses a URL it cannot parse', async () => {
    const { stderr, exitCode } = await runCli(['not-a-url'], tempDir);

    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/invalid url/i);
  });

  it('rejects a full URL passed to --include-path-glob', async () => {
    const { stderr, exitCode } = await runCli(
      ['https://example.com', '--include-path-glob', 'https://example.com/foo'],
      tempDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain(
      '--include-path-glob must be path(s), not full URL(s)',
    );
  });

  // Every case here runs through execFile, which is never a TTY — the same
  // condition a CI log or a redirect to a file creates.
  it('leaves no data directory behind when an argument is rejected', async () => {
    const cwd = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lighthouse-parade-cwd-'),
    );

    const { exitCode } = await runCli(
      ['https://example.com', '--include-path-glob', 'https://example.com/foo'],
      cwd,
    );

    expect(exitCode).not.toBe(0);
    expect(fs.readdirSync(cwd)).toEqual([]);
  });

  it('rejects a full URL passed to --exclude-path-glob', async () => {
    const { stderr, exitCode } = await runCli(
      ['https://example.com', '--exclude-path-glob', 'https://example.com/foo'],
      tempDir,
    );

    expect(exitCode).not.toBe(0);
    expect(stderr).toContain(
      '--exclude-path-glob must be path(s), not full URL(s)',
    );
  });
});
