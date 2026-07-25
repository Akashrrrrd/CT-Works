# 🚀 CT Adequacy Input Cheat Sheet - Quick Reference

## ⚡ FASTEST WAY: Just Follow the Color

When filling the form, follow this simple approach:

### 🔴 RED Tab: CT DATA
**"Go get the CT test certificate from substation office"**

```
CT Primary:        600          (from nameplate "600/1A")
CT Secondary:      1            (from nameplate "600/1A")
Accuracy Class:    5P20         (from nameplate)
Rct:               2.5          (from test certificate)
Rated Burden:      15           (from nameplate)
ALF:               20           (take the second number from "5P20")
Vk Available:      400          (from test certificate)
Io at Vk:          30           (from test certificate)
```

### 🟠 ORANGE Tab: WIRING
**"Measure the cable or check cable label"**

```
Conductor:         6 mm²        (what does cable label say?)
R at 20°C:         3.09         (look up in table for 6mm² copper)
Temp Coefficient:  0.00393      (always this for copper)
Temperature:       75           (worst case in substation)
Cable Length:      120          (measure in meters)
```

### 🟡 YELLOW Tab: SYSTEM
**"Ask your system planner or check the short-circuit study"**

```
Frequency:         50 Hz        (50 in Europe, 60 in USA)
Bus Voltage:       33 kV        (from substation nameplate)
Max Fault:         12.5 kA      (from short-circuit study)
X/R Ratio:         15           (typical value, ask if unsure)
```

### 🟢 GREEN Tab: LINE
**"Get from cable datasheet or system tables"**

```
R1:                0.0221       (from cable table Ω/km)
X1:                0.1600       (from cable table Ω/km)
R0:                0.1300       (from cable table Ω/km)
X0:                0.0600       (from cable table Ω/km)
Line Length:       1.74         (in kilometers)
```

---

## 🎯 STANDARD VALUES TABLE

### If You Don't Have the Exact Value, Use These Defaults

#### For Copper Cables (R at 20°C in Ω/km)
| Size | Resistance |
|------|-----------|
| 1.5 mm² | 12.4 |
| 2.5 mm² | 7.41 |
| 4 mm² | 4.66 |
| 6 mm² | 3.09 |
| 10 mm² | 1.87 |
| 16 mm² | 1.17 |
| 25 mm² | 0.73 |

#### For Line Impedances (Standard Copper Cable)
| Parameter | Value | Unit |
|-----------|-------|------|
| R1 | 0.0221 | Ω/km |
| X1 | 0.1600 | Ω/km |
| R0 | 0.1300 | Ω/km |
| X0 | 0.0600 | Ω/km |

#### For System Parameters
| Parameter | Value | When to Use |
|-----------|-------|------------|
| Frequency | 50 Hz | Europe, Asia |
| Frequency | 60 Hz | North America |
| Temp Coeff | 0.00393 | Copper cable |
| Temperature | 75°C | Worst case |
| X/R Ratio | 15 | MV systems (3-110kV) |
| X/R Ratio | 20 | HV systems (>110kV) |

---

## 🗺️ WHERE TO FIND EACH VALUE

### 📄 Document Checklist - What to Gather

- [ ] **CT Test Certificate** - Contains: Rct, Vk, Io, ALF
- [ ] **CT Nameplate Photo** - Contains: Primary, Secondary, Class, Rated Burden
- [ ] **Cable Label/Datasheet** - Contains: mm², Ω/km
- [ ] **Short-Circuit Study** - Contains: Max Fault, X/R Ratio
- [ ] **Substation One-Line Diagram** - Contains: Bus Voltage, Cable Route Length
- [ ] **System Impedance Tables** - Contains: Line R1/X1/R0/X0

---

## ❌ COMMON WRONG INPUTS

| Wrong | Right | Why |
|-------|-------|-----|
| 400A for a 400/5 CT | 400 for Primary, 5 for Secondary | Never mix primary/secondary |
| 3.09 Ω total cable resistance | 3.09 (per km) × 0.12 km = 0.37Ω | Always multiply by length in km |
| 20°C temperature | 75°C | Use operating temperature, not reference |
| 12.5 A fault current | 12.5 kA | Always use kA, not A |
| R1 = 0.0221 km/Ω | R1 = 0.0221 Ω/km | Units matter! |

---

## ✅ QUICK VALIDATION

Before clicking "Compute", answer these:

- [ ] All fields filled? ✓
- [ ] All values positive? ✓
- [ ] CT Primary > Secondary? ✓
- [ ] Cable length < 1 km? ✓ (usually)
- [ ] Fault current between 5-50 kA? ✓
- [ ] Temperature between 50-80°C? ✓
- [ ] All units match the label? ✓

