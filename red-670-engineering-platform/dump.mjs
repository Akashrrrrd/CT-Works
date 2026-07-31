import { read, utils } from 'xlsx';
import fs from 'fs';
const file = process.argv[2],
  sheet = process.argv[3];
const wb = read(fs.readFileSync(file), { cellFormula: true, cellNF: true });
const ws = wb.Sheets[sheet];
if (!ws) {
  console.log('NO SHEET', sheet);
  process.exit(0);
}
const range = utils.decode_range(ws['!ref']);
console.log('REF', ws['!ref']);
for (let r = range.s.r; r <= range.e.r; r++) {
  const parts = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) continue;
    let s = addr + ': ';
    if (cell.f) s += '{=' + cell.f + '} -> ';
    s += JSON.stringify(cell.v);
    parts.push(s);
  }
  if (parts.length) console.log('R' + (r + 1) + ' | ' + parts.join(' || '));
}
