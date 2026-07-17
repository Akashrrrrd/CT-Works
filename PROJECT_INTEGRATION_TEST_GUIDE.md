# 🧪 **PROJECT INTEGRATION TESTING GUIDE**

## How Projects Use the 3 IED Templates with Exact Outputs

This guide shows you **exactly** how to verify that projects are using the IED templates and producing the correct Hitachi document outputs.

---

## 🎯 **What We're Testing**

**Projects should automatically:**
1. **Detect** when you select one of the 3 IED templates
2. **Route** calculations to the appropriate IED calculator  
3. **Return** exact Hitachi N-19957 2-DF4W values
4. **Show** "IED Template" in calculation method

---

## 📋 **Step-by-Step Testing Process**

### **Step 1: Start the Server**
```bash
npm run dev
```
✅ Server should start on http://localhost:3001

### **Step 2: Access Projects**
1. Open browser: **http://localhost:3001**
2. Login to any workspace
3. Go to **Computations** (not Templates!)
4. Click **"New Computation"** or **"Run Check"**

### **Step 3: Test Each IED Template**

#### **🔵 Test 1: SIEMENS 7SJ85 Project Integration**

**3.1 Select Template:**
- Choose template with name containing **"SIEMENS 7SJ85"** or **"7SJ85"**
- Template should have `iedType: 'tpl-siemens-7sj85'`

**3.2 Input Test Data:**
```json
Sheet1 (CT Parameters):
- CT Ratio Primary: 2000 A
- CT Ratio Secondary: 1 A  
- Accuracy Class: PX
- CT Resistance: 0.5 Ω
- Rated Burden: 7.5 VA
- Accuracy Limit Factor: 10
- Knee Point Voltage: 1000 V
- Conductor Cross Section: 6.0 mm²
- Cable Length: 120 m

Sheet2 (System Parameters):
- System Frequency: 50 Hz
- Bus Voltage: 132 kV
- Max Fault Current: 50 kA
- X/R Ratio: 15
```

**3.3 Expected Output:**
```
✅ EXPECTED RESULTS:
- Verdict: "ADEQUATE" 
- Required Kssc: 25.00
- Available Kssc: 27.93  
- Calculation Method: "IED Template"
- Intermediates should show: template_type: "SIEMENS_7SJ85"
```

#### **🔴 Test 2: ABB RET670 Project Integration**

**3.1 Select Template:**
- Choose template with name containing **"RET670"** or **"ABB RET670"**
- Template should have `iedType: 'tpl-abb-ret670'`

**3.2 Input Test Data:**
```json
Sheet1 (CT Parameters):
- CT Ratio Primary: 600 A (transformer tap-2)
- CT Ratio Secondary: 1 A
- CT Resistance: 16 Ω (from document)
- Knee Point Voltage: 1600 V
- Cable Length: 120 m

Sheet2 (System Parameters):  
- System Frequency: 50 Hz
- Bus Voltage: 132 kV
- Max Fault Current: 50 kA
- X/R Ratio: 15
```

**3.3 Expected Output:**
```
✅ EXPECTED RESULTS:
- Verdict: "ADEQUATE"
- Ealreq Max: ~274.67 V (Equation 3 controlling)
- Vk Required: ~219.73 V  
- Vk Available: 1600 V
- Calculation Method: "IED Template"
- Intermediates should show: template_type: "ABB_RET670"
```

#### **🟢 Test 3: RED670 Project Integration**

**3.1 Select Template:**
- Choose template with name containing **"RED670"**
- Template should have `iedType: 'tpl-red670'`

**3.2 Input Test Data:**
```json
Sheet1 (CT Parameters):
- CT Ratio Primary: 1800 A (recommended tap)
- CT Ratio Secondary: 1 A
- CT Resistance: 5.6 Ω (tap-2 resistance)
- Knee Point Voltage: 1250 V (tap-2)
- Cable Length: 120 m

Sheet2 (System Parameters):
- System Frequency: 50 Hz  
- Bus Voltage: 132 kV
- Max Fault Current: 50 kA
- X/R Ratio: 15
```

**3.3 Expected Output:**
```
✅ EXPECTED RESULTS:
- Verdict: "ADEQUATE"
- Ealreq Max: ~500.06 V (Distance Endzone-1 1ph controlling)
- Vk Required: ~400.05 V
- Vk Available: 1250 V  
- Calculation Method: "IED Template"
- Intermediates should show: template_type: "RED670"
```

---

## 🔍 **How to Verify IED Template is Being Used**

### **Check 1: Calculation Method**
In the computation results, look for:
```json
"intermediates": {
  "calculation_method": "IED Template",  ← Should say this!
  "template_type": "SIEMENS_7SJ85",     ← Template type
  "hitachi_reference": "N-19957 2-DF4W" ← Document reference
}
```

### **Check 2: Values Match Expected**
Compare your results with the expected outputs above.

### **Check 3: Browser Network Tab**
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Run computation
4. Look for POST request to `/api/workspaces/[id]/computations`
5. Check the response - should contain IED template data

---

## 🚨 **What If It's NOT Working?**

### **❌ Problem: Shows "Legacy" calculation method**
**Cause:** Template not recognized as IED template
**Solution:** Check template `iedType` in database

### **❌ Problem: Wrong values (not matching expected)**
**Cause:** IED calculator not being called
**Solution:** Check calculation routing logic

### **❌ Problem: Calculation fails with error**
**Cause:** Input conversion issues  
**Solution:** Check input parameter mapping

---

## ✅ **Success Indicators**

**🎯 Project integration is working if ALL of these are true:**

1. ✅ **Template Detection:** System recognizes IED template types
2. ✅ **Calculation Routing:** Routes to correct IED calculator  
3. ✅ **Exact Values:** Results match Hitachi document expected values
4. ✅ **Method Indication:** Shows "IED Template" in calculation method
5. ✅ **All 3 Templates:** SIEMENS 7SJ85, ABB RET670, and RED670 all work

---

## 📊 **Alternative API Testing**

If web interface isn't available, test the API directly:

```bash
# Test computation API with SIEMENS 7SJ85
curl -X POST http://localhost:3001/api/workspaces/[workspace-id]/computations \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "templateId": "template-id-for-7sj85",
    "sheet1": {"ct_ratio_primary": 2000, "ct_ratio_secondary": 1},
    "sheet2": {"system_frequency": 50, "bus_voltage": 132}
  }'
```

**Expected Response:**
```json
{
  "verdict": "ADEQUATE",
  "intermediates": {
    "calculation_method": "IED Template",
    "template_type": "SIEMENS_7SJ85"
  }
}
```

---

## 🎉 **Summary**

**The project integration is successful when:**
- Projects automatically use IED templates when selected
- Calculations produce exact Hitachi document values
- System shows "IED Template" as calculation method
- All three templates (7SJ85, RET670, RED670) work correctly

**This ensures all projects get exact, validated results from the Hitachi N-19957 2-DF4W formulas!**