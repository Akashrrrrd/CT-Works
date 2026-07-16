# 🚀 SIEMENS 7SJ85 Usage Guide & Testing Instructions

## What is this system for?

### 🔧 **Purpose: CT/VT Adequacy Analysis for Electrical Protection**

The SIEMENS 7SJ85 template is used for **critical electrical engineering analysis** to ensure Current Transformers (CTs) and Voltage Transformers (VTs) are properly sized for protection relay systems in high-voltage substations.

### 🏭 **Real-World Applications:**

1. **Power Plant Protection Systems**
   - Ensuring protection relays can detect faults accurately
   - Preventing equipment damage from electrical faults
   - Maintaining power system stability

2. **Industrial Substation Design**
   - 132kV/33kV transformer stations
   - Distribution system protection
   - Grid interconnection points

3. **Engineering Consultancy**
   - Design verification for utility companies
   - Compliance with international standards (IEC, IEEE)
   - Technical documentation for regulatory approval

### ⚡ **Why This Matters:**
- **Safety**: Improperly sized CTs can fail to detect dangerous faults
- **Reliability**: Ensures protection systems work during emergencies
- **Compliance**: Meets international electrical engineering standards
- **Cost**: Prevents expensive equipment failures and outages

---

## 🧪 How to Test & Verify Correctness

### Method 1: Direct API Testing (Immediate)

**Step 1: Test the API directly**
```bash
curl -X POST http://localhost:3001/api/relay-formulas/siemens-7sj85 \
  -H "Content-Type: application/json" \
  -d '{
    "ct_wiring": {
      "conductor_cross_section": 6.00,
      "resistance_w_km_20c": 3.69,
      "specific_resistance_20c": 0.00393,
      "conductor_length_m": 120
    },
    "vt_wiring": {
      "conductor_cross_section": 2.50,
      "resistance_w_km_20c": 8.87,
      "specific_resistance_20c": 0.00393,
      "conductor_length_m": 120,
      "primary_voltage": 132,
      "secondary_voltage": 0.11
    },
    "system": {
      "system_frequency": 50,
      "bus_voltage_level": 132,
      "max_bus_fault_level": 50,
      "xr_ratio": 15,
      "mv_bus_voltage_level": 132,
      "mv_max_bus_fault_rating": 40
    },
    "power_line": {
      "assumed_cable": 3,
      "cable_type": "CU HDPE",
      "cable_mm2": 240,
      "cables_per_phase": 1,
      "positive_seq_resistance_r1": 0.0221,
      "positive_seq_reactance_x1": 0.1600,
      "zero_seq_resistance_r0": 0.1300,
      "zero_seq_reactance_x0": 0.0600,
      "route_length": 1.74
    },
    "ct_core": {
      "ct_ratio_primary": 3150,
      "ct_ratio_secondary": 1,
      "class_of_accuracy": "5P 20",
      "ct_resistance": 9,
      "rated_burden": 7.5
    },
    "connected_devices": {
      "device_7sj85": 0.02,
      "device_sel751": 0.02,
      "device_fms": 0.06,
      "device_avr": 0.20
    }
  }'
```

**Expected Response (Exact Hitachi Values):**
```json
{
  "final_verdict": "SUITABLY DIMENSIONED",
  "ct_calculations": {
    "resistance_at_75c": 4.48759,
    "lead_resistance": 0.54,
    "loop_resistance": 1.08,
    "va_consumption": 1.08
  },
  "fault_calculations": {
    "system_tp_ms": 40.94,
    "through_fault_current_a": 43475,
    "endzone1_fault_current_a": 43585
  },
  "adequacy_check": {
    "required_kssc": 10.00,
    "available_kssc": 31.81,
    "suitable": true,
    "verdict": "SUITABLY DIMENSIONED"
  }
}
```

### Method 2: Web Interface Testing (User-Friendly)

**Step 1: Access the Calculator**
1. Open browser to: http://localhost:3001
2. Navigate to any workspace
3. Go to **Templates** → **SIEMENS 7SJ85**
4. URL will be: http://localhost:3001/workspaces/[workspace-id]/templates/siemens-7sj85

**Step 2: Input Test Values**
Use these exact values from the Hitachi document:

