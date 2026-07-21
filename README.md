# The Strays

A moonlit, Victorian-styled single-page site for *The Strays* — a chronicle of
the moon-touched. An ancient book falls open the moment you enter, beneath a
full moon with fog rolling across the night.

## What it does

- **The gate** — a moonlit landing screen with a full moon, drifting fog, and an
  ornate **The Strays** title set in Victorian display type, framed by gold
  filigree flourishes.
- **The reveal** — pressing **Enter** (or the Enter / Space key) fades the gate,
  and a gilt-bound book swings its cover open into a two-page spread. A lone
  **werewolf howl** greets you as it opens.
- **The passage** — a Victorian passage types itself onto the right page, letter
  by letter, tipped with a gold fleuron caret.
- **Full moon & fog** — a real, wind-blown fog is drawn on a `<canvas>` and
  drifts across the moon and the open pages. A soft-glowing full moon hangs in a
  starry night sky.
- **Sound** — everything is generated live with the Web Audio API (no audio
  files):
  - **Howl** — a synthesized werewolf howl (pitch swell, vibrato, vowel formant,
    breath, and a canyon echo). Plays on entry and via the **Howl** button.
  - **Ambience** — an uneasy night drone with gusting wind, toggled from the nav.

## Navigation

A Victorian top bar carries the controls (**Howl**, **Ambience**) flanked by
mirrored gold filigree flourishes and a central fleuron.

## Running it

No build step and no dependencies. Open `index.html` in any modern browser:

```
# from the project directory
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or simply double-click `index.html`. (Browsers require a click before audio can
start — the **Enter** button provides that gesture.)

## Files

| File         | Purpose                                                     |
|--------------|-------------------------------------------------------------|
| `index.html` | Markup for the night sky, moon, nav, gate, and the book     |
| `styles.css` | Victorian styling, the 3D book, moon, and animations        |
| `script.js`  | Canvas fog, Web Audio howl + ambience, entry & typewriter   |

Fonts (*Cinzel Decorative*, *Playfair Display*, *Cormorant Garamond*,
*IM Fell English*) load from Google Fonts with serif fallbacks, so the site
still works fully offline.
