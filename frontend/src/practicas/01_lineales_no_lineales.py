"""Práctica 1 · Sistemas de ecuaciones lineales y no lineales.

1) Clasificar un sistema lineal con el teorema de Rouché-Frobenius.
2) Resolver un sistema NO lineal con Newton-Raphson multivariable.
Requiere: numpy
"""
import numpy as np


def clasificar(A, b):
    A = np.array(A, dtype=float)
    Ab = np.column_stack([A, b])
    r, r_ab, n = np.linalg.matrix_rank(A), np.linalg.matrix_rank(Ab), A.shape[1]
    if r < r_ab:
        return "incompatible (sin solución)"
    return "compatible determinado" if r == n else "compatible indeterminado (infinitas)"


print("x + y = 3,  x - y = 1   ->", clasificar([[1, 1], [1, -1]], [3, 1]))
print("x + y = 3, 2x + 2y = 6  ->", clasificar([[1, 1], [2, 2]], [3, 6]))
print("x + y = 3, 2x + 2y = 7  ->", clasificar([[1, 1], [2, 2]], [3, 7]))


# Sistema no lineal:  x² + y² = 4,   xy = 1
def F(v):
    x, y = v
    return np.array([x**2 + y**2 - 4, x * y - 1])


def J(v):  # matriz jacobiana: derivadas parciales de cada ecuación
    x, y = v
    return np.array([[2 * x, 2 * y],
                     [y, x]])


def newton(F, J, x0, tol=1e-10, max_iter=50):
    x = np.array(x0, dtype=float)
    for k in range(1, max_iter + 1):
        delta = np.linalg.solve(J(x), -F(x))  # cada paso es un sistema LINEAL
        x = x + delta
        print(f"k={k:2d}  x={x}  ||delta||={np.linalg.norm(delta, np.inf):.2e}")
        if np.linalg.norm(delta, np.inf) < tol:
            return x, k
    raise RuntimeError("Newton no convergió")


sol, k = newton(F, J, [2.0, 0.5])
print(f"\nSolución: x = {sol[0]:.12f}, y = {sol[1]:.12f}  ({k} iteraciones)")
print("Comprobación F(x) =", F(sol))
