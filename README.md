# Checklist Unit Pendingin — config

Halaman `index.html` **dibangun** dari config JSON, jadi isi checklist bisa diubah tanpa menyentuh kode.

```
config/               <- yang diedit (data)
  units.json            jenis unit pendingin: [{id, label}]
  general.json          grup & baris General Check, dan untuk unit mana tiap grup/baris berlaku
  leak-test.json        langkah prosedur Pengetesan Bocor Body (di form dan di output)
assets/leak-test-reference.png   foto referensi manifold (bisa diganti)
src/index.template.html          kode aplikasi (jarang diubah)
tools/core.mjs        validasi + render (dipakai build dan Checklist Config Manager)
tools/build.mjs       config + template  ->  index.html
tools/mcp-server.mjs  MCP server untuk mengedit config lewat Claude
index.html            HASIL build (disajikan GitHub Pages) — jangan diedit manual
```

## Aturan general.json
- Grup: `{id, title, units?, rows}`. Baris: `{id, name, rec, unit, units?}`.
- `units` (opsional) = daftar id unit tempat grup/baris itu muncul. Tanpa `units` = muncul untuk semua unit.
- `id` grup dan `id` baris dipakai sebagai kunci isian draft (`idGrup||idBaris`). **Jangan ganti id baris yang sudah ada**; ubah teks (`name`, `rec`, `unit`) dan urutan boleh. Baris baru beri id baru (mis. `"5"` atau `"cek_freon"`).

## Cara pakai
1. Edit file di `config/` (atau lewat Checklist Config Manager / MCP).
2. `npm run build` (tidak butuh `npm install`). Build menolak config yang tidak valid.
3. Buka `index.html`, cek, lalu commit & push.

MCP (butuh `npm install` sekali): `claude mcp add pendingin-config -- node /path/ke/repo/tools/mcp-server.mjs`. Alat: `overview`, `get_config`, `set_config`, `validate`, `build`, `git_diff`, `publish_git` (wajib `confirm=true`).
