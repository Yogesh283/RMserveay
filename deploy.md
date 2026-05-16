# Deployment (Local -> GitHub -> Server via SSH)

Yeh guide aapko **local Windows** se **GitHub push** karna aur phir **live server** par **SSH** ke through **git pull** karke deploy karna sikhata hai.

---

## 0) Variables set karein (placeholders)

Replace these values everywhere:

- `REPO_URL`: `https://github.com/Yogesh283/RMserveay.git`  (ya `git@github.com:...` if you use SSH)
- `BRANCH`: `main`
- `SERVER_USER`: `rmsurveyai` (apne server user name se replace)
- `SERVER_HOST`: `rmsurveyai.com` (apne server host/IP se replace)
- `SERVER_DIR`: `/home/rmsurveyai/htdocs/rmsurveyai.com` (apne live path se replace)
- `LOCAL_DIR` (PowerShell): `C:\xampp\htdocs\RAMSERVE`
- `LOCAL_DIR` (Git Bash): `/c/xampp/htdocs/RAMSERVE` — **forward slashes**, backslash mat use karein

> **Git Bash:** `cd C:\xampp\...` galat hai — `\x`, `\h` escape ho jate hain aur error `C:xampphtdocsRAMSERVE` aata hai. Hamesha `cd /c/xampp/htdocs/RAMSERVE` use karein.

---

## 1) Local (Windows): Git push

### 1.1 Remote check

**Git Bash (MINGW64):**

```bash
cd /c/xampp/htdocs/RAMSERVE
git status
git remote -v
```

**PowerShell:**

```powershell
cd "C:\xampp\htdocs\RAMSERVE"
git status
git remote -v
```

If remote is missing/wrong:

```bash
git remote add origin "REPO_URL"
```

### 1.2 Branch ensure `main`

```bash
git branch
git checkout -b main
```

If you already have commits on another branch, you can switch:

```bash
git checkout main
```

### 1.3 Commit & push

**Git Bash:**

```bash
cd /c/xampp/htdocs/RAMSERVE
git add .
git commit -m "Update for deployment (YYYY-MM-DD)"
git pull origin main --rebase
git push -u origin main
```

**PowerShell:**

```powershell
cd "C:\xampp\htdocs\RAMSERVE"
git add .
git commit -m "Update for deployment (YYYY-MM-DD)"
git pull origin main --rebase
git push -u origin main
```

> If `git pull origin main` ke time conflict aaye, usko resolve karke phir push karein.

---

## 2) Server (SSH): Deploy using `git pull`

### 2.1 SSH into server

```powershell
ssh SERVER_USER@SERVER_HOST
```

### 2.2 Go to deploy directory

```bash
cd "SERVER_DIR"
```

### 2.2.1 Remote URL check (agar zarurat ho)

```bash
git remote -v
git remote set-url origin "REPO_URL"
```

### 2.3 Pull latest code

`public/storage` pehle se **symlink** ho ( `php artisan storage:link` ) to `git pull` fail ho sakta hai: *untracked working tree files would be overwritten by merge: public/storage*.

**Pehle `public/storage` hatao, pull karo, phir dubara link banao:**

```bash
cd /home/rmsurveyai/htdocs/rmsurveyai.com
# Symlink: rm -f kaafi. Folder ho to pehle uploads copy karo, phir rm -rf:
# cp -a public/storage/. storage/app/public/ 2>/dev/null || true
rm -rf public/storage
git fetch --all
git checkout main
git pull --ff-only origin main
```

> `rm -rf public/storage` sirf `public/storage` entry hataata hai — asli uploads `storage/app/public` me honi chahiye. Agar pehle galat folder bana tha, upar wala `cp -a` ek baar chalao.

---

## 2.4) Ek hi command — `scripts/deploy-live.sh` (recommended)

Repo me ye script hai: **`scripts/deploy-live.sh`**. Ye ek sequence chalata hai:

`git pull` → `composer install --no-dev` → `npm ci` + `npm run build` → `migrate` → cache clear / `config:cache` / `route:clear` → `storage:link` — aur **`public/hot`** hata deta hai (Vite dev flag).

**Server par (hosting user se, root se nahi):**

```bash
cd /home/rmsurveyai/htdocs/rmsurveyai.com
chmod +x scripts/deploy-live.sh   # sirf pehli baar
bash scripts/deploy-live.sh
```

Agar server PHP lockfile se chhota ho / platform warning aaye:

```bash
COMPOSER_IGNORE_PLATFORM_REQS=1 bash scripts/deploy-live.sh
```

Sirf backend / Composer, bina frontend build:

```bash
SKIP_NPM=1 bash scripts/deploy-live.sh
```

**Windows se SSH — ek line:**

```powershell
ssh rmsurveyai@rmsurveyai.com "cd /home/rmsurveyai/htdocs/rmsurveyai.com && bash scripts/deploy-live.sh"
```

