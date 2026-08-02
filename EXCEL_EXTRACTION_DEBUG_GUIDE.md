# Excel Extraction Debugging Guide

## Overview

The CT Adequacy system extracts data from Excel files with:
- **17 Standard Parameters** (fixed for all users)
- **N Devices** (typically 4-20) with 7 parameters each

This guide helps you troubleshoot when extracted values don't match your Excel file.

---

## Quick Diagnostic Steps

### Step 1: Check Extracted Values

After uploading your Excel file, look at the **"Extracted Devices Summary"** section (blue box). This shows exactly what the system extracted from your file.

**Compare these values with your Excel file:**
- CT Ratio
- Accuracy Class
- CT Resistance (Rct)
- Vk - Knee Point Voltage
- Burden
- Magnetizing Current (Io)
- Core
- CT Core Used For

### Step 2: Open Browser Console

If values don't match, open the browser console to see detailed extraction logs:

1. Press **F12** (or right-click → Inspect)
2. Click the **Console** tab
3. Upload your Excel file again
4. Look for extraction logs marked with emojis:

```
🔍 STARTING DEVICE PARAMETER EXTRACTION
🔎 Pass 1: Looking for section header row...
✅ Found section header at row 25: "PROTECTION PURPOSE / DEVICES"
🔎 Pass 2: Looking for device name row...
 Row 26: Found 4 device-like cells [col2="RED670", col3="BCPU", ...]
✅ Selected row 26 as device name row
```

### Step 3: Verify Device Detection

Look for these key log lines:

#### Device Name Row Detection
```
📍 Device name row identified: 26
✅ Device name collection complete: 4 devices found
 [1] Column 2: "DISTANCE + DIFFERENTIAL PROTECTION"
 [2] Column 3: "BCPU + OC/EF"
 [3] Column 4: "AMMETERS"
 [4] Column 5: "BB/BF"
```

**What to check:**
- Does the row number match where your device names are in Excel?
- Are all 4 (or N) devices detected?
- Are the device names correct?

#### Parameter Extraction
```
📋 Row 32: Parameter "ct ratio" → ct_ratio
 ✓ Device "DISTANCE + DIFFERENTIAL PROTECTION" (col2): ct_ratio = "800/1A"
 ✓ Device "BCPU + OC/EF" (col3): ct_ratio = "2500/1A"
 ✓ Device "AMMETERS" (col4): ct_ratio = "2500/1A"
 ✓ Device "BB/BF" (col5): ct_ratio = "800/1A"
```

**What to check:**
- Does the row number match where "CT Ratio" appears in your Excel?
- Are the extracted values correct for each device?
- Are values being read from the correct columns?

---

## Common Issues & Solutions

### Issue 1: Wrong Number of Devices Detected

**Symptoms:**
- Expected 4 devices, but only 1-2 found
- Extra devices detected that aren't real

**Root Causes:**
- Device name row contains units, numbers, or symbols that look like device names
- Device names are split across too many rows
- Parameter rows start before all device names are collected

**Solutions:**
1. Check console log for "Pass 2" - which row was selected as the device name row?
2. Verify that row in your Excel contains only device names (no units like "Ω", "VA", "kV")
3. Check if device names span multiple merged rows - they should be consolidated within 4 rows

### Issue 2: Wrong Values Extracted

**Symptoms:**
- CT Ratio shows "800/1" but Excel has "2500/1A"
- Vk shows value from wrong device
- All devices have the same values

**Root Causes:**
- Columns misaligned due to merged cells
- Parameter rows detected from wrong section
- Values being read from adjacent columns

**Solutions:**
1. Check console logs for "Pass 5: Extracting parameter values"
2. For each parameter, verify the column numbers match your Excel layout:
 ```
 Device "BCPU" (col3): ct_ratio = "2500/1A"
 ```
 If col3 is wrong, your Excel might have extra columns before the device data
3. Look for "Empty, using col4" messages - indicates merged cell handling

### Issue 3: "N/A" for All Device Parameters

**Symptoms:**
- All device parameters show "N/A"
- Standard parameters extracted correctly
- Device names detected correctly

**Root Causes:**
- Parameter section not found
- Parameter names don't match expected patterns

