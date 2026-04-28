# UI Guardrails - Magazzino / Carico Merce

Queste regole sono vincolanti per ogni modifica futura alla pagina `WarehouseGiacenze` (Carico Merce).

## Layout generale modal
- Il modal deve occupare tutto il viewport (`width` e `height`), senza overflow orizzontale del viewport.
- Qualsiasi overflow deve stare in contenitori dedicati, mai sul viewport.
- Evitare wrapper scrollabili che mischiano sezioni diverse (es. preview + tabelle nello stesso scroll container).

## Flow mobile
- Ordine obbligatorio:
  1. Anteprima prodotto (blocco autonomo)
  2. Archivio articoli
  3. Righe movimento
  4. Card inferiori
- In mobile le tabelle stanno una sotto l'altra.
- L'unico elemento scrollabile per ogni tabella è il contenitore della tabella stessa.
- Le frecce azione in riga sono sempre visibili su mobile:
  - Archivio articoli: freccia in basso
  - Righe movimento: freccia in alto

## Flow desktop
- Le due tabelle principali sono protagoniste e devono occupare lo spazio disponibile senza straripare il viewport.
- Le due aree tabella devono avere dimensioni coerenti e allineate.
- Overflow solo nei contenitori tabella (`overflow-auto` locale).

## Card inferiori
- Layout desktop fisso: 50% / 25% / 25%.
- Prima card (Registrazione DDT): full-height nella riga.
- Card centrale: full-height nella riga.
- Sezione card inferiori può essere collassabile solo desktop.

## Card DDT (prima card)
- Split interno obbligatorio: sinistra 38.2%, destra 61.8%.
- Colonna destra deve rispettare il padding della card (nessun "straripo").
- Upload non limitato a PDF: accetta qualsiasi file.
- Ogni file caricato crea una riga con:
  - Nome file
  - Select tipo documento con opzioni:
    - `ddt`
    - `fattura del vettore`
    - `fattura d'aquisto`
    - `immagine prodotto`
- Tabella file senza header.

## Qualità implementativa
- Non introdurre altezze arbitrarie che rendono blocchi "abnormi" o "striminziti".
- Usare `min-h-0` correttamente su catene flex/grid quando serve scroll interno.
- Prima di chiudere una modifica UI, verificare:
  - desktop standard
  - widescreen
  - mobile stretto
  - assenza di overflow-x viewport

## Regola globale sidebar/menu utente (futuri progetti)
- Nella vista mobile con overlay menu, i controlli utente devono stare nello stesso blocco: tema, supporto, profilo, informazioni, logout.
- Evitare controlli utente isolati fuori dal gruppo profilo (es. toggle tema separato dal menu utente).

## Regola globale controlli UI (design system)
- Input, select e bottoni di filtro/toolbar devono avere altezza coerente nella stessa riga (no componenti "sfasati").
- Le select devono usare caret custom con padding destro adeguato (caret mai attaccato al bordo destro).
- Evitare mix improvvisati di classi per i controlli: usare classi UI condivise e riutilizzabili (baseline stile shadcn-like).

## Baseline tabella "Articoli in DDT" (vincolante)
- Obiettivo: evitare disallineamento header/body e overflow nelle card dettagli.
- Desktop:
  - Header separato dal body scrollabile.
  - Header e body devono avere colonne identiche tramite `colgroup` condiviso (stesse width).
  - Solo il body è scrollabile verticalmente.
- Mobile:
  - Tabella unica dentro contenitore scrollabile locale.
  - Nessun `overflow-hidden` sui wrapper superiori che possa tagliare scrollbar o righe.
- Valori mancanti:
  - Nessuna colonna viene rimossa in base al contenuto.
  - I campi mancanti mostrano sempre `-` (incluso `Seriale`) per coerenza visiva e semantica.
