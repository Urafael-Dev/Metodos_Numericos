"""Sistemas no lineales: método de Newton-Raphson multivariable.

Para F(x) = 0 con F: ℝⁿ → ℝⁿ, Newton linealiza F alrededor de x⁽ᵏ⁾:

    J(x⁽ᵏ⁾) Δ⁽ᵏ⁾ = -F(x⁽ᵏ⁾),     x⁽ᵏ⁺¹⁾ = x⁽ᵏ⁾ + Δ⁽ᵏ⁾

donde J es la matriz jacobiana. Cada iteración resuelve un sistema LINEAL,
por eso este tema une los sistemas lineales y los no lineales.

Las ecuaciones llegan como texto desde el navegador. Nunca se evalúan con
eval: se analizan con el módulo ast de Python y solo se aceptan números,
variables declaradas, operadores aritméticos y una lista cerrada de
funciones; con eso se construye la expresión de SymPy.
"""

from __future__ import annotations

import ast
import math
import re

import numpy as np
import sympy as sp

from .validacion import ErrorEntrada, entero, real, vector

FUNCIONES = {
    "sin": sp.sin, "sen": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "asin": sp.asin, "acos": sp.acos, "atan": sp.atan,
    "sinh": sp.sinh, "cosh": sp.cosh, "tanh": sp.tanh,
    "exp": sp.exp, "log": sp.log, "ln": sp.log, "sqrt": sp.sqrt, "abs": sp.Abs,
}
CONSTANTES = {"pi": sp.pi, "e": sp.E}
MAX_LARGO = 200
MAX_NODOS = 120
NOMBRE_VAR = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,3}$")


def _a_sympy(nodo, simbolos, cuenta):
    cuenta[0] += 1
    if cuenta[0] > MAX_NODOS:
        raise ErrorEntrada("La expresión es demasiado larga.")
    if isinstance(nodo, ast.Expression):
        return _a_sympy(nodo.body, simbolos, cuenta)
    if isinstance(nodo, ast.Constant) and isinstance(nodo.value, (int, float)) and not isinstance(nodo.value, bool):
        if abs(nodo.value) > 1e9:
            raise ErrorEntrada("Los números deben ser menores que 10⁹.")
        return sp.Rational(str(nodo.value)) if isinstance(nodo.value, float) else sp.Integer(nodo.value)
    if isinstance(nodo, ast.Name):
        if nodo.id in simbolos:
            return simbolos[nodo.id]
        if nodo.id in CONSTANTES:
            return CONSTANTES[nodo.id]
        raise ErrorEntrada(f"«{nodo.id}» no es una variable declarada ni una constante (pi, e).")
    if isinstance(nodo, ast.UnaryOp) and isinstance(nodo.op, (ast.UAdd, ast.USub)):
        v = _a_sympy(nodo.operand, simbolos, cuenta)
        return -v if isinstance(nodo.op, ast.USub) else v
    if isinstance(nodo, ast.BinOp):
        a = _a_sympy(nodo.left, simbolos, cuenta)
        b = _a_sympy(nodo.right, simbolos, cuenta)
        if isinstance(nodo.op, ast.Add):
            return a + b
        if isinstance(nodo.op, ast.Sub):
            return a - b
        if isinstance(nodo.op, ast.Mult):
            return a * b
        if isinstance(nodo.op, ast.Div):
            return a / b
        if isinstance(nodo.op, ast.Pow):
            if b.is_number and abs(float(b)) > 50:
                raise ErrorEntrada("Los exponentes deben estar entre -50 y 50.")
            if a.is_number and b.is_number and a != 0:
                # Evita potencias numéricas gigantes del tipo ((49^49)^49)^49.
                if abs(float(sp.log(sp.Abs(a), 10).evalf(15)) * float(b)) > 300:
                    raise ErrorEntrada("El resultado numérico es demasiado grande.")
            return a ** b
        raise ErrorEntrada("Operador no permitido. Usa + - * / ^.")
    if isinstance(nodo, ast.Call) and isinstance(nodo.func, ast.Name) and not nodo.keywords:
        f = FUNCIONES.get(nodo.func.id)
        if f is None:
            raise ErrorEntrada(f"Función «{nodo.func.id}» no permitida. Usa: {', '.join(sorted(FUNCIONES))}.")
        if len(nodo.args) != 1:
            raise ErrorEntrada(f"{nodo.func.id} recibe un solo argumento.")
        return f(_a_sympy(nodo.args[0], simbolos, cuenta))
    raise ErrorEntrada("La expresión contiene algo no permitido.")


