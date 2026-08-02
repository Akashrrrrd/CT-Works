# 📋 CT Adequacy Analysis - Complete Input Guide

## How Users Should Understand What to Give as Inputs

This guide explains **WHERE to find** each input value and **WHAT it means**.

---

## 🎯 Overview: 5 Tabs of Input Data

When creating a new IED computation, you fill 5 tabs of data:

1. **CT Data** - From CT manufacturer nameplate
2. **Wiring** - Cable specifications between CT and relay
3. **System** - Power system characteristics
4. **Line** - Protected line/feeder impedances
5. **IEDs** - Relay devices connected to this CT

Each value has a source. Know the source, fill the value correctly.

---

## 📑 TAB 1: CT DATA (From CT Nameplate)

**What is this?** The CT (Current Transformer) nameplate parameters from the manufacturer.

**Where to find it?** Look at the CT physical unit or CT test certificate/datasheet.

### CT Data Fields

#### 1️⃣ CT Primary (Ipn) - REQUIRED
- **What it is**: The primary current rating
- **Unit**: Amperes (A)
- **Where to find**: CT nameplate, marked as "Primary" or "Ipn"
- **Example values**: 400A, 600A, 1000A, 2000A, 3150A
- **Example source**: "CT Ratio 600/1A" → Primary = 600A
- **Why it matters**: Determines the fault current multiplier

#### 2️⃣ CT Secondary (In) - REQUIRED
- **What it is**: The secondary current rating
- **Unit**: Amperes (A)
- **Where to find**: CT nameplate, marked as "Secondary" or "In"
- **Example values**: 1A, 5A (almost always 1A or 5A)
- **Example source**: "CT Ratio 600/1A" → Secondary = 1A
- **Why it matters**: Standard relay input current

#### 3️⃣ Accuracy Class - REQUIRED
- **What it is**: The accuracy classification of the CT
- **Unit**: Format like "5P20", "10P15", "PX"
- **Where to find**: CT nameplate, marked as "Accuracy Class" or "Class"
- **Example values**: 5P20, 10P15, 5P10, PX
- **What it means**:
 - First part (5, 10): Composite error at rated burden (%)
 - Second part (20, 15, 10): Accuracy Limit Factor
- **Standard**: For protection relays, usually "5P20" or similar
- **Why it matters**: Determines the accuracy limit factor used in calculations

#### 4️⃣ Rct (Ω) - REQUIRED
- **What it is**: CT winding resistance at rated current
- **Unit**: Ohms (Ω)
- **Where to find**: CT test certificate or datasheet, labeled "Rct", "R_ct", or "Winding Resistance"
- **Example values**: 2.5Ω, 3.5Ω, 5Ω, 9Ω
- **Typical range**: 0.5Ω to 15Ω depending on CT size
- **Why it matters**: Affects internal burden of the CT

#### 5️⃣ Rated Burden (VA) - REQUIRED
- **What it is**: Maximum burden (power consumption) the CT can supply
- **Unit**: Volt-Amperes (VA)
- **Where to find**: CT nameplate, marked as "Rated Burden", "PN", or "S_N"
- **Example values**: 5VA, 7.5VA, 10VA, 15VA, 20VA, 30VA
- **Standard burdens**: 5, 10, 15, 30 VA (common ratings)
- **Why it matters**: Determines the available burden budget

#### 6️⃣ ALF (Accuracy Limit Factor) - REQUIRED
- **What it is**: Maximum multiplication factor for accuracy
- **Unit**: Dimensionless (number only)
- **Where to find**: CT nameplate or from Accuracy Class
- **Example values**: 10, 15, 20, 30
- **How to determine**:
 - From nameplate: Extract the second number from Accuracy Class
 - "5P20" → ALF = 20
 - "10P15" → ALF = 15
 - "PX" → ALF = Usually 10-20 (check datasheet)
- **Why it matters**: Used in the core calculation formula

