import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sources = [
    join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
    join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
];
const destDir = join(root, 'public', 'downloads');
const dest = join(destDir, 'rm-survey-member.apk');

const src = sources.find((p) => existsSync(p));
if (!src) {
    console.error('No APK found. Build one in Android Studio first, then run this script again.');
    console.error('Expected paths:\n' + sources.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copied ${src}\n  → ${dest}`);
