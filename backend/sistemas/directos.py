"""Métodos directos con registro de pasos: Gauss, Gauss-Jordan, LU, Cholesky y Cramer.

Todos trabajan sobre listas de Python cuyos elementos son, o bien `float`, o
bien `Fraction` (modo exacto). Así el mismo código produce resultados como
7/3 cuando los datos son racionales, que es como se resuelven los ejercicios
a mano, y decimales en el resto de casos.

* Gauss:        [A | b] → triangular superior + sustitución regresiva.
* Gauss-Jordan: [A | b] → forma escalonada reducida (RREF); con [A | I] da A⁻¹.
                Sirve para cualquier m × n y clasifica el sistema.
* LU:           PA = LU (Doolittle con pivoteo parcial); Ly = Pb, Ux = y.
* Cholesky:     A = LLᵀ para A simétrica definida positiva.
* Cramer:       xᵢ = det(Aᵢ) / det(A).
"""

from __future__ import annotations

import math
from fractions import Fraction

from .validacion import ErrorEntrada, matriz, vector

TOL = 1e-11


# ---------------------------------------------------------------------------
# Números exactos o de coma flotante
# ---------------------------------------------------------------------------

def a_fraccion(x: float) -> Fraction:
    """Convierte un float en la fracción «obvia» (0.1 → 1/10, 0.3333333333 → 1/3)."""
    f = Fraction(repr(float(x)))
    if f.denominator > 10_000:
        g = Fraction(x).limit_denominator(100_000)
        if abs(float(g) - x) <= 1e-12 * max(1.0, abs(x)):
            return g
    return f


def _preparar(M, exacto):
    return [[a_fraccion(v) if exacto else float(v) for v in fila] for fila in M]


def _cero(v, tol):
    return v == 0 if isinstance(v, Fraction) else abs(v) <= tol


def _float(M):
    return [[0.0 if abs(float(v)) < TOL else float(v) for v in fila] for fila in M]


def _str(v):
    if isinstance(v, Fraction):
        return str(v)
    return repr(0.0 if abs(v) < TOL else float(v))


def _strs(M):
    return [[_str(v) for v in fila] for fila in M]


def tex_num(v):
    """LaTeX de un número: fracción con \\frac o decimal corto."""
    if isinstance(v, Fraction):
        if v.denominator == 1:
            return str(v.numerator)
        s = "-" if v < 0 else ""
        return f"{s}\\dfrac{{{abs(v.numerator)}}}{{{v.denominator}}}"
    v = float(v)
    if abs(v) < TOL:
        return "0"
    if abs(v) >= 1e6 or abs(v) < 1e-4:
        m, e = f"{v:.4e}".split("e")
        return f"{m}\\times10^{{{int(e)}}}"
    return f"{v:.6g}"


def _par(v):
    t = tex_num(v)
    return f"({t})" if t.startswith("-") else t


def _foto(M, exacto, **extra):
    paso = {"matriz": _float(M), **extra}
    if exacto:
        paso["exacta"] = _strs(M)
    return paso


def _vector_salida(x, exacto):
    salida = {"x": [float(v) for v in x]}
    if exacto:
        salida["x_exacto"] = [_str(v) for v in x]
    salida["x_tex"] = [tex_num(v) for v in x]
    return salida


def _datos(A, b, exacto, cuadrada=False, max_n=10):
    A = matriz(A, max_filas=max_n, max_columnas=max_n, cuadrada=cuadrada)
    b = vector(b, len(A))
    escala = max(1.0, float(abs(A).max()))
    return _preparar(A.tolist(), exacto), [a_fraccion(v) if exacto else float(v) for v in b], TOL * escala


# ---------------------------------------------------------------------------
# Gauss-Jordan (cualquier m × n) y Gauss (triangular + sustitución regresiva)
# ---------------------------------------------------------------------------