#### 7️⃣ Vk Available (V) - REQUIRED
- **What it is**: Knee-point voltage of the CT
- **Unit**: Volts (V)
- **Where to find**: CT test certificate or datasheet, labeled "Vk", "Vk,available", or "Knee Point Voltage"
- **Example values**: 200V, 300V, 400V, 600V, 800V
- **Typical range**: 200V - 1000V depending on CT class
- **Why it matters**: Maximum voltage the CT can handle before saturation

#### 8️⃣ Io at Vk (mA) - REQUIRED
- **What it is**: Magnetizing current at knee-point voltage
- **Unit**: Milliamperes (mA)
- **Where to find**: CT test certificate, labeled "Io", "Io (at Vk)", or "Magnetizing Current"
- **Example values**: 20mA, 30mA, 50mA, 100mA
- **Typical range**: 10mA - 200mA
- **Why it matters**: Indicates CT saturation characteristics

---

## 📑 TAB 2: WIRING (Cable from CT to Relay)

**What is this?** The cable that connects the CT to the relay panel. This adds resistance and affects burden calculations.

**Where to find it?** Physical cable installed or cable schedule/drawing.

### Wiring Fields

#### 1️⃣ Conductor (mm²) - REQUIRED
- **What it is**: Cross-sectional area of the cable conductor
- **Unit**: Square millimeters (mm²)
- **Where to find**: Cable specification or physical inspection
- **Example values**: 1.5, 2.5, 4, 6, 10, 16 mm²
- **Standard cable sizes**: 1.5, 2.5, 4, 6, 10, 16, 25 mm²
- **How to identify**: 
 - Look at cable label: "4 mm²"
 - Or look at core diameter and calculate
 - Or check cable schedule in project drawings
- **Why it matters**: Determines cable resistance

#### 2️⃣ R at 20°C (Ω/km) - REQUIRED
- **What it is**: Resistance of the cable per kilometer at 20°C reference temperature
- **Unit**: Ohms per kilometer (Ω/km)
- **Where to find**: Cable datasheet or standard tables
- **Standard table** (Copper at 20°C):
 - 1.5 mm² → 12.4 Ω/km
 - 2.5 mm² → 7.41 Ω/km
 - 4 mm² → 4.66 Ω/km
 - 6 mm² → 3.09 Ω/km
 - 10 mm² → 1.87 Ω/km
 - 16 mm² → 1.17 Ω/km
- **How to find**: 
 - Check cable datasheet
 - Use standard copper resistance table
 - Ask cable manufacturer
- **Why it matters**: Base resistance before temperature correction

#### 3️⃣ Temp. Coefficient - REQUIRED
- **What it is**: How much resistance changes with temperature
- **Unit**: Per °C (1/°C)
- **Where to find**: Cable datasheet or standard value
- **Standard values**:
 - Copper: 0.00393 /°C (most common)
 - Aluminum: 0.00403 /°C
 - Nichrome: 0.0002 /°C
- **Default value**: Use 0.00393 for copper cables (99% of cases)
- **Why it matters**: Adjusts resistance for operating temperature

#### 4️⃣ Temperature (°C) - REQUIRED
- **What it is**: Expected operating temperature of the cable
- **Unit**: Degrees Celsius (°C)
- **Where to find**: System design specification or standard practice
- **Example values**:
 - Indoor substation: 50°C
 - Outdoor in hot climate: 75°C
 - Worst case: 80°C
 - Standard assumption: 75°C
- **How to determine**:
 - Check electrical design manual
 - Typical worst-case: 75°C
 - Conservative: 80°C
 - Cool environment: 50°C
- **Why it matters**: Higher temperature = higher resistance

#### 5️⃣ Cable Length (m) - REQUIRED
- **What it is**: Total length of cable from CT to relay panel
- **Unit**: Meters (m)
- **Where to find**: Physical measurement or cable schedule
- **Example values**: 25m, 50m, 100m, 150m
- **How to measure**:
 - Measure along the cable route
 - Account for routing through conduits
 - Add extra for connections (usually 10% margin)
 - Use cable schedule from project drawings
- **Why it matters**: Longer cable = more resistance = more burden

---

## 📑 TAB 3: SYSTEM (Power Network Data)

**What is this?** Characteristics of the power system where the CT is installed.

**Where to find it?** Power system studies, network model, or system specifications.

### System Fields

