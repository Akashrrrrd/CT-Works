# 🧪 **VERIFICATION TEST PROJECT**
## **Complete Test Case with Expected Results**

---

## 📋 **TEST PROJECT DETAILS**

### **Project Information (Step 1)**
```
Project Name: "Beta Substation CT/VT Check"
Substation: "Beta Industrial Switching Station"
Engineer: "Test Engineer"
Date: "2026-07-17"
Voltage Level: "132kV"
```

### **System Parameters (Step 2)**
```
Bus Voltage Level: 132 kV
System Frequency: 50 Hz
Bus Fault Level: 31.5 kA (3-phase)
X/R Ratio: 15
```

### **Wiring Configuration (Step 3)**
```
CT Wiring:
- Cross Section: 6 mm²
- Resistance @ 20°C: 3.08 Ω/km (auto-filled)
- Lead Length: 120 meters

VT Wiring:
- Cross Section: 2.5 mm²
- Resistance @ 20°C: 7.41 Ω/km (auto-filled)
- Lead Length: 120 meters
```

### **Line Parameters (Step 4)**
```
Positive Sequence Resistance (R1): 0.0271 Ω/km
Positive Sequence Reactance (X1): 0.1600 Ω/km
Zero Sequence Resistance (R0): 0.1300 Ω/km
Zero Sequence Reactance (X0): 0.0600 Ω/km
Route Length: 1.74 km
```

### **IED Selection (Step 5)**
```
IED #1: SIEMENS 7SJ85
- CT Ratio: 3200/1A
- Accuracy Class: 5P20
- CT Resistance: 2.5 Ω
- Knee Point Voltage: 2000 V
- Magnetizing Current: 10 mA
- IED Burden: 0.5 VA (auto from database)

IED #2: ABB RET670
- CT Ratio: 1600/1A
- Accuracy Class: PX
- CT Resistance: 1.8 Ω
- Knee Point Voltage: 1600 V
- Magnetizing Current: 5 mA
- IED Burden: 0.1 VA (auto from database)

IED #3: SEL 751
- CT Ratio: 1600/1A
- Accuracy Class: 5P20
- CT Resistance: 1.5 Ω
- Knee Point Voltage: 1200 V
- Magnetizing Current: 8 mA
- IED Burden: 0.33 VA (auto from database)
```

---

## 🧮 **EXPECTED CALCULATION RESULTS**

### **System Calculations (Automatic)**
```
Phase Voltage = 132,000 ÷ √3 = 76,210 V
Max Fault Current = 31.5 × 1000 = 31,500 A
Source Impedance = 76,210 ÷ 31,500 = 2.4194 Ω
X/R = 15, so:
- Source Resistance = 2.4194 ÷ √(1 + 15²) = 0.1603 Ω
- Source Reactance = 0.1603 × 15 = 2.4045 Ω
Time Constant = 15 ÷ (2π × 50) = 0.0477 s
```

### **Wiring Calculations (Automatic)**
```
CT Wiring:
- Temperature = 50°C (outdoor assumption)
- Resistance @ 50°C = 3.08 × (1 + 0.00393 × (50-20)) = 3.44 Ω/km
- Lead Resistance = (120/1000) × 3.44 = 0.413 Ω (one-way)
- Loop Resistance = 2 × 0.413 = 0.826 Ω

VT Wiring:
- Resistance @ 50°C = 7.41 × (1 + 0.00393 × 30) = 8.28 Ω/km
- Loop Resistance = 2 × (120/1000) × 8.28 = 1.987 Ω
```

### **Zone 1 Fault Calculations (80% reach)**
```
Z1 Total = √((0.0271 × 1.74)² + (0.1600 × 1.74)²) = 0.283 Ω
Zone 1 Impedance = √((0.1603 + 0.8 × 0.047)² + (2.4045 + 0.8 × 0.278)²) = 2.51 Ω
Zone 1 Fault Current 3ph = 76,210 ÷ (2.51 × √3) = 17,540 A

Z0 Total for 1ph = √((0.1300 × 1.74)² + (0.0600 × 1.74)²) = 0.249 Ω
Zone 1 Fault Current 1ph = (3 × 76,210) ÷ (2.51 + 0.8 × 0.249) = 85,340 A
```

---

## 📊 **EXPECTED IED RESULTS**

### **IED #1: SIEMENS 7SJ85**
```
Input Summary:
- CT Ratio: 3200/1A
- Accuracy: 5P20 (ALF = 20)
- CT Resistance: 2.5 Ω
- Available Vk: 2000 V
- IED Burden: 0.5 VA

Burden Calculations:
- CT Internal Burden = 1² × 2.5 = 2.5 VA
- Lead Burden = 1² × 0.826 = 0.826 VA
- IED Burden = 0.5 VA (from database)
- Total Burden = 2.5 + 0.826 + 0.5 = 3.826 VA

KSSC Method:
- Required Kssc = 31,500 ÷ 3200 = 9.84
- Rated Burden (PN) = 7.5 VA (typical for protection CT)
- Available Kssc = 20 × (2.5 + 7.5) ÷ (2.5 + 0.826) = 60.18
- Safety Margin = (60.18 - 9.84) ÷ 9.84 × 100 = 512%

Vk Method:
- Max Secondary Current = 31,500 ÷ 3200 = 9.84 A
- Required Vk = 9.84 × (2.5 + 0.826 + 0.5) = 37.7 V
- Available Vk = 2000 V
- Safety Margin = (2000 - 37.7) ÷ 37.7 × 100 = 5203%

VERDICT: ✅ SUITABLE (Both methods pass with huge margins)
```

