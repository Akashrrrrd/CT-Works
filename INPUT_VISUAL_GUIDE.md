# 📊 Visual Input Guide - Where Everything Comes From

## 🎯 The Complete Picture

This document shows visually where each input value comes from and what it means.

---

## 🔴 TAB 1: CT DATA - The Transformer Nameplate

### Physical Location
```
 ┌─────────────────────┐
 │ CT TRANSFORMER │
 │ │
 ┌─────────┐ │ ┌───────────────┐ │
 HV ──┤ PRIMARY ├─┤ │ NAMEPLATE │ │
 └─────────┘ │ │ │ │
 │ │ Ratio: 600/1A │ │
 │ │ Class: 5P20 │ │
 ┌─────────┐ │ │ Burden: 15VA │ │
 LV ──┤SECONDARY├─┤ │ Rct: 2.5Ω │ │
 └─────────┘ │ │ Vk: 400V │ │
 │ │ Io: 30mA │ │
 │ └───────────────┘ │
 │ (Read these!) │
 └─────────────────────┘
```

### Nameplate Values
```
600/1A → Primary = 600, Secondary = 1
5P20 → Accuracy Class = 5P20, ALF = 20
15VA → Rated Burden = 15VA
```

### Test Certificate Values
```
[CT Test Certificate]
─────────────────────
Rct @ 20°C: 2.5Ω
Knee Point Voltage (Vk): 400V
Magnetizing Current (Io): 30mA
```

---

## 🟠 TAB 2: WIRING - The Cable Connection

### Physical Location
```
 ┌──────────────┐
 │ SUBSTATION │
 │ │
 ┌────┴──────────────┴──┐
 │ [ CT Core ] │ ← You are here
 └────┬──────────────┬──┘ (CT nameplate read)
 │ │
 [CABLE ROUTE] CABLE LENGTH = 120m
 │ │ ← Measure this!
 │ │
 │ ┌──────────────┐
 └─┤ RELAY PANEL │
 │ │
 └──────────────┘
```

### Cable Information
```
Physical Cable:
┌────────────────────────┐
│ Cable Label: │
│ ├─ Conductor: 6 mm² │ ← Read from label
│ ├─ Length: 120m │ ← Measure the route
│ └─ Specification: Cu │
└────────────────────────┘

From Cable Datasheet:
┌────────────────────────┐
│ Copper 6mm² @ 20°C: │
│ R = 3.09 Ω/km │ ← Look in table
│ α = 0.00393/°C │ ← Standard for Cu
└────────────────────────┘

Operating Condition:
┌────────────────────────┐
│ Temperature = 75°C │ ← Worst case in summer
└────────────────────────┘
```

### How Cable Resistance Changes
```
Resistance vs Temperature
─────────────────────────

R(20°C) = 7.41 Ω/km [from table]
 │
 │ × 1.00393 per °C
 │ × (75 - 20) = × 1.21615
 ↓
R(75°C) = 9.01 Ω/km [adjusted for temperature]
 │
 │ × cable length (km)
 │ × 0.12 km
 ↓
Total resistance = 1.08 Ω [total cable loss]
```

---

## 🟡 TAB 3: SYSTEM - The Power Network

### System Diagram
```
 ┌─────────────────────────────────────────┐
 │ POWER SYSTEM AT 33kV │
 │ (Frequency: 50 Hz) │
 │ │
 │ HV Transmission Generator │
 │ ↓ ↓ │
 │ └──────────┬──────┘ │
 │ │ │
 │ [Source Impedance: Zs] │
 │ │ │
 │ ↓ │
 │ ┌─────────────────────┐ │
 │ │ 33 kV BUSBAR │ │
 │ │ (Bus Voltage) │ │
 │ │ │ │
 │ │ Max 3-Phase Fault │ │
 │ │ = 12.5 kA │ │
 │ │ (from SC study) │ │
 │ └──────────┬──────────┘ │
 │ │ │
 │ X/R Ratio = 15 │
 │ (from impedance data) │
 │ │ │
 └───────────────┼─────────────────────────┘
 │
 [This is where]
 [your CT sits]
```

### Where Each System Value Comes From