def _eliminar(M, n_cols, pivoteo, tol, exacto, reducida):
    """Eliminación sobre las n_cols primeras columnas. Devuelve (pasos, pivotes, operaciones)."""
    m = len(M)
    pasos = [_foto(M, exacto, tipo="inicio", descripcion="Matriz aumentada inicial", operaciones=[])]
    mult = 0
    fila = 0
    pivotes = []
    for col in range(n_cols):
        if fila >= m:
            break
        candidatas = range(fila, m)
        if pivoteo:
            p = max(candidatas, key=lambda i: abs(M[i][col]))
        else:
            p = next((i for i in candidatas if not _cero(M[i][col], tol)), fila)
        if _cero(M[p][col], tol):
            pasos.append(_foto(M, exacto, tipo="sin_pivote", operaciones=[],
                               descripcion=f"La columna {col + 1} no tiene pivote: x{col + 1} es variable libre"))
            continue
        if p != fila:
            M[fila], M[p] = M[p], M[fila]
            pasos.append(_foto(M, exacto, tipo="intercambio", pivote=[fila, col],
                               descripcion=f"Intercambio de filas para usar el pivote {'de mayor valor absoluto' if pivoteo else 'no nulo'}",
                               operaciones=[{"tex": f"F_{{{fila + 1}}} \\leftrightarrow F_{{{p + 1}}}"}]))
        piv = M[fila][col]
        if reducida and piv != 1:
            M[fila] = [v / piv for v in M[fila]]
            mult += len(M[fila]) - col
            pasos.append(_foto(M, exacto, tipo="normalizar", pivote=[fila, col],
                               descripcion=f"Se divide la fila {fila + 1} entre el pivote para que valga 1",
                               operaciones=[{"tex": f"F_{{{fila + 1}}} \\leftarrow F_{{{fila + 1}}} \\div {_par(piv)}"}]))
            piv = M[fila][col]
        ops = []
        objetivo = range(m) if reducida else range(fila + 1, m)
        for k in objetivo:
            if k == fila or _cero(M[k][col], tol):
                continue
            f = M[k][col] / piv
            M[k] = [a - f * c for a, c in zip(M[k], M[fila])]
            M[k][col] = Fraction(0) if exacto else 0.0
            mult += len(M[k]) - col
            signo = "-" if f > 0 else "+"
            ops.append({"tex": f"F_{{{k + 1}}} \\leftarrow F_{{{k + 1}}} {signo} {tex_num(abs(f))}\\,F_{{{fila + 1}}}"})
        if ops:
            donde = "arriba y abajo del pivote" if reducida else "debajo del pivote"
            pasos.append(_foto(M, exacto, tipo="eliminacion", pivote=[fila, col], operaciones=ops,
                               descripcion=f"Se anulan los elementos de la columna {col + 1} {donde}"))
        pivotes.append(col)
        fila += 1
    return pasos, pivotes, mult


def _clasificar(M, n, pivotes, tol):
    inconsistente = any(all(_cero(v, tol) for v in M[i][:n]) and not _cero(M[i][n], tol) for i in range(len(M)))
    libres = [c for c in range(n) if c not in pivotes]
    if inconsistente:
        return "incompatible", libres
    return ("compatible determinado" if not libres else "compatible indeterminado"), libres


