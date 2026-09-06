# sherry · 3D portfolio 🫧

A fun, **mobile-only** 3D portfolio — one blob, six orbiting shapes, a starfield,
and a few easter eggs. Built with vanilla JS + [three.js](https://threejs.org) (vendored, no build step).

## Run it

Any static server works:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open it **on your phone** (or your browser's device mode) — desktop visitors get a friendly "grab your phone" screen instead.

## Edit the content

Everything personal — name, role, bio, skills, projects, socials — lives in **one file**:

```
js/content.js
```

Edit that file and refresh. No other changes needed.

## The fun stuff

- 🌀 **Drag horizontally** on the background to spin the world (with inertia)
- 👆 **Tap the blob** — it pokes back (spring squash + particle pop + boing)
- ✋ **Hold anywhere** for ~2s — party mode
- 🔁 **Tap the logo 5×** — another party (the secret one)
-  The blob's color drifts as you scroll; the camera dollies in
- 📷 Phone tilt adds a subtle parallax (where the device cooperates)
- 🔊 Sound toggle in the top-right (tiny WebAudio synth, zero audio files)

## Notes

- `three.module.js` is vendored in `vendor/` (r160) so the site works with no CDN dependency.
- Respects `prefers-reduced-motion`.
- Placeholder content is in `js/content.js` — swap in real details there.
