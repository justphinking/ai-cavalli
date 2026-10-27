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
  musiche/avventura, suspense, love, comedy, calma, triste   → 3 clip ciascuna, in loop
  accenti/taglio, drama, crescendo                         → 1 clip ciascuna
  accenti/battuta                                          → 3 clip
  extra/                                                   → fino a 20 clip, 01.mp3 … 20.mp3
  cavalli/                                                 → 3 clip
  jingle/                                                  → 1 clip (inizio storia)
  porta-saloon/                                            → 1 clip (prima dell'imprevisto)
```

- Formati: mp3, m4a, aac, wav, ogg. Il nome del file è libero (tranne negli Extra, dove conta il numero).
- Se una cartella è vuota, l'app usa un suono segnaposto.
- Per caricare o sostituire un file dal sito di GitHub: entra nella cartella → *Add file → Upload files* → trascina → *Commit changes*. Dopo circa un minuto l'app aggiornata è online.
- Per le musiche in loop conviene esportare clip che finiscono "a tempo", così il giro è pulito.

## Imprevisti

Le frasi degli imprevisti si registrano **direttamente sul telefono**, dal pulsante con il microfono in alto a sinistra (fuori dalla modalità storia). Restano solo su quel telefono, fino a 50.

Attenzione: se si cancellano i dati del sito dal browser, le registrazioni si perdono.

## Come funziona

- **Musiche**: una alla volta, in loop. Toccando la musica che sta suonando la si spegne.
- **Accenti**: Silenzio sfuma tutto in 3 secondi. Taglio ferma tutto di colpo con un accento. Drama e Battuta suonano sopra la musica. Crescendo suona sopra la musica e alla fine ferma tutto. Jolly suona un Extra a caso tra quelli non assegnati.
- **Extra**: al primo tocco si sceglie il suono, poi il tocco lo fa suonare. Per cambiarlo si tiene premuto (solo fuori dalla modalità storia).
- **Inizia la storia**: parte il jingle e si entra in modalità storia. Il tasto diventa *Ai cavalli!*: una clip a caso che entra in dissolvenza e sostituisce l'audio presente.
- **Imprevisto** (porte del saloon): solo in modalità storia, una volta per storia. Ferma l'audio, suona la porta e poi una frase registrata a caso.
- **Pausa / Riprendi / Riavvia**: compaiono in modalità storia. Riavvia ferma tutto e torna all'inizio.

## Provarla sul computer

Serve Node.js 18 o successivo:

```
npm run build
npx serve dist
```
