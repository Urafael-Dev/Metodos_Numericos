"""Métodos iterativos: Jacobi, Gauss-Seidel y SOR, con análisis de convergencia.

Se parte la matriz como A = D + L + U (diagonal, triangular inferior y
superior estrictas). Cada método es una iteración x⁽ᵏ⁺¹⁾ = T x⁽ᵏ⁾ + c y
converge para cualquier x⁽⁰⁾ si y solo si el radio espectral ρ(T) < 1:

* Jacobi:        T_J  = -D⁻¹(L + U)
* Gauss-Seidel:  T_GS = -(D + L)⁻¹ U
* SOR (ω):       T_ω  = (D + ωL)⁻¹ [(1 - ω)D - ωU]

La dominancia diagonal estricta es una condición suficiente (no necesaria)
para que Jacobi y Gauss-Seidel converjan.
"""

from __future__ import annotations

import itertools
import math

import numpy as np

from .validacion import ErrorEntrada, entero, matriz, radio_espectral, real, vector

METODOS = {"jacobi": "Jacobi", "gauss_seidel": "Gauss-Seidel", "sor": "SOR"}


def dominancia(A):
    filas = []
    for i, fila in enumerate(A):
        diag = abs(fila[i])
        resto = float(np.sum(np.abs(fila)) - diag)
        filas.append({"fila": i + 1, "diagonal": float(diag), "suma_resto": resto, "cumple": bool(diag > resto)})
    return {"estricta": all(f["cumple"] for f in filas), "filas": filas}


def matrices_iteracion(A, omega=1.0):
    D = np.diag(np.diag(A))
    L = np.tril(A, -1)
    U = np.triu(A, 1)
    res = {}
    if np.all(np.abs(np.diag(A)) > 0):
        TJ = -np.linalg.solve(D, L + U)
        TGS = -np.linalg.solve(D + L, U)
        TW = np.linalg.solve(D + omega * L, (1 - omega) * D - omega * U)
        res = {"T_jacobi": TJ, "T_gauss_seidel": TGS, "T_sor": TW,
               "rho_jacobi": radio_espectral(TJ), "rho_gauss_seidel": radio_espectral(TGS),
               "rho_sor": radio_espectral(TW)}
        rj = res["rho_jacobi"]
        res["omega_optimo"] = 2 / (1 + math.sqrt(1 - rj ** 2)) if rj < 1 else None
    return res


def es_spd(A):
    if not np.allclose(A, A.T):
        return False
    try:
        np.linalg.cholesky(A)
        return True
    except np.linalg.LinAlgError:
        return False


def reordenar_dominante(A, b):
    """Busca una permutación de filas que haga A diagonalmente dominante (n ≤ 7)."""
    n = len(A)
    if n > 7:
        return None
    mejor, mejor_valor = None, -np.inf
    for perm in itertools.permutations(range(n)):
        P = A[list(perm)]
        diag = np.abs(np.diag(P))
        resto = np.sum(np.abs(P), axis=1) - diag
        if np.all(diag > resto):
            valor = float(np.min(diag - resto))
            if valor > mejor_valor:
                mejor, mejor_valor = perm, valor
    if mejor is None:
        return None
    return list(mejor), A[list(mejor)], b[list(mejor)]


def _paso(A, b, x, metodo, omega):
    n = len(b)
    nuevo = x.copy()
    detalle = []
    for i in range(n):
        fuente = nuevo if metodo != "jacobi" else x
        terminos = [(j, A[i, j], fuente[j]) for j in range(n) if j != i]
        suma = sum(a * v for _, a, v in terminos)
        gs = (b[i] - suma) / A[i, i]
        valor = gs if metodo != "sor" else (1 - omega) * x[i] + omega * gs
        detalle.append({"i": i + 1, "terminos": [{"j": j + 1, "a": float(a), "x": float(v)} for j, a, v in terminos],
                        "b": float(b[i]), "a_ii": float(A[i, i]), "gs": float(gs), "valor": float(valor),
                        "anterior": float(x[i])})
        nuevo[i] = valor
    return nuevo, detalle


