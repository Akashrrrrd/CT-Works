import { read } from 'xlsx'
import fs from 'fs'
import { calculate7SJ85 } from './lib/services/red670-calculations'

const g = (ws: any, a: string) => (ws[a] ? ws[a].v : undefined)
const num = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

let checks = 0,
  fails = 0
const cmp = (label: string, got: number, exp: any) => {
  if (num(exp) === undefined) return
  checks++
  const ok = Math.abs(got - exp) <= Math.max(1e-9, Math.abs(exp) * 1e-10)
  if (!ok) {
    fails++
    console.log('   MISMATCH', label, 'got', got, 'exp', exp)
  }
}
const cmpS = (label: string, got: string, exp: any) => {
  if (typeof exp !== 'string') return
  checks++
  const norm = (s: string) => s.replace(/Dimentioned/g, 'Dimensioned').trim()
  if (norm(got) !== norm(exp)) {
    fails++
    console.log('   VERDICT MISMATCH', label, 'got', got, 'exp', exp)
  }
}

// The three per-tap blocks in the 7SJ85 sheet.
const BLOCKS = [
  {
    ratio: 'H10', sec: 'O10', cls: 'H11', n: 'I11', rct: 'H12', pn: 'H13',
    devices: ['J17', 'J18', 'J19', 'J20'], lead: 'J21', pl: 'J22', pe: 'P22',
    itk: 'S24', ipn: 'S25', req: 'G34', avail: 'G38', cmp: 'F40', verdict: 'G42',
  },
  {
    ratio: 'J51', sec: 'O51', cls: 'J52', n: 'K52', rct: 'J53', pn: 'J54',
    devices: ['J58', 'J59', 'J60', 'J61'], lead: 'J62', pl: 'J63', pe: 'P63',
    itk: 'S65', ipn: 'S66', req: 'G75', avail: 'G79', cmp: 'F81', verdict: 'G83',
  },
  {
    ratio: 'L92', sec: 'O92', cls: 'L93', n: 'M93', rct: 'L94', pn: 'L95',
    devices: ['J99', 'J100', 'J101'], lead: 'J102', pl: 'J103', pe: 'P103',
    itk: 'S105', ipn: 'S106', req: 'G115', avail: 'G119', cmp: 'F121', verdict: 'G123',
  },
]

const SHEETS = ['BCU+OC-5P SEL751+7SJ85', 'BCU+OC-5P SEL751+7SJ85 (2)']

for (const f of fs.readdirSync('data')) {
  const wb = read(fs.readFileSync('data/' + f), { cellFormula: true })
  for (const sheetName of SHEETS) {
    const R = wb.Sheets[sheetName]
    const B = wb.Sheets['CT-VT Burdens']
    if (!R) continue
    console.log('=====', f, '|', sheetName)

    const itkmax = num(g(R, BLOCKS[0].itk))
    if (itkmax === undefined) {
      console.log('   no Itkmax, skipped')
      continue
    }

    // Device burdens come from the block-1 rows; blanks mean the row is unused.
    const devices = BLOCKS[0].devices
      .map((a, i) => ({ name: `dev${i + 1}`, burden_va: num(g(R, a)) }))
      .filter((d) => d.burden_va !== undefined) as { name: string; burden_va: number }[]

    const ct_wiring = {
      conductor_cross_section_mm2: g(B, 'S10'),
      resistance_per_km_at_20c: g(B, 'S11'),
      lead_length_m: g(B, 'S19'),
    } as any

    // Only taps with a numeric ratio, Rct, PN and n are live in the sheet.
    const liveIdx: number[] = []
    const taps = BLOCKS.map((b, i) => {
      const ratio = num(g(R, b.ratio)),
        sec = num(g(R, b.sec)),
        rct = num(g(R, b.rct)),
        pn = num(g(R, b.pn)),
        n = num(g(R, b.n))
      if (ratio === undefined || sec === undefined || rct === undefined || pn === undefined || n === undefined) return null
      liveIdx.push(i)
      return {
        name: `Tap-${i + 1}`,
        ct_ratio_primary: ratio,
        ct_ratio_secondary: sec,
        ct_resistance_ohm: rct,
        rated_burden_va: pn,
        accuracy_limiting_factor: n,
      }
    }).filter(Boolean) as any[]

    if (taps.length === 0) {
      console.log('   no live taps, skipped')
      continue
    }

    const res = calculate7SJ85({ itkmax_a: itkmax, ct_wiring, device_burdens: devices, ct_taps: taps })

    cmp('leadVA', res.burdens.lead_va, g(B, 'S22'))
    cmp('PL', res.burdens.total_external_burden_va, g(R, BLOCKS[0].pl))

    res.taps.forEach((t, k) => {
      const b = BLOCKS[liveIdx[k]]
      cmp(`${t.name} PE`, t.pe_va, g(R, b.pe))
      cmp(`${t.name} Ipn`, t.ipn_a, g(R, b.ipn))
      cmp(`${t.name} Kssc req`, t.kssc_required, g(R, b.req))
      cmp(`${t.name} Kssc avail`, t.kssc_available, g(R, b.avail))
      cmpS(`${t.name} cmp`, t.comparison, g(R, b.cmp))
      cmpS(`${t.name} verdict`, t.verdict, g(R, b.verdict))
      console.log(
        `  ${t.name} ${t.ct_ratio} Rct=${t.rct_ohm} PN=${t.pn_va} -> req ${t.kssc_required.toFixed(4)} ${t.comparison} avail ${t.kssc_available.toFixed(4)} | ${t.verdict}`,
      )
    })
  }
}
console.log(`\n${checks - fails}/${checks} checks passed, ${fails} mismatches`)
