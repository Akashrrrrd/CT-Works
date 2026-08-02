# Data Flow Diagram - Siemens 7SJ85 Calculation Fix

## 🔴 BEFORE FIX (Broken Data Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ SIEMENS 7SJ85 CALCULATOR (React Component) │
│ │
│ User Input: │
│ ├─ CT Ratio Primary: 3150 A │
│ ├─ CT Resistance: 9 Ω │
│ ├─ Rated Burden: 7.5 VA │
│ ├─ Device Burden: 0.02 VA │
│ └─ Accuracy Limit Factor: 20 ← IN ct_core │
│ │
│ State: inputData = { │
│ ct_core: { │
│ ct_ratio_primary: 3150, │
│ ct_resistance: 9, │
│ rated_burden: 7.5, │
│ accuracy_limit_factor: 20 ← NESTED HERE │
│ }, │
│ connected_devices: { │
│ device_7sj85: 0.02 │
│ } │
│ } │
└─────────────────────────────────────────────────────────────────┘
 │
 │ fetch('/api/relay-formulas/siemens-7sj85', {
 │ method: 'POST',
 │ body: JSON.stringify(inputData)
 │ })
 ▼
┌─────────────────────────────────────────────────────────────────┐
│ API ENDPOINT: /api/relay-formulas/siemens-7sj85/route.ts │
│ │
│ OLD CODE (BROKEN): │
│ │
│ const input = await req.json() │
│ // input.ct_core.accuracy_limit_factor = 20 │
│ // input.accuracy_limit_factor = undefined ❌ │
│ │
│ const results = Siemens7SJ85Calculator │
│ .performCompleteCalculation(input) │
│ // Passes raw input with nested ALF │
│ // Service gets accuracy_limit_factor = undefined │
└─────────────────────────────────────────────────────────────────┘
 │
 │ Wrong data structure!
 ▼
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION SERVICE │
│ performCompleteCalculation({ │
│ ct_wiring: {...}, │
│ system: {...}, │
│ ct_core: {...}, │
│ connected_devices: {...}, │
│ accuracy_limit_factor: undefined ❌ UNDEFINED │
│ }) │
│ │
│ BurdenCalculations.calculateAvailableKssc( │
│ accuracy_factor = undefined, ❌ │
│ internal_burden = 9, │
│ rated_burden = 7.5, │
│ total_load_other_burden = 0.02 │
│ ) │
│ │
│ Result: undefined × ((9 + 7.5) / (9 + 0.02)) │
│ = undefined × 1.8293 │
│ = NaN ❌ │
└─────────────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────┐
│ WRONG RESULTS │
│ │
│ { │
│ "required_kssc": 15.87, │
│ "available_kssc": NaN, ❌ WRONG │
│ "final_verdict": "UNDER DIMENSIONED" ❌ WRONG │
│ } │
│ │
│ Engineering says: CT should be suitable! ❌ Contradicted │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ AFTER FIX (Correct Data Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ SIEMENS 7SJ85 CALCULATOR (React Component) │
│ │
│ User Input: │
│ ├─ CT Ratio Primary: 3150 A │
│ ├─ CT Resistance: 9 Ω │
│ ├─ Rated Burden: 7.5 VA │
│ ├─ Device Burden: 0.02 VA │
│ └─ Accuracy Limit Factor: 20 ← IN ct_core (UNCHANGED) │
│ │
│ State: inputData = { │
│ ct_core: { │
│ ct_ratio_primary: 3150, │
│ ct_resistance: 9, │
│ rated_burden: 7.5, │
│ accuracy_limit_factor: 20 ← STAYS HERE (UI design) │
│ }, │
│ connected_devices: { │
│ device_7sj85: 0.02 │
│ } │
│ } │
└─────────────────────────────────────────────────────────────────┘
 │
 │ fetch('/api/relay-formulas/siemens-7sj85', {
 │ method: 'POST',
 │ body: JSON.stringify(inputData)
 │ })
 ▼
┌─────────────────────────────────────────────────────────────────┐
│ API ENDPOINT: /api/relay-formulas/siemens-7sj85/route.ts │
│ │
│ NEW CODE (FIXED): │
│ │
│ const input = await req.json() │
│ // input.ct_core.accuracy_limit_factor = 20 │
│ │
│ const accuracy_limit_factor = input.ct_core?.accuracy_limit_factor
│ if (typeof accuracy_limit_factor !== 'number') { ✅ VALIDATE │
│ return error │
│ } │
│ │
│ const calculationInput = { ✅ TRANSFORM│
│ ...input, │
│ accuracy_limit_factor ← EXTRACTED TO TOP-LEVEL │
│ } │
│ // calculationInput.accuracy_limit_factor = 20 │
│ // calculationInput.ct_core.accuracy_limit_factor = 20 (also exists)
│ │
│ const results = Siemens7SJ85Calculator │
│ .performCompleteCalculation(calculationInput) │
│ // NOW PASSES CORRECT STRUCTURE │
└─────────────────────────────────────────────────────────────────┘
 │
 │ Correct data structure!
 ▼
┌─────────────────────────────────────────────────────────────────┐
│ CALCULATION SERVICE │
│ performCompleteCalculation({ │
│ ct_wiring: {...}, │
│ system: {...}, │
│ ct_core: {...}, │
│ connected_devices: {...}, │
│ accuracy_limit_factor: 20 ✅ CORRECT │
│ }) │
│ │
│ BurdenCalculations.calculateAvailableKssc( │
│ accuracy_factor = 20, ✅ │
│ internal_burden = 9, │
│ rated_burden = 7.5, │
│ total_load_other_burden = 0.02 │
│ ) │
│ │
│ Result: 20 × ((9 + 7.5) / (9 + 0.02)) │
│ = 20 × (16.5 / 9.02) │
│ = 20 × 1.8293 │
│ = 36.59 ✅ CORRECT │
└─────────────────────────────────────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────────────┐
│ CORRECT RESULTS │
│ │
│ { │
│ "required_kssc": 15.87, │
│ "available_kssc": 36.59, ✅ CORRECT │
│ "final_verdict": "SUITABLY DIMENSIONED" ✅ CORRECT │
│ } │
│ │
│ Engineering says: CT should be suitable! ✅ CONFIRMED │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Transformation at API Level

```
INPUT (from Component)
│
├─ ct_wiring: {conductor_cross_section, resistance_w_km_20c, ...}
├─ system: {system_frequency, bus_voltage_level, ...}
├─ ct_core: {
│ ct_ratio_primary: 3150,
│ ct_resistance: 9,
│ rated_burden: 7.5,
│ accuracy_limit_factor: 20 ← NESTED
│ ...
├─ connected_devices: {device_7sj85: 0.02}
└─ ...

API TRANSFORMATION (NEW CODE)
│
├─ Extract: const accuracy_limit_factor = input.ct_core?.accuracy_limit_factor
├─ Validate: if (typeof accuracy_limit_factor !== 'number') error
└─ Build: const calculationInput = {...input, accuracy_limit_factor}

OUTPUT (to Calculation Service)
│
├─ ct_wiring: {conductor_cross_section, resistance_w_km_20c, ...}
├─ system: {system_frequency, bus_voltage_level, ...}
├─ ct_core: {
│ ct_ratio_primary: 3150,
│ ct_resistance: 9,
│ rated_burden: 7.5,
│ accuracy_limit_factor: 20 ← STAYS HERE
│ ...
├─ connected_devices: {device_7sj85: 0.02}
├─ accuracy_limit_factor: 20 ← ALSO HERE (EXTRACTED TO TOP-LEVEL)
└─ ...

✅ Service finds accuracy_limit_factor at TOP-LEVEL where it expects it!
```

---

## 🧮 Formula Calculation Comparison

### BEFORE FIX
```
available_kssc = n × ((PE + PN) / (PE + PL))

Where:
 n = accuracy_limit_factor = undefined ❌
 PE = 9 VA
 PN = 7.5 VA
 PL = 0.02 VA

Calculation:
 undefined × ((9 + 7.5) / (9 + 0.02))
 = undefined × (16.5 / 9.02)
 = undefined × 1.8293
 = NaN ❌

Suitability Check:
 NaN > 15.87 = false ❌ (wrong!)
 
Verdict: UNDER DIMENSIONED ❌
```

### AFTER FIX
```
available_kssc = n × ((PE + PN) / (PE + PL))

Where:
 n = accuracy_limit_factor = 20 ✅
 PE = 9 VA
 PN = 7.5 VA
 PL = 0.02 VA

Calculation:
 20 × ((9 + 7.5) / (9 + 0.02))
 = 20 × (16.5 / 9.02)
 = 20 × 1.8293
 = 36.59 ✅

Suitability Check:
 36.59 > 15.87 = true ✅ (correct!)
 
Verdict: SUITABLY DIMENSIONED ✅
```

---

## 🎯 Key Insight

**The problem was NOT in the formulas, component, or calculation logic.**

**The problem WAS in the data transformation between component and calculation service.**

The fix ensures that data flows correctly through all layers:
1. Component stores ALF in intuitive location (ct_core)
2. API extracts and transforms it to service interface
3. Service receives ALF where it expects it
4. Calculation produces correct results

```
Component → API (Transform) → Service → Results

 ✅ All parts work correctly when data is passed correctly
```

---

## 📊 Benefits of This Architecture

| Aspect | Benefit |
|--------|---------|
| **Component Design** | Can store ALF in ct_core (intuitive for users) |
| **Service Design** | Can expect ALF at top-level (clean interface) |
| **API Layer** | Transforms between the two (single responsibility) |
| **Validation** | Centralized at API boundary (consistent checking) |
| **Maintainability** | Clear separation of concerns |
| **Flexibility** | Easy to change transformations without touching components/services |

---

## ✅ Verification

To verify the fix is working:

```
Request → API → Transform → Service → Calculation → Response
 ↓ ↓ ↓ ↓ ↓ ↓
Input Extract Build Receive Result Output
ALF in ALF ALF at ALF at 36.59 Suitably
ct_core from top top instead Dimension
 ct_core level level of NaN ed ✅
```

**All stages must work correctly for correct results.**

The fix ensures they do. ✅
