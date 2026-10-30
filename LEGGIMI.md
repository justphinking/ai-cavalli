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

## Inserire i contenuti

Ogni cartella contiene un file `LEGGIMI.txt` che spiega cosa ci va.

```
img/
  sfondo-1.jpg                → sfondo della schermata 1 (titolo)
  sfondo-2.jpg                → sfondo della schermata 2 (saloon)
  icona-cavalli.png           → icona dei tasti Ai cavalli! / Inizia la storia, 512 × 256 px (facoltativa)
  icona-titolo.png            → icona grande sopra il titolo della schermata 1, 1024 × 512 px (facoltativa)
audio/
  ambiente/                   → 1 clip in loop (schermata 2, saloon)
  inizio/                     → clip di "Inizia la storia"
  cavalli/                    → 2 clip: 1 = tocco, 2 = tenuto premuto
  musiche/neutro, mistero, suspense, conflitto,
          love, comedy, calma, triste            → 3 clip ciascuna, in loop
  accenti/tan, drama, crescendo                  → 1 clip ciascuna
  accenti/battuta                                → 3 clip
  extra/                      → tutte le clip che vuoi, per i tasti "?"
  chiamata/squillo, clic, occupato → suoni del tasto Chiamate (facoltativi)
aiutini.txt                   → frasi dell'Aiutino (schermata 2)
suggerimenti.txt              → frasi dei tasti "?" (storia)
```

- Audio: mp3, m4a, aac, wav, ogg. Nomi liberi, tranne in `cavalli`, dove i file si chiamano 1 e 2.
- Per i loop (ambiente e musiche) usa il WAV 44.100 Hz 16 bit, tagliato sui passaggi per lo zero.
- Sfondi: formato verticale 1170 × 2532 px (minimo 1080 × 1920), JPG sotto i 500 KB. I nomi devono essere esattamente `sfondo-1.jpg` e `sfondo-2.jpg`.
- Se un contenuto manca, l'app usa un segnaposto (suono generato o sfondo di legno disegnato).
- Testi: una frase per riga. Si modificano da GitHub: apri il file → icona della matita → scrivi → *Commit changes*.
- Per caricare o sostituire un file dal sito di GitHub: entra nella cartella → *Add file → Upload files* → trascina → *Commit changes*. Dopo circa un minuto l'app aggiornata è online.

## Chiamate

Si registrano **direttamente sul telefono**, dal pulsante "registra una chiamata" in alto a destra nella schermata del saloon. Restano solo su quel telefono, fino a 50.

Attenzione: se si cancellano i dati del sito dal browser, le registrazioni si perdono.

## Come funziona

**Schermata 1 (titolo)**: tocca un punto qualsiasi. Parte la musica del saloon e si passa alla schermata 2.

**Schermata 2 (saloon)**
- **Inizia la storia**: parte la clip di `inizio` e una dissolvenza luminosa porta alla storia.
- **Aiutino**: mostra una frase a caso da `aiutini.txt`. Una volta per storia; la frase resta finché non si entra nella storia.

**Storia**
- **Musiche** (8): una alla volta, in loop. Toccando la musica che sta suonando la si spegne.
- **Tasti "?"** (4): in ogni storia 2, scelti a caso, suonano una clip da `extra` sopra la musica (che si abbassa un po'). Gli altri 2 mostrano un suggerimento da `suggerimenti.txt`, che si chiude toccandolo o premendo un altro tasto. Dopo l'uso diventano grigi.
- **Ai cavalli!**: tocco normale → clip 1; tenuto premuto 1,5 secondi → clip 2, con lo schermo che si illumina fino alla fine della clip. Entrano in dissolvenza e sostituiscono l'audio presente.
- **Volume**: alterna il volume della musica tra alto (pieno) e basso (22%), con una dissolvenza di 1,5 secondi. All'inizio di ogni storia è su basso.
- **Tan!**, **Drama** e **Battuta**: l'accento parte e un istante dopo (0,2 secondi) la musica e gli altri suoni si fermano di colpo.
- **Crescendo**: suona sopra la musica e alla fine ferma tutto.
- **Chiamate**: fa arrivare una delle chiamate registrate: suoneria (2 s), clic, voce con filtro telefono, clic, segnale di occupato (2 s). La musica resta bassa per tutto il tempo. Senza ripetizioni, 3 volte per storia (i pallini in alto a destra).
- **Pausa / Riprendi**: sospende tutto l'audio.
- **Riavvia**: ferma tutto e torna alla schermata del saloon, riattivando tutti i tasti.

## Provarla sul computer

Serve Node.js 18 o successivo:

```
npm run build
npx serve dist
```