#### 1️⃣ Frequency (Hz) - REQUIRED
- **What it is**: Power system frequency
- **Unit**: Hertz (Hz)
- **Where to find**: Power system specification
- **Standard values**:
 - 50 Hz (Europe, Asia, Africa, Australia)
 - 60 Hz (North America)
- **How to determine**: Ask your power utility
- **Why it matters**: Affects fault current calculations

#### 2️⃣ Bus Voltage (kV) - REQUIRED
- **What it is**: Voltage level at the substation bus
- **Unit**: Kilovolts (kV)
- **Where to find**: Substation single-line diagram or nameplate
- **Example values**: 33kV, 66kV, 110kV, 132kV, 220kV, 400kV
- **How to determine**:
 - Look at substation nameplate
 - Check one-line diagram
 - Ask substation operator
- **Why it matters**: Affects fault current magnitude

#### 3️⃣ Max Fault (kA) - REQUIRED
- **What it is**: Maximum three-phase short-circuit current at the bus
- **Unit**: Kiloamperes (kA)
- **Where to find**: Short-circuit study or system load flow study
- **Example values**: 5kA, 10kA, 20kA, 50kA
- **How to determine**:
 - Use short-circuit analysis software (DIgSILENT, ETAP, PSS/E)
 - Ask system operator
 - From system documentation
 - For new design: Calculate using Zs method
- **Why it matters**: Determines the fault current the relay must handle

#### 4️⃣ X/R Ratio - REQUIRED
- **What it is**: Ratio of system reactance to resistance
- **Unit**: Dimensionless (number only)
- **Where to find**: System impedance data or typical values
- **Typical values**:
 - HV systems (>110kV): 15-20
 - MV systems (33-110kV): 10-15
 - LV systems (<33kV): 5-10
- **How to determine**:
 - From short-circuit study
 - From system impedance tables
 - Use typical value for your voltage level
- **Standard assumption**: Use 15 if unsure
- **Why it matters**: Affects fault current phase angle

---

## 📑 TAB 4: LINE (Protected Feeder Impedances)

**What is this?** Electrical characteristics of the power line/cable being protected.

**Where to find it?** Cable datasheet or system impedance tables.

### Line Fields

#### 1️⃣ R1 (Ω/km) - REQUIRED
- **What it is**: Positive sequence resistance per km
- **Unit**: Ohms per kilometer (Ω/km)
- **Where to find**: Cable datasheet or line data table
- **Example values**: 0.01 - 0.5 Ω/km
- **Typical for cables**: 0.022 Ω/km (single-core Cu)
- **How to get**: 
 - Check cable manufacturer datasheet
 - Use cable impedance tables
 - Ask project engineer
- **Why it matters**: Affects distance relay zone calculations

#### 2️⃣ X1 (Ω/km) - REQUIRED
- **What it is**: Positive sequence reactance per km
- **Unit**: Ohms per kilometer (Ω/km)
- **Where to find**: Cable datasheet or line data table
- **Example values**: 0.08 - 0.2 Ω/km
- **Typical for cables**: 0.16 Ω/km (single-core Cu)
- **How to get**: Cable datasheet or impedance tables
- **Why it matters**: Affects distance relay zone calculations

#### 3️⃣ R0 (Ω/km) - REQUIRED
- **What it is**: Zero sequence resistance per km
- **Unit**: Ohms per kilometer (Ω/km)
- **Where to find**: Cable datasheet or line data table
- **Example values**: 0.1 - 1.0 Ω/km
- **Typical for cables**: 0.13 Ω/km
- **How to get**: Cable datasheet or impedance tables
- **Why it matters**: Affects ground fault calculations

#### 4️⃣ X0 (Ω/km) - REQUIRED
- **What it is**: Zero sequence reactance per km
- **Unit**: Ohms per kilometer (Ω/km)
- **Where to find**: Cable datasheet or line data table
- **Example values**: 0.05 - 0.3 Ω/km
- **Typical for cables**: 0.06 Ω/km
- **How to get**: Cable datasheet or impedance tables
- **Why it matters**: Affects ground fault calculations

