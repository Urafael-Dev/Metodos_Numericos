"""Análisis de estabilidad (condicionamiento) y de convergencia de un sistema A x = b.

* Estabilidad: el número de condición κ(A) = ‖A‖·‖A⁻¹‖ acota cuánto se
  amplifica un error relativo en los datos:
      ‖δx‖/‖x‖ ≤ κ(A) · ‖δb‖/‖b‖
  Se pierden aproximadamente log₁₀ κ(A) cifras decimales.
* Convergencia: los métodos iterativos convergen si ρ(T) < 1; la dominancia
  diagonal estricta y que A sea simétrica definida positiva son condiciones
  suficientes conocidas.
"""

from __future__ import annotations

import math

import numpy as np

from .iterativos import dominancia, es_spd, matrices_iteracion
from .validacion import matriz, real, vector


def hilbert(n):
    return [[1 / (i + j + 1) for j in range(n)] for i in range(n)]


def _cond(A, p):
    try:
        c = float(np.linalg.cond(A, p))
    except np.linalg.LinAlgError:
        return None
    return c if math.isfinite(c) and c < 1e300 else None


def clasificar(kappa):
    if kappa is None:
        return "singular"
    if kappa < 1e2:
        return "bien condicionado"
    if kappa < 1e6:
        return "moderadamente condicionado"
    return "mal condicionado"


def analizar(A, b=None, epsilon=1e-6, semilla=7):
    A = matriz(A, max_filas=10, max_columnas=10, cuadrada=True)
    n = len(A)
    b = A @ np.ones(n) if b in (None, []) else vector(b, n)
    epsilon = real(epsilon, "ε", 1e-15, 0.5, 1e-6)

    det = float(np.linalg.det(A))
    s = np.linalg.svd(A, compute_uv=False)
    singular = s[-1] <= n * np.finfo(float).eps * s[0]
    k2 = None if singular else float(s[0] / s[-1])
    autovalores = np.linalg.eigvals(A)

    resultado = {
        "n": n,
        "determinante": det,
        "valores_singulares": s.tolist(),
        "autovalores": [{"re": float(z.real), "im": float(z.imag)} for z in autovalores],
        "kappa_1": None if singular else _cond(A, 1),
        "kappa_2": k2,
        "kappa_inf": None if singular else _cond(A, np.inf),
        "clasificacion": clasificar(k2),
        "cifras_perdidas": None if k2 is None else math.log10(k2),
        "cifras_confiables": None if k2 is None else max(0.0, 15.95 - math.log10(k2)),
        "dominancia": dominancia(A),
        "spd": es_spd(A),
        "simetrica": bool(np.allclose(A, A.T)),
    }

    if np.all(np.abs(np.diag(A)) > 0):
        it = matrices_iteracion(A, 1.0)
        resultado.update(rho_jacobi=it["rho_jacobi"], rho_gauss_seidel=it["rho_gauss_seidel"],
                         omega_optimo=it["omega_optimo"])
    else:
        resultado.update(rho_jacobi=None, rho_gauss_seidel=None, omega_optimo=None)

    if singular:
        resultado["perturbacion"] = None
        return resultado

    # Experimento: perturbar b (y A) con error relativo ε y medir el efecto en x.
    rng = np.random.default_rng(semilla)
    x = np.linalg.solve(A, b)
    db = rng.standard_normal(n)
    db *= epsilon * np.linalg.norm(b) / np.linalg.norm(db)
    x_b = np.linalg.solve(A, b + db)
    dA = rng.standard_normal((n, n))
    dA *= epsilon * np.linalg.norm(A, 2) / np.linalg.norm(dA, 2)
    try:
        x_A = np.linalg.solve(A + dA, b)
        cambio_A = float(np.linalg.norm(x_A - x) / np.linalg.norm(x))
    except np.linalg.LinAlgError:
        x_A, cambio_A = None, None
    cambio_b = float(np.linalg.norm(x_b - x) / np.linalg.norm(x))

    resultado["perturbacion"] = {
        "epsilon": epsilon,
        "b": b.tolist(),
        "x": x.tolist(),
        "delta_b": db.tolist(),
        "x_perturbado_b": x_b.tolist(),
        "cambio_relativo_b": cambio_b,
        "amplificacion_b": cambio_b / epsilon,
        "x_perturbado_A": None if x_A is None else x_A.tolist(),
        "cambio_relativo_A": cambio_A,
        "cota": k2 * epsilon,
    }
    return resultado


def experimento_hilbert(n_max=12):
    """κ(H_n) crece exponencialmente: muestra la pérdida de precisión de Gauss."""
    filas = []
    for n in range(2, n_max + 1):
        H = np.array(hilbert(n))
        x = np.ones(n)
        b = H @ x
        x_calc = np.linalg.solve(H, b)
        filas.append({"n": n, "kappa": float(np.linalg.cond(H)),
                      "error": float(np.linalg.norm(x_calc - x, np.inf))})
    return filas

