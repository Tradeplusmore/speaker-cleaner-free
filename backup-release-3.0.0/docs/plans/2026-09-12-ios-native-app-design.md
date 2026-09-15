# Design — App nativa iOS "Speaker Cleaner"

- Data: 2026-09-12
- Stato: approvato
- Progetto: speaker-cleaner-free (PWA esistente)
- Obiettivo: convertire la PWA in un'app iOS installabile su iPhone, sbloccando le funzioni non disponibili su Safari.

## Contesto e vincoli

- Sviluppo da **solo Windows**: nessun Mac, niente Xcode locale.
- **Nessun Apple Developer Account** al momento.
- Funzioni richieste dall'utente:
  1. Monetizzazione (StoreKit IAP).
  2. Esperienza nativa pulita (nessun Safari, permessi persistenti).
  3. Widget su Home Screen e comandi Siri.
  4. Riproduzione audio in background (schermo bloccato).
  5. Feedback aptico (vibrazione).

Limiti di piattaforma (impossibili anche per app native):
- Controllo del volume di sistema iOS.
- Selezione programmatica dell'uscita audio.
- Rilevamento certo dell'acqua nello speaker.

## Approccio scelto

**Capacitor**: riuso del 100% del codice web esistente (HTML/CSS/JS) dentro un guscio nativo `WKWebView`, con plugin nativi per le funzioni mancanti. Build compilata su un runner macOS cloud (GitHub Actions), installazione sul telefono tramite sideload (Sideloadly + Apple ID gratuito) o, in futuro, App Store/TestFlight con account a pagamento.

## Architettura

- **Cartella web (repo root)**: PWA v2.0.0 invariata (index.html, app.js, manifest.json, icone). Sorgente unica di verità.
- **Cartella `ios-app/`**: progetto Capacitor.
  - `www/` = copia generata degli asset web tramite `npm run build:web` (script `scripts/copy-web.mjs`).
  - `capacitor.config.ts`: appId `com.tradeplusmore.speakercleaner`, appName "Speaker Cleaner", webDir `www`.
  - Dipendenze: `@capacitor/core`, `@capacitor/ios`, `@capacitor/haptics`; dev: `@capacitor/cli`, `@capacitor/assets`.
  - Cartella `ios/` **non committata**: generata in CI da `npx cap add ios`, poi configurata dallo script `scripts/configure-ios.mjs` e sincronizzata con `npx cap sync ios`.
  - `assets/icon.png` (1024x1024): generate icone/splash native con `@capacitor/assets`.
- **Plugin nativi**:
  - `@capacitor/haptics` → feedback aptico.
  - Configurazione `AVAudioSession` categoria `.playback` in `AppDelegate` (audio in background) + `UIBackgroundModes = [audio]` in Info.plist, applicati da `configure-ios.mjs`.

## Integrazione col web

- In `app.js` (root, sorgente unica):
  - `const isNative = !!window.Capacitor`.
  - In modalità nativa: banner install/dispositivo nascosti, aptica attiva, Wake Lock saltato (inutile col background audio).
  - Helper `haptic(style)` che invoca `Capacitor.Plugins.Haptics` se presente, altrimenti no-op.
- Il motore audio WebAudio (token/fade) resta identico e gira nel WKWebView.
- Nota onesta: i timer JS si sospendono in background; un tono singolo continua a suonare a schermo bloccato, le sequenze multi-fase (Deep Clean) mettono in pausa il passaggio di fase finché l'app torna in foreground.

## Pipeline di build (da Windows)

1. GitHub Actions `ios-build.yml` su runner `macos-14` (Xcode incluso):
   - `npm ci` → `npm run build:web` → `npx cap add ios` → `node scripts/configure-ios.mjs` → `npx @capacitor/assets generate --ios` → `npx cap sync ios`.
   - `xcodebuild` con `CODE_SIGNING_ALLOWED=NO` (build unsigned).
   - Packaging dell'`.app` in `Payload/` → `.ipa` unsigned.
   - Upload dell'`.ipa` come artefatto GitHub.
2. L'utente scarica l'`.ipa` da Windows e lo installa con **Sideloadly + Apple ID gratuito** (ri-firma ogni 7 giorni). Con account pagato: TestFlight/App Store.

## Monetizzazione (Fase 2, separata)

- IAP non-consumable "Speaker Cleaner Pro" tramite RevenueCat o StoreKit2.
- Richiede Apple Developer Account a pagamento + App Store Connect.
- Non implementato in questa fase; il design resta pronto.

## Widget e Siri (Fase 3, separata)

- Estensione nativa SwiftUI: widget con avvio rapido Water Eject + App Intents per Siri.
- Richiede un target nativo aggiuntivo nel progetto Xcode; gestibile dal build cloud.

## Error handling e test

- Fallback web: senza `window.Capacitor` nessuna funzione crasha (guardie esistenti).
- Test locali: `node --check app.js`, validazione JSON, `npx cap add/sync` su Windows per generare/validare.
- Test sul dispositivo: aptica, background audio a schermo spento, permesso microfono, tutte le 6 schede, installazione via Sideloadly.

## Deliverable Fase 1

- `docs/plans/2026-09-12-ios-native-app-design.md` (questo file).
- `docs/INSTALL-IPHONE.md`: guida sideload.
- `ios-app/`: progetto Capacitor completo.
- `.github/workflows/ios-build.yml`: build .ipa.
- Aggiornamenti a `app.js`, `README.md`, `CHANGELOG.md`.