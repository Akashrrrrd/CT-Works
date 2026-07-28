# CT/VT Adequacy Calculation Validation Guide

## Overview
This document explains the validation approach for ensuring that user inputs produce dynamically calculated outputs that match expected test case values.

## Test Cases Provided

### 7SJ85 (SIEMENS) - KSSC Method

#### Test Case 1:
- **CT Ratio**: 600/1
- **Class**: 5P20
- **CT Resistance**: 8 Ω
- **Rated Burden**: 7.5 VA
- **ALF**: 20
- **Expected Output**:
  - Available Kssc: 28.91
  - Required Kssc: 52.50
  - Verdict: UNDER DIMENSIONED

#### Test Case 2:
- **CT Ratio**: 1200/1
- **Class**: 5P20
- **CT Resistance**: 10 Ω
- **Rated Burden**: 15 VA
- **ALF**: 20
- **Expected Output**:
  - Available Kssc: 39.30
  - Required Kssc: 26.25
  - Verdict: SUITABLY DIMENSIONED

#### Test Case 3:
- **CT Ratio**: 2000/1
- **Class**: 5P20
- **CT Resistance**: 20 Ω
- **Rated Burden**: 7.5 VA
- **ALF**: 20
- **Expected Output**:
  - Available Kssc: 24.20
  - Required Kssc: 15.75
  - Verdict: SUITABLY DIMENSIONED

### RED670 (ABB) - VK Method

#### Test Case 1:
- **CT Ratio**: 800/1
- **Class**: PX
- **CT Resistance**: 3.5 Ω
- **Vk**: 540 V
- **I0 Magnetizing Current**: 20 mA
- **Expected Output**:
  - Eal req Value: 713.275
  - Vk value: 570.62
  - Verdict: UNDER DIMENSIONED

#### Test Case 2:
- **CT Ratio**: 1000/1
- **Class**: PX
- **CT Resistance**: 5 Ω
- **Vk**: 600 V
- **I0 Magnetizing Current**: 30 mA
- **Expected Output**:
  - Eal req Value: 707.711
  - Vk value: 566.17
  - Verdict: SUITABLY DIMENSIONED

#### Test Case 3:
- **CT Ratio**: 2500/1
- **Class**: PX
- **CT Resistance**: 5 Ω
- **Vk**: 3750 V
- **I0 Magnetizing Current**: 60 mA
- **Expected Output**:
  - Eal req Value: 283.08
  - Vk value: 226.47
  - Verdict: SUITABLY DIMENSIONED

### Common System Input Parameters:
- Conductor Cross section: 2.50 mm²
- Resistance @ 20°C: 7.41 Ω/km
- Specific resistance: 0.00393 /K
- Conductor Length: 150 m
- System frequency: 50 Hz
- Bus voltage level: 33 kV
- Max. bus fault level: 31.5 kA
- X/R Ratio: 40
- R1: 0.0221 Ω/km
- X1: 0.16 Ω/km
- R0: 0.1300 Ω/km
- X0: 0.06 Ω/km
- ROUTE LENGTH: 0.20 km

## Architecture

### Calculation Engine Layers

#### 1. **Automated Calculation Engine** (`automated-calculation-engine.ts`)
- Entry point that takes `CTVTAdequacyInput` from the UI
- Maps UI inputs to the core calculation engine format
- Orchestrates both KSSC and VK method calculations
- Returns `CTVTAdequacyReport` with results

#### 2. **Core Calculation Engine** (`calculation-engine.ts`)
- Contains `runFullAnalysis()` function
- Uses `convertLegacyInput()` to prepare data
- Calls `evaluateBay()` to perform calculations
- Uses `convertEngineResult()` to format output
- Supports both Kssc (SIEMENS 7SJ85) and Vk (RED670) methods

#### 3. **Method-Specific Calculators**

##### **SIEMENS 7SJ85 Calculator** (`siemens-7sj85-calculations.ts`)
- **Method**: Accuracy Limit Factor (ALF) / Kssc approach
- **Key Calculations**:
  - Required Kssc = Itkmax / Ipn
  - Available Kssc = n × [(PE + PN) / (PE + PL)]
  - PE (Internal Burden) = In² × Rct
  - PL (Lead Burden) = Is² × RL
- **Input**: CT ratio, Rct, burden, ALF, wiring parameters
- **Output**: required_kssc, available_kssc, verdict

