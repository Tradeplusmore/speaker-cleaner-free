# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/) e il versionamento segue [Semver](https://semver.org/).

## [3.0.0] - 2026-09-12

### Added

- Progetto Capacitor in `ios-app/` per la conversione della PWA in app nativa iOS.
- Feedback aptico (Core Haptics) in modalita nativa: avvio pulizia, stop e salvataggio preset.
- Audio in background a schermo bloccato tramite configurazione `AVAudioSession` in categoria playback.
- Rilevamento dell'ambiente nativo (`window.Capacitor`) con fallback completo al browser.
- Pipeline GitHub Actions `ios-build.yml` che compila l'.ipa in cloud su macOS, senza Mac locale.
- Guida di installazione via sideload in `docs/INSTALL-IPHONE.md`.
- Documento di design dell'app nativa in `docs/plans/`.

### Changed

- `app.js`: introdotto `isNative` e helper `haptic`/`hapticNotify` (no-op nel browser).
- `README.md`: sezione dedicata all'app nativa e alla struttura aggiornata.

## [2.0.0] - 2026-09-11

### Added

- Navigazione a sei schede: Home, Clean, Test, Lab, Dati e Opzioni.
- Motore audio unificato e cancellabile con fade in/out anti-click e stop affidabile.
- Controllo del volume interno persistente, indipendente dai tasti fisici di iOS.
- Modale di sicurezza pre-avvio con conferma di assenza di cuffie o AirPods.
- Preset Water Eject a 150, 165, 180 e 200 Hz, sweep adattivo 150-230 Hz e modalita Pulse a 165 Hz.
- Test a canale alternato L/R e sweep di risposta per bassi, medi e alti.
- Hearing self-check da 250 Hz a 8 kHz con avviso che non e un test medico.
- Laboratorio audio: generatore di toni continuo, rumore white/pink/brown, sweep configurabile e metronomo 40-240 BPM.
- Analizzatore live da microfono con oscilloscopio, spettro FFT, lettura RMS in dBFS e frequenza dominante.
- Preset personalizzati salvabili, cronologia delle sessioni e backup export/import in JSON.
- Pulsante di aggiornamento della PWA con svuotamento della cache.
- Screen Wake Lock durante la riproduzione per evitare lo spegnimento dello schermo su iPhone.
- Rilevamento del dispositivo con avviso su hardware non iPhone.
- Istruzioni di installazione iOS (Condividi, poi Aggiungi a Home).

### Changed

- Interfaccia ridisegnata in stile minimal Apple, senza emoji e con colori di sistema iOS.
- Misura del microfono riclassificata come indicatore ambientale onesto, non come diagnostica dello speaker.
- Logica JavaScript estratta in app.js separato dal documento HTML.
- Cache del service worker aggiornata a v6 con fallback offline e filtro delle richieste non-GET.

### Fixed

- manifest.json riscritto come JSON valido dopo che l'array delle icone era stato chiuso con un oggetto icona orfano.
- Timer delle sequenze Deep Clean protetti dall'annullamento durante lo stop.

### Removed

- Modalita AirPods e Bluetooth, perche l'uscita audio non e selezionabile via web ed e solo di sistema.
- Funzione Auto Repair, sostituita da Deep Clean.
- Diagnostica microfono con esito automatico sullo stato dello speaker.

## [1.0.0] - 2026-08-01

### Added

- Versione iniziale single-page con Water Eject, Dust Sweep, Pink Noise, Bass Clean, Quick e Deep Clean.
- Frequenza personalizzata con selezione della forma d'onda e test canali sinistro e destro.
- Registrazione della PWA tramite service worker e manifest.