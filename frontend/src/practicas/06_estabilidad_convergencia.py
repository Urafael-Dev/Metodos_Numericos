"""Práctica 6 · Análisis de estabilidad y convergencia.

* Número de condición κ(A) y pérdida de cifras (matrices de Hilbert).
* Experimento de perturbación: ||δx||/||x|| <= κ(A) · ||δb||/||b||.
Requiere: numpy
"""
import numpy as np


def hilbert(n):
    i, j = np.indices((n, n))
    return 1.0 / (i + j + 1)


print(f"{'n':>3} | {'κ(H)':>10} | {'cifras perdidas':>15} | {'error en x':>10}")
for n in range(2, 13, 2):
    H = hilbert(n)
    x_real = np.ones(n)
    x = np.linalg.solve(H, H @ x_real)
    k = np.linalg.cond(H)
    print(f"{n:3d} | {k:10.2e} | {np.log10(k):15.1f} | {np.max(np.abs(x - x_real)):10.2e}")

# Perturbación: rectas casi paralelas
A = np.array([[1, 1], [1, 1.0001]])
b = np.array([2, 2.0001])
x = np.linalg.solve(A, b)
db = np.array([0, 0.0001])
x_p = np.linalg.solve(A, b + db)
rel_b = np.linalg.norm(db) / np.linalg.norm(b)
rel_x = np.linalg.norm(x_p - x) / np.linalg.norm(x)
print(f"\nx = {x},  x perturbado = {x_p}")
print(f"cambio en b: {rel_b:.1e}   cambio en x: {rel_x:.1e}   amplificación: {rel_x / rel_b:.0f}")
print(f"cota κ(A)·ε = {np.linalg.cond(A) * rel_b:.1e}")

# Convergencia de un método iterativo: radio espectral de T_J
M = np.array([[4, 3, 0], [3, 4, -1], [0, -1, 4]], dtype=float)
D = np.diag(np.diag(M))
TJ = -np.linalg.solve(D, M - D)
print("\nρ(T_J) =", max(abs(np.linalg.eigvals(TJ))), "-> Jacobi", "converge" if max(abs(np.linalg.eigvals(TJ))) < 1 else "NO converge")