> Agar aap hamesha `sudo -u rmsurveyai` use karte ho:  
> `sudo -u rmsurveyai -H bash -lc 'cd /home/rmsurveyai/htdocs/rmsurveyai.com && bash scripts/deploy-live.sh'`

---

## 3) Install dependencies + build (Laravel + Vite)

### 3.1 PHP / Composer

Server PHP version check:

```bash
php -v
```

`composer.lock` agar **PHP 8.4+** packages lock karta ho aur server **8.2** ho to ya to server PHP **8.4** par upgrade karo (recommended), ya temporary:

```bash
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev --ignore-platform-reqs
```

**Root se mat chalao** — hosting user se chalao (warning avoid):

```bash
sudo -u rmsurveyai -H bash -lc 'cd /home/rmsurveyai/htdocs/rmsurveyai.com && composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev'
```

Agar root se hi karna ho:

```bash
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev --ignore-platform-reqs
```

### 3.2 Node / Vite build

Root me `package.json` present hai, isliye yahin se build:

```bash
rm -f public/hot
npm ci
npm run build
```

> **`public/hot`** = local Vite dev server (`npm run dev`). Agar yeh file production par rahe to browser `http://localhost:5173` se load karega → CORS error. Deploy par **hamesha delete** karo.

---

## 4) Laravel commands

### 4.1 Make sure `.env` exists

If `.env` server pe already set hai, usko overwrite na karein.

Common way (if needed):

```bash
cp -n .env.example .env
```

Then `.env` me ensure karo:
- `APP_URL`
- `DB_*`
- `SESSION_*`
- `SANCTUM_STATEFUL_DOMAINS` (agar login ke time `/api/user` 401 aa raha hai)

### 4.2 Key (only if missing)

```bash
php artisan key:generate --force
```

### 4.3 Migrate

```bash
php artisan migrate --force
```

### 4.4 Cache clear + cache warm

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:clear
```

> **Filament / Livewire:** `php artisan route:cache` mat chalao — stale cache se `Route [filament.admin.pages.*] not defined` aa sakta hai. Sirf `route:clear` + `config:cache` use karo.

### 4.5 Storage link (if needed)

Pehle purana link/folder hatao, phir link banao:

```bash
rm -rf public/storage
php artisan storage:link
ls -la public/storage
```

Expected: `public/storage -> .../storage/app/public`

---

## 5) Permissions (important)

PHP-FPM jo user se chalta hai (often `www-data`, kabhi hosting user `rmsurveyai`), **usi user ko `storage/` + `bootstrap/cache` par write chahiye**.  
Galat ownership se ye errors aate hain:

- **`vendor/autoload.php: Permission denied`** → browser **HTTP 500**, lekin `php artisan` / tinker **200** (CLI `rmsurveyai`, web `www-data`)
- `file_put_contents(... storage/framework/sessions ...): Permission denied`
- Blade / Livewire par `tempnam(): file created in the system's temporary directory` → HTTP 500

Pehle FPM user confirm karo (example):

```bash
grep -E '^user\s*=' /etc/php/*/fpm/pool.d/www.conf 2>/dev/null | head
```

Fir owner set karo (example: Ubuntu / `www-data`):

```bash
sudo chown -R www-data:www-data "/home/rmsurveyai/htdocs/rmsurveyai.com/storage" "/home/rmsurveyai/htdocs/rmsurveyai.com/bootstrap/cache"
sudo chmod -R ug+rwX "/home/rmsurveyai/htdocs/rmsurveyai.com/storage" "/home/rmsurveyai/htdocs/rmsurveyai.com/bootstrap/cache"
```

Agar PHP-FPM **`www-data`** hai aur project **`rmsurveyai`** own karta hai (recommended):

```bash
cd /home/rmsurveyai/htdocs/rmsurveyai.com
# Parent dirs: www-data ko traverse allow (home often 750 hota hai)
chmod 711 /home/rmsurveyai /home/rmsurveyai/htdocs 2>/dev/null || true
chown -R rmsurveyai:www-data .
chmod -R ug+rX .
chmod -R 775 storage bootstrap/cache
chmod 640 .env
```

Verify (www-data jaisa read):

```bash
sudo -u www-data test -r vendor/autoload.php && echo "vendor OK" || echo "vendor FAIL"
curl -sI https://rmsurveyai.com | head -1
```

> Root se `composer` / `php artisan` chalane par newly created files `root:root` ho sakti hain — isliye deploy ke baad `chown` dubara zaroor check karo.

Typical shortcut (sirf tab jab FPM user = `rmsurveyai`):

