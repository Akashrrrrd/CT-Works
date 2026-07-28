import { read, utils } from 'xlsx';
import fs from 'fs';

const file = 'data/CT-VT-ADEQUACY-CHECK-IED-TEMPLATES-1-2fd462.xlsx';
const workbook = read(fs.readFileSync(file));

const sheets = ['7SJ85 IED TEMPLATE', 'RED670 IED TEMPLATE'];

for (const sheetName of sheets) {
  console.log(`\n\n========== ${sheetName} ==========`);
  const sheet = workbook.Sheets[sheetName];
  const data = utils.sheet_to_json(sheet);
  
  console.log(`Total rows: ${data.length}\n`);
  
  // Log first 50 rows to see structure
  for (let i = 0; i < Math.min(50, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i], null, 2));
  }
}
