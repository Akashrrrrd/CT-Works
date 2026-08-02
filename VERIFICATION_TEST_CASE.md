# SIEMENS 7SJ85 - VERIFICATION TEST CASE
## Complete Input & Expected Output for Accuracy Verification

---

## TEST CASE #1: Standard 33kV Feeder Protection (From Standard Engineering Document)

### ✅ INPUT VALUES (What you enter when creating IED):

**CT DATA (Nameplate Parameters):**
- CT Primary (Ipn): **600** A
- CT Secondary (In): **1** A
- Accuracy Class: **5P20**
- Rct (CT Resistance): **3.5** Ω
- Vk Available: **400** V
- Io at Vk: **30** mA
- Rated Burden: **15** VA
- ALF (Accuracy Limit Factor): **20**

**CT WIRING (Cable Parameters):**
- Conductor Cross Section: **2.5** mm²
- Resistance @ 20°C: **7.41** Ω/km
- Temperature Coefficient: **0.00393** /K
- Operating Temperature: **75** °C
- Cable Length: **50** m
- Relay Rated Current: **1** A

**SYSTEM PARAMETERS:**
- System Frequency: **50** Hz
- Bus Voltage: **33** kV
- Max Fault Current: **12.5** kA
- X/R Ratio: **15**

**POWER LINE (Cable Impedance):**
- R1 (Positive Seq Resistance): **0.0221** Ω/km
- X1 (Positive Seq Reactance): **0.1600** Ω/km
- R0 (Zero Seq Resistance): **0.1300** Ω/km
- X0 (Zero Seq Reactance): **0.0600** Ω/km
- Route Length: **1.74** km

**CONNECTED IEDs/DEVICES:**
- Device 1: **SIEMENS 7SJ85** - Burden: **0.02** VA
- Device 2: **Energy Meter** - Burden: **0.02** VA

---

## ✅ EXPECTED OUTPUT VALUES (What website should show):

### CT WIRING CALCULATIONS:
```
Resistance @ 75°C: 8.99 Ω/km (7.41 × 1.21615)
Lead Resistance (RL): 0.45 Ω (8.99 × 50m)
Loop Resistance (2RL): 0.90 Ω (2 × 8.99 × 50m)
VA Consumption: 0.90 VA (1² × 8.99 × 50m)
```

### FAULT CURRENT CALCULATIONS:
```
Max HV Busbar Fault Current: 12,500 A (12.5 kA × 1000)
HV Rating of Busbar: 33,000 V (33 kV × 1000)
Source Impedance Zs: 1.52 Ω (33000 / (√3 × 12500))
Time Constant (Tp): 47.75 ms (15 / (2π × 50))
```

### BURDEN CALCULATIONS:
```
Internal Burden (PE): 3.50 VA (1² × 3.5)
Wiring Burden (PL_wiring): 0.90 VA (Loop resistance)
Device Burden (PL_devices): 0.04 VA (0.02 + 0.02)
Total Burden (PL_total): 0.94 VA (0.90 + 0.04)
Rated Burden (PN): 15.00 VA
```

### CT ADEQUACY CHECK (CORE FORMULAS):
```
Required Kssc: 20.83 (12,500 / 600)
Available Kssc: 99.47 (20 × ((3.5 + 15) / (3.5 + 0.94)))
 = 20 × ((18.5) / (4.44))
 = 20 × 4.4686
 = 89.37

Suitable?: YES ✓
Verdict: "SUITABLY DIMENSIONED"
```

### VK CALCULATIONS:
```
Vk Available: 400 V (From CT nameplate)
Vk Required: 72.91 V (20.83 × 3.5)
Ealreq Max: 72.91 V (Same as Vk Required)
```

---

## VERIFICATION CHECKLIST:

When you create the IED with the input values above and click **"Compute"**, the website should show:

```
✓ Vk Required: 72.91 V (±1 decimal place acceptable)
✓ Vk Available: 400 V
✓ Ealreq Max: 72.91 V
✓ Verdict: "SUITABLY DIMENSIONED"
✓ Available Kssc: ~89.37 (Should be > Required Kssc 20.83)
✓ Required Kssc: 20.83
```

---

## STEP-BY-STEP MANUAL CALCULATION (For Reference):

### Step 1: Resistance at 75°C
```
R(75°C) = R20 × [1 + a(t - 20)]
R(75°C) = 7.41 × [1 + 0.00393 × (75 - 20)]
R(75°C) = 7.41 × [1 + 0.21615]
R(75°C) = 7.41 × 1.21615
R(75°C) = 8.9037 Ω/km ≈ 8.99 Ω/km ✓
```

### Step 2: Loop Resistance (go + return)
```
2RL = 2 × R(75°C) × length(m)
2RL = 2 × 8.99 × 50
2RL = 0.8991 Ω ≈ 0.90 Ω ✓
```

### Step 3: Fault Current Conversion
```
Itkmax = Fault Level (kA) × 1000
Itkmax = 12.5 × 1000
Itkmax = 12,500 A ✓
```

### Step 4: Required Kssc
```
Required Kssc = Itkmax / Ipn
Required Kssc = 12,500 / 600
Required Kssc = 20.833 ✓
```

### Step 5: Internal Burden
```
PE = In² × Rct
PE = 1² × 3.5
PE = 3.5 VA ✓
```

### Step 6: Total Burden
```
PL_total = PL_wiring + PL_devices
PL_total = 0.90 + 0.04
PL_total = 0.94 VA ✓
```

### Step 7: Available Kssc (CORE FORMULA)
```
Available Kssc = n × ((PE + PN) / (PE + PL))
Available Kssc = 20 × ((3.5 + 15) / (3.5 + 0.94))
Available Kssc = 20 × (18.5 / 4.44)
Available Kssc = 20 × 4.4686
Available Kssc = 89.37 ✓
```

### Step 8: Verdict
```
IF Available Kssc > Required Kssc:
 89.37 > 20.83 → TRUE ✓
 Verdict = "SUITABLY DIMENSIONED" ✓
```

### Step 9: Vk Required
```
Vk Required = Required Kssc × Rct
Vk Required = 20.833 × 3.5
Vk Required = 72.916 V ≈ 72.91 V ✓
```

---

## WHAT HAPPENS NEXT:

### **If Website Output Matches Exactly:**
✅ **SUCCESS!** The calculation engine is working correctly
- All formulas are implemented properly
- Data flow is correct
- Ready for production use

### **If Website Output Doesn't Match:**
❌ **Need More Investigation:**
- Compare the exact values shown vs expected
- Identify which calculation is wrong
- Examples of potential issues:
 - If `Vk Required` is very different (like 200V instead of 72.91V)
 - If `Available Kssc` doesn't match
 - If `Resistance @ 75°C` is wrong
 - If connected device burdens not being summed correctly

---

## INSTRUCTIONS TO TEST:

1. **Open your website** and navigate to create new IED
2. **Enter all INPUT VALUES exactly as listed above**
3. **Click "Compute"**
4. **Compare the website output with EXPECTED OUTPUT**
5. **Let me know the results:**
 - Did it match? (screenshot would help)
 - Which values were different?
 - By how much?

---

## NOTES:

- All values use **precision to 2 decimal places** for final display
- Intermediate calculations use full precision internally
- If off by 1-2 in the last digit due to rounding, that's acceptable
- If off by significant amounts, we found the remaining bug

