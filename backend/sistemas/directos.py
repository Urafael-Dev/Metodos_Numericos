"""Métodos directos: eliminación de Gauss-Jordan con registro de pasos.

Gauss-Jordan lleva la matriz aumentada [A | b] a su forma escalonada reducida
(RREF): cada pivote vale 1 y es el único elemento no nulo de su columna. A
diferencia de Gauss, no necesita sustitución regresiva: la solución se lee en
la última columna. Funciona para cualquier m x n, así que también clasifica el
sistema (única, infinitas o ninguna solución). Con [A | I] calcula la inversa.
"""

from __future__ import annotations

import numpy as np

from .validacion import ErrorEntrada, matriz, vector

TOL = 1e-11


def _foto(M):
    return [[0.0 if abs(v) < TOL else float(v) for v in fila] for fila in M]


def gauss_jordan(A, b=None, modo="sistema", pivoteo=True):
    if modo not in ("sistema", "inversa"):
        raise ErrorEntrada("modo debe ser «sistema» o «inversa».")
    A = matriz(A, max_filas=10, max_columnas=10, cuadrada=(modo == "inversa"))
    m, n = A.shape
    if modo == "sistema":
        b = vector(b, m)
        M = np.hstack([A, b.reshape(-1, 1)])
    else:
        M = np.hstack([A, np.eye(m)])

    escala = max(1.0, float(np.max(np.abs(A))))
    tol = TOL * escala
    pasos = [{"tipo": "inicio", "descripcion": "Matriz aumentada inicial", "operaciones": [], "matriz": _foto(M)}]
    multiplicaciones = 0
    sumas = 0
    fila = 0
    columnas_pivote = []

    for col in range(n):
        if fila >= m:
            break
        candidatas = np.abs(M[fila:, col])
        if pivoteo:
            p = fila + int(np.argmax(candidatas))
        else:
            no_nulas = np.nonzero(candidatas > tol)[0]
            p = fila + int(no_nulas[0]) if no_nulas.size else fila
        if abs(M[p, col]) <= tol:
            pasos.append({"tipo": "sin_pivote",
                          "descripcion": f"La columna {col + 1} no tiene pivote: x{col + 1} será variable libre",
                          "operaciones": [], "matriz": _foto(M)})
            continue
        if p != fila:
            M[[fila, p]] = M[[p, fila]]
            pasos.append({"tipo": "intercambio",
                          "descripcion": f"Intercambio de filas para usar el pivote {'de mayor valor absoluto' if pivoteo else 'no nulo'}",
                          "operaciones": [{"tex": f"F_{{{fila + 1}}} \\leftrightarrow F_{{{p + 1}}}"}],
                          "pivote": [fila, col], "matriz": _foto(M)})
        piv = M[fila, col]
        if abs(piv - 1.0) > 1e-14:
            M[fila] = M[fila] / piv
            multiplicaciones += M.shape[1] - col
            pasos.append({"tipo": "normalizar",
                          "descripcion": f"Se divide la fila {fila + 1} entre el pivote para que valga 1",
                          "operaciones": [{"tex": f"F_{{{fila + 1}}} \\leftarrow F_{{{fila + 1}}} / ({piv:.6g})"}],
                          "pivote": [fila, col], "matriz": _foto(M)})
        M[fila, col] = 1.0
        ops = []
        for k in range(m):
            if k == fila:
                continue
            f = M[k, col]
            if abs(f) > tol:
                M[k] = M[k] - f * M[fila]
                M[k, col] = 0.0
                multiplicaciones += M.shape[1] - col
                sumas += M.shape[1] - col
                signo = "-" if f > 0 else "+"
                ops.append({"tex": f"F_{{{k + 1}}} \\leftarrow F_{{{k + 1}}} {signo} {abs(f):.6g}\\,F_{{{fila + 1}}}"})
        if ops:
            pasos.append({"tipo": "eliminacion",
                          "descripcion": f"Se anulan los demás elementos de la columna {col + 1} (arriba y abajo del pivote)",
                          "operaciones": ops, "pivote": [fila, col], "matriz": _foto(M)})
        columnas_pivote.append(col)
        fila += 1

    rango = len(columnas_pivote)
    resultado = {
        "modo": modo,
        "m": m,
        "n": n,
        "rango": rango,
        "columnas_pivote": [c + 1 for c in columnas_pivote],
        "pasos": pasos,
        "rref": _foto(M),
        "operaciones": {"multiplicaciones_divisiones": multiplicaciones, "sumas_restas": sumas},
        "teoricas": {"gauss_jordan": round(n ** 3 / 2 + n ** 2), "gauss": round(n ** 3 / 3 + n ** 2)},
    }

    if modo == "inversa":
        if rango < n:
            resultado.update(invertible=False, inversa=None)
        else:
            inversa = M[:, n:]
            resultado.update(invertible=True, inversa=_foto(inversa),
                             verificacion=float(np.max(np.abs(A @ inversa - np.eye(n)))))
        resultado["determinante"] = float(np.linalg.det(A))
        return resultado

    inconsistente = any(np.all(np.abs(M[i, :n]) <= tol) and abs(M[i, n]) > tol for i in range(m))
    libres = [c for c in range(n) if c not in columnas_pivote]
    if inconsistente:
        clasificacion = "incompatible"
        x = None
        base = []
    else:
        x = np.zeros(n)
        for i, c in enumerate(columnas_pivote):
            x[c] = M[i, n]
        base = []
        for lib in libres:
            v = np.zeros(n)
            v[lib] = 1.0
            for i, c in enumerate(columnas_pivote):
                v[c] = -M[i, lib]
            base.append(_foto([v])[0])
        clasificacion = "compatible determinado" if not libres else "compatible indeterminado"
    resultado.update(
        clasificacion=clasificacion,
        consistente=not inconsistente,
        variables_libres=[c + 1 for c in libres],
        x=None if x is None else _foto([x])[0],
        base_nucleo=base,
        residuo=None if x is None else float(np.linalg.norm(A @ x - b)),
    )
    return resultado
