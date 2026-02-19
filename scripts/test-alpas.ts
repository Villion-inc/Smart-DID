/**
 * ALPAS API 테스트 실행 래퍼
 * lib-mvp 루트에서: npx tsx scripts/test-alpas.ts
 * → library-did-main/packages/backend 쪽 스크립트를 실행합니다.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '../library-did-main/packages/backend');

const r = spawnSync('npx', ['tsx', 'scripts/test-alpas.ts'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});
process.exit(r.status ?? 1);