| Section | Parameter | Value |
|---------|-----------|-------|
| **CT Wiring** | Conductor Cross Section | 6.00 mm² |
| | Resistance W/km at 20°C | 3.69 Ω/km |
| | Specific Resistance | 0.00393 /K⁻¹ |
| | Conductor Length | 120 m |
| **System** | Frequency | 50 Hz |
| | Bus Voltage Level | 132 kV |
| | Max Bus Fault Level | 50 kA |
| | X/R Ratio | 15 |
| **CT Core** | CT Ratio Primary | 3150 A |
| | CT Ratio Secondary | 1 A |
| | Class of Accuracy | 5P 20 |
| | CT Resistance | 9 Ω |
| | Rated Burden | 7.5 VA |

**Step 3: Verify Results**
After clicking "Calculate CT/VT Adequacy", you should see:

✅ **Expected Results:**
- **Final Verdict:** SUITABLY DIMENSIONED
- **CT Lead Resistance:** 0.54 Ω
- **Available Kssc:** 31.81
- **Required Kssc:** 10.00
- **Check:** Available > Required ✅

---

## 🔍 Verification Checklist

### ✅ **Critical Values to Check:**

| Calculation | Expected Value | Document Reference |
|-------------|----------------|-------------------|
| CT Resistance at 75°C | 4.48759 Ω/km | Page 1, Hitachi Doc |
| CT Lead Resistance | 0.54 Ω | Page 1, Hitachi Doc |
| CT Loop Resistance | 1.08 Ω | Page 1, Hitachi Doc |
| VA Consumption | 1.08 VA | Page 1, Hitachi Doc |
| System Time Constant | 40.94 ms | Page 3, Hitachi Doc |
| Through Fault Current | 43,475 A | Page 3, Hitachi Doc |
| Endzone-1 Fault Current | 43,585 A | Page 4, Hitachi Doc |
| Required Kssc | 10.00 | Page 6, Hitachi Doc |
| Available Kssc | 31.81 | Page 6, Hitachi Doc |
| **Final Verdict** | **SUITABLY DIMENSIONED** | **Page 6, Hitachi Doc** |

### 🚨 **Error Scenarios to Test:**

1. **Under-dimensioned CT Test:**
   - Change CT Resistance to 50 Ω
   - Should get "UNDER DIMENSIONED" verdict

2. **Invalid Input Test:**
   - Enter negative values
   - Should show validation errors

3. **Missing Parameters:**
   - Leave fields empty
   - Should show required field errors

---

## 🎯 **Success Criteria:**

### ✅ **The implementation is working correctly if:**

1. **Exact Value Match:**
   - All calculated values match Hitachi document exactly
   - Final verdict is "SUITABLY DIMENSIONED"
   - Available Kssc (31.81) > Required Kssc (10.00)

2. **API Response:**
   - Returns JSON with all calculation sections
   - No errors in browser console
   - Response time < 2 seconds

3. **User Interface:**
   - All input fields accept values
   - Results display correctly
   - Document reference shown
   - Professional styling matches design

4. **Mathematical Accuracy:**
   - CT resistance temperature calculation: R₇₅ = 3.69 × (1 + 0.00393 × (75-20)) = 4.48759 Ω/km
   - Lead resistance: RL = 4.48759 × (120/1000) = 0.54 Ω
   - Loop resistance: 2RL = 2 × 0.54 = 1.08 Ω
   - Available Kssc: 20 × ((9 + 7.5)/(9 + 1.38)) = 31.81

---

## 📋 **Common Issues & Solutions:**

### 🔧 **Issue: API Returns Error**
**Solution:**
- Check server is running on port 3001
- Verify all required fields are provided
- Check browser network tab for detailed error

### 🔧 **Issue: Wrong Calculations**
**Solution:**
- Compare with expected values above
- Check input parameter units (mm², kV, Ω, etc.)
- Verify temperature coefficient (0.00393 /K⁻¹)

### 🔧 **Issue: Page Won't Load**
**Solution:**
- Ensure development server is running
- Check URL format: /workspaces/[id]/templates/siemens-7sj85
- Verify no build errors in console

---

## 🏆 **Professional Use Cases:**

### 1. **Electrical Engineering Consultancy**
- Input actual substation parameters
- Generate compliance reports
- Verify protection system design

### 2. **Utility Company Design Review**
- Check contractor calculations
- Validate equipment specifications
- Ensure safety standards compliance

### 3. **Educational/Training**
- Demonstrate CT adequacy concepts
- Compare different scenarios
- Learn protection system design

This system replaces manual calculations that typically take hours, providing instant, accurate results following international standards.