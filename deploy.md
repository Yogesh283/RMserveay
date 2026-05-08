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

---

## 1) Local (Windows PowerShell): Git push

### 1.1 Remote check

```powershell
git status
git remote -v
```

If remote is missing/wrong:

```powershell
git remote add origin "REPO_URL"
```

### 1.2 Branch ensure `main`

```powershell
git branch
git checkout -b main
```

If you already have commits on another branch, you can switch:

```powershell
git checkout main
```

### 1.3 Commit & push

```powershell
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

```bash
git fetch --all
git checkout main
git pull --ff-only origin main
```

---

## 3) Install dependencies + build (Laravel + Vite)

### 3.1 PHP / Composer

```bash
composer install --no-interaction --prefer-dist --optimize-autoloader
```

### 3.2 Node / Vite build

Root me `package.json` present hai, isliye yahin se build:

```bash
npm ci
npm run build
```

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
php artisan route:cache
```

### 4.5 Storage link (if needed)

```bash
php artisan storage:link
```

---

## 5) Permissions (important)

PHP-FPM jo user se chalta hai (often `www-data`, kabhi hosting user `rmsurveyai`), **usi user ko `storage/` + `bootstrap/cache` par write chahiye**.  
Galat ownership se ye errors aate hain:

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

Agar aap codebase ko `rmsurveyai` user se own karna chahte ho lekin PHP-FPM `www-data` hai, tab **same group + setgid directory** sensible hota hai (example):

```bash
sudo chown -R rmsurveyai:www-data "/home/rmsurveyai/htdocs/rmsurveyai.com"
sudo chmod -R ug+rwX "/home/rmsurveyai/htdocs/rmsurveyai.com/storage" "/home/rmsurveyai/htdocs/rmsurveyai.com/bootstrap/cache"
sudo find "/home/rmsurveyai/htdocs/rmsurveyai.com/storage" "/home/rmsurveyai/htdocs/rmsurveyai.com/bootstrap/cache" -type d -exec chmod g+s {} \;
sudo usermod -aG www-data rmsurveyai   # sirf zarurat ho to
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

## Notes

1. Agar deploy ke baad `/api/user` par **401 Unauthorized** aa raha ho, mostly issue hota hai:
   - `APP_URL` wrong
   - `SANCTUM_STATEFUL_DOMAINS` missing/mismatch
   - session cookie `SESSION_DOMAIN` / `SESSION_SECURE_COOKIE` mismatch
2. Frontend changes show nahi ho rahe ho to server pe `npm run build` confirm karein (Vite `public/build/manifest.json` generate hota hai).

3. `tempnam()` / Blade compile error aaye to `storage/framework/views` writable hai ya nahi verify karo, aur codebase me `bootstrap/runtime.php` project ke `storage/tmp` ko `TMPDIR` set karta hai — deploy/pull ke baad permissions phir match karo.













git -c safe.directory=/home/rmsurveyai/htdocs/rmsurveyai.com pull --ff-only origin main && composer install --no-interaction --prefer-dist --optimize-autoloader && npm ci && npm run build && php artisan migrate --force && php artisan optimize:clear && php artisan config:cache && php artisan route:cache && php artisan storage:link





git fetch --all
git checkout main
git pull --ff-only origin main




cd /home/rmsurveyai/htdocs/rmsurveyai.com
git pull --ff-only origin main
php artisan optimize:clear
php artisan config:cache
php artisan route:cache