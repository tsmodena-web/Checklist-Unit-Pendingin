// Inti tanpa akses file: validasi config dan render index.html dari template.
// Dipakai oleh build (Node) dan oleh Checklist Config Manager (browser), jadi hasilnya selalu sama.

export const FILES = {
  units: 'config/units.json',
  general: 'config/general.json',
  leakTest: 'config/leak-test.json',
};
export const TEMPLATE = 'src/index.template.html';
export const OUTPUT = 'index.html';
export const REF_IMAGE_FILE = 'assets/leak-test-reference.png';

const ID_RE = /^[a-z][a-z0-9_]*$/;
const ROW_ID_RE = /^[A-Za-z0-9_-]+$/;
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;

export function validate(cfg) {
  const errors = [];
  const warnings = [];
  const { units, general, leakTest } = cfg;

  const unitIds = new Set();
  if (!Array.isArray(units) || !units.length) errors.push('units: harus array [{id, label}], minimal 1');
  else units.forEach((u, i) => {
    if (!u || !ID_RE.test(u.id || '')) errors.push(`units[${i}].id harus huruf kecil/angka/underscore, diawali huruf`);
    else if (unitIds.has(u.id)) errors.push(`units[${i}].id "${u.id}" duplikat`);
    else unitIds.add(u.id);
    if (!isStr(u && u.label)) errors.push(`units[${i}].label kosong`);
  });

  const checkUnits = (list, where) => {
    if (list === undefined) return;
    if (!Array.isArray(list) || !list.length) { errors.push(`${where}.units harus daftar id unit (hapus field ini kalau berlaku untuk semua unit)`); return; }
    for (const id of list) if (!unitIds.has(id)) errors.push(`${where}.units: unit "${id}" tidak ada di units.json`);
  };

  if (!Array.isArray(general) || !general.length) errors.push('general: harus array grup, minimal 1');
  else {
    const gids = new Set();
    general.forEach((g, gi) => {
      const where = `general[${gi}]` + (g && g.title ? ` "${g.title}"` : '');
      if (!g || !isStr(g.id)) { errors.push(`${where}.id kosong`); return; }
      if (gids.has(g.id)) errors.push(`${where}.id duplikat`); gids.add(g.id);
      if (g.id.includes('||')) errors.push(`${where}.id tidak boleh memuat "||"`);
      if (!isStr(g.title)) errors.push(`${where}.title kosong`);
      checkUnits(g.units, where);
      if (!Array.isArray(g.rows) || !g.rows.length) { errors.push(`${where}.rows minimal 1 baris`); return; }
      const rids = new Set();
      g.rows.forEach((r, ri) => {
        const w = `${where}.rows[${ri}]`;
        if (!r || !ROW_ID_RE.test(r.id || '')) errors.push(`${w}.id harus huruf/angka/_/-`);
        else if (rids.has(r.id)) errors.push(`${w}.id "${r.id}" duplikat dalam grup (id dipakai sebagai kunci draft)`);
        else rids.add(r.id);
        for (const k of ['name', 'rec', 'unit']) if (!isStr(r && r[k])) errors.push(`${w}.${k} kosong`);
        checkUnits(r && r.units, w);
      });
    });
    for (const id of unitIds) {
      const n = general.reduce((acc, g) => acc + (!g.units || g.units.includes(id) ? (g.rows || []).filter((r) => !r.units || r.units.includes(id)).length : 0), 0);
      if (!n) warnings.push(`unit "${id}" tidak mendapat satu pun baris checklist`);
    }
  }

  if (!leakTest || typeof leakTest !== 'object') errors.push('leakTest: harus object {procedureForm, procedureOutput}');
  else for (const k of ['procedureForm', 'procedureOutput']) {
    if (!Array.isArray(leakTest[k]) || !leakTest[k].length || !leakTest[k].every(isStr)) errors.push(`leakTest.${k}: harus daftar langkah, minimal 1`);
  }
  return { errors, warnings };
}

// ---------- rendering ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Teks yang masuk ke template literal JS juga harus aman dari ` dan ${.
const escTpl = (s) => esc(s).replace(/`/g, '&#96;').replace(/\$\{/g, '&#36;{');
const jsLit = (v) => JSON.stringify(v).replace(/<\//g, '<\\/').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

export function render(cfg, template, refImageDataUrl) {
  const groups = cfg.general.map((g) => {
    const o = { id: g.id, title: g.title };
    if (g.units) o.units = g.units;
    o.rows = g.rows.map((r) => {
      const row = { id: r.id, name: r.name, rec: r.rec, unit: r.unit };
      if (r.units) row.units = r.units;
      return row;
    });
    return o;
  });
  const li = (list) => list.map((s) => `            <li>${escTpl(s)}</li>`).join('\n');
  const swaps = {
    '/*@@REF_IMAGE@@*/': JSON.stringify(refImageDataUrl || ''),
    '/*@@GENERAL_GROUPS@@*/': jsLit(groups),
    '/*@@UNIT_OPTIONS@@*/': jsLit(cfg.units.map((u) => [u.id, u.label])),
    '<!--@@PROCEDURE_FORM@@-->': li(cfg.leakTest.procedureForm),
    '<!--@@PROCEDURE_OUTPUT@@-->': li(cfg.leakTest.procedureOutput),
  };
  let out = template;
  for (const [key, value] of Object.entries(swaps)) {
    if (!out.includes(key)) throw new Error(`Placeholder ${key} tidak ada di template`);
    out = out.split(key).join(value);
  }
  return out;
}
