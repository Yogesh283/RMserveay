# Member app — Android APK (Capacitor)

Ye project **user / member** side ko Android APK me pack karta hai: app WebView me aapki **live website** kholti hai (Laravel + React), isliye alag API server nahi chahiye.

## Stack

- **Capacitor 8** — `capacitor.config.json` + folder `android/`
- **Live URL** default: `https://rmsurveyai.com` (badalne ke liye neeche dekho)

## Pehle install (Windows)

1. [Node.js](https://nodejs.org/) (repo jaisa version)
2. [Android Studio](https://developer.android.com/studio) — Android SDK + platform tools
3. Is repo root:

```powershell
cd C:\xampp\htdocs\RAMSERVE
npm install
```

## Live URL set karein

Root file `capacitor.config.json` me:

```json
"server": {
  "url": "https://YOUR-DOMAIN.com",
  "androidScheme": "https",
  "cleartext": false
}
```

Phir sync:

```powershell
npm run cap:sync
```

## Android project kholna + APK banana

```powershell
npm run cap:open:android
```

Android Studio me:

1. **File → Sync Project with Gradle Files** (pehli baar)
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Debug APK path approx:  
   `android\app\build\outputs\apk\debug\app-debug.apk`

4. Website welcome page par download button ke liye APK copy karo:

```powershell
npm run cap:copy-apk
```

File `public\downloads\rm-survey-member.apk` banegi — home page par **Download Android app** dikhega (`/download/member-app`).

**Release / Play Store** ke liye signing config (keystore) Android Studio ke **Build → Generate Signed Bundle / APK** se lagao.

## Har baar deploy ke baad

Agar sirf `capacitor.config.json` / `capacitor-www` badla ho:

```powershell
npm run cap:sync
```

Phir Android Studio se dubara build karo.

## Note (cookies / login)

App same domain par session cookies use karti hai. Agar WebView me login nahi rehta:

- `.env` me `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `APP_URL` sahi hon
- HTTPS use ho (cleartext off hai)

## Local dev URL (optional)

Emulator se XAMPP test ke liye kuch setups `http://10.0.2.2:8000` use karte hain; us waqt `cleartext: true` + Android network security config chahiye — production ke liye HTTPS hi rakho.
