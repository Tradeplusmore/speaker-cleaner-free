# Installare l'app su iPhone (sideload)

Questa guida spiega come installare l'app nativa **Speaker Cleaner** sul tuo iPhone senza App Store, partendo da un PC Windows e un Apple ID gratuito.

## Cos'e l'.ipa

L'app e compilata in cloud (GitHub Actions su macOS) e viene consegnata come file `.ipa` non firmato. Il sideload serve a firmarla con il tuo Apple ID e installarla sul telefono.

## Prerequisiti

- iPhone con iOS 16.4 o superiore.
- PC Windows.
- **Apple ID** (gratuito, qualsiasi).
- [iTunes](https://www.apple.com/it/itunes/) e [iCloud](https://support.apple.com/it-it/HT204283) per Windows (necessari per Sideloadly).
- [Sideloadly](https://sideloadly.io/) (gratuito).

## Passi

1. **Scarica l'.ipa**
   - Apri il repository su GitHub.
   - Scheda **Actions** → workflow **iOS Build** → esegui "Run workflow" (o apri l'ultimo run).
   - Nella sezione **Artifacts** in fondo, scarica `SpeakerCleaner-ios`.
   - Estrai l'archivio: dentro c'e `SpeakerCleaner.ipa`.

2. **Prepara il telefono**
   - Apri Impostazioni → Generali → VPN e gestione dispositivi → fidati dello sviluppatore quando richiesto.
   - Collega l'iPhone al PC via cavo e scegli "Fidati di questo computer".

3. **Installa Sideloadly**
   - Installa Sideloadly sul PC e aprilo.
   - Inserisci il tuo Apple ID e la password quando richiesto.

4. **Firma e installa**
   - Trascina `SpeakerCleaner.ipa` nella finestra di Sideloadly.
   - Scegli il tuo iPhone come dispositivo di destinazione.
   - Clicca **Start**.
   - Se richiesto, inserisci un codice di verifica a 6 cifre inviato dall'Apple ID.

5. **Apri l'app**
   - Sull'iPhone troverai l'icona **Speaker Cleaner**.
   - Al primo avvio: Impostazioni → Generali → VPN e gestione dispositivi → **Fidati** dello sviluppatore.

## Limitazioni del sideload con account gratuito

- L'app scade dopo **7 giorni** e va ri-firmata ripetendo i passi 3-4.
- Massimo **3 app** firmate con lo stesso Apple ID.
- Nessuna notifica push remota (non necessaria per quest'app).

## Passare a firma annuale / App Store

Con un [Apple Developer Program](https://developer.apple.com/programs/) ($99/anno):

- La firma dura 1 anno, niente ri-firma ogni 7 giorni.
- Distribuzione via **TestFlight** o **App Store** per chiunque.
- Sblocca le funzioni di monetizzazione (acquisti in-app) e widget/Siri.

Se vuoi procedere su questa strada, il progetto e gia pronto: basta configurare la firma nel workflow GitHub Actions e aggiungere l'account Apple Developer ai segreti del repository.