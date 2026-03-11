import joblib
import numpy as np
from sklearn.metrics import accuracy_score
from sklearn.model_selection import cross_val_score
from sklearn.datasets import make_classification

# Load trained model
model = joblib.load("sepsis_prediction_model.pkl")

# Create sample dataset (for evaluation demo)
X, y = make_classification(
    n_samples=1000,
    n_features=16,
    n_informative=10,
    random_state=42
)

# Predictions
y_pred = model.predict(X)

# Accuracy
accuracy = accuracy_score(y, y_pred)
print("Model Accuracy:", accuracy)

# Cross Validation
scores = cross_val_score(model, X, y, cv=5)

print("\nCross Validation Scores:")
print(scores)

print("\nAverage CV Accuracy:", scores.mean())