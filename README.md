## Live Demo
https://huggingface.co/spaces/Hema200510/sepsis-icu-monitor

# Sepsis AI Monitor

AI-powered ICU sepsis detection system using your trained LightGBM model.

---

## What's in this folder

```
sepsis-app/
├── backend.py                      ← Python Flask API (loads your .pkl models)
├── sepsis_prediction_model.pkl     ← Your trained LightGBM model
├── sepsis_scaler.pkl               ← Your trained StandardScaler
├── requirements.txt                ← Python dependencies
├── package.json                    ← Node/React dependencies
├── vite.config.js                  ← Vite config (proxies /api → Flask)
├── index.html                      ← HTML entry point
└── src/
    ├── main.jsx                    ← React entry point
    └── App.jsx                     ← Main dashboard UI
```

---

## How to Run

You need **two terminals** open — one for the Python backend, one for the React frontend.

---

### Step 1 — Install Python dependencies

```bash
pip install -r requirements.txt
```

> If you get a LightGBM version error, install the exact version your model was trained on:
> ```bash
> pip install lightgbm==4.3.0
> ```

---

### Step 2 — Start the Python backend

In **Terminal 1**:

```bash
python backend.py
```

You should see:
```
✓ Model loaded:  LGBMClassifier
✓ Scaler loaded: StandardScaler

==================================================
  Sepsis AI Backend running on http://localhost:5000
  Endpoints:
    GET  /api/patients  → live feed (all patients)
    POST /api/predict   → single patient prediction
    GET  /api/health    → health check
==================================================
```

---

### Step 3 — Install Node dependencies

In **Terminal 2** (first time only):

```bash
npm install
```

---

### Step 4 — Start the React frontend

Still in **Terminal 2**:

```bash
npm run dev
```

You should see:
```
  VITE ready in 300ms
  ➜  Local:   http://localhost:3000/
```

---

### Step 5 — Open the app

Go to **http://localhost:3000** in your browser.

You'll see the live ICU monitor with real LightGBM predictions updating every 2 seconds.

---

## Test the API directly

Check it's working:
```bash
curl http://localhost:5000/api/health
```

Run a manual prediction (the exact sepsis patient from your notebook Cell 4):
```bash
curl -X POST http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"HR":118,"O2Sat":91,"Temp":38.9,"SBP":88,"MAP":60,"DBP":55,"Resp":30,"WBC":17.5,"Lactate":4.2,"Platelets":140,"Age":67,"ICULOS":8}'
```

Expected response:
```json
{
  "prediction": {
    "level": "HIGH",
    "prob": 0.97,
    "score": 97
  }
}
```

---

## Connect real patient data

In `backend.py`, the `advance_vitals()` function currently simulates data.
To connect real hospital data, replace the `/api/patients` route body with your actual data source:

```python
@app.route("/api/patients", methods=["GET"])
def get_all_patients():
    # Replace this with your real data source:
    # - hospital DB query
    # - HL7 FHIR API call
    # - CSV file read
    data = your_data_source.get_latest_vitals()
    ...
```

---

## Requirements

- Python 3.8+
- Node.js 18+
- npm 9+
"# deploy"  