```
Frequency: 50 Hz
├─ Europe: 50 Hz (most of world)
├─ North America: 60 Hz
└─ Fixed per country (you just pick)

Bus Voltage: 33 kV
├─ Source: Substation nameplate
├─ Common values: 11kV, 33kV, 66kV, 110kV, 220kV, 400kV
└─ What it is: The voltage level of this substation

Max Fault Current: 12.5 kA
├─ Source: Short-circuit study (ask planner)
├─ How to get: Run load-flow + SC analysis
├─ Unit: Always in kA (NOT A)
└─ What it means: Max 3-phase short circuit at this bus

X/R Ratio: 15
├─ Source: System impedance data
├─ Typical: 5-10 (LV), 10-15 (MV), 15-20 (HV)
├─ If unsure: Use 15 for MV systems
└─ What it means: Ratio of reactive to active impedance
```

---

## 🟢 TAB 4: LINE - The Protected Feeder

### Feeder Diagram
```
 Substation Distant End
 ┌──────────┐ ┌─────────┐
 │ BUSBAR │─────CABLE───│ LOAD │
 │ 33 kV │ 1.74 km │ or │
 │ │ │ FAULT │
 └────┬─────┘ └─────────┘
 │
 │ [Your CT is here]
 │ Protecting this feeder
 │
 ┌───┴────────────────────────────┐
 │ FEEDER SPECIFICATIONS: │
 │ │
 │ Length: 1.74 km │
 │ Conductor Material: Cu │
 │ Conductor Size: 240 mm² │
 │ │
 │ R1 (pos seq R): 0.0221 Ω/km │
 │ X1 (pos seq X): 0.1600 Ω/km │
 │ R0 (zero seq R): 0.1300 Ω/km│
 │ X0 (zero seq X): 0.0600 Ω/km│
 └───────────────────────────────┘
```

### Impedance Values
```
Standard Copper Cable Impedances (per km):

┌──────────┬─────────┬─────────┐
│ Type │ Value │ Why │
├──────────┼─────────┼─────────┤
│ R1 │ 0.0221 │ Positive│
│ (Resist) │ Ω/km │ sequence│
│ │ │ ACTIVE │
├──────────┼─────────┼─────────┤
│ X1 │ 0.1600 │ Positive│
│ (React) │ Ω/km │ sequence│
│ │ │ REACTIVE│
├──────────┼─────────┼─────────┤
│ R0 │ 0.1300 │ Ground │
│ (Resist) │ Ω/km │ fault │
│ │ │ ACTIVE │
├──────────┼─────────┼─────────┤
│ X0 │ 0.0600 │ Ground │
│ (React) │ Ω/km │ fault │
│ │ │ REACTIVE│
└──────────┴─────────┴─────────┘

Source: Cable datasheet or system impedance tables
```

### How Impedance Scales with Length
```
Single km impedance (from table):
 R1 = 0.0221 Ω/km
 
Multiply by total length:
 × 1.74 km
 ──────────
 = 0.0384 Ω total

Used by distance relay:
 Zone 1: Usually 80% of line = 0.85 km
 Zone 2: Usually 120% of line = 2.09 km
 Zone 3: Usually longer
```

---

## 📋 Data Collection Flowchart

```
START: "I need to fill this form"
 │
 ├─→ CT DATA TAB
 │ ├─ Go to substation
 │ ├─ Find CT unit
 │ ├─ Read nameplate (Primary/Secondary/Class/Burden)
 │ ├─ Get test certificate (Rct/Vk/Io)
 │ └─ ✓ All 8 fields complete
 │
 ├─→ WIRING TAB
 │ ├─ Check cable label (Conductor size)
 │ ├─ Get cable datasheet (Ω/km)
 │ ├─ Use standard copper value (0.00393)
 │ ├─ Enter worst-case temperature (75°C)
 │ ├─ Measure cable route (Length)
 │ └─ ✓ All 5 fields complete
 │
 ├─→ SYSTEM TAB
 │ ├─ Use local frequency (50 or 60 Hz)
 │ ├─ Get from substation (Bus voltage)
 │ ├─ Ask planner for fault study (Max fault)
 │ ├─ Look up X/R ratio or use 15
 │ └─ ✓ All 4 fields complete
 │
 ├─→ LINE TAB
 │ ├─ Get cable datasheet (R1/X1/R0/X0)
 │ ├─ Or use standard table values
 │ ├─ Measure feeder length
 │ └─ ✓ All 5 fields complete
 │
 └─→ COMPUTE
 ├─ System runs calculation
 ├─ Checks if CT is adequate
 └─ Returns: SUITABLE or UNDER-DIMENSIONED
```

---

## 🔍 Example: Tracing One Value

### Example: Rct = 2.5Ω

**Question: Where does Rct = 2.5 come from?**

```
Answer: CT Test Certificate

Step 1: Locate the certificate
 └─ Ask substation for "CT Test Certificate"
 (from CT commissioning or factory test)

Step 2: Open the certificate
 └─ Should be a PDF or paper document
 Filed in substation office

Step 3: Find the section "Winding Resistance"
 ├─ Header: "CT Test Results"
 ├─ Section: "Winding Resistance"
 ├─ Value: "Rct = 2.5 Ω @ 20°C"
 └─ This is your value!

Step 4: Enter into form
 ├─ CT Data Tab
 ├─ Field: "Rct (Ω)"
 └─ Value: 2.5
```

### Example: X1 = 0.1600 Ω/km

**Question: Where does X1 come from?**

```
Answer: Cable Datasheet or Standard Table

Option 1: From Cable Datasheet
 ├─ Get cable specification
 ├─ Look for "Positive Sequence Reactance"
 ├─ Should say "X1 = 0.160 Ω/km"
 └─ Enter 0.1600

Option 2: From Standard Table (if datasheet missing)
 ├─ Standard copper cable: X1 ≈ 0.16 Ω/km
 ├─ This is typical/universal
 └─ Safe to use: 0.1600
```

---

## 📝 Document Checklist Template

Print or save this and use when gathering data:

```
□ CT Nameplate (photo)
 ├─ Primary: _______ A
 ├─ Secondary: _______ A
 ├─ Accuracy Class: _______
 └─ Rated Burden: _______ VA

□ CT Test Certificate
 ├─ Rct: _______ Ω
 ├─ Vk Available: _______ V
 ├─ Io at Vk: _______ mA
 └─ ALF: _______

□ Cable Information
 ├─ Conductor Size: _______ mm²
 ├─ R at 20°C: _______ Ω/km
 ├─ Length: _______ m
 └─ Material: Cu / Al

□ Short-Circuit Study
 ├─ Bus Voltage: _______ kV
 ├─ Max Fault Current: _______ kA
 ├─ X/R Ratio: _______
 └─ Frequency: _______ Hz

□ Feeder/Line Data
 ├─ R1: _______ Ω/km
 ├─ X1: _______ Ω/km
 ├─ R0: _______ Ω/km
 ├─ X0: _______ Ω/km
 └─ Length: _______ km
```

---

## ✅ Validation Checklist

Before submitting, verify:

```
☑ CT DATA
 □ Primary > Secondary (e.g., 600 > 1)
 □ Class format correct (e.g., 5P20)
 □ Rct is small number (0.5-15)
 □ Vk is voltage (100-1000)
 □ Io is current in mA (10-200)

☑ WIRING
 □ Conductor is positive (1.5-25)
 □ Resistance is per km (not total)
 □ Length is in meters
 □ Temperature is operating temp (50-80)

☑ SYSTEM
 □ Frequency is 50 or 60
 □ Bus voltage matches substation
 □ Fault current in kA (not A)
 □ X/R ratio between 5-20

☑ LINE
 □ Impedances are per km
 □ All impedances are small (< 1)
 □ Length in km (fractional OK)
 □ All values positive
```

---

## 🎯 Key Insight

Each field represents **one physical quantity**:

```
Primary = Physical wire in CT handling 600A
Secondary = Physical wire in CT handling 1A
Rct = How much the wire opposes current
Vk = How much voltage the CT can handle
Cable length = How far it is from CT to relay
R1 = How much the line resists current
X1 = How much the line opposes changing current
```

**When you don't know a value, ask: "What is this measuring in the real world?"**
Then find the document that measured it.

---

**Now you understand where everything comes from. Go gather your documents!** 🚀

