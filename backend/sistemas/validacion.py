"""Validación compartida de las entradas de la API."""

from __future__ import annotations

import math

import numpy as np


class ErrorEntrada(ValueError):
    """Datos de entrada inválidos; la vista lo convierte en un HTTP 400."""


def numero(valor, donde):
    if isinstance(valor, bool):
        raise ErrorEntrada(f"{donde}: se esperaba un número, no un booleano.")
    if isinstance(valor, str):
        valor = valor.strip().replace(",", ".")
    try:
        x = float(valor)
    except (TypeError, ValueError):
        raise ErrorEntrada(f"{donde}: «{valor}» no es un número.") from None
    if not math.isfinite(x):
        raise ErrorEntrada(f"{donde}: el valor debe ser finito.")
    return x


def matriz(A, nombre="A", max_filas=50, max_columnas=10, cuadrada=False):
    if not isinstance(A, list) or not A or not all(isinstance(f, list) for f in A):
        raise ErrorEntrada(f"La matriz {nombre} debe ser una lista de filas no vacía.")
    n = len(A[0])
    if n == 0 or any(len(f) != n for f in A):
        raise ErrorEntrada(f"Todas las filas de {nombre} deben tener el mismo número de columnas (y al menos una).")
    m = len(A)
    if m > max_filas or n > max_columnas:
        raise ErrorEntrada(f"Tamaño máximo admitido para {nombre}: {max_filas} x {max_columnas}.")
    if cuadrada and m != n:
        raise ErrorEntrada(f"La matriz {nombre} debe ser cuadrada (es {m} x {n}).")
    return np.array([[numero(v, f"{nombre}[{i + 1},{j + 1}]") for j, v in enumerate(f)]
                     for i, f in enumerate(A)], dtype=float)


def vector(v, n, nombre="b"):
    if not isinstance(v, list) or len(v) != n:
        raise ErrorEntrada(f"El vector {nombre} debe tener {n} componentes.")
    return np.array([numero(x, f"{nombre}[{i + 1}]") for i, x in enumerate(v)], dtype=float)


def entero(v, nombre, lo, hi, por_defecto):
    if v is None or v == "":
        return por_defecto
    try:
        k = int(v)
    except (TypeError, ValueError):
        raise ErrorEntrada(f"{nombre} debe ser un entero.") from None
    if not lo <= k <= hi:
        raise ErrorEntrada(f"{nombre} debe estar entre {lo} y {hi}.")
    return k


def real(v, nombre, lo, hi, por_defecto):
    if v is None or v == "":
        return por_defecto
    x = numero(v, nombre)
    if not lo <= x <= hi:
        raise ErrorEntrada(f"{nombre} debe estar entre {lo:g} y {hi:g}.")
    return x


def radio_espectral(T):
    return float(np.max(np.abs(np.linalg.eigvals(T)))) if T.size else 0.0
