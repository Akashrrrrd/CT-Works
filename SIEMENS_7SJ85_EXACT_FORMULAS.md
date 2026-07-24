# SIEMENS 7SJ85 - EXACT FORMULAS FROM HITACHI N-19957 2-DF4W

## PAGE 1: CT WIRING BURDEN CALCULATIONS

### CT WIRING PARAMETERS (Input):
```
A = Conductor cross section (mm²)
R20 = Resistance in Ω/km at 20°C
a = Specific resistance at 20°C (copper wires) = 0.00393 /°K
l = Conductor length in meters (CT to relay)
t = Operating temperature (°C) = 75°C
Is = Secondary current of CT (A)
Ir = Relay Rated current (A)
```

### CT WIRING CALCULATIONS:

**Step 1: Resistance @ 75°C**
```
R(t) = R20 × [1 + a(t - 20°C)]
R(75°C) = R20 × [1 + 0.00393 × (75 - 20)]
R(75°C) = R20 × [1 + 0.00393 × 55]
R(75°C) = R20 × 1.21615
```

**Step 2: Lead Resistance (one-way)**
```
RL = R(75°C) × l
```

**Step 3: Lead Resistance of Current Loop (go + return)**
```
2RL = 2 × R(75°C) × l
```

**Step 4: VA Consumption of Connecting Leads**
```
Pl = Is² × R(75°C) × l
```

---

## PAGE 2: SYSTEM PARAMETERS & CABLE DETAILS

### SYSTEM PARAMETERS (Input):
```
f = System Frequency (Hz)
Vbus = Bus Voltage Level (kV)
Ifmax = Max. Bus fault level (kA)
X/R = X/R Ratio
```

### FAULT CURRENT CALCULATIONS:

**Maximum HV Busbar Fault Current:**
```
Itkmax = Ifmax × 1000
(Convert kA to A)
```

**Source Impedance Zs:**
```
Zs = (Vbus × 1000) / (√3 × Itkmax)
(Where Vbus is in kV, need to convert to V)
```

**HV Rating of Busbar:**
```
Vbusbar = Vbus × 1000 (in Volts)
```

### CABLE PARAMETERS (Input):
```
R1 = Positive Sequence Resistance (Ω/km)
X1 = Positive Sequence Reactance (Ω/km)
R0 = Zero Sequence Resistance (Ω/km)
X0 = Zero Sequence Reactance (Ω/km)
L = Route length (km)
```

### CABLE IMPEDANCE CALCULATIONS:

**Positive Sequence Impedance per km:**
```
Z1 = R1 + jX1
```

**Zero Sequence Impedance per km:**
```
Z0 = R0 + jX0
```

**Total Cable Positive Sequence Impedance:**
```
Z1L = (R1 × L) + j(X1 × L)
```

**Total Cable Zero Sequence Impedance:**
```
Z0L = (R0 × L) + j(X0 × L)
```

---

## PAGE 3-4: FAULT CURRENT & TIME CONSTANT CALCULATIONS

### 1-PHASE TO EARTH THROUGH FAULT:

**Cable Impedance Zot:**
```
Zot = Zs + Z0L
```

**Fault Impedance Zft:**
```
Zft = Zit + Z2t + Zot
```

**1-Phase Fault Current:**
```
I(1-ph, through) = (Vbus × 1.0 × √3) / Zft
```

**X/R Ratio for 1-phase through fault:** From document = 8.60

**Time Constant (1-phase through):**
```
tp(1-ph,through) = (X/R) / (2 × π × f)
tp(1-ph,through) = 8.60 / (2 × π × 50) = 27.37 ms
```

---

### 3-PHASE FAULT ENDZONE-1 (80%):

**Fault Impedance Z1zone-1:**
```
Z1zone-1 = Zs + (0.8 × Z1L)
```

**Fault Impedance Zfzone1:**
```
Zfzone1 = Z1zone-1 + Z2zone-1 + Zfzone1
```

**3-Phase Fault Current (Endzone-1):**
```
I(3-ph, endzone1) = (Vbus × 1.0) / (Zfzone1 × √3)
```

**X/R Ratio for 3-phase endzone-1:** From document = 13.19

**Time Constant (3-phase endzone-1):**
```
tp(3-ph,endzone1) = 13.19 / (2 × π × 50) = 41.98 ms
```

---

## PAGE 5-6: CT ADEQUACY CHECK - CORE FORMULAS

### CT CORE PARAMETERS (Input):
```
Ipn = CT Primary Current (A)
In = CT Rated Secondary Current (A) = 1A (standard)
Rct = CT Resistance (Ω)
PN = Rated Burden (VA)
n = CT Accuracy Limiting Factor (ALF)
```

### BURDEN CALCULATIONS:

**Internal Burden (PE):**
```
PE = In² × Rct
PE = 1² × Rct
PE = Rct
```

**Total Lead Burden (PL):**
```
PL = 2 × R(75°C) × l
(This is 2RL from page 1)
```

**Total Load Other Burden:**
```
PL_total = PL + Sum of all connected device burdens
```

### ADEQUACY CHECK FORMULAS:

**Required Kssc (Short Circuit Capability):**
```
Required Kssc = Itkmax / Ipn
(Maximum HV fault current / CT primary ratio)
```

**Available (Effective) Kssc:**
```
Available Kssc = n × ((PE + PN) / (PE + PL_total))
Where:
  n = CT Accuracy Limiting Factor (ALF)
  PE = Internal Burden = Rct
  PN = Rated Burden (user input)
  PL_total = Total lead burden + connected device burdens
```

**VERDICT:**
```
IF Available Kssc > Required Kssc:
  CT is "SUITABLY DIMENSIONED"
ELSE:
  CT is "UNDER DIMENSIONED"
```

---

## VT WIRING CALCULATIONS (Similar to CT)

Same formulas as CT wiring but using VT parameters:
- Vp = Primary Voltage (normalized by √3)
- Vs = Secondary Voltage (normalized by √3)

---

## CRITICAL IMPLEMENTATION REQUIREMENTS

1. **All R values at 75°C use multiplier 1.21615** (coefficient for 0.00393 temp increase over 55°C)

2. **Available Kssc formula is NON-NEGOTIABLE:**
   ```
   Available Kssc = ALF × ((PE + PN) / (PE + PL))
   ```
   Where PL is TOTAL of:
   - Lead resistance burden
   - Connected device burdens
   - Does NOT include PE (internal burden)

3. **Required Kssc depends ONLY on:**
   - Max fault current (Itkmax = fault level × 1000)
   - CT primary ratio (Ipn)

4. **Vk Calculations (from CT nameplate):**
   - Vk Available: From CT test certificate
   - Vk Required: Calculated based on fault currents and impedances

5. **Output values MUST match:**
   - Vk Required (voltage)
   - Vk Available (voltage)
   - Ealreq Max (maximum electrical adequacy requirement)
   - Verdict (SUITABLE / UNDER DIMENSIONED)

