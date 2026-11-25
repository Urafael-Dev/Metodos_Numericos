"""Práctica 3 · Eliminación de Gauss-Jordan con pivoteo parcial.

Lleva [A | b] a forma escalonada reducida y lee la solución en la última columna.
Con [A | I] obtiene la inversa.
Requiere: numpy
"""
import numpy as np


def gauss_jordan(M, tol=1e-12, mostrar=True):
    M = np.array(M, dtype=float)
    filas, cols = M.shape
    fila = 0
    for col in range(cols - 1):
        if fila >= filas:
            break
        p = fila + np.argmax(np.abs(M[fila:, col]))  # pivoteo parcial
        if abs(M[p, col]) < tol:
            continue  # columna sin pivote -> variable libre
        if p != fila:
            M[[fila, p]] = M[[p, fila]]
            if mostrar:
                print(f"F{fila + 1} <-> F{p + 1}")
        M[fila] /= M[fila, col]  # pivote = 1
        for k in range(filas):
            if k != fila and abs(M[k, col]) > tol:
                M[k] -= M[k, col] * M[fila]  # ceros arriba y abajo
        if mostrar:
            print(f"Columna {col + 1}:\n{np.round(M, 4)}\n")
        fila += 1
    return M


A = np.array([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], dtype=float)
b = np.array([8, -11, -3], dtype=float)

R = gauss_jordan(np.column_stack([A, b]))
print("Solución x =", R[:, -1])  # -> [ 2.  3. -1.]

inv = gauss_jordan(np.hstack([A, np.eye(3)]), mostrar=False)[:, 3:]
print("\nInversa de A:\n", np.round(inv, 6))
print("A · A⁻¹ = I ?", np.allclose(A @ inv, np.eye(3)))
