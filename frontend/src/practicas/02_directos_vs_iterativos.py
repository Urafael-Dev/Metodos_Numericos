"""Práctica 2 · Métodos directos frente a métodos iterativos.

Se resuelve el mismo sistema tridiagonal (diagonalmente dominante) de tamaño
creciente con un método directo (eliminación, numpy.linalg.solve) y con
Gauss-Seidel, y se compara tiempo y error.
Requiere: numpy
"""
import time

import numpy as np


def sistema(n):
    A = 4 * np.eye(n) - np.eye(n, k=1) - np.eye(n, k=-1)  # tridiagonal, muy disperso
    x_real = np.ones(n)
    return A, A @ x_real, x_real


def gauss_seidel_tridiagonal(A, b, tol=1e-10, max_iter=500):
    """Gauss-Seidel que solo toca los 3 elementos no nulos de cada fila: O(n) por iteración."""
    n = len(b)
    x = np.zeros(n)
    for k in range(1, max_iter + 1):
        maximo = 0.0
        for i in range(n):
            s = b[i]
            if i > 0:
                s -= A[i, i - 1] * x[i - 1]
            if i < n - 1:
                s -= A[i, i + 1] * x[i + 1]
            nuevo = s / A[i, i]
            maximo = max(maximo, abs(nuevo - x[i]))
            x[i] = nuevo
        if maximo < tol:
            return x, k
    return x, max_iter


print(f"{'n':>6} | {'directo (s)':>11} | {'G-S (s)':>9} | {'iter':>4} | {'error directo':>13} | {'error G-S':>9}")
for n in (50, 200, 800):
    A, b, x_real = sistema(n)
    t0 = time.perf_counter()
    x_d = np.linalg.solve(A, b)
    t_d = time.perf_counter() - t0
    t0 = time.perf_counter()
    x_i, k = gauss_seidel_tridiagonal(A, b)
    t_i = time.perf_counter() - t0
    print(f"{n:6d} | {t_d:11.5f} | {t_i:9.5f} | {k:4d} | "
          f"{np.max(np.abs(x_d - x_real)):13.2e} | {np.max(np.abs(x_i - x_real)):9.2e}")

print("\nMemoria de A densa con n = 100 000:", 100_000**2 * 8 / 1e9, "GB (imposible); "
      "dispersa (3 diagonales):", 3 * 100_000 * 8 / 1e6, "MB")