### **IED #2: ABB RET670**
```
Input Summary:
- CT Ratio: 1600/1A
- Accuracy: PX (ALF = 1, uses Vk method primarily)
- CT Resistance: 1.8 Ω
- Available Vk: 1600 V
- IED Burden: 0.1 VA

Burden Calculations:
- CT Internal Burden = 1² × 1.8 = 1.8 VA
- Lead Burden = 1² × 0.826 = 0.826 VA
- IED Burden = 0.1 VA
- Total Burden = 1.8 + 0.826 + 0.1 = 2.726 VA

Vk Method (Primary for PX class):
- Max Secondary Current = 31,500 ÷ 1600 = 19.69 A
- Required Vk = 19.69 × (1.8 + 0.826 + 0.1) = 53.7 V
- Available Vk = 1600 V
- Safety Margin = (1600 - 53.7) ÷ 53.7 × 100 = 2881%

KSSC Method (Backup):
- Required Kssc = 31,500 ÷ 1600 = 19.69
- Available Kssc = 1 × (1.8 + 10) ÷ (1.8 + 0.826) = 4.49
- This fails, but PX class uses Vk method

VERDICT: ✅ SUITABLE (Vk method passes with excellent margin)
```

### **IED #3: SEL 751**
```
Input Summary:
- CT Ratio: 1600/1A
- Accuracy: 5P20 (ALF = 20)
- CT Resistance: 1.5 Ω
- Available Vk: 1200 V
- IED Burden: 0.33 VA

Burden Calculations:
- CT Internal Burden = 1² × 1.5 = 1.5 VA
- Lead Burden = 1² × 0.826 = 0.826 VA
- IED Burden = 0.33 VA
- Total Burden = 1.5 + 0.826 + 0.33 = 2.656 VA

KSSC Method:
- Required Kssc = 31,500 ÷ 1600 = 19.69
- Available Kssc = 20 × (1.5 + 7.5) ÷ (1.5 + 0.826) = 77.39
- Safety Margin = (77.39 - 19.69) ÷ 19.69 × 100 = 293%

Vk Method:
- Max Secondary Current = 31,500 ÷ 1600 = 19.69 A
- Required Vk = 19.69 × (1.5 + 0.826 + 0.33) = 52.2 V
- Available Vk = 1200 V
- Safety Margin = (1200 - 52.2) ÷ 52.2 × 100 = 2200%

VERDICT: ✅ SUITABLE (Both methods pass with excellent margins)
```

---

## 🎯 **OVERALL EXPECTED RESULTS**

### **Results Dashboard Should Show:**
```
┌─────────────────────────────────────────────────────────┐
│ RESULTS SUMMARY │
├─────────────────────────────────────────────────────────┤
│ SIEMENS 7SJ85 │ 🟢 SUITABLE │ Safety: +512% │
│ ABB RET670 │ 🟢 SUITABLE │ Safety: +2881% │
│ SEL 751 │ 🟢 SUITABLE │ Safety: +293% │
├─────────────────────────────────────────────────────────┤
│ OVERALL VERDICT: 🟢 ALL SUITABLE │
│ 3/3 IEDs are suitably dimensioned │
└─────────────────────────────────────────────────────────┘
```

### **Key Numbers to Verify:**
```
System:
✓ Phase Voltage: 76,210 V
✓ Max Fault Current: 31,500 A
✓ Source Impedance: 2.4194 Ω

Wiring:
✓ CT Loop Resistance: 0.826 Ω
✓ VT Loop Resistance: 1.987 Ω

SIEMENS 7SJ85:
✓ Required Kssc: 9.84
✓ Available Kssc: ≈60
✓ Required Vk: ≈38 V
✓ Available Vk: 2000 V
✓ Verdict: SUITABLE

ABB RET670:
✓ Required Vk: ≈54 V
✓ Available Vk: 1600 V
✓ Verdict: SUITABLE

SEL 751:
✓ Required Kssc: 19.69
✓ Available Kssc: ≈77
✓ Required Vk: ≈52 V
✓ Available Vk: 1200 V
✓ Verdict: SUITABLE
```

---

## 🧪 **VERIFICATION STEPS**

### **1. Navigate to Website:**
```
http://localhost:3001/ct-vt-adequacy
```

### **2. Enter Exact Values:**
Follow the 6-step wizard with the exact values above

### **3. Compare Results:**
Check that the calculated values match my predictions within ±5%

### **4. Key Verification Points:**
- [ ] Phase voltage ≈ 76,210 V
- [ ] Max fault current = 31,500 A
- [ ] CT loop resistance ≈ 0.826 Ω
- [ ] All 3 IEDs show SUITABLE verdict
- [ ] SIEMENS 7SJ85 safety margin > 500%
- [ ] ABB RET670 safety margin > 2800%
- [ ] SEL 751 safety margin > 290%
- [ ] Overall verdict: ALL SUITABLE

---

## 🎯 **EXPECTED CALCULATION ACCURACY**

The results should be **highly accurate** because:

✅ **System calculations** based on fundamental electrical engineering formulas 
✅ **IED burdens** from verified database of manufacturer specifications 
✅ **Cable resistances** from standard electrical tables 
✅ **CT adequacy** using IEC 61869-2 and IEEE C37.110 methods 
✅ **Temperature corrections** applied to cable resistance 
✅ **Multiple verification methods** (KSSC + Vk) for cross-checking 

The safety margins are intentionally **very high** in this test case to ensure clear SUITABLE verdicts. In real applications, margins of 20-50% are typical and acceptable.

**Now please test these exact values on the website and let me know if the results match my predictions! 🧪**