def gauss_jordan(A, b=None, modo="sistema", pivoteo=True, exacto=False):
    if modo not in ("sistema", "inversa"):
        raise ErrorEntrada("modo debe ser «sistema» o «inversa».")
    if modo == "inversa":
        An = matriz(A, max_filas=10, max_columnas=10, cuadrada=True)
        n = len(An)
        tol = TOL * max(1.0, float(abs(An).max()))
        Ap = _preparar(An.tolist(), exacto)
        uno, cero = (Fraction(1), Fraction(0)) if exacto else (1.0, 0.0)
        M = [fila + [uno if i == j else cero for j in range(n)] for i, fila in enumerate(Ap)]
        m = n
    else:
        Ap, bp, tol = _datos(A, b, exacto)
        m, n = len(Ap), len(Ap[0])
        M = [fila + [bi] for fila, bi in zip(Ap, bp)]

    pasos, pivotes, mult = _eliminar(M, n, pivoteo, tol, exacto, reducida=True)
    rango = len(pivotes)
    resultado = {
        "metodo": "gauss_jordan", "modo": modo, "m": m, "n": n, "rango": rango, "exacto": exacto,
        "columnas_pivote": [c + 1 for c in pivotes], "pasos": pasos,
        "operaciones": {"multiplicaciones_divisiones": mult},
        "teoricas": {"gauss_jordan": round(n ** 3 / 2 + n ** 2), "gauss": round(n ** 3 / 3 + n ** 2)},
    }
    if modo == "inversa":
        inv = [fila[n:] for fila in M] if rango == n else None
        det = determinante(Ap)
        resultado.update(invertible=rango == n, inversa=_float(inv) if inv else None,
                         inversa_exacta=_strs(inv) if inv and exacto else None,
                         determinante=float(det), determinante_tex=tex_num(det))
        if inv:
            prod = [[sum(float(Ap[i][k]) * float(inv[k][j]) for k in range(n)) for j in range(n)] for i in range(n)]
            resultado["verificacion"] = max(abs(prod[i][j] - (i == j)) for i in range(n) for j in range(n))
        return resultado

    clasificacion, libres = _clasificar(M, n, pivotes, tol)
    x, base = None, []
    if clasificacion != "incompatible":
        x = [Fraction(0) if exacto else 0.0 for _ in range(n)]
        for i, c in enumerate(pivotes):
            x[c] = M[i][n]
        for lib in libres:
            v = [Fraction(0) if exacto else 0.0 for _ in range(n)]
            v[lib] = Fraction(1) if exacto else 1.0
            for i, c in enumerate(pivotes):
                v[c] = -M[i][lib]
            base.append(v)
    resultado.update(
        clasificacion=clasificacion, consistente=clasificacion != "incompatible",
        variables_libres=[c + 1 for c in libres],
        base_nucleo=[[float(v) for v in vec] for vec in base],
        base_nucleo_tex=[[tex_num(v) for v in vec] for vec in base],
        rref=_float(M),
    )
    if x is not None:
        resultado.update(_vector_salida(x, exacto))
        resultado["residuo"] = math.sqrt(sum((sum(float(Ap[i][j]) * float(x[j]) for j in range(n)) - float(bp[i])) ** 2
                                             for i in range(m)))
    else:
        resultado.update(x=None, residuo=None)
    return resultado


def _sustitucion_regresiva(U, y, exacto, nombre="x"):
    n = len(y)
    x = [Fraction(0) if exacto else 0.0 for _ in range(n)]
    pasos = []
    for i in range(n - 1, -1, -1):
        suma = sum((U[i][j] * x[j] for j in range(i + 1, n)), Fraction(0) if exacto else 0.0)
        x[i] = (y[i] - suma) / U[i][i]
        terminos = " ".join(f"{'-' if U[i][j] > 0 else '+'} {tex_num(abs(U[i][j]))}{_par(x[j])}"
                            for j in range(i + 1, n) if U[i][j] != 0)
        num = f"{tex_num(y[i])} {terminos}".strip()
        pasos.append({"tex": f"{nombre}_{{{i + 1}}} = \\frac{{{num}}}{{{tex_num(U[i][i])}}} = {tex_num(x[i])}"})
    return x, pasos


def _sustitucion_progresiva(L, b, exacto, nombre="y", unitaria=True):
    n = len(b)
    y = [Fraction(0) if exacto else 0.0 for _ in range(n)]
    pasos = []
    for i in range(n):
        suma = sum((L[i][j] * y[j] for j in range(i)), Fraction(0) if exacto else 0.0)
        y[i] = (b[i] - suma) if unitaria else (b[i] - suma) / L[i][i]
        terminos = " ".join(f"{'-' if L[i][j] > 0 else '+'} {tex_num(abs(L[i][j]))}{_par(y[j])}"
                            for j in range(i) if L[i][j] != 0)
        num = f"{tex_num(b[i])} {terminos}".strip()
        expr = num if unitaria else f"\\frac{{{num}}}{{{tex_num(L[i][i])}}}"
        pasos.append({"tex": f"{nombre}_{{{i + 1}}} = {expr} = {tex_num(y[i])}"})
    return y, pasos