```bash
sudo chown -R rmsurveyai:rmsurveyai "/home/rmsurveyai/htdocs/rmsurveyai.com"
sudo chmod -R 775 "/home/rmsurveyai/htdocs/rmsurveyai.com/storage" "/home/rmsurveyai/htdocs/rmsurveyai.com/bootstrap/cache"
```

---

## 6) Restart services (server specific)

```bash
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
```

> Agar `systemctl` available nahi hai ya php-fpm ka name different hai, server ke hisaab se adjust karein.

---

## 7) Quick rollback

```bash
git log --oneline -5
git checkout <commit_hash>
```

---

## 8) Fix: `Could not delete vendor/...` + `composer.lock` pull conflict

**Cause:** Pehle `composer` / `php artisan` **root** se chala → `vendor/` files `root:root`; `rmsurveyai` uninstall nahi kar pata. Server par `composer.lock` edit ho gaya → `git pull` block.

**Server (copy-paste order):**

```bash
cd /home/rmsurveyai/htdocs/rmsurveyai.com

# 1) Ownership — poora project hosting user ko
chown -R rmsurveyai:rmsurveyai .

# 2) Server-side composer.lock changes hatao, GitHub se lo
git checkout -- composer.lock
git pull --ff-only origin main

# 3) Broken vendor hatao (root ya rmsurveyai — chown ke baad dono chalenge)
rm -rf vendor

# 4) Fresh install — hamesha rmsurveyai user se (root mat)
sudo -u rmsurveyai -H bash -lc 'cd /home/rmsurveyai/htdocs/rmsurveyai.com && composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev'

# 5) Laravel cache (rmsurveyai se)
sudo -u rmsurveyai -H bash -lc 'cd /home/rmsurveyai/htdocs/rmsurveyai.com && php artisan optimize:clear && php artisan config:cache && php artisan route:clear'
```

> Naya `composer.lock` (PHP 8.2) GitHub par ho to step 4 me `--ignore-platform-reqs` ki zarurat nahi. Purana lock ho to: `composer install ... --ignore-platform-reqs`

---

## Notes

1. **`Route [filament.admin.pages.admin-dashboard] not defined`** — `php artisan route:clear` ( **`route:cache` mat use karo** Filament ke saath). Ensure `app/Filament/Admin/Pages/AdminDashboard.php` deployed hai.
2. **`git pull` error: `public/storage` would be overwritten** — Section 2.3 dekho: `rm -rf public/storage` → pull → `php artisan storage:link` (Section 4.5 ke baad).
3. Agar deploy ke baad `/api/user` par **401 Unauthorized** aa raha ho, mostly issue hota hai:
   - `APP_URL` wrong
   - `SANCTUM_STATEFUL_DOMAINS` missing/mismatch
   - session cookie `SESSION_DOMAIN` / `SESSION_SECURE_COOKIE` mismatch
4. Frontend changes show nahi ho rahe ho to server pe `npm run build` confirm karein (Vite `public/build/manifest.json` generate hota hai).

5. `tempnam()` / Blade compile error aaye to `storage/framework/views` writable hai ya nahi verify karo, aur codebase me `bootstrap/runtime.php` project ke `storage/tmp` ko `TMPDIR` set karta hai — deploy/pull ke baad permissions phir match karo.

*(Quick deploy: section **2.4** — `bash scripts/deploy-live.sh`.)*




# === LIVE: Binary closing — sab scopes (active + sub + super) ===

# Aaj ki closing (sab 3 scopes ek saath)
php artisan binary:daily-closing --date=today

# Yesterday ki (default cron behaviour, scopes=all)
php artisan binary:daily-closing


# === Scope-specific runs ===

# Sirf active panel ($1/pair, max 20/day)
php artisan binary:daily-closing --scope=active_panel --date=today

# Sirf sub panel (milestone tier $2/$4/$8/$16/...; excess LAPSE)
php artisan binary:daily-closing --scope=panel --date=today

# Sirf super sub panel (milestone × 10: $20/$40/$80/$160/...; excess LAPSE)
php artisan binary:daily-closing --scope=super --date=today


# === Specific date ===
php artisan binary:daily-closing --date=2026-05-08
php artisan binary:daily-closing --scope=active_panel --date=2026-05-08


# === Sirf report dekhna (no work, just the audit table) ===
php artisan binary:daily-closing --date=today --report
php artisan binary:daily-closing --scope=active_panel --date=today --report






# Sub aur super carries change kiye, dobara closing chala — simple
php artisan binary:daily-closing --scope=panel --date=today
# Carries adjust kiye, fir
php artisan binary:daily-closing --scope=panel --date=today      # phir chal jayega
php artisan binary:daily-closing --scope=super --date=today
php artisan binary:daily-closing --scope=active_panel --date=today







FILAMENT_ADMIN_EMAILS=support@rmsurveyai.com
FILAMENT_ADMIN_LOGIN_UIDS=admin001