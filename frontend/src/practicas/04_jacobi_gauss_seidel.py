"""Práctica 4 · Métodos de Jacobi, Gauss-Seidel y SOR.

Incluye la comprobación de dominancia diagonal y el radio espectral de la
matriz de iteración, que decide la convergencia (ρ(T) < 1).
Requiere: numpy
"""
import numpy as np


def jacobi(A, b, x0=None, tol=1e-8, max_iter=200):
    n = len(b)
    x = np.zeros(n) if x0 is None else np.array(x0, dtype=float)
    for k in range(1, max_iter + 1):
        x_nuevo = np.empty(n)
        for i in range(n):
            s = sum(A[i, j] * x[j] for j in range(n) if j != i)  # solo valores VIEJOS
            x_nuevo[i] = (b[i] - s) / A[i, i]
        if np.linalg.norm(x_nuevo - x, np.inf) < tol:
            return x_nuevo, k
        x = x_nuevo
    return x, max_iter


def sor(A, b, omega=1.0, x0=None, tol=1e-8, max_iter=200):
    """omega = 1 es Gauss-Seidel; 1 < omega < 2 sobre-relaja."""
    n = len(b)
    x = np.zeros(n) if x0 is None else np.array(x0, dtype=float)
    for k in range(1, max_iter + 1):
        viejo = x.copy()
        for i in range(n):
            s1 = A[i, :i] @ x[:i]           # valores YA actualizados
            s2 = A[i, i + 1:] @ viejo[i + 1:]
            gs = (b[i] - s1 - s2) / A[i, i]
            x[i] = (1 - omega) * viejo[i] + omega * gs
        if np.linalg.norm(x - viejo, np.inf) < tol:
            return x, k
    return x, max_iter


def radios_espectrales(A):
    D = np.diag(np.diag(A))
    L, U = np.tril(A, -1), np.triu(A, 1)
    TJ = -np.linalg.solve(D, L + U)
    TGS = -np.linalg.solve(D + L, U)
    rho = lambda T: max(abs(np.linalg.eigvals(T)))  # noqa: E731
    return rho(TJ), rho(TGS)


A = np.array([[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]], dtype=float)
b = np.array([6, 25, -11, 15], dtype=float)

diag = np.abs(np.diag(A))
print("¿Diagonalmente dominante?", np.all(diag > np.sum(np.abs(A), axis=1) - diag))
rj, rgs = radios_espectrales(A)
print(f"ρ(T_J) = {rj:.4f}   ρ(T_GS) = {rgs:.4f}   (ρ_GS < ρ_J: Gauss-Seidel converge más rápido)")

for nombre, (x, k) in {
    "Jacobi": jacobi(A, b),
    "Gauss-Seidel": sor(A, b, 1.0),
    "SOR ω=1.05": sor(A, b, 1.05),
}.items():
    print(f"{nombre:13s} {k:3d} iteraciones  x = {np.round(x, 8)}")
