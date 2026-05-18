import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoSrc = join(root, 'public', 'images', 'logo.png');
const assetsDir = join(root, 'assets');
const logoDest = join(assetsDir, 'logo.png');

if (!existsSync(logoSrc)) {
    console.error('Missing site logo at public/images/logo.png — add it, then re-run npm run cap:assets');
    process.exit(1);
}

mkdirSync(assetsDir, { recursive: true });
copyFileSync(logoSrc, logoDest);

const brandBg = '#0b0f1a';
const cmd = [
    'npx',
    '@capacitor/assets',
    'generate',
    '--android',
    `--iconBackgroundColor "${brandBg}"`,
    `--iconBackgroundColorDark "${brandBg}"`,
    `--splashBackgroundColor "${brandBg}"`,
    `--splashBackgroundColorDark "${brandBg}"`,
    '--logoSplashScale 0.35',
].join(' ');

execSync(cmd, { cwd: root, stdio: 'inherit', shell: true });
