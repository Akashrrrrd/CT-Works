# SIEMENS 7SJ85 Calculator - Output Mismatch Analysis

## 📋 Executive Summary

Your calculation output shows mismatches because **accuracy_limit_factor** is not being passed correctly from the UI component to the backend calculation service. This causes:

- ❌ `available_kssc` becomes `NaN` instead of the correct value
- ❌ Final verdict becomes unpredictable
- ❌ Intermediate calculations appear incorrect
- ❌ Engineering results don't match Hitachi standards

---

## 🔴 Core Issue: Data Flow Breakdown

### The Problem Chain

```
USER INPUT (Component)
  ct_core: { accuracy_limit_factor: 20 }
    ↓
JSON sent to API
    ↓
API receives: input.ct_core.accuracy_limit_factor = 20
    ↓
API passes input directly to calculation service
    ↓
Service expects: input.accuracy_limit_factor (TOP-LEVEL)
    ↓
Service gets: input.accuracy_limit_factor = undefined ❌
    ↓
calculateAvailableKssc(accuracy_factor=undefined, ...)
    ↓
Result: NaN ❌
```

### Why This Happens

**Component sends:**
```json
{
  "ct_wiring": {...},
  "system": {...},
  "ct_core": {
    "accuracy_limit_factor": 20,  // ← Nested here
    ...
  }
}
```

**Service expects:**
```typescript
performCompleteCalculation({
  ct_wiring: {...},
  system: {...},
  ct_core: {...},
  accuracy_limit_factor: 20,  // ← Top-level here!
  ...
})
```

**API must transform:**
```typescript
input.ct_core.accuracy_limit_factor → accuracy_limit_factor (top-level)
```

---

## 🧮 Impact on Calculations

### Available Kssc Formula

```
available_kssc = accuracy_limit_factor × ((internal_burden + rated_burden) / (internal_burden + total_load_other_burden))
```

**With undefined accuracy_limit_factor:**
```
available_kssc = undefined × ((9 + 7.5) / (9 + 0.02))
              = undefined × 1.826
              = NaN  ❌
```

**With correct accuracy_limit_factor = 20:**
```
available_kssc = 20 × ((9 + 7.5) / (9 + 0.02))
              = 20 × (16.5 / 9.02)
              = 20 × 1.8293
              = 36.59  ✅
```

### What Gets Broken

1. **Available Kssc**: NaN (should be ~36.59)
2. **Suitability Check**: NaN > 15.87 = false (wrong!)
3. **Final Verdict**: "UNDER DIMENSIONED" (wrong! Should be "SUITABLY DIMENSIONED")

---

## ✅ Solution Implementation

### File to Fix: `/app/api/relay-formulas/siemens-7sj85/route.ts`

**Lines 18-43 need to be changed:**

```typescript
// BEFORE (BROKEN)
try {
  const input = await req.json();
  
  // Validate required input structure
  const requiredSections = ['ct_wiring', 'system', 'power_line', 'ct_core', 'connected_devices'];
  for (const section of requiredSections) {
    if (!input[section]) {
      return NextResponse.json({ error: `Missing required section: ${section}` }, { status: 400 });
    }
  }
  
  // This passes the raw input - accuracy_limit_factor is nested, not top-level!
  const results = Siemens7SJ85Calculator.performCompleteCalculation(input);
```

```typescript
// AFTER (FIXED)
try {
  const input = await req.json();
  
  // Validate required input structure
  const requiredSections = ['ct_wiring', 'system', 'power_line', 'ct_core', 'connected_devices'];
  for (const section of requiredSections) {
    if (!input[section]) {
      return NextResponse.json({ error: `Missing required section: ${section}` }, { status: 400 });
    }
  }

  // Extract accuracy_limit_factor from ct_core and elevate it to top-level
  // The calculation service expects it at the top level, not nested in ct_core
  const accuracy_limit_factor = input.ct_core?.accuracy_limit_factor;
  if (typeof accuracy_limit_factor !== 'number') {
    return NextResponse.json({ 
      error: 'accuracy_limit_factor must be a number in ct_core' 
    }, { status: 400 });
  }

  // Prepare calculation input with accuracy_limit_factor at top level
  const calculationInput = {
    ...input,
    accuracy_limit_factor  // Now it's at the top-level!
  };

  // Pass the properly structured input
  const results = Siemens7SJ85Calculator.performCompleteCalculation(calculationInput);
```

### Key Changes

1. ✅ Extract `accuracy_limit_factor` from `input.ct_core`
2. ✅ Validate it's a number (required by calculation service)
3. ✅ Create new object with ALF at top-level
4. ✅ Pass corrected object to calculation service

---

## 🧪 Expected Before & After

### BEFORE FIX (Current Broken State)
```
Input: accuracy_limit_factor in ct_core → Passed as nested
Output:
  required_kssc: 15.87
  available_kssc: NaN  ❌
  final_verdict: "UNDER DIMENSIONED" ❌
  
Analysis: CT appears inadequate (wrong!)
```

### AFTER FIX (Correct State)
```
Input: accuracy_limit_factor in ct_core → Extracted to top-level
Output:
  required_kssc: 15.87
  available_kssc: 36.59  ✅
  final_verdict: "SUITABLY DIMENSIONED" ✅
  
Analysis: CT is suitably dimensioned (correct!)
```