def normalizar(texto, conocidos=()):
    """Escritura de cuaderno → sintaxis de Python: 2,5x → 2.5*x, x² → x**2, 3(x+1) → 3*(x+1), xy → x*y."""
    def separar(m):
        palabra = m.group(1)
        if palabra in FUNCIONES or palabra in CONSTANTES or palabra in conocidos:
            return palabra
        return "*".join(palabra)

    t = texto.replace("^", "**").replace("·", "*").replace("×", "*").replace("−", "-").replace("–", "-")
    t = t.replace("²", "**2").replace("³", "**3")
    t = re.sub(r"(\d),(\d)", r"\1.\2", t)               # coma decimal
    t = re.sub(r"(\d)\s*([a-zA-Z(])", r"\1*\2", t)        # 2x, 3(x+1)
    t = re.sub(r"\)\s*([a-zA-Z0-9(])", r")*\1", t)        # (x+1)(x-1), (x+1)y
    t = re.sub(r"\b([a-zA-Z]{2,4})\b(?!\s*\()", separar, t)  # xy -> x*y
    return t


def interpretar(texto, simbolos):
    if not isinstance(texto, str) or not texto.strip():
        raise ErrorEntrada("Hay una ecuación vacía.")
    if len(texto) > MAX_LARGO:
        raise ErrorEntrada(f"Cada ecuación admite como máximo {MAX_LARGO} caracteres.")
    t = normalizar(texto, simbolos)
    if t.count("=") > 1:
        raise ErrorEntrada(f"«{texto}» tiene más de un signo igual.")
    lados = t.split("=")
    try:
        arboles = [ast.parse(lado.strip(), mode="eval") for lado in lados]
    except SyntaxError:
        raise ErrorEntrada(f"No se entiende la expresión «{texto}».") from None
    exprs = [_a_sympy(a, simbolos, [0]) for a in arboles]
    return exprs[0] - exprs[1] if len(exprs) == 2 else exprs[0]


