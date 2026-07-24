# FORMULA ACCURACY DEBUG - Test Case Required

## Please provide ONE complete example:

### INPUT VALUES (What user enters for IED creation):

**CT Data:**
- CT Primary: _____ A (e.g., 600)
- CT Secondary: _____ A (e.g., 1)
- Accuracy Class: _____ (e.g., 5P20)
- Rct (CT Resistance): _____ Ω (e.g., 3.5)
- Vk Available: _____ V (e.g., 400)
- Io at Vk: _____ mA (e.g., 30)
- Rated Burden: _____ VA (e.g., 15)
- ALF (Accuracy Limit Factor): _____ (e.g., 20)

**Wiring (CT Lead):**
- Conductor: _____ mm² (e.g., 2.5)
- R at 20°C: _____ Ω/km (e.g., 7.41)
- Temp Coefficient: _____ /K (e.g., 0.00393)
- Operating Temp: _____ °C (e.g., 75)
- Cable Length: _____ m (e.g., 50)

**System Parameters:**
- Frequency: _____ Hz (e.g., 50)
- Bus Voltage: _____ kV (e.g., 33)
- Max Fault: _____ kA (e.g., 12.5)
- X/R Ratio: _____ (e.g., 15)

**Connected IEDs/Devices:**
- Number of devices: _____
- Device 1: _____ VA burden (e.g., 0.02)
- Device 2: _____ VA burden (e.g., 0.02)
- etc.

---

### EXPECTED OUTPUT (From your Excel calculation):

**What your Excel sheet shows as the CORRECT answer:**
- Vk Required: _____ V
- Vk Available: _____ V
- Ealreq Max: _____ V
- Verdict: _____ (SUITABLE / UNDER DIMENSIONED)

**Show the Excel formulas you use for these 3 calculations:**
- Formula for Vk Required: _____
- Formula for Vk Available: _____
- Formula for Ealreq Max: _____

---

### ACTUAL OUTPUT (What website currently produces):

**What website shows (INCORRECT):**
- Vk Required: _____ V
- Vk Available: _____ V
- Ealreq Max: _____ V
- Verdict: _____ 

---

### WHERE THE MISMATCH HAPPENS:

Which value is wrong?
- [ ] Vk Required (mismatch by _____ V)
- [ ] Vk Available (mismatch by _____ V)
- [ ] Ealreq Max (mismatch by _____ V)
- [ ] All of them

Difference: _____ (is it 2x, 10x, completely wrong?)

---

## STEP-BY-STEP MANUAL CALCULATION (Please show your work):

### What YOU calculate manually in Excel step-by-step:

Step 1: Calculate ______ = ______ × ______ = _____
Step 2: Calculate ______ = ______ × ______ = _____
Step 3: Calculate ______ = ______ × ______ = _____
...

### Intermediate values that should be calculated:

- Resistance @ 75°C: _____ Ω/km
- Lead Resistance: _____ Ω
- Loop Resistance: _____ Ω
- Internal Burden: _____ VA
- Total Load Other Burden: _____ VA
- Required Kssc: _____
- Available Kssc: _____
- etc.

---

**Once you provide this, I can identify exactly which formula in the code is wrong and fix it.**