def gauss(A, b, pivoteo=True, exacto=False):
    Ap, bp, tol = _datos(A, b, exacto)
    m, n = len(Ap), len(Ap[0])
    M = [fila + [bi] for fila, bi in zip(Ap, bp)]
    pasos, pivotes, mult = _eliminar(M, n, pivoteo, tol, exacto, reducida=False)
    if m != n or len(pivotes) < n:
        # Sin solución única: Gauss-Jordan clasifica y da la solución general.
        r = gauss_jordan(A, b, pivoteo=pivoteo, exacto=exacto)
        r.update(metodo="gauss", aviso="El sistema no tiene solución única: se completa con Gauss-Jordan para clasificarlo.")
        return r
    U = [fila[:n] for fila in M]
    y = [fila[n] for fila in M]
    x, sust = _sustitucion_regresiva(U, y, exacto)
    for i in range(n):
        mult += n - i
    return {"metodo": "gauss", "m": m, "n": n, "rango": n, "exacto": exacto, "pasos": pasos,
            "sustitucion": list(reversed(sust)), "clasificacion": "compatible determinado",
            "operaciones": {"multiplicaciones_divisiones": mult},
            "teoricas": {"gauss": round(n ** 3 / 3 + n ** 2)}, **_vector_salida(x, exacto)}


# ---------------------------------------------------------------------------
# LU, Cholesky, Cramer
# ---------------------------------------------------------------------------

def lu(A, b, pivoteo=True, exacto=False):
    Ap, bp, tol = _datos(A, b, exacto, cuadrada=True)
    n = len(Ap)
    cero, uno = (Fraction(0), Fraction(1)) if exacto else (0.0, 1.0)
    U = [fila[:] for fila in Ap]
    L = [[cero] * n for _ in range(n)]
    perm = list(range(n))
    pasos = []
    for k in range(n):
        p = max(range(k, n), key=lambda i: abs(U[i][k])) if pivoteo else next(
            (i for i in range(k, n) if not _cero(U[i][k], tol)), k)
        if _cero(U[p][k], tol):
            raise ErrorEntrada("La matriz es singular: no tiene factorización LU (ni solución única).")
        if p != k:
            U[k], U[p] = U[p], U[k]
            L[k], L[p] = L[p], L[k]
            perm[k], perm[p] = perm[p], perm[k]
        ops = []
        for i in range(k + 1, n):
            f = U[i][k] / U[k][k]
            L[i][k] = f
            U[i] = [a - f * c for a, c in zip(U[i], U[k])]
            U[i][k] = cero
            ops.append({"tex": f"m_{{{i + 1}{k + 1}}} = \\frac{{{tex_num(f * U[k][k])}}}{{{tex_num(U[k][k])}}} = {tex_num(f)}"})
        Lp = [[uno if i == j else (L[i][j] if j < i else cero) for j in range(n)] for i in range(n)]
        pasos.append({"descripcion": f"Columna {k + 1}" + (f": intercambio F{k + 1} ↔ F{p + 1}" if p != k else ""),
                      "operaciones": ops, "L": _float(Lp), "U": _float(U),
                      **({"L_exacta": _strs(Lp), "U_exacta": _strs(U)} if exacto else {})})
    for i in range(n):
        L[i][i] = uno
    P = [[uno if perm[i] == j else cero for j in range(n)] for i in range(n)]
    Pb = [bp[perm[i]] for i in range(n)]
    y, prog = _sustitucion_progresiva(L, Pb, exacto, "y", unitaria=True)
    x, reg = _sustitucion_regresiva(U, y, exacto, "x")
    return {"metodo": "lu", "n": n, "exacto": exacto, "pasos": pasos,
            "P": _float(P), "L": _float(L), "U": _float(U),
            **({"L_exacta": _strs(L), "U_exacta": _strs(U)} if exacto else {}),
            "permutacion": [p + 1 for p in perm], "Pb_tex": [tex_num(v) for v in Pb],
            "y_tex": [tex_num(v) for v in y], "progresiva": prog, "regresiva": list(reversed(reg)),
            "clasificacion": "compatible determinado", **_vector_salida(x, exacto)}