def newton(ecuaciones, variables, x0, tol=1e-8, max_iter=30):
    if not isinstance(variables, list) or not 1 <= len(variables) <= 6:
        raise ErrorEntrada("Declara entre 1 y 6 variables.")
    for v in variables:
        if not isinstance(v, str) or not NOMBRE_VAR.match(v) or v in FUNCIONES or v in CONSTANTES:
            raise ErrorEntrada(f"«{v}» no es un nombre de variable válido.")
    if len(set(variables)) != len(variables):
        raise ErrorEntrada("Hay variables repetidas.")
    n = len(variables)
    if not isinstance(ecuaciones, list) or len(ecuaciones) != n:
        raise ErrorEntrada(f"Se necesitan {n} ecuaciones para {n} incógnitas.")
    x = vector(x0, n, "x0")
    tol = real(tol, "La tolerancia", 1e-15, 1.0, 1e-8)
    max_iter = entero(max_iter, "El máximo de iteraciones", 1, 100, 30)

    simbolos = {v: sp.Symbol(v, real=True) for v in variables}
    lista = [simbolos[v] for v in variables]
    F = sp.Matrix([interpretar(e, simbolos) for e in ecuaciones])
    J = F.jacobian(lista)
    f_num = sp.lambdify(lista, F, modules="numpy")
    j_num = sp.lambdify(lista, J, modules="numpy")

    def evaluar(fn, punto):
        with np.errstate(all="ignore"):
            return np.array(fn(*punto), dtype=float)

    historial = []
    estado = "max_iter"
    for k in range(max_iter + 1):
        Fx = evaluar(f_num, x).reshape(-1)
        if not np.all(np.isfinite(Fx)):
            estado = "fuera_dominio"
            historial.append({"k": k, "x": x.tolist(), "F": None, "norma_F": None, "delta": None})
            break
        Jx = evaluar(j_num, x).reshape(n, n)
        fila = {"k": k, "x": x.tolist(), "F": Fx.tolist(), "norma_F": float(np.linalg.norm(Fx, np.inf)),
                "J": Jx.tolist() if k < 3 else None, "delta": None, "norma_delta": None}
        historial.append(fila)
        if k == max_iter:
            break
        if not np.all(np.isfinite(Jx)) or abs(np.linalg.det(Jx)) < 1e-14:
            estado = "jacobiana_singular"
            break
        delta = np.linalg.solve(Jx, -Fx)
        fila["delta"] = delta.tolist()
        fila["norma_delta"] = float(np.linalg.norm(delta, np.inf))
        x = x + delta
        if np.max(np.abs(x)) > 1e10:
            estado = "diverge"
            historial.append({"k": k + 1, "x": x.tolist(), "F": None, "norma_F": None, "delta": None})
            break
        if fila["norma_delta"] < tol:
            Fx = evaluar(f_num, x).reshape(-1)
            historial.append({"k": k + 1, "x": x.tolist(), "F": Fx.tolist(),
                              "norma_F": float(np.linalg.norm(Fx, np.inf)), "delta": None})
            estado = "converge"
            break

    # Orden de convergencia estimado con los últimos tres incrementos
    orden = None
    ds = [h["norma_delta"] for h in historial if h.get("norma_delta")]
    if len(ds) >= 3 and all(d > 0 for d in ds[-3:]):
        e0, e1, e2 = ds[-3:]
        try:
            q = math.log(e2 / e1) / math.log(e1 / e0)
            orden = q if math.isfinite(q) else None
        except (ValueError, ZeroDivisionError):
            orden = None

    resultado = {
        "variables": variables,
        "F_tex": [sp.latex(f) for f in F],
        "J_tex": sp.latex(J),
        "estado": estado,
        "iteraciones": max(0, len(historial) - 1),
        "x": historial[-1]["x"],
        "historial": historial,
        "orden_estimado": orden,
        "tolerancia": tol,
    }
    if n == 2:
        componentes = [sp.lambdify(lista, fi, modules="numpy") for fi in F]
        resultado["malla"] = _malla(componentes, historial)
    return resultado


def _malla(componentes, historial, puntos=90):
    xs = [h["x"][0] for h in historial if h["x"] and all(math.isfinite(v) for v in h["x"])]
    ys = [h["x"][1] for h in historial if h["x"] and all(math.isfinite(v) for v in h["x"])]
    cx, cy = xs[-1], ys[-1]
    ancho = max(2.0, (max(xs) - min(xs)) * 1.4, (max(ys) - min(ys)) * 1.4)
    ancho = min(ancho, 50.0)
    x0, x1 = cx - ancho / 2, cx + ancho / 2
    y0, y1 = cy - ancho / 2, cy + ancho / 2
    gx = np.linspace(x0, x1, puntos)
    gy = np.linspace(y0, y1, puntos)
    X, Y = np.meshgrid(gx, gy)
    capas = []
    for fc in componentes:
        with np.errstate(all="ignore"):
            Z = np.broadcast_to(np.asarray(fc(X, Y), dtype=float), X.shape)
        Z = np.where(np.isfinite(Z), Z, np.nan)
        capas.append([[None if math.isnan(z) else round(float(z), 6) for z in fila] for fila in Z])
    return {"x": [x0, x1], "y": [y0, y1], "n": puntos, "F": capas}


# ---------------------------------------------------------------------------
# Interpretar un ejercicio escrito como texto
# ---------------------------------------------------------------------------

def _orden_natural(nombre):
    """Orden de pizarra: x, y, z, w, luego el resto alfabético; x1 < x2 < x10."""
    m = re.match(r"^([a-zA-Z_]+?)(\d*)$", nombre)
    base, num = (m.group(1), int(m.group(2)) if m.group(2) else -1) if m else (nombre, -1)
    rango = "xyzw".index(base) if base in ("x", "y", "z", "w") else 4
    return (rango, base, num)


