# Sumber Fogbound

Isi folder ini adalah sumber game. `index.html` di root dihasilkan dari sini.

- `game/` kode game, digabung berurutan: game_a, game_audio, game_b, game_ch5, game_props, game_c (dibungkus satu IIFE)
- `assets/` semua gambar (PNG/JPG) dan `meta.json` (titik anchor sprite)
- `og.html` meta tag preview link (Open Graph)
- `build.py` penggabung: `python3 src/build.py` menghasilkan `../index.html`

## Analytics (GoatCounter, tanpa cookie)
Jalankan dengan kode situs GoatCounter:

    FOG_GC=kodekamu python3 src/build.py

Event yang dicatat: `mulai-babN`, `selesai-babN`, `mati-babN-<penyebab>`. Mode `?test` tidak mengirim apa pun.
