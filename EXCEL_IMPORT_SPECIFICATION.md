# 📊 **Excel Import Specification for CT Adequacy Analysis**

## **🎯 Overview**

The CT/VT Adequacy Analysis Platform now supports a **standardized Excel import format** that handles:

- **17 Standard Parameters** (fixed structure, varying values across users)
- **7 Device Parameters** × **N Devices** (4-20 devices possible per import)

This specification ensures consistent data extraction regardless of user-specific variations in Excel formatting.

---

## **📋 Structure Definition**

### **🔧 17 Standard Parameters (Always Present)**

These are **system-level parameters** that remain consistent in structure but vary in values:

| # | Parameter Name | Unit | Example Value | Description |
|---|---|---|---|---|
| 1 | Bus Fault Level | kA | `31.5kA/3sec` | Maximum fault current at bus |
| 2 | System Frequency | Hz | `50` | System operating frequency |
| 3 | Bus Voltage Level | kV | `33kV` | Operating voltage level |
| 4 | X/R Ratio | - | `-` | System reactance to resistance ratio |
| 5 | CT Wiring - Conductor Cross Section (1) | mm | `6` | First CT wiring conductor size |
| 6 | Resistance in W/km at 20°C (1) | Ω/km | `3.69` | First conductor resistance |
| 7 | Specific Resistance at 20°C (1) | K-1 | `-` | First conductor temperature coefficient |
| 8 | Lead Length VT to Relay (1) | m | `50` | First lead length |
| 9 | CT Wiring - Conductor Cross Section (2) | mm | `2.5` | Second CT wiring conductor size |
| 10 | Resistance in W/km at 20°C (2) | Ω/km | `8.87` | Second conductor resistance |
| 11 | Specific Resistance at 20°C (2) | K-1 | `-` | Second conductor temperature coefficient |
| 12 | Lead Length VT to Relay (2) | m | `50` | Second lead length |
| 13 | Route Length | km | `0.20` | Cable route length |
| 14 | Positive Seq. Resistance R1 | Ω/km | `0.0221` | Positive sequence resistance |
| 15 | Positive Seq. Reactance Z1 | Ω/km | `0.1600` | Positive sequence reactance |
| 16 | Negative Seq. Resistance R0 | Ω/km | `0.1300` | Zero sequence resistance |
| 17 | Negative Seq. Reactance Z0 | Ω/km | `0.0600` | Zero sequence reactance |

### **🔌 7 Device Parameters (Per Device)**

These parameters are **repeated for each device** (4-20 devices possible):

| # | Parameter Name | Unit | Example Values | Description |
|---|---|---|---|---|
| 1 | **Core** | - | `Core 1`, `T1`, `-` | Core designation |
| 2 | **CT Core Used For** | - | `Core 1`, `Core 2` | Purpose/Function |
| 3 | **CT Ratio** | - | `800/1A`, `2500/1A` | Current transformer ratio |
| 4 | **Accuracy Class** | - | `PX`, `0.5` | CT accuracy classification |
| 5 | **CT Resistance** | ohm | `3.5`, `6`, `2.5`, `15` | CT secondary resistance |
| 6 | **Vk- Knee Point Voltage** | V | `540`, `400` | Knee point voltage |
| 7 | **Burden** | VA | `10`, `20` | Connected burden |
| 8 | **Magnetizing Current** | mA | `20`, `-` | Magnetizing current at Vk |

---

## **📊 Excel File Structure**