def descubrir_variables(textos):
    nombres = []
    for texto in textos:
        t = normalizar(texto)
        for lado in t.split("="):
            try:
                arbol = ast.parse(lado.strip(), mode="eval")
            except SyntaxError:
                raise ErrorEntrada(f"No se entiende la ecuación «{texto}».") from None
            funciones = {id(n.func) for n in ast.walk(arbol) if isinstance(n, ast.Call)}
            for n in ast.walk(arbol):
                if (isinstance(n, ast.Name) and id(n) not in funciones and n.id not in FUNCIONES
                        and n.id not in CONSTANTES and n.id not in nombres):
                    if not NOMBRE_VAR.match(n.id):
                        raise ErrorEntrada(f"«{n.id}» no es un nombre de variable válido (máx. 4 caracteres).")
                    nombres.append(n.id)
    return sorted(nombres, key=_orden_natural)


def separar_ecuaciones(texto):
    if not isinstance(texto, str):
        raise ErrorEntrada("Escribe las ecuaciones como texto.")
    lineas = [l.strip() for l in re.split(r"[\n;]+", texto) if l.strip()]
    if not lineas:
        raise ErrorEntrada("Escribe al menos una ecuación.")
    if len(lineas) > 10:
        raise ErrorEntrada("Como máximo 10 ecuaciones.")
    return lineas


def _num_exacto(c):
    c = sp.nsimplify(c) if not c.is_Rational else c
    if c.is_Rational:
        return float(c), str(c)
    v = float(c.evalf(20))
    return v, repr(v)


def interpretar_sistema(texto, variables=None):
    """Texto → variables, linealidad y, si es lineal, la matriz A y el vector b."""
    ecuaciones = separar_ecuaciones(texto)
    if variables:
        if not isinstance(variables, list):
            raise ErrorEntrada("variables debe ser una lista.")
    else:
        variables = descubrir_variables(ecuaciones)
    if not variables:
        raise ErrorEntrada("No se encontró ninguna incógnita en las ecuaciones.")
    if len(variables) > 10:
        raise ErrorEntrada("Como máximo 10 incógnitas.")
    simbolos = {v: sp.Symbol(v, real=True) for v in variables}
    lista = [simbolos[v] for v in variables]
    exprs = [sp.expand(interpretar(e, simbolos)) for e in ecuaciones]

    lineal = True
    for e in exprs:
        try:
            if sp.Poly(e, *lista).total_degree() > 1:
                lineal = False
        except sp.PolynomialError:
            lineal = False
        if not lineal:
            break

    m, n = len(exprs), len(lista)
    salida = {
        "ecuaciones": ecuaciones,
        "variables": variables,
        "m": m,
        "n": n,
        "lineal": lineal,
        "F_tex": [sp.latex(e) + " = 0" for e in exprs],
    }
    if lineal:
        A, A_ex, b, b_ex = [], [], [], []
        for e in exprs:
            fila, fila_ex = [], []
            for s in lista:
                v, vx = _num_exacto(e.coeff(s))
                fila.append(v)
                fila_ex.append(vx)
            v, vx = _num_exacto(-e.subs({s: 0 for s in lista}))
            A.append(fila)
            A_ex.append(fila_ex)
            b.append(v)
            b_ex.append(vx)
        salida.update(A=A, b=b, A_exacta=A_ex, b_exacta=b_ex,
                      racional=all("." not in x and "e" not in x for f in A_ex for x in f) and
                      all("." not in x and "e" not in x for x in b_ex))
        salida["sistema_tex"] = [
            sp.latex(sp.Eq(sum(sp.nsimplify(A_ex[i][j]) * lista[j] for j in range(n)), sp.nsimplify(b_ex[i])))
            for i in range(m)
        ]
    else:
        # ¿Está escrito como x = g(x, y, …)? Entonces admite punto fijo.
        lados_izq = []
        for e in ecuaciones:
            izq = normalizar(e, simbolos).split("=")[0].strip() if "=" in e else None
            lados_izq.append(izq)
        salida["forma_punto_fijo"] = sorted(l for l in lados_izq if l) == sorted(variables) and m == n
        salida["sistema_tex"] = [sp.latex(interpretar_lados(e, simbolos)) for e in ecuaciones]
    return salida


def interpretar_lados(texto, simbolos):
    t = normalizar(texto, simbolos)
    if "=" not in t:
        return sp.Eq(_a_sympy(ast.parse(t, mode="eval"), simbolos, [0]), 0)
    izq, der = t.split("=", 1)
    return sp.Eq(_a_sympy(ast.parse(izq.strip(), mode="eval"), simbolos, [0]),
                 _a_sympy(ast.parse(der.strip(), mode="eval"), simbolos, [0]))