#### 5️⃣ Line Length (km) - REQUIRED
- **What it is**: Total length of the protected feeder
- **Unit**: Kilometers (km)
- **Where to find**: 
 - Power system one-line diagram
 - Cable route schedule
 - Physical measurement
- **Example values**: 1.74km, 5km, 10km, 25km
- **How to determine**:
 - Measure on map
 - Check project drawings
 - Ask system engineer
- **Why it matters**: Affects distance relay reach and fault current calculation

---

## 📑 TAB 5: IEDs (Connected Devices)

**What is this?** List of relay devices connected to this CT core.

**Where to find it?** Substation wiring diagram or protection philosophy document.

### IED Fields

#### Connected IEDs / Relays

**What it is**: All protection devices that use this CT core

**Why it matters**: Each relay adds a small burden to the CT

**Example devices**:
- SIEMENS 7SJ85 relay
- RED670 relay
- Current transformer burden indicator
- Other protective relays

**Information needed per device**:
- Name/Tag (e.g., "T1-RED670")
- Burden (VA) - typically 0.02 VA per device
- Type - "Protection", "Metering", "Monitoring"

---

## 🔍 STEP-BY-STEP: Complete Example

### Scenario: New 33kV Feeder with RED670 Protection

#### TAB 1: CT DATA
- Find the CT nameplate on the CT unit in the substation
- **CT Primary**: 400A (from nameplate "400/1")
- **CT Secondary**: 1A
- **Accuracy Class**: 5P20 (from nameplate)
- **Rct**: 2.5Ω (from test certificate)
- **Rated Burden**: 15VA (from nameplate)
- **ALF**: 20 (from Accuracy Class 5P20, take the 20)
- **Vk Available**: 400V (from test certificate)
- **Io at Vk**: 30mA (from test certificate)

#### TAB 2: WIRING
- Measure cable from CT to relay panel
- Check cable specification on label
- **Conductor**: 6 mm² (marked on cable)
- **R at 20°C**: 3.09 Ω/km (from copper table for 6mm²)
- **Temp Coefficient**: 0.00393 (copper, standard)
- **Temperature**: 75°C (worst case in substation)
- **Cable Length**: 120m measured = 0.12km

#### TAB 3: SYSTEM
- Get from short-circuit study or system planner
- **Frequency**: 50 Hz (European system)
- **Bus Voltage**: 33kV (feeder voltage)
- **Max Fault**: 12.5kA (from SC study)
- **X/R Ratio**: 15 (typical for 33kV)

#### TAB 4: LINE
- Get from cable datasheet or system impedance tables
- **R1**: 0.0221 Ω/km (from cable table)
- **X1**: 0.1600 Ω/km (from cable table)
- **R0**: 0.1300 Ω/km (from cable table)
- **X0**: 0.0600 Ω/km (from cable table)
- **Line Length**: 1.74 km (feeder route length)

#### TAB 5: IEDs
- RED670 relay with 0.02 VA burden

---

## ❌ COMMON MISTAKES TO AVOID

### Mistake 1: Wrong CT Primary/Secondary
- ❌ Using "400" when it should be "400" (correct, but confusing)
- ✅ Always check nameplate or test certificate
- ✅ Write as "Primary: 400, Secondary: 1"

### Mistake 2: Confusing Cable Resistance
- ❌ Using 3.09 as total resistance for entire cable
- ✅ Remember: 3.09 is per kilometer, multiply by length
- ✅ For 0.12 km cable: 3.09 × 0.12 = 0.37Ω

### Mistake 3: Wrong Temperature
- ❌ Using 20°C (reference temperature)
- ✅ Use operating temperature (50-75°C)
- ✅ Use worst case: 75°C

### Mistake 4: Wrong Fault Current
- ❌ Using 12.5A instead of 12.5kA
- ✅ Always check units (kA = 1000 × A)
- ✅ Short-circuit studies always in kA

### Mistake 5: Forgetting Units
- ❌ Entering "400" without knowing if it's A, mA, V
- ✅ Each field has a unit label
- ✅ Always check the unit before entering

---

## 📊 Quick Reference Table

