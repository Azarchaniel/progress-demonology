import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

await build({ entryPoints: ['tests/game.test.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: '.test-build/game.test.mjs' });
const result = spawnSync(process.execPath, ['--test', '.test-build/game.test.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