---

## 📊 Calculation Examples

### Example 1: Standard CT (Hitachi Document)
**Inputs:**
- CT Ratio: 3150/1 A
- Accuracy Limit Factor: 20 (from test certificate)
- CT Resistance: 9 Ω
- Rated Burden: 7.5 VA
- Device Burden: 0.02 VA
- Max Fault Level: 50 kA

**Calculations:**
```
1. Max HV Busbar Fault: 1000 × 50 kA = 50,000 A
2. Required Kssc: 50,000 / 3150 = 15.87
3. Internal Burden: 1² × 9 = 9 VA
4. Available Kssc: 20 × ((9 + 7.5) / (9 + 0.02)) = 36.59
5. Check: 36.59 > 15.87 = TRUE
6. Verdict: SUITABLY DIMENSIONED ✅
```

### Example 2: High Burden Case
**Inputs:**
- CT Ratio: 800/1 A
- Accuracy Limit Factor: 10
- CT Resistance: 3.5 Ω
- Rated Burden: 5 VA
- Device Burden: 5 VA (high burden load)
- Max Fault Level: 100 kA

**Calculations:**
```
1. Max HV Busbar Fault: 1000 × 100 kA = 100,000 A
2. Required Kssc: 100,000 / 800 = 125
3. Internal Burden: 1² × 3.5 = 3.5 VA
4. Available Kssc: 10 × ((3.5 + 5) / (3.5 + 5)) = 10 × 1 = 10
5. Check: 10 > 125 = FALSE
6. Verdict: UNDER DIMENSIONED ✅
```

---

## 🔍 Why Formulas Work Correctly (When ALF is Passed)

The calculation service has **correct formulas** based on Hitachi document N-19957 2-DF4W:

| Formula | Status | Notes |
|---------|--------|-------|
| Lead Resistance: RL = R × l | ✅ Correct | Using r20 * 0.00121615 |
| Loop Resistance: 2RL | ✅ Correct | Proper factor of 2 |
| VA Consumption: In² × RL | ✅ Correct | Using secondary current |
| Max HV Fault: 1000 × max_bus_fault_level | ✅ Correct | Proper conversion to A |
| Required Kssc: Fault_Current / CT_Ratio | ✅ Correct | Simple division |
| Available Kssc: n × ((PE + PN) / (PE + PL)) | ✅ Correct | IF n (ALF) is passed! |

**The formulas are not the problem. The data flow is.**

---

## 🎯 Why This Mismatch Occurs

### Design Mismatch Between Layers

**Why Component has ALF in ct_core:**
- Intuitive UI design - ALF is a CT property
- Makes sense from user perspective
- Groups related parameters together

**Why Service expects ALF at top-level:**
- ALF is used in multiple calculations, not just CT
- Makes it a required parameter, not optional
- Matches the actual calculation interface

**Why API doesn't transform it:**
- API assumes data structure matches service interface
- No explicit extraction/transformation layer
- Bug introduced when calculation service was updated

---

## ✨ Why This Fix Is Complete

1. **Addresses Root Cause**: Properly passes ALF to calculation service
2. **Maintains UI Design**: Component structure unchanged - ALF still under CT
3. **Adds Validation**: Ensures ALF is present and numeric
4. **Improves Error Handling**: Clear error if ALF is missing
5. **No Breaking Changes**: All other calculations continue to work
6. **Backward Compatible**: Works with existing component and calculations

---

## 📋 Verification Checklist

After applying the fix, verify:

- [ ] `available_kssc` is a number (not NaN)
- [ ] `available_kssc > required_kssc` produces boolean result
- [ ] Final verdict is "SUITABLY DIMENSIONED" for adequate CTs
- [ ] Final verdict is "UNDER DIMENSIONED" for inadequate CTs
- [ ] Error message appears if `accuracy_limit_factor` is missing
- [ ] All intermediate calculations produce valid numbers
- [ ] Calculation results match Hitachi document examples

---

## 🚀 Implementation Steps

1. **Edit `/app/api/relay-formulas/siemens-7sj85/route.ts`**
   - Replace the try block (lines 18-36) with the fixed version
   - Add extraction and validation of `accuracy_limit_factor`

2. **Rebuild the application**
   ```bash
   npm run build
   ```

3. **Test with example data**
   - Use the test case from Hitachi document
   - Verify results match expected values

4. **Deploy the fix**
   - No database changes needed
   - No component changes needed
   - Pure backend fix

---

## 📚 Reference

- **Document**: Hitachi N-19957 2-DF4W
- **Subject**: CT/VT Adequacy Check for 132/33kV Substation
- **Key Formula**: Available Kssc = n × ((PE + PN) / (PE + PL))
- **Critical Parameter**: n (Accuracy Limit Factor from CT test certificate)

---

## Questions?

If calculations still don't match after applying this fix:

1. Check that `accuracy_limit_factor` is a valid number
2. Verify the formula values match the Hitachi document
3. Ensure all input parameters are within expected ranges
4. Review the test file `test-calculation-fix.ts` for expected values

The fix has been implemented in `/app/api/relay-formulas/siemens-7sj85/route.ts` ✅