def iterar(A, b, x0=None, metodo="jacobi", tol=1e-6, max_iter=50, omega=1.25,
           criterio="absoluto", reordenar=False):
    if metodo not in METODOS:
        raise ErrorEntrada(f"Método desconocido. Opciones: {', '.join(METODOS)}.")
    if criterio not in ("absoluto", "relativo"):
        raise ErrorEntrada("criterio debe ser «absoluto» o «relativo».")
    A = matriz(A, max_filas=10, max_columnas=10, cuadrada=True)
    n = len(A)
    b = vector(b, n)
    x = np.zeros(n) if x0 in (None, []) else vector(x0, n, "x0")
    tol = real(tol, "La tolerancia", 1e-14, 1.0, 1e-6)
    max_iter = entero(max_iter, "El máximo de iteraciones", 1, 500, 50)
    omega = real(omega, "ω", 0.01, 1.99, 1.25)

    permutacion = None
    if reordenar and not dominancia(A)["estricta"]:
        r = reordenar_dominante(A, b)
        if r:
            permutacion, A, b = r

    if np.any(np.abs(np.diag(A)) < 1e-14):
        raise ErrorEntrada("Hay un cero en la diagonal (a_ii = 0): reordena las filas o activa «reordenar».")

    analisis = matrices_iteracion(A, omega)
    clave = {"jacobi": "rho_jacobi", "gauss_seidel": "rho_gauss_seidel", "sor": "rho_sor"}[metodo]
    rho = analisis[clave]

    historial = [{"k": 0, "x": x.tolist(), "error": None, "residuo": float(np.linalg.norm(b - A @ x, np.inf))}]
    desarrollo = []
    estado = "max_iter"
    for k in range(1, max_iter + 1):
        nuevo, detalle = _paso(A, b, x, metodo, omega)
        if k <= 3:
            desarrollo.append({"k": k, "componentes": detalle})
        dif = float(np.linalg.norm(nuevo - x, np.inf))
        if criterio == "relativo":
            norma = float(np.linalg.norm(nuevo, np.inf))
            error = dif / norma if norma > 0 else dif
        else:
            error = dif
        x = nuevo
        if not np.all(np.isfinite(x)) or np.max(np.abs(x)) > 1e12:
            historial.append({"k": k, "x": [v if math.isfinite(v) else None for v in x.tolist()],
                              "error": None, "residuo": None})
            estado = "diverge"
            break
        historial.append({"k": k, "x": x.tolist(), "error": error,
                          "residuo": float(np.linalg.norm(b - A @ x, np.inf))})
        if error < tol:
            estado = "converge"
            break

    exacta = None
    try:
        exacta = np.linalg.solve(A, b).tolist()
    except np.linalg.LinAlgError:
        pass

    dom = dominancia(A)
    return {
        "metodo": metodo,
        "nombre": METODOS[metodo],
        "n": n,
        "A": A.tolist(),
        "b": b.tolist(),
        "permutacion": None if permutacion is None else [p + 1 for p in permutacion],
        "estado": estado,
        "iteraciones": len(historial) - 1,
        "x": historial[-1]["x"],
        "historial": historial,
        "desarrollo": desarrollo,
        "tolerancia": tol,
        "criterio": criterio,
        "omega": omega if metodo == "sor" else None,
        "dominancia": dom,
        "spd": es_spd(A),
        "rho": rho,
        "rho_jacobi": analisis["rho_jacobi"],
        "rho_gauss_seidel": analisis["rho_gauss_seidel"],
        "rho_sor": analisis["rho_sor"],
        "omega_optimo": analisis["omega_optimo"],
        "T": analisis[{"jacobi": "T_jacobi", "gauss_seidel": "T_gauss_seidel", "sor": "T_sor"}[metodo]].tolist(),
        "solucion_exacta": exacta,
        "prediccion": "converge" if rho < 1 else "no converge",
    }