### **Expected Layout:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARAMETERS TABLE                                  │
├─────────────────────────────┬──────────┬─────────────────────────────────────┤
│ Parameters                  │ Unit     │ Values                              │
├─────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Bus Fault level             │ kA       │ 31.5kA/3sec                        │
│ System Frequency            │ Hz       │ 50                                  │
│ Bus Voltage Level           │ kV       │ 33kV                                │
│ X/R Ratio                   │ -        │ -                                   │
│ ...                         │ ...      │ ...                                 │
└─────────────────────────────┴──────────┴─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVICES TABLE                                     │
├─────────────────────────────┬──────────┬─────────┬─────────┬─────────┬──────┤
│ PROTECTION PURPOSE          │          │DISTANCE │ BCPU+   │AMMETERS │ BB/BF│
│ DEVICES                     │          │+DIFFER  │ OC/EF   │ FRER    │ REP670│
│                             │          │ RED 670 │REX640+  │         │      │
│                             │          │         │REF615   │         │      │
├─────────────────────────────┼──────────┼─────────┼─────────┼─────────┼──────┤
│ Core                        │ -        │ Core 1  │ Core 2  │ T1      │Core3 │
│ CT Core used For            │          │ Core 1  │ Core 2  │ -       │Core4 │
│ CT Ratio                    │          │ 800/1A  │ 800/1A  │ 800/1A  │2500/1A│
│ Accuracy Class              │ ohm      │ PX      │ PX      │ 0.5     │ PX   │
│ CT Resistance               │ V        │ 3.5     │ 6       │ 2.5     │ 15   │
│ Vk- Knee point Voltage      │ VA       │ 540     │ 400     │ -       │ 400  │
│ Burden                      │ mA       │ -       │ -       │ 10      │ -    │
│ Magnetizing current         │          │ 20      │ 20      │ -       │ 20   │
└─────────────────────────────┴──────────┴─────────┴─────────┴─────────┴──────┘
```

---

## **🔍 Data Processing Logic**

### **Standard Parameters Processing:**
1. **Scan all rows** for parameter names matching patterns
2. **Extract values** from "Values" column (column 3) or fallback to column 2
3. **Normalize values**: Empty cells, "-", or null → "N/A"
4. **Store in standardized structure** for consistent access

### **Device Parameters Processing:**
1. **Locate device table** by finding "PROTECTION" + "DEVICES" keywords
2. **Extract device names** from header row (columns 3+)
3. **Create device objects** for each detected device (4-20 devices)
4. **Map 7 parameters** to each device from subsequent rows
5. **Handle variable device count** dynamically

### **Value Normalization:**
- **Empty cells** → `"N/A"`
- **Dash "-"** → `"N/A"`
- **Null/undefined** → `"N/A"`
- **Valid values** → Preserved as strings
- **Units preserved** in original format (e.g., "31.5kA/3sec", "800/1A")

---

## **🎯 Device Type Detection**

### **Supported Device Types:**
- **RED670** - Transformer Differential + Distance + Breaker Failure
- **REF615** - Feeder Differential Protection  
- **REL670** - Line Distance Protection
- **BCPU** - Bay Control and Protection Unit
- **Ammeters** - Current Measurement Devices
- **BB/BF** - Busbar/Breaker Failure Protection
- **REP670** - Busbar Protection
- **REX640** - Feeder Protection and Control
- **Custom devices** - Any other device names

### **Protection Function Inference:**
```typescript
RED670    → ['differential', 'distance', 'breaker_failure']
REF615    → ['differential', 'overcurrent']  
REL670    → ['distance', 'overcurrent']
BB/BF     → ['breaker_failure']
BCPU      → ['control', 'protection']
Ammeters  → ['metering']
```

---

## **📤 API Response Structure**

### **Successful Import Response:**
```json
{
  "success": true,
  "data": {
    "standard_parameters": {
      "bus_fault_level": "31.5kA/3sec",
      "system_frequency": "50",
      "bus_voltage_level": "33kV",
      "route_length": "0.20",
      // ... all 17 parameters
    },
    "devices": [
      {
        "device_name": "RED 670",
        "core": "Core 1",
        "ct_core_used_for": "Core 1", 
        "ct_ratio": "800/1A",
        "accuracy_class": "PX",
        "ct_resistance": "3.5",
        "vk_knee_point_voltage": "540",
        "burden": "N/A",
        "magnetizing_current": "20"
      },
      // ... up to 20 devices
    ],
    "total_devices": 4,
    "device_types": ["RED 670", "REX640+REF615", "AMMETERS FRER", "BB/BF REP670"]
  },
  "message": "Excel file parsed successfully. Found 4 devices with 17 standard parameters.",
  "summary": {
    "standard_parameters_found": 17,
    "devices_found": 4,
    "device_types": ["RED 670", "REX640+REF615", "AMMETERS FRER", "BB/BF REP670"],
    "warnings": []
  }
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": "Excel file validation failed",
  "errors": [
    "No device data found in Excel file",
    "Device 2: Missing CT ratio"
  ],
  "warnings": [
    "Only 3 devices found. Expected at least 4 devices.",
    "Device 1 (RED670): Missing knee point voltage"
  ]
}
```

---

## **🔧 Implementation Features**

### **✅ Robust Pattern Matching**
- **Flexible parameter detection** using multiple keyword patterns
- **Case-insensitive matching** for parameter names
- **Partial string matching** to handle formatting variations

### **✅ Dynamic Device Handling**
- **Variable device count** (4-20 devices supported)
- **Automatic device type detection** from names
- **Protection function inference** based on device names

### **✅ Data Validation**
- **Required parameter checking** for critical values
- **Device count validation** (warns if <4 or >20 devices)
- **Missing data handling** with appropriate warnings

### **✅ Legacy Compatibility**
- **Backward compatibility** with existing computation system
- **Automatic field mapping** to legacy structure
- **Seamless integration** with current CT adequacy calculations

---

## **🚀 Usage Examples**

### **Frontend Integration:**
```typescript
// Upload Excel file
const formData = new FormData();
formData.append('file', excelFile);

const response = await fetch(`/api/workspaces/${workspaceId}/import-excel-ct`, {
  method: 'POST',
  body: formData
});

const result = await response.json();

if (result.success) {
  console.log(`Found ${result.data.total_devices} devices`);
  console.log(`Standard parameters: ${result.summary.standard_parameters_found}`);
  
  // Access standardized data
  const busVoltage = result.data.standard_parameters.bus_voltage_level;
  const firstDevice = result.data.devices[0];
  const ctRatio = firstDevice.ct_ratio;
}
```

### **Computation Integration:**
```typescript
// The extracted data automatically provides legacy fields
const legacyData = {
  ct_ratio_primary: result.data.ct_ratio_primary,
  ct_ratio_secondary: result.data.ct_ratio_secondary,
  frequency: result.data.frequency,
  bus_voltage_kv: result.data.bus_voltage_kv,
  // ... all legacy fields available
};

// Use with existing CT adequacy calculation
const computation = await createComputation(templateId, legacyData);
```

---

## **📝 Summary**

This standardized Excel import system provides:

- ✅ **Consistent data extraction** from varying Excel formats
- ✅ **Support for 4-20 devices** with 7 parameters each  
- ✅ **17 standard parameters** always captured
- ✅ **Robust error handling** and validation
- ✅ **Legacy compatibility** with existing systems
- ✅ **Real-time processing** with detailed feedback
- ✅ **Flexible device detection** and classification

**The system is now ready to handle any Excel file following this standardized structure, ensuring reliable CT adequacy analysis regardless of user-specific formatting variations.**