# The Forbidden Tome

A creepy single-page website featuring an ancient, cursed-looking book that
opens the moment you enter.

## What it does

- **The gate** — a dark landing screen with a pulsing blood-red title
  (*The Forbidden Tome*) and an ominous **Enter** button.
- **The reveal** — pressing **Enter** (or the Enter / Space key) fades away the
  gate, shakes the screen, and a heavy leather book swings its cover open into a
  two-page spread.
- **The incantation** — once open, a creepy passage types itself onto the right
  page, letter by letter, with a blood-red cursor.
- **Atmosphere** — drifting fog, floating dust motes, candle-like flicker, a
  vignette, a blinking/roving eye on the cover, and cursor-reactive parallax.
- **Ambient sound** — an uneasy low drone with distant wind, generated live with
  the Web Audio API (no audio files needed). Toggle it with the speaker button
  in the top-right corner.

## Running it

No build step and no dependencies. Just open `index.html` in any modern browser:

```
# from the project directory
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or simply double-click `index.html`.

## Files

| File         | Purpose                                             |
|--------------|-----------------------------------------------------|
| `index.html` | Markup for the gate, the book, and ambient overlays |
| `styles.css` | All styling, 3D book layout, and animations         |
| `script.js`  | Entry sequence, typewriter effect, and Web Audio    |

Fonts (*Nosifer*, *IM Fell English*) are loaded from Google Fonts with serif
fallbacks, so the site still works fully offline.
