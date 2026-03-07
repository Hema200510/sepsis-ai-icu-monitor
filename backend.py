"""
Sepsis AI Backend — Flask API
Loads your trained LightGBM model + StandardScaler from .pkl files
and serves real predictions via REST API.

Run: python backend.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import warnings
import os
import random
import math
import time

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)

# ── Load your trained models ──────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH  = os.path.join(BASE_DIR, "sepsis_prediction_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "sepsis_scaler.pkl")

print("Loading model and scaler...")
model  = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
print(f"✓ Model loaded:  {type(model).__name__}")
print(f"✓ Scaler loaded: {type(scaler).__name__}")

FEATURE_ORDER = [
    'HR', 'O2Sat', 'Temp', 'SBP', 'MAP', 'DBP', 'Resp',
    'WBC', 'Lactate', 'Platelets', 'Age', 'ICULOS',
    'ShockIndex', 'PulsePressure', 'Resp_Shock', 'OxygenStress'
]

def engineer_features(raw: dict) -> dict:
    """Exactly matches your notebook feature engineering."""
    p = dict(raw)
    p['ShockIndex']    = p['HR'] / max(p['SBP'], 1)
    p['PulsePressure'] = p['SBP'] - p['DBP']
    p['Resp_Shock']    = p['Resp'] * p['HR']
    p['OxygenStress']  = p['HR'] / max(p['O2Sat'], 1)
    # Replace inf/nan with median fallback
    for k, v in p.items():
        if not math.isfinite(float(v)):
            p[k] = 0.0
    return p

def predict(raw: dict) -> dict:
    """Full pipeline: raw vitals → engineered → scaled → LightGBM → probability."""
    engineered = engineer_features(raw)
    X = pd.DataFrame([[engineered[f] for f in FEATURE_ORDER]], columns=FEATURE_ORDER)
    X_scaled = scaler.transform(X)
    prob = float(model.predict_proba(X_scaled)[0][1])
    score = round(min(max(prob * 100, 1), 99))
    level = "HIGH" if prob > 0.70 else "MODERATE" if prob > 0.40 else "LOW"
    return {
        "prob":       prob,
        "score":      score,
        "level":      level,
        "engineered": {k: round(engineered[k], 4) for k in ['ShockIndex','PulsePressure','Resp_Shock','OxygenStress']},
        "scaled":     {f: round(float(v), 4) for f, v in zip(FEATURE_ORDER, X_scaled[0])}
    }

# ── Demo patient state (simulates a live ICU feed) ─────────────────────────
PATIENT_PROFILES = [
    {"id":"PT-001","ward":"ICU-1C","bed":"1C-04","dx":"Urosepsis / AKI",       "age":79,
     "base":{"HR":102,"O2Sat":93,"Temp":38.8,"SBP":96, "MAP":68,"DBP":62,"Resp":23,"WBC":16.8,"Lactate":2.4,"Platelets":142},"traj":"deteriorating","iculos":18},
    {"id":"PT-002","ward":"ICU-3A","bed":"3A-02","dx":"Hospital Pneumonia",     "age":67,
     "base":{"HR":88, "O2Sat":94,"Temp":37.8,"SBP":108,"MAP":76,"DBP":64,"Resp":20,"WBC":13.2,"Lactate":1.6,"Platelets":178},"traj":"fluctuating",  "iculos":31},
    {"id":"PT-003","ward":"ICU-2B","bed":"2B-07","dx":"Post-op Abdominal",      "age":54,
     "base":{"HR":74, "O2Sat":98,"Temp":36.9,"SBP":124,"MAP":84,"DBP":78,"Resp":14,"WBC":7.8, "Lactate":0.9,"Platelets":248},"traj":"stable",       "iculos":8},
    {"id":"PT-004","ward":"ICU-4A","bed":"4A-01","dx":"COPD + Infection",       "age":61,
     "base":{"HR":96, "O2Sat":91,"Temp":37.6,"SBP":104,"MAP":72,"DBP":66,"Resp":22,"WBC":12.4,"Lactate":1.7,"Platelets":188},"traj":"worsening",    "iculos":24},
    {"id":"PT-005","ward":"ICU-2A","bed":"2A-03","dx":"Bacteremia",             "age":71,
     "base":{"HR":114,"O2Sat":90,"Temp":39.1,"SBP":86, "MAP":58,"DBP":52,"Resp":28,"WBC":18.2,"Lactate":3.8,"Platelets":118},"traj":"critical",     "iculos":6},
    {"id":"PT-006","ward":"ICU-3B","bed":"3B-09","dx":"Pancreatitis",           "age":45,
     "base":{"HR":82, "O2Sat":97,"Temp":37.3,"SBP":116,"MAP":80,"DBP":72,"Resp":17,"WBC":9.6, "Lactate":1.1,"Platelets":220},"traj":"improving",    "iculos":42},
]

DRIFT = {
    "deteriorating": {"HR":+0.4,"O2Sat":-0.15,"Temp":+0.04,"SBP":-0.3,"MAP":-0.2,"DBP":-0.1,"Resp":+0.3,"WBC":+0.08,"Lactate":+0.06,"Platelets":-0.5},
    "worsening":     {"HR":+0.25,"O2Sat":-0.1,"Temp":+0.02,"SBP":-0.2,"MAP":-0.15,"DBP":-0.08,"Resp":+0.2,"WBC":+0.05,"Lactate":+0.04,"Platelets":-0.3},
    "fluctuating":   {"HR":+0.05,"O2Sat":-0.02,"Temp":+0.01,"SBP":-0.05,"MAP":-0.02,"DBP":-0.01,"Resp":+0.05,"WBC":+0.01,"Lactate":+0.01,"Platelets":-0.1},
    "stable":        {"HR":0,"O2Sat":0,"Temp":0,"SBP":0,"MAP":0,"DBP":0,"Resp":0,"WBC":0,"Lactate":0,"Platelets":0},
    "improving":     {"HR":-0.2,"O2Sat":+0.1,"Temp":-0.02,"SBP":+0.2,"MAP":+0.1,"DBP":+0.05,"Resp":-0.15,"WBC":-0.04,"Lactate":-0.03,"Platelets":+0.4},
    "critical":      {"HR":+0.5,"O2Sat":-0.2,"Temp":+0.05,"SBP":-0.4,"MAP":-0.3,"DBP":-0.15,"Resp":+0.4,"WBC":+0.1,"Lactate":+0.08,"Platelets":-0.7},
}

LIMITS = {
    "HR":(30,200),"O2Sat":(75,100),"Temp":(35,42),"SBP":(50,220),
    "MAP":(40,160),"DBP":(30,130),"Resp":(6,50),"WBC":(1,40),
    "Lactate":(0.3,15),"Platelets":(20,600)
}

# Mutable live state
live_vitals = {p["id"]: dict(p["base"]) for p in PATIENT_PROFILES}
tick_count  = {p["id"]: 0 for p in PATIENT_PROFILES}

def advance_vitals(patient_id: str) -> dict:
    profile = next(p for p in PATIENT_PROFILES if p["id"] == patient_id)
    current = live_vitals[patient_id]
    drift   = DRIFT.get(profile["traj"], {})
    updated = {}
    n = lambda s: (random.random() - 0.5) * s
    noise = {"HR":2,"O2Sat":0.6,"Temp":0.08,"SBP":2,"MAP":1.5,"DBP":1.2,"Resp":0.8,"WBC":0.3,"Lactate":0.1,"Platelets":3}
    for k in current:
        lo, hi = LIMITS.get(k, (-999, 999))
        val = current[k] + drift.get(k, 0) + n(noise.get(k, 0))
        val = max(lo, min(hi, val))
        updated[k] = round(val, 1) if k in ("Temp","WBC","Lactate") else round(val)
    live_vitals[patient_id] = updated
    tick_count[patient_id]  += 1
    return updated

# ── API ROUTES ─────────────────────────────────────────────────────────────

@app.route("/api/patients", methods=["GET"])
def get_all_patients():
    """Returns all patients with their latest vitals and model predictions."""
    results = []
    for p in PATIENT_PROFILES:
        vitals  = advance_vitals(p["id"])
        raw     = {**vitals, "Age": p["age"], "ICULOS": p["iculos"] + tick_count[p["id"]] * 2 / 3600}
        pred    = predict(raw)
        results.append({
            "id":    p["id"],
            "ward":  p["ward"],
            "bed":   p["bed"],
            "dx":    p["dx"],
            "age":   p["age"],
            "iculos":round(p["iculos"] + tick_count[p["id"]] * 2 / 3600, 1),
            "vitals": vitals,
            "prediction": pred,
            "tick":  tick_count[p["id"]],
        })
    return jsonify(results)


@app.route("/api/predict", methods=["POST"])
def predict_single():
    """
    Predict sepsis risk for a single patient.
    POST body (JSON):
    {
      "HR": 118, "O2Sat": 91, "Temp": 38.9, "SBP": 88, "MAP": 60,
      "DBP": 55, "Resp": 30, "WBC": 17.5, "Lactate": 4.2,
      "Platelets": 140, "Age": 67, "ICULOS": 8
    }
    """
    data = request.get_json()
    required = ["HR","O2Sat","Temp","SBP","MAP","DBP","Resp","WBC","Lactate","Platelets","Age","ICULOS"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400
    try:
        raw  = {k: float(data[k]) for k in required}
        pred = predict(raw)
        return jsonify({"input": raw, "prediction": pred})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": type(model).__name__, "features": len(FEATURE_ORDER)})


if __name__ == "__main__":
    print("\n" + "="*50)
    print("  Sepsis AI Backend running on http://localhost:5000")
    print("  Endpoints:")
    print("    GET  /api/patients  → live feed (all patients)")
    print("    POST /api/predict   → single patient prediction")
    print("    GET  /api/health    → health check")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)
