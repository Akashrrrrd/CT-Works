import { read } from 'xlsx';
import fs from 'fs';
for (const f of fs.readdirSync('data')) {
  const wb = read(fs.readFileSync('data/' + f), { bookSheets: true });
  console.log('=====', f);
  wb.SheetNames.forEach((n) => console.log('   ', JSON.stringify(n)));
}
