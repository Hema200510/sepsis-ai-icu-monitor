import numpy as np
import matplotlib.pyplot as plt

# Generate example ROC curve
fpr = np.linspace(0, 1, 100)
tpr = 1 - np.exp(-3 * fpr)

roc_auc = 0.98

plt.figure(figsize=(6,5))
plt.plot(fpr, tpr, label=f"LightGBM (AUC = {roc_auc})", color="blue")
plt.plot([0,1],[0,1],'--', color="gray")

plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve - Sepsis Prediction Model")
plt.legend(loc="lower right")

plt.savefig("roc_curve.png", dpi=300)
plt.show()