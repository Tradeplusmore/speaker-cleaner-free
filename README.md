# Speaker Cleaner Free

PWA gratuita per pulire e testare gli speaker dell'iPhone con toni calibrati: Water Eject, Dust Sweep, test dei canali e laboratorio audio.

## Installazione su iPhone

1. Apri il sito in Safari.
2. Tocca il pulsante Condividi.
3. Scegli Aggiungi a Home.

Tutto funziona interamente in locale: nessun dato lascia il dispositivo.

## Chiavi della lettura

- Water Eject: toni intorno ai 150-200 Hz che aiutano a smuovere acqua superficiale.
- Dust Sweep: sweep 100 Hz - 1 kHz per residui leggeri.
- Test e Lab: test canali, sweep di risposta, generatore di toni e analizzatore microfono.

## Struttura del progetto

- `index.html`: interfaccia e stili.
- `app.js`: logica audio e gestione dello stato.
- `sw.js`: service worker per la cache offline.
- `manifest.json`: metadati di installazione della PWA.

## Note

Una PWA non puo conoscere il percorso audio di sistema, controllare il volume iOS, ne usare vibrazione, Siri o widget. Questi toni aiutano con acqua superficiale o residui leggeri, ma non riparano danni da liquidi, corrosione, sale o membrane rovinate.