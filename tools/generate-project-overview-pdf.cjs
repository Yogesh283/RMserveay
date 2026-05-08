const fs = require('fs');
const path = require('path');

function esc(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

const lines = [
  'RM Survey Project Overview (Hindi Guide)',
  '',
  '1) Project ka main purpose',
  'Yeh platform do major roles handle karta hai: Member aur Publisher.',
  'Member side par user survey complete karke income streams unlock karta hai.',
  'Publisher side par survey create, responses track aur analytics dekhta hai.',
  '',
  '2) Tech stack short me',
  'Backend: Laravel + Sanctum auth + MySQL',
  'Frontend: React + Vite + Tailwind style utility classes',
  'Admin: Filament panel (custom path configured).',
  '',
  '3) User flow (Member)',
  'Register/Login -> Dashboard -> ID Activation -> Sub/Super Panels -> Team/Matching',
  'Wallet module: Main wallet, P2P wallet, deposit, withdraw, internal transfer.',
  'Transactions page me full ledger dikhta hai.',
  '',
  '4) Income structure',
  'Direct income: referral/sponsor based.',
  'Panel matching: left-right binary volume par based.',
  'Sub panel matching aur Super panel matching alag tiers me chalte hain.',
  'Level income: team depth logic ke through calculate hota hai.',
  '',
  '5) Team structure ka logic',
  'Do relations parallel chalti hain:',
  '- sponsor relation (kisne invite kiya)',
  '- binary relation (left/right tree placement)',
  'User table me sponsor_id, binary_parent_id, binary_side, left_child_id, right_child_id fields hain.',
  '',
  '6) Important APIs (example)',
  '/api/member/dashboard/summary',
  '/api/member/team/overview',
  '/api/member/wallet/overview',
  '/api/member/programme/self-survey/*',
  '/api/member/support-tickets',
  '',
  '7) Admin panel',
  'Filament admin me users, wallets, earnings, survey data, support tickets manage hote hain.',
  'Admin user detail me team tree visual check kiya ja sakta hai.',
  '',
  '8) Deployment flow',
  'Local commit/push -> Server git pull -> composer install -> npm build -> artisan cache commands.',
  'Typical commands: optimize:clear, config:cache, route:cache, migrate --force.',
  '',
  '9) Security & Ops notes',
  '- Production me APP_DEBUG=false rakho.',
  '- .env secrets ko public commit na karo.',
  '- storage/bootstrap cache permissions sahi hone chahiye.',
  '',
  '10) Current customization highlights',
  '- Member UI dark neon fintech theme me redesign.',
  '- More menu compact + referral copy/share support.',
  '- Panel pages (active/sub/super) ka visual alignment improve.',
  '',
  'Ye document quick understanding ke liye banaya gaya hai.',
];

const pageWidth = 595;
const pageHeight = 842;
const marginLeft = 40;
const topStart = 805;
const lineGap = 14;

const contentOps = [];
contentOps.push('BT');
contentOps.push('/F1 10 Tf');
contentOps.push(`1 0 0 1 ${marginLeft} ${topStart} Tm`);

for (let i = 0; i < lines.length; i += 1) {
  const line = esc(lines[i]);
  if (i === 0) {
    contentOps.push('/F1 13 Tf');
    contentOps.push(`(${line}) Tj`);
    contentOps.push('/F1 10 Tf');
  } else {
    contentOps.push(`0 -${lineGap} Td`);
    contentOps.push(`(${line}) Tj`);
  }
}

contentOps.push('ET');
const stream = contentOps.join('\n');

const objects = [];
objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
objects.push(
  `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`
);
objects.push(`4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj\n`);
objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

let pdf = '%PDF-1.4\n';
const offsets = [0];
for (const obj of objects) {
  offsets.push(Buffer.byteLength(pdf, 'utf8'));
  pdf += obj;
}

const xrefOffset = Buffer.byteLength(pdf, 'utf8');
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += '0000000000 65535 f \n';
for (let i = 1; i < offsets.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

const outPath = path.resolve(process.cwd(), 'RM_Survey_Project_Overview_Hindi.pdf');
fs.writeFileSync(outPath, pdf, 'binary');
console.log(`PDF generated: ${outPath}`);