##### **RED670 Calculator** (`red670-calculations.ts`)
- **Method**: Knee-Point Voltage (Vk) / Ealreq approach
- **Key Calculations**:
  - Ealreq = K × (If / n) × (Rct + 2RL + Rr)
  - Vk comparison for suitability
- **Input**: CT ratio, Rct, Vk, magnetizing current, wiring parameters
- **Output**: vk_required, vk_available, ealreq_max, verdict

## Data Flow

```
User Input (UI)
    ↓
AdequacyWizard.tsx
    ↓
AutomatedCalculationEngine.performCompleteAnalysis()
    ↓
runFullAnalysis(FullAnalysisInput)
    ↓
convertLegacyInput() → converts to internal format
    ↓
evaluateBay() → performs calculations
    ↓
convertEngineResult() → formats results
    ↓
DeviceResult with intermediates
    ↓
PDF Report Generator
    ↓
PDF Output (all values from intermediates)
```

## Dynamic Calculation Guarantee

### 1. **All Intermediates Stored**
Every calculation result includes an `intermediates` object containing:
- All input parameters
- All intermediate calculated values
- Calculation method identifier
- Formula descriptions

### 2. **PDF Generation Uses Intermediates**
The PDF report (`pdf-report.ts`):
- Pulls ALL values from `device.intermediates`
- No hardcoded example values
- Displays method-specific formulas
- Shows substituted formula values

### 3. **Method Detection**
The system automatically detects whether to use Kssc or Vk based on:
- Device type (SIEMENS_7SJ85 vs ABB_RED670)
- IED template selected
- Input parameters available

## Validation Testing

### Test Execution
To validate that calculations match expected outputs:

```bash
# Run SIEMENS 7SJ85 verification
npx ts-node tests/siemens-7sj85-verification.ts

# Run complete test suite
npm run test:adequacy
```

### Expected Output Format
All calculations return values matching this structure:

```typescript
interface DeviceResult {
  device_name: string;
  device_type: DeviceType;
  verdict: 'SUITABLY DIMENSIONED' | 'UNDER DIMENSIONED' | 'NOT APPLICABLE';
  
  // Kssc method (SIEMENS 7SJ85)
  kssc_available?: number;
  kssc_required?: number;
  
  // Vk method (ABB RED670)
  vk_available?: number;
  vk_required?: number;
  ealreq_max?: number;
  
  // Calculation method tracker
  calculation_method?: 'KSSC' | 'VK_METHOD';
  
  // All intermediates for transparency
  intermediates: Record<string, number | string>;
}
```

## Fixes Applied

### 1. **Extended DeviceResult Interface**
- Added `kssc_available` and `kssc_required` fields
- Added `calculation_method` field to track which method was used
- Updated all calculator return statements

### 2. **Enhanced Intermediates**
- SIEMENS 7SJ85: Added 25+ intermediate values
- RED670: Added 20+ intermediate values
- All values computed from user inputs

### 3. **PDF Report Updates**
- Conditional rendering based on `calculation_method`
- All values pulled from `intermediates`
- Formula descriptions included
- No hardcoded values

## Validation Checklist

When testing with new input values:

1. **Inputs are captured correctly**
   - ✓ All user inputs stored in `inputs` object
   - ✓ No default/hardcoded values used

2. **Calculations use inputs**
   - ✓ Intermediate values computed from inputs
   - ✓ Each calculation step visible in intermediates
   - ✓ Formula substitutions shown

3. **Outputs match expected values**
   - ✓ Required Kssc = Itkmax / Ipn (±0.01)
   - ✓ Available Kssc = n × [(PE + PN) / (PE + PL)] (±0.01)
   - ✓ Verdict correct based on comparison

4. **PDF displays correctly**
   - ✓ All values from intermediates (not hardcoded)
   - ✓ Correct formulas for method
   - ✓ Substituted values visible
   - ✓ Inputs and outputs both present

## Known Constraints

1. **Floating-Point Tolerance**: ±0.01 for most calculations
2. **Method Detection**: Automatic, cannot override (prevent user error)
3. **Temperature**: Standardized at 75°C for wiring resistance
4. **Frequency**: Must be 50 or 60 Hz

## Future Enhancements

1. Add batch processing for multiple test cases
2. Export calculation trace for audit trails
3. Add custom tolerance configuration
4. Support additional IED templates
