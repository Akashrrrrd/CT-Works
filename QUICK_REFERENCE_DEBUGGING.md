# Quick Reference: Debugging Excel Extraction Issues

## 🚨 Problem: Extracted values don't match my Excel file

### ⚡ 3-Step Quick Fix

#### 1️⃣ Check the Blue Box (10 seconds)
After uploading Excel, look at the **"Extracted Devices Summary"** (blue box):
- Do the device names match?
- Do CT Ratio, Vk, Rct values match your Excel?

✅ **If YES** → Everything is working! Click "Compute CT Data"
❌ **If NO** → Go to Step 2

---

#### 2️⃣ Open Browser Console (30 seconds)
Press **F12** → Click **Console** tab

Look for these emoji markers in the logs:

| Emoji | What It Shows | What to Check |
|-------|---------------|---------------|
| 🔎 **Pass 1** | Section header detection | Did it find "PROTECTION PURPOSE / DEVICES"? |
| 🔎 **Pass 2** | Device name row | Is the row number correct? |
| ✅ **Devices found** | List of detected devices | Are all 4 devices shown? Correct columns? |
| 📋 **Parameter rows** | Value extraction | Are values from correct rows/columns? |
| 📦 **Final devices** | Complete output | Check all 7 parameters per device |

**Quick checklist:**
- [ ] Device name row number matches my Excel
- [ ] All 4 devices detected (not 1 or 2)
- [ ] Device columns (col2, col3, etc.) are correct
- [ ] Parameter values match my Excel cells

---

#### 3️⃣ Common Issues & Instant Fixes

| Issue | Console Shows | Fix |
|-------|---------------|-----|
| **Only 1 device found** | "Found 1 devices: col2='31.5kA...'" | Your Excel is missing section header. Add "PROTECTION PURPOSE / DEVICES" row above device names |
| **Wrong device names** | Device names include numbers/units | Device name row contains non-name data. Check row number in Pass 2 |
| **All values are N/A** | "Could not find parameter rows" | Parameter names don't match expected. Check `EXCEL_EXTRACTION_DEBUG_GUIDE.md` for name patterns |
| **Wrong CT Ratio** | "Device X (col3): ct_ratio = wrong" | Check if Excel has merged cells or extra columns before devices |
| **0 devices found** | "No device name row found" | Excel structure doesn't match expected format. See guide for required structure |

---

## 📋 Expected Excel Structure (Quick View)

```
Row 1-20: [STANDARD PARAMETERS]
 Bus Fault Level, Frequency, Voltage, etc.

Row 25: [PROTECTION PURPOSE / DEVICES] ← Must have this header!
Row 26: [Label] [Device 1] [Device 2] [Device 3] [Device 4]
Row 27: Core Core 1 Core 2 T1 T1
Row 28: CT Ratio 800/1A 2500/1A 2500/1A 800/1A
Row 29: Accuracy PX PX 0.5 PX
Row 30: Resistance 3.5 6 2.5 15
Row 31: Vk 540 400 N/A 400
Row 32: Burden 10 20 15 10
Row 33: Magnetizing 20 60 N/A 20
```

**Key Requirements:**
- ✅ Section header row with "PROTECTION" or "DEVICES"
- ✅ Device names in columns 2+ (not column 0 or 1)
- ✅ Parameter names in column 0
- ✅ No extra columns before device data

---

## 🔧 Still Not Working?

Read the **full guide**: `EXCEL_EXTRACTION_DEBUG_GUIDE.md`

Or share with dev team:
1. Screenshot of rows 20-40 from your Excel
2. Copy console logs (Pass 1-6)
3. Note which values are wrong and what they should be

---

## 📊 Console Log Example (What Success Looks Like)

```
🔎 Pass 1: Looking for section header row...
✅ Found section header at row 25

🔎 Pass 2: Looking for device name row...
✅ Selected row 26 as device name row

✅ Device name collection complete: 4 devices found
 [1] Column 2: "DISTANCE + DIFFERENTIAL PROTECTION"
 [2] Column 3: "BCPU + OC/EF"
 [3] Column 4: "AMMETERS"
 [4] Column 5: "BB/BF"

📍 Parameter section starts at row 28

📋 Row 30: Parameter "ct ratio" → ct_ratio
 ✓ Device "DISTANCE + DIFFERENTIAL" (col2): ct_ratio = "800/1A"
 ✓ Device "BCPU + OC/EF" (col3): ct_ratio = "2500/1A"
 ✓ Device "AMMETERS" (col4): ct_ratio = "2500/1A"
 ✓ Device "BB/BF" (col5): ct_ratio = "800/1A"

✅ EXTRACTION COMPLETE: 4 DEVICES
```

If your logs look like this → Everything is working! ✨

---

## ⏱️ Troubleshooting Time Estimates

| Issue Complexity | Time to Diagnose | Time to Fix |
|------------------|------------------|-------------|
| Missing section header | 30 seconds | 1 minute (add header row) |
| Wrong device columns | 1 minute | 2 minutes (adjust Excel layout) |
| Parameter name mismatch | 2 minutes | 3 minutes (rename parameter labels) |
| Complex Excel structure | 5 minutes | 10 minutes (reformat Excel) |

**Most issues can be fixed in under 5 minutes!**

---

## 🎯 Pro Tips

1. **Keep a template Excel** - Once extraction works, save it as a template
2. **Use the blue box** - Fastest way to spot issues
3. **Check console first** - Don't guess, let the logs tell you
4. **One issue at a time** - Fix device detection before checking parameter values
5. **Test incrementally** - Upload after each Excel change to verify

---

**Last Updated**: June 3, 2026
**Version**: Quick Reference v1.0