**Solutions:**
1. Check console for "📍 Parameter section starts at row X"
2. If you see "❌ ERROR: Could not find parameter rows", the system couldn't locate where parameters begin
3. Verify your Excel has these parameter names (case-insensitive):
 - Core
 - CT Core Used For
 - CT Ratio
 - Accuracy Class / Class of Accuracy
 - CT Resistance / Resistance
 - Vk - Knee Point Voltage / Knee Point Voltage
 - Burden
 - Magnetizing Current

### Issue 4: Values from Standard Parameters Mixed with Device Data

**Symptoms:**
- Device names include system parameters like "31.5kA/3sec", "50Hz"
- Only 1 "device" found with mangled name

**Root Causes:**
- System scanned too much of the sheet
- Couldn't distinguish between standard parameters section and device section

**Solutions:**
1. Ensure your Excel has a clear section header like:
 - "PROTECTION PURPOSE / DEVICES"
 - "CONNECTED DEVICES"
2. Device names should appear in columns 2+ (not column 0 or 1)
3. Standard parameters should be in a different section, higher up in the sheet

---

## Expected Excel Structure

The system expects this structure:

```
Row 1-20: STANDARD PARAMETERS SECTION
 ├─ Bus Fault Level: [value1] [value2 if applicable]
 ├─ System Frequency: [value]
 ├─ Bus Voltage Level: [value]
 └─ ... (14 more parameters)

Row 25-30: DEVICE TABLE SECTION
Row 25: [PROTECTION PURPOSE / DEVICES]
Row 26: [param label] [Device 1 Name] [Device 2 Name] [Device 3] [Device 4]
Row 27: (optional merged row continuation)
Row 28: Core Core 1 Core 2 T1 T1
Row 29: CT Core Used Core 1 Core 2 Core 1 Core 2
Row 30: CT Ratio 800/1A 2500/1A 2500/1A 800/1A
Row 31: Accuracy PX PX 0.5 PX
Row 32: Resistance 3.5 6 2.5 15
Row 33: Vk 540 400 N/A 400
Row 34: Burden 10 20 15 10
Row 35: Magnetizing 20 60 N/A 20
```

**Key Rules:**
1. Device names in **columns 2+** (not column 0 or 1)
2. Parameter labels in **column 0**
3. Clear section separation between standard params and device table
4. Section header containing "PROTECTION" or "DEVICES"

---

## Still Having Issues?

If the above steps don't resolve your issue:

1. **Take a screenshot** of rows 20-40 of your Excel file
2. **Copy the console logs** from Pass 1-6
3. **Note which values are wrong** and what they should be
4. Share with the development team for analysis

The detailed logs will show exactly how the system is interpreting your Excel file structure, making it possible to adjust the extraction logic to match your specific format.

---

## Technical Details

### Device Detection Algorithm

1. **Find Section Header**: Scan for row containing "PROTECTION" + "DEVICES"
2. **Find Device Name Row**: Starting from header, find first row with 2+ device-like cells in columns 2+
3. **Collect Names**: Gather device name fragments from that row + up to 3 rows below (stops at first parameter keyword)
4. **Find Parameter Section**: Locate row where parameter names begin (e.g., "Core", "CT Ratio")
5. **Extract Values**: For each parameter row, extract value from each device's column
6. **Handle Merged Cells**: If device column is empty, check ±1 column

### Parameter Name Matching

The system uses **fuzzy matching** for parameter names to handle variations:

| Parameter | Matches |
|-----------|---------|
| `core` | "core" (but not "ct core used" or "used for") |
| `ct_core_used_for` | "ct core used for", "used for", "core used" |
| `ct_ratio` | "ct ratio", "ratio" (but not "x/r ratio") |
| `accuracy_class` | "class of accuracy", "accuracy class", "accuracy" |
| `ct_resistance` | "ct resistance", "resistance" (but not "seq", "specific", "w/km", "lead") |
| `vk_knee_point_voltage` | "vk", "knee point voltage", "knee-point" |
| `burden` | "burden" (but not "load" or "total") |
| `magnetizing_current` | "magnetizing current", "magnetizing", "magnetising" |

### Value Normalization

- **Whitespace trimmed**
- Empty cells, "-", or null → "N/A"
- Numbers parsed: "31.5kA/3sec" → 31.5 (first numeric token only)
- Lead resistance calculated: `(length_m / 1000) × resistance_per_km`

---

## Version Info

- **Last Updated**: 2026-06-03
- **System**: Per-Device CT Adequacy Analysis
- **Excel Processor Version**: v2.0 (Enhanced Logging)