def cholesky(A, b):
    Ap, bp, tol = _datos(A, b, False, cuadrada=True)
    n = len(Ap)
    if any(abs(Ap[i][j] - Ap[j][i]) > tol for i in range(n) for j in range(n)):
        raise ErrorEntrada("Cholesky exige una matriz simétrica (A = Aᵀ). Usa LU o Gauss.")
    L = [[0.0] * n for _ in range(n)]
    pasos = []
    for j in range(n):
        s = sum(L[j][k] ** 2 for k in range(j))
        rad = Ap[j][j] - s
        if rad <= tol:
            raise ErrorEntrada(f"A no es definida positiva (en l_{j + 1}{j + 1} el radicando vale {rad:.6g} ≤ 0). Usa LU o Gauss.")
        L[j][j] = math.sqrt(rad)
        resta = " ".join(f"- {_par(L[j][k])}^2" for k in range(j))
        pasos.append({"tex": f"l_{{{j + 1}{j + 1}}} = \\sqrt{{{tex_num(Ap[j][j])} {resta}}} = {tex_num(L[j][j])}"})
        for i in range(j + 1, n):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            L[i][j] = (Ap[i][j] - s) / L[j][j]
            resta = " ".join(f"- {_par(L[i][k])}{_par(L[j][k])}" for k in range(j))
            pasos.append({"tex": f"l_{{{i + 1}{j + 1}}} = \\frac{{{tex_num(Ap[i][j])} {resta}}}{{{tex_num(L[j][j])}}} = {tex_num(L[i][j])}"})
    y, prog = _sustitucion_progresiva(L, bp, False, "y", unitaria=False)
    Lt = [[L[j][i] for j in range(n)] for i in range(n)]
    x, reg = _sustitucion_regresiva(Lt, y, False, "x")
    return {"metodo": "cholesky", "n": n, "exacto": False, "pasos": pasos, "L": _float(L),
            "y_tex": [tex_num(v) for v in y], "progresiva": prog, "regresiva": list(reversed(reg)),
            "clasificacion": "compatible determinado", **_vector_salida(x, False)}


def determinante(M):
    """Determinante por eliminación (exacto si M tiene Fractions)."""
    n = len(M)
    A = [fila[:] for fila in M]
    exacto = isinstance(A[0][0], Fraction)
    det = Fraction(1) if exacto else 1.0
    for k in range(n):
        p = max(range(k, n), key=lambda i: abs(A[i][k]))
        if (A[p][k] == 0) if exacto else abs(A[p][k]) < 1e-300:
            return Fraction(0) if exacto else 0.0
        if p != k:
            A[k], A[p] = A[p], A[k]
            det = -det
        det *= A[k][k]
        for i in range(k + 1, n):
            f = A[i][k] / A[k][k]
            A[i] = [a - f * c for a, c in zip(A[i], A[k])]
    return det


def cramer(A, b, exacto=True):
    Ap, bp, tol = _datos(A, b, exacto, cuadrada=True, max_n=6)
    n = len(Ap)
    d = determinante(Ap)
    if _cero(d, tol):
        raise ErrorEntrada("det(A) = 0: la regla de Cramer no se puede aplicar (el sistema no tiene solución única).")
    columnas = []
    x = []
    for i in range(n):
        Ai = [fila[:i] + [bp[k]] + fila[i + 1:] for k, fila in enumerate(Ap)]
        di = determinante(Ai)
        x.append(di / d)
        columnas.append({"i": i + 1, "Ai": _float(Ai), **({"Ai_exacta": _strs(Ai)} if exacto else {}),
                         "det_tex": tex_num(di), "tex": f"x_{{{i + 1}}} = \\frac{{\\det A_{{{i + 1}}}}}{{\\det A}} = "
                                                       f"\\frac{{{tex_num(di)}}}{{{tex_num(d)}}} = {tex_num(di / d)}"})
    return {"metodo": "cramer", "n": n, "exacto": exacto, "det_tex": tex_num(d), "determinante": float(d),
            "A": _float(Ap), **({"A_exacta": _strs(Ap)} if exacto else {}), "columnas": columnas,
            "clasificacion": "compatible determinado", **_vector_salida(x, exacto)}