| Tab | Field | Unit | Source | Example |
|-----|-------|------|--------|---------|
| CT Data | Primary | A | CT nameplate | 600 |
| CT Data | Secondary | A | CT nameplate | 1 |
| CT Data | Accuracy Class | - | CT nameplate | 5P20 |
| CT Data | Rct | Ω | CT test cert | 2.5 |
| CT Data | Rated Burden | VA | CT nameplate | 15 |
| CT Data | ALF | - | From Accuracy Class | 20 |
| CT Data | Vk Available | V | CT test cert | 400 |
| CT Data | Io at Vk | mA | CT test cert | 30 |
| Wiring | Conductor | mm² | Cable label | 6 |
| Wiring | R at 20°C | Ω/km | Cable table | 3.09 |
| Wiring | Temp Coeff | /°C | Standard | 0.00393 |
| Wiring | Temperature | °C | Design spec | 75 |
| Wiring | Cable Length | m | Measurement | 120 |
| System | Frequency | Hz | System spec | 50 |
| System | Bus Voltage | kV | System spec | 33 |
| System | Max Fault | kA | SC study | 12.5 |
| System | X/R Ratio | - | SC study | 15 |
| Line | R1 | Ω/km | Cable table | 0.0221 |
| Line | X1 | Ω/km | Cable table | 0.1600 |
| Line | R0 | Ω/km | Cable table | 0.1300 |
| Line | X0 | Ω/km | Cable table | 0.0600 |
| Line | Line Length | km | Measurement | 1.74 |

---

## 🎓 Where to Find Each Document

### CT Nameplate & Test Certificate
- **Location**: Physical CT unit or filed in substation office
- **Contains**: Primary, Secondary, Class, Rated Burden, Vk, Io
- **Format**: Paper certificate or digital PDF

### Cable Datasheet
- **Location**: Cable supplier website or project files
- **Contains**: Conductor size, R at 20°C, impedance per km
- **Search for**: "Cable impedance table" or "Cable datasheet PDF"

### Short-Circuit Study
- **Location**: System planner office or project folder
- **Contains**: Max fault current, X/R ratio for each bus
- **File name**: Usually "SC_Study.pdf" or "Fault_Analysis.xlsx"

### One-Line Diagram
- **Location**: Substation office or project files
- **Contains**: Bus voltage, circuit connections
- **File name**: Usually "SLD.pdf" or "One_Line.pdf"

### Cable Impedance Tables
- **Standard tables**: IEEE, IEC, or cable manufacturer
- **Search**: "Copper cable resistance table Ω/km"
- **Common values**: Pre-loaded in software defaults

---

## ✅ VERIFICATION CHECKLIST

Before clicking "Compute", verify:

- [ ] All fields are filled (no blank values)
- [ ] All values have correct units
- [ ] CT data matches CT nameplate
- [ ] Cable length is in meters
- [ ] System fault current is in kA, not A
- [ ] Temperature is operating temp (50-80°C), not 20°C
- [ ] Line impedances are per km, not total
- [ ] X/R ratio seems reasonable (5-20)
- [ ] All numbers are positive (no negative values)

If all checked, click "Compute" with confidence.

---

## 🆘 Still Unsure?

### For CT Data
1. Go to the physical CT location in substation
2. Read the nameplate directly
3. Get the test certificate from substation office
4. If still unsure, contact CT manufacturer with nameplate photo

### For Cable Data
1. Check cable label on the cable sheath
2. Get cable datasheet from cable supplier
3. Use standard copper cable table (0.00393 typical)
4. If unsure about length, measure it directly

### For System Data
1. Ask your system planner
2. Get the latest short-circuit study
3. Use one-line diagram for voltage
4. Use typical X/R ratio (15) if unsure

### For Line Data
1. Check project cable schedule
2. Get line impedance from system study
3. Measure line length on map
4. Use cable datasheet for impedance

---

## 🎯 Key Takeaway

**Each input value comes from a specific source document:**
- CT nameplate/certificate
- Cable datasheet
- System specifications
- Project drawings

**Know the source, find the document, read the value, enter it correctly.**

That's how users should think about inputs. Not guessing - knowing exactly where each number comes from.

