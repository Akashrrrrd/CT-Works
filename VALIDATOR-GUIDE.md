# Dynamic Calculation Validator - Quick Start Guide

## What Is This?

The **Calculation Validator** is a dedicated debug page where you can test the dynamic calculations with ANY input values and verify outputs match expected results.

## How to Access

1. **Start the dev server**: `npm run dev`
2. **Navigate to**: `http://localhost:3000/debug/calculation-validator`

Or deploy to production and access at: `{your-domain}/debug/calculation-validator`

## How to Use

### Step 1: Select Calculation Method
Choose between:
- **7SJ85 (KSSC Method)** - For SIEMENS relays
- **RED670 (Vk Method)** - For ABB relays

### Step 2: Quick Test Cases
Click any pre-loaded test case button to instantly populate input fields with known test data:
- 3 test cases for 7SJ85
- 3 test cases for RED670

### Step 3: Modify Inputs (Optional)
Edit any input field to test with different values. Change values whenever you want to test how calculations respond.

### Step 4: Run Calculation
Click "Run Calculation" to execute the dynamic calculation with your inputs.

### Step 5: Verify Results
Compare your results with expected values:
- **Green ✓ Match** - Calculation is correct
- **Red ✗ Mismatch** - Something is wrong
- **Tolerance**: ±0.01 (0.01 error margin)

### Step 6: Inspect Intermediates
Click "Show All Intermediates" to see every calculated value that fed into the final result.

## Test Cases Included

### 7SJ85 (KSSC Method)

| Test Case | CT Ratio | Rct (Ω) | Burden (VA) | Expected Available | Expected Required |
|-----------|----------|---------|------------|-------------------|-------------------|
| 1 | 600/1 | 8 | 7.5 | 28.91 | 52.50 |
| 2 | 1200/1 | 10 | 10 | 24.50 | 26.25 |
| 3 | 2000/1 | 12 | 12 | 20.80 | 15.75 |

### RED670 (Vk Method)

| Test Case | CT Ratio | Rct (Ω) | Burden (VA) | Expected Available Vk | Expected Required Vk |
|-----------|----------|---------|------------|----------------------|----------------------|
| 1 | 800/1 | 6 | 5 | 1189.02 | 703.90 |
| 2 | 1000/1 | 8 | 7.5 | 1224.09 | 763.45 |
| 3 | 2500/1 | 15 | 15 | 1350.50 | 1245.80 |

## Validation Checklist

Run these tests to confirm dynamic calculations are working:

### ✓ Test 1: Load Test Cases
- [ ] Click each pre-loaded test case
- [ ] Verify inputs populate correctly
- [ ] Run calculation
- [ ] Verify results show "✓ Match"

### ✓ Test 2: Modify Inputs
- [ ] Load Test Case 1
- [ ] Change CT Ratio Primary from 600 to 650
- [ ] Run calculation
- [ ] Verify results change (are NOT cached)
- [ ] Change back to 600
- [ ] Run calculation
- [ ] Verify original results return

### ✓ Test 3: Random Values
- [ ] Load Test Case 1
- [ ] Change all inputs to random values
- [ ] Run calculation
- [ ] Verify intermediates show computed values
- [ ] Verify no hardcoded example values

### ✓ Test 4: Both Methods
- [ ] Test all 3 cases for 7SJ85
- [ ] Test all 3 cases for RED670
- [ ] Verify all show "✓ Match"

### ✓ Test 5: Intermediates
- [ ] Run any calculation
- [ ] Expand "Show All Intermediates"
- [ ] Verify values are numeric and computed
- [ ] Verify values make sense for the inputs

## What This Proves

✅ **Calculations are truly dynamic** - Changing inputs produces different outputs  
✅ **No hardcoded values** - All results computed from user inputs  
✅ **Correct calculation logic** - Results match expected test cases  
✅ **Transparency** - All intermediates visible for audit  
✅ **Reproducibility** - Same inputs always give same outputs  

## Troubleshooting

### "Calculation failed" error
- Check browser console for details
- Verify all input values are numeric
- Try reloading the page

### Results don't match expected values
- Check that you selected the correct method (7SJ85 vs RED670)
- Verify input values match the test case
- Look at intermediates to debug calculation steps

### App won't compile
- Run `npm run build` to check for TypeScript errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## API Endpoint

The validator uses this API endpoint internally:

```
POST /api/debug/validate-calculation

Request:
{
  "method": "siemens_7sj85" | "red670",
  "inputs": {
    "ct_ratio_primary": number,
    "ct_ratio_secondary": number,
    "ct_resistance": number,
    "lead_resistance": number,
    "relay_burden_va": number,
    ...
  }
}

Response:
{
  "kssc_required": number,
  "kssc_available": number,
  "verdict": string,
  "calculation_method": string,
  "intermediates": { ... }
}
```

## Production Deployment

To disable this debug page in production:

1. Move `/app/debug/calculation-validator/page.tsx` to a private folder
2. Add authentication check to the page
3. Or set an environment variable to enable/disable debug pages

## Next Steps

After validator confirms calculations are correct:

1. **Deploy to production** - Push changes to main branch
2. **Test in live app** - Navigate to `/ct-vt-adequacy` in production
3. **Download PDF** - Verify PDF reports show computed values
4. **User acceptance** - Have users validate with their own data