If YES to all → **Click Compute with confidence**

---

## 🔍 EXAMPLE: 33kV Feeder with RED670

### What You'll Gather:

**From CT in substation:**
- Photo of nameplate → 400/1A, 5P20, 15VA
- Test certificate → Rct 2.5Ω, Vk 400V, Io 30mA

**From cable:**
- Label on cable → 6 mm²
- From copper table → 3.09 Ω/km
- Measure length → 120m = 0.12 km

**From system planner:**
- Fault study → 12.5 kA at 33kV
- System X/R → 15

**From feeder data:**
- Cable datasheet → R1 0.0221, X1 0.16, R0 0.13, X0 0.06 Ω/km
- Route length → 1.74 km

### Final Inputs:

```
CT TAB:
  Primary: 400        Secondary: 1
  Class: 5P20         ALF: 20
  Rct: 2.5            Burden: 15
  Vk: 400             Io: 30

WIRING TAB:
  Conductor: 6        Resistance: 3.09
  Temp Coeff: 0.00393 Temperature: 75
  Cable Length: 120

SYSTEM TAB:
  Frequency: 50       Voltage: 33
  Fault: 12.5         X/R: 15

LINE TAB:
  R1: 0.0221          X1: 0.16
  R0: 0.13            X0: 0.06
  Length: 1.74
```

### Expected Result:
✅ Vk Required: ~52V  
✅ Vk Available: 400V  
✅ **Verdict: SUITABLY DIMENSIONED**

---

## 📞 WHEN YOU'RE STUCK

### "I can't find Rct, where is it?"
→ It's in the **CT Test Certificate**, not the nameplate. Ask substation for the test report from CT commissioning.

### "Cable doesn't have a label, how do I know mm²?"
→ **Measure the cable diameter** or ask substation when they installed it. Common sizes: 2.5, 4, 6, 10 mm².

### "Which X/R ratio should I use?"
→ **Use 15 for 33kV, use 20 for 110kV+**. Or ask your system planner. It's rarely exact, 15-20 range is fine.

### "Should temperature be 20 or 75?"
→ **Always 75°C** (worst case). Never use 20°C - that's just the reference temperature for the resistance table.

### "My fault current is 5000A, not 5kA - am I wrong?"
→ **You're using wrong units**. 5000A = 5kA. System always wants kA (thousands of amperes).

---

## 🎓 THE GOLDEN RULE

> **Each value comes from ONE specific source document.**
> 
> **Don't guess. Know the source. Find the document. Read the value.**

### Sources:
1. **CT Nameplate** → Primary, Secondary, Class, Burden
2. **CT Test Cert** → Rct, Vk, Io, ALF
3. **Cable Label** → Conductor size (mm²)
4. **Cable Datasheet** → Resistance (Ω/km)
5. **Short-Circuit Study** → Fault current, X/R
6. **System Diagram** → Bus voltage, Cable length
7. **Standard Tables** → Copper resistance, Line impedances

---

## 📊 CONFIDENCE SCORING

### 100% Confident? (All exact documents)
✅ CT test certificate  
✅ Cable datasheet  
✅ Short-circuit study  
✅ System specifications  

→ **Click compute immediately**

### 80% Confident? (Some values from tables)
✅ CT nameplate found  
✅ Cable size measured  
✅ Using standard copper resistance (3.09 for 6mm²)  
✅ Using typical X/R ratio (15)  

→ **Still good, click compute**

### 50% Confident? (Mostly using defaults)
⚠️ Using guess for X/R ratio  
⚠️ Not sure about cable size  
⚠️ Unsure about fault current  

→ **Ask system planner before computing**

---

## 🚀 FASTEST WORKFLOW

1. **Gather documents** (5 minutes)
2. **Photo of CT nameplate** (1 minute)
3. **Ask for CT test cert** (system operator has it)
4. **Measure cable** (2 minutes)
5. **Ask system planner for fault study** (1 email)
6. **Enter all values** (5 minutes)
7. **Click Compute** (instant results)

**Total time: ~15 minutes for first IED, ~2 minutes for repeats**

---

## 🎯 YOU'RE READY WHEN

- [ ] You know WHERE each value comes from
- [ ] You know WHAT each value means
- [ ] You have the DOCUMENTS to prove it
- [ ] You can EXPLAIN each value to someone else

Now you're ready to create an IED computation.

Go get that CT test certificate! 🚀

