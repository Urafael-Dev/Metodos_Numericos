"""Práctica 5 · Sistemas no cuadrados por mínimos cuadrados.

* Sobredeterminado (m > n): ecuaciones normales y QR.
* Subdeterminado (m < n): solución de norma mínima.
* Rango deficiente: pseudoinversa (SVD).
Requiere: numpy
"""
import numpy as np

# Sobredeterminado: recta y = c0 + c1 x por 4 lecturas de un sensor
x = np.array([1, 2, 3, 4], dtype=float)
y = np.array([2, 3, 5, 6], dtype=float)
A = np.column_stack([np.ones_like(x), x])

c_normales = np.linalg.solve(A.T @ A, A.T @ y)       # AᵀA c = Aᵀy
Q, R = np.linalg.qr(A)
c_qr = np.linalg.solve(R, Q.T @ y)                    # R c = Qᵀy (más estable)
r = y - A @ c_normales
print("Ecuaciones normales:", c_normales, " QR:", c_qr)
print("Residuo r =", r, " Σr² =", r @ r, " Aᵀr =", A.T @ r)
print("κ(A) =", np.linalg.cond(A), " κ(AᵀA) =", np.linalg.cond(A.T @ A))

# Subdeterminado: 2 ecuaciones, 3 incógnitas
B = np.array([[1, 1, 1], [1, 2, 3]], dtype=float)
d = np.array([6, 14], dtype=float)
x_min = B.T @ np.linalg.solve(B @ B.T, d)            # x = Bᵀ(BBᵀ)⁻¹d
print("\nNorma mínima:", x_min, " ||x|| =", np.linalg.norm(x_min), " Bx =", B @ x_min)

# Rango deficiente: la columna 3 = columna 1 + columna 2
C = np.array([[1, 2, 3], [2, 1, 3], [1, 1, 2], [3, 0, 3]], dtype=float)
e = np.array([6, 5, 4, 4], dtype=float)
print("\nrango(C) =", np.linalg.matrix_rank(C), "de", C.shape[1])
print("Pseudoinversa:", np.linalg.pinv(C) @ e)
print("lstsq        :", np.linalg.lstsq(C, e, rcond=None)[0])