# ---------------------------------------------------------------------------
# Punto fijo multivariable
# ---------------------------------------------------------------------------

def punto_fijo(ecuaciones, variables, x0, tol=1e-8, max_iter=100, seidel=False):
    """Iteración x⁽ᵏ⁺¹⁾ = G(x⁽ᵏ⁾) con las ecuaciones escritas como «x = g(x, y, …)»."""
    if not isinstance(variables, list) or not 1 <= len(variables) <= 6:
        raise ErrorEntrada("Declara entre 1 y 6 variables.")
    n = len(variables)
    if not isinstance(ecuaciones, list) or len(ecuaciones) != n:
        raise ErrorEntrada(f"Se necesitan {n} ecuaciones de la forma variable = g(...).")
    simbolos = {v: sp.Symbol(v, real=True) for v in variables}
    lista = [simbolos[v] for v in variables]
    G = [None] * n
    for e in ecuaciones:
        t = normalizar(e, simbolos)
        if t.count("=") != 1:
            raise ErrorEntrada(f"«{e}» debe tener la forma variable = g(...), p. ej. x = (y^2 + 8)/10.")
        izq, der = (p.strip() for p in t.split("="))
        if izq not in simbolos:
            raise ErrorEntrada(f"En «{e}» el lado izquierdo debe ser una sola variable ({', '.join(variables)}).")
        i = variables.index(izq)
        if G[i] is not None:
            raise ErrorEntrada(f"La variable {izq} aparece despejada dos veces.")
        G[i] = interpretar(der, simbolos)
    x = vector(x0, n, "x0")
    tol = real(tol, "La tolerancia", 1e-15, 1.0, 1e-8)
    max_iter = entero(max_iter, "El máximo de iteraciones", 1, 500, 100)

    Gm = sp.Matrix(G)
    JG = Gm.jacobian(lista)
    g_num = [sp.lambdify(lista, g, modules="math") for g in G]
    jg_num = sp.lambdify(lista, JG, modules="numpy")

    def rho_en(p):
        try:
            with np.errstate(all="ignore"):
                J = np.array(jg_num(*p), dtype=float)
            if not np.all(np.isfinite(J)):
                return None, None
            return float(np.max(np.abs(np.linalg.eigvals(J)))), float(np.max(np.sum(np.abs(J), axis=1)))
        except (ValueError, TypeError, OverflowError, np.linalg.LinAlgError):
            return None, None

    historial = [{"k": 0, "x": x.tolist(), "error": None}]
    estado = "max_iter"
    for k in range(1, max_iter + 1):
        nuevo = x.copy()
        try:
            for i in range(n):
                fuente = nuevo if seidel else x
                nuevo[i] = float(g_num[i](*fuente))
        except (ValueError, OverflowError, ZeroDivisionError):
            estado = "fuera_dominio"
            break
        if not np.all(np.isfinite(nuevo)) or np.max(np.abs(nuevo)) > 1e12:
            estado = "diverge"
            historial.append({"k": k, "x": [v if math.isfinite(v) else None for v in nuevo.tolist()], "error": None})
            break
        error = float(np.max(np.abs(nuevo - x)))
        x = nuevo
        historial.append({"k": k, "x": x.tolist(), "error": error})
        if error < tol:
            estado = "converge"
            break

    rho0, norma0 = rho_en(np.array(historial[0]["x"]))
    rho_f, norma_f = rho_en(x) if estado != "diverge" else (None, None)
    F = [lista[i] - G[i] for i in range(n)]
    resultado = {
        "metodo": "punto_fijo", "variables": variables, "seidel": seidel,
        "G_tex": [f"{sp.latex(lista[i])} = {sp.latex(G[i])}" for i in range(n)],
        "JG_tex": sp.latex(JG), "estado": estado, "iteraciones": len(historial) - 1,
        "x": historial[-1]["x"], "historial": historial,
        "rho_inicial": rho0, "norma_inicial": norma0, "rho_final": rho_f, "norma_final": norma_f,
        "tolerancia": tol,
    }
    if n == 2 and estado != "fuera_dominio":
        componentes = [sp.lambdify(lista, f, modules="numpy") for f in F]
        resultado["malla"] = _malla(componentes, historial)
    return resultado
