# QUICK FIX SUMMARY - Siemens 7SJ85 Calculation Accuracy

## What Was Fixed

### Problem 1: Missing Form Input Capture
**Before:** Form fields in Wiring, System, and Line tabs were NOT being captured into state
**After:** All tabs now properly update state variables when you type values

### Problem 2: Incomplete Data Sent to Backend
**Before:** Only partial data was being sent to the computation API
**After:** Complete sheet1 and sheet2 objects with all required fields are now sent

### Problem 3: Direct Siemens 7SJ85 Calculator Not Being Used
**Before:** Data was being converted to a legacy format that wasn't matching the exact Hitachi formulas
**After:** The API now calls Siemens7SJ85Calculator directly with correctly mapped inputs

---

## Files Changed

1. **app/workspaces/[id]/substations/[subId]/bays/[bayId]/page.tsx**
   - Added proper state binding for all form tabs (Wiring, System, Line)
   - Added ctSecondary, ratedBurden, and alf fields to iedForm state
   - Restructured systemParams to include all calculation parameters
   - Updated Compute button to build complete sheet1 and sheet2 objects
   - Fixed Modify button hover state (no more white-on-white text)

2. **app/api/workspaces/[id]/computations/route.ts**
   - Added direct Siemens7SJ85Calculator route for SIEMENS_7SJ85 template type
   - Direct mapping from sheet1/sheet2 to calculator input format
   - Removed intermediate conversion layers that were losing data

---

## How to Test

### Step 1: Navigate to Create IED
1. Open your workspace
2. Select a Substation → Bay
3. Click the "+ New IED" card

### Step 2: Fill in CT Data Tab
```
CT Primary (Ipn):      600
CT Secondary (In):     1
Accuracy Class:        5P20
Rct (Ω):              3.5
Rated Burden (VA):     15
ALF:                   20
Vk Available (V):      400
Io at Vk (mA):        30
```

### Step 3: Fill in Wiring Tab
```
Conductor (mm²):       2.5
R at 20°C (Ω/km):     7.41
Temp. Coefficient:     0.00393
Temperature (°C):      75
Cable Length (m):      50
```

### Step 4: Fill in System Tab
```
Frequency (Hz):        50
Bus Voltage (kV):      33
Max Fault (kA):       12.5
X/R Ratio:            15
```

### Step 5: Fill in Line Tab
```
R1 (Ω/km):            0.0221
X1 (Ω/km):           0.1600
R0 (Ω/km):           0.1300
X0 (Ω/km):           0.0600
Line Length (km):      1.74
```

### Step 6: Click "Compute"
- Model should auto-select: SIEMENS 7SJ85
- Should see results below

### Step 7: Expected Output Values
```
✓ Vk Required:     72.91 V    (±0.5 accepted)
✓ Vk Available:    400 V
✓ Ealreq Max:      72.91 V
✓ Verdict:         "SUITABLY DIMENSIONED"
```

---

## What Changed in the Calculator Path

**OLD PATH:**
```
Frontend sheet1/sheet2 
→ Legacy conversion in project-calculations.ts 
→ Complex intermediate format 
→ Loss of data/precision 
→ Wrong calculations
```

**NEW PATH:**
```
Frontend sheet1/sheet2 (complete with all fields)
→ Direct Siemens7SJ85Calculator.performCompleteCalculation()
→ Exact Hitachi N-19957 2-DF4W formulas
→ Correct calculations
```

---

## Exact Formulas Being Used (Verified)

### Temperature Correction
```
R(75°C) = R20 × 1.21615
Where 1.21615 = [1 + 0.00393 × (75 - 20)]
```

### Core CT Adequacy Formula
```
Available Kssc = n × ((PE + PN) / (PE + PL))
Where:
  n = Accuracy Limit Factor (ALF)
  PE = Internal Burden (In² × Rct) = 1² × 3.5 = 3.5 VA
  PN = Rated Burden = 15 VA
  PL = Loop resistance + device burdens
```

### Required Kssc
```
Required Kssc = Itkmax / Ipn
Where Itkmax = Max fault current in Amperes
```

### Vk Required
```
Vk Required = Required Kssc × Rct
```

---

## Build Status
✅ Successfully compiled with no errors

---

## Next Steps
1. Test with the input values above
2. Report if output matches expected values
3. If it matches → ✅ CALCULATIONS ARE CORRECT
4. If it doesn't match → Report which values differ and by how much

