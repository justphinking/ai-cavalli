# Ai cavalli!

Pannello sonoro per raccontare storie. È una web app: si apre da un link e si può aggiungere alla schermata Home del telefono come un'app.

## Metterla online (GitHub + Vercel)

1. **GitHub**: crea un nuovo repository (anche privato), per esempio `ai-cavalli`.
   Nella pagina del repository vuoto scegli *uploading an existing file* e trascina **tutto il contenuto** di questa cartella (non la cartella stessa). Conferma con *Commit changes*.
2. **Vercel**: *Add New → Project*, scegli il repository `ai-cavalli`, poi *Deploy*.
   Non serve cambiare impostazioni: le legge da `vercel.json`.
3. Dopo un minuto Vercel ti dà l'indirizzo (tipo `ai-cavalli.vercel.app`). Aprilo sul telefono.
4. **Icona sulla Home**
   - iPhone (Safari): tasto Condividi → *Aggiungi alla schermata Home*.
   - Android (Chrome): menu ⋮ → *Aggiungi a schermata Home* / *Installa app*.

Da qui in poi, ogni modifica caricata su GitHub viene pubblicata da Vercel in automatico.

## Inserire i suoni

Tutti i suoni stanno nella cartella `audio/`. Ogni sottocartella contiene un file `LEGGIMI.txt` che spiega cosa ci va.

```
audio/
  ambiente/                                                → 1 clip in loop (schermata iniziale, saloon)
  cavalli/                                                 → 2 clip: 1 = tocco, 2 = tenuto premuto / ingresso nella storia
  musiche/avventura, suspense, love, comedy, calma, triste   → 3 clip ciascuna, in loop
  accenti/taglio, drama, crescendo                         → 1 clip ciascuna
  accenti/battuta                                          → 3 clip
  extra/                                                   → tutte le clip che vuoi, per i 4 tasti "?"
```

- Formati: mp3, m4a, aac, wav, ogg. Nomi liberi (tranne in `cavalli`, dove i file si chiamano 1 e 2).
- Se una cartella è vuota, l'app usa un suono segnaposto.
- Per caricare o sostituire un file dal sito di GitHub: entra nella cartella → *Add file → Upload files* → trascina → *Commit changes*. Dopo circa un minuto l'app aggiornata è online.
- Per i loop (ambiente e musiche) usa il WAV 44.100 Hz 16 bit, tagliato sui passaggi per lo zero.

## Testi dell'Aiutino

Stanno nel file `aiutini.txt`, una frase per riga. Si modifica da GitHub: apri il file → icona della matita → scrivi → *Commit changes*.

## Registrazioni per il Jolly

Si registrano **direttamente sul telefono**, dal pulsante con il microfono in alto a destra nella schermata iniziale. Restano solo su quel telefono, fino a 50.

Attenzione: se si cancellano i dati del sito dal browser, le registrazioni si perdono.

## Come funziona

**Schermata iniziale (saloon)**
- Al primo tocco sullo schermo parte l'ambiente in loop (i browser non lasciano partire l'audio da soli).
- **Aiutino**: mostra una frase a caso dall'archivio. Si può usare una volta; la frase resta finché non si entra nella storia.
- **Ai cavalli!**: comunque lo si prema fa partire la clip 2 di `cavalli`, sfuma l'ambiente ed entra nella storia.

**Storia**
- **Musiche**: una alla volta, in loop. Toccando la musica che sta suonando la si spegne.
- **Tasti "?"** (4, attorno al tasto centrale): ognuno suona una clip a caso da `extra`, mai la stessa due volte nella storia, sopra la musica (che si abbassa un po'). Dopo l'uso diventa grigio.
- **Ai cavalli!**: tocco normale → clip 1; tenuto premuto 1,5 secondi → clip 2. Entrano in dissolvenza e sostituiscono l'audio presente.
- **Accenti**: Silenzio sfuma tutto in 3 secondi. Taglio ferma tutto di colpo con un accento. Drama e Battuta suonano sopra la musica. Crescendo suona sopra la musica e alla fine ferma tutto.
- **Jolly**: suona una delle registrazioni, sopra la musica (che si abbassa un po'), senza ripetizioni. Si può usare 3 volte per storia (i pallini in alto a destra), poi diventa grigio.
- **Pausa / Riprendi**: sospende tutto l'audio.
- **Riavvia**: ferma tutto, torna alla schermata iniziale e riattiva tutti i tasti.

## Provarla sul computer

Serve Node.js 18 o successivo:

```
npm run build
npx serve dist
```
