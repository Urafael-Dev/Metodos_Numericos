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


def interpretar(texto, simbolos):
    if not isinstance(texto, str) or not texto.strip():
        raise ErrorEntrada("Hay una ecuación vacía.")
    if len(texto) > MAX_LARGO:
        raise ErrorEntrada(f"Cada ecuación admite como máximo {MAX_LARGO} caracteres.")
    t = texto.replace("^", "**").replace("·", "*").replace("−", "-")
    # Multiplicación implícita sencilla: 2x -> 2*x, 3(x+1) -> 3*(x+1)
    t = re.sub(r"(\d)\s*([a-zA-Z(])", r"\1*\2", t)
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
    if not isinstance(variables, list) or not 1 <= len(variables) <= 4:
        raise ErrorEntrada("Declara entre 1 y 4 variables.")
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
