import { read, utils } from 'xlsx';
import fs from 'fs';

const file = 'data/CT-VT-ADEQUACY-CHECK-IED-TEMPLATES-1-2fd462.xlsx';
const workbook = read(fs.readFileSync(file));

console.log('Sheet Names:', workbook.SheetNames);
console.log('\n');

for (const sheetName of workbook.SheetNames) {
  console.log(`\n===== SHEET: ${sheetName} =====`);
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  console.log(`Rows: ${data.length}`);
  if (data.length > 0) {
    console.log('Sample rows:');
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
  }
}
