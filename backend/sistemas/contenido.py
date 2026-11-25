"""Ejemplos precargados por tema y banco de preguntas del cuestionario.

Las respuestas correctas nunca salen al frontend: se califican en el servidor.
"""

EJEMPLOS_NO_CUADRADOS = [
    {
        "id": "recta",
        "titulo": "Calibración de un sensor (4 × 2)",
        "descripcion": "Ajustar y = c₀ + c₁x a 4 lecturas: más ecuaciones que incógnitas.",
        "A": [[1, 1], [1, 2], [1, 3], [1, 4]],
        "b": [2, 3, 5, 6],
    },
    {
        "id": "inconsistente3x2",
        "titulo": "Sistema inconsistente 3 × 2",
        "descripcion": "Tres rectas que no se cortan en un mismo punto; se visualiza en 3D.",
        "A": [[1, 0], [0, 1], [1, 1]],
        "b": [1, 1, 0],
    },
    {
        "id": "subdeterminado",
        "titulo": "Subdeterminado 2 × 3",
        "descripcion": "Dos ecuaciones, tres incógnitas: infinitas soluciones, se elige la de norma mínima.",
        "A": [[1, 1, 1], [1, 2, 3]],
        "b": [6, 14],
    },
    {
        "id": "rango_deficiente",
        "titulo": "Rango deficiente 4 × 3",
        "descripcion": "La tercera columna es suma de las otras dos: AᵀA es singular y se usa la SVD.",
        "A": [[1, 2, 3], [2, 1, 3], [1, 1, 2], [3, 0, 3]],
        "b": [6, 5, 4, 4],
    },
    {
        "id": "parabola",
        "titulo": "Trayectoria parabólica (6 × 3)",
        "descripcion": "Ajuste de y = c₀ + c₁t + c₂t² a mediciones con ruido.",
        "A": [[1, 0, 0], [1, 1, 1], [1, 2, 4], [1, 3, 9], [1, 4, 16], [1, 5, 25]],
        "b": [1.1, 5.9, 9.2, 10.1, 9.0, 5.8],
    },
]

EJEMPLOS_GAUSS_JORDAN = [
    {"id": "unica", "titulo": "Solución única (3 × 3)", "modo": "sistema",
     "A": [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], "b": [8, -11, -3]},
    {"id": "infinitas", "titulo": "Infinitas soluciones", "modo": "sistema",
     "A": [[1, 2, -1], [2, 4, -2], [1, 1, 1]], "b": [3, 6, 4]},
    {"id": "incompatible", "titulo": "Sin solución", "modo": "sistema",
     "A": [[1, 2, -1], [2, 4, -2], [1, 1, 1]], "b": [3, 7, 4]},
    {"id": "circuito", "titulo": "Corrientes de un circuito (mallas)", "modo": "sistema",
     "A": [[15, -5, 0], [-5, 20, -10], [0, -10, 25]], "b": [10, 0, 5]},
    {"id": "inversa", "titulo": "Matriz inversa con [A | I]", "modo": "inversa",
     "A": [[2, 1, 1], [1, 3, 2], [1, 0, 0]], "b": None},
]

EJEMPLOS_ITERATIVOS = [
    {"id": "dominante4", "titulo": "Dominante 4 × 4 (converge)",
     "A": [[10, -1, 2, 0], [-1, 11, -1, 3], [2, -1, 10, -1], [0, 3, -1, 8]], "b": [6, 25, -11, 15]},
    {"id": "red", "titulo": "Balanceo de tráfico en 3 nodos",
     "A": [[10, -2, -1], [-1, 8, -2], [-2, -1, 5]], "b": [7, 5, 2]},
    {"id": "plano", "titulo": "2 × 2 para ver la trayectoria",
     "A": [[4, 1], [2, 5]], "b": [9, 13]},
    {"id": "reordenar", "titulo": "No dominante, pero se puede reordenar",
     "A": [[1, 5, 1], [6, 1, 1], [1, 1, 7]], "b": [7, 8, 9], "reordenar": True},
    {"id": "diverge", "titulo": "Diverge (ρ > 1)",
     "A": [[1, 2], [3, 1]], "b": [3, 4]},
]

EJEMPLOS_NO_LINEALES = [
    {"id": "circulo_exp", "titulo": "Circunferencia y exponencial",
     "variables": ["x", "y"], "ecuaciones": ["x^2 + y^2 = 4", "exp(x) + y = 1"], "x0": [1, -1.7]},
    {"id": "hiperbola", "titulo": "Circunferencia e hipérbola",
     "variables": ["x", "y"], "ecuaciones": ["x^2 + y^2 = 4", "x*y = 1"], "x0": [2, 0.5]},
    {"id": "trig", "titulo": "Sistema trigonométrico",
     "variables": ["x", "y"], "ecuaciones": ["sin(x) + y^2 = 1", "x + cos(y) = 1.5"], "x0": [0.5, 0.5]},
    {"id": "burden3", "titulo": "Clásico 3 × 3 (Burden y Faires)",
     "variables": ["x", "y", "z"],
     "ecuaciones": ["3*x - cos(y*z) - 1/2 = 0", "x^2 - 81*(y + 0.1)^2 + sin(z) + 1.06 = 0",
                    "exp(-x*y) + 20*z + (10*pi - 3)/3 = 0"],
     "x0": [0.1, 0.1, -0.1]},
]

EJEMPLOS_ESTABILIDAD = [
    {"id": "bien", "titulo": "Bien condicionada", "A": [[4, 1, 0], [1, 4, 1], [0, 1, 4]], "b": [5, 6, 5]},
    {"id": "casi_singular", "titulo": "Casi singular (rectas casi paralelas)",
     "A": [[1, 1], [1, 1.0001]], "b": [2, 2.0001]},
    {"id": "hilbert5", "titulo": "Matriz de Hilbert 5 × 5",
     "A": [[1 / (i + j + 1) for j in range(5)] for i in range(5)], "b": None},
    {"id": "no_dominante", "titulo": "SPD pero no dominante",
     "A": [[4, 3, 0], [3, 4, -1], [0, -1, 4]], "b": [24, 30, -24]},
]

EJEMPLOS = {
    "no_cuadrados": EJEMPLOS_NO_CUADRADOS,
    "gauss_jordan": EJEMPLOS_GAUSS_JORDAN,
    "iterativos": EJEMPLOS_ITERATIVOS,
    "no_lineales": EJEMPLOS_NO_LINEALES,
    "estabilidad": EJEMPLOS_ESTABILIDAD,
}

PREGUNTAS = [
    {
        "id": "g1",
        "tema": "Sistemas lineales y no lineales",
        "tipo": "opcion",
        "enunciado": r"Un sistema lineal \(A\mathbf{x}=\mathbf{b}\) con \(\operatorname{rango}(A)=\operatorname{rango}([A\mid\mathbf{b}])<n\) es:",
        "opciones": ["Incompatible", "Compatible determinado", "Compatible indeterminado", "No lineal"],
        "correcta": 2,
        "explicacion": r"Teorema de Rouché-Frobenius: rangos iguales pero menores que \(n\) ⇒ infinitas soluciones.",
    },
    {
        "id": "g2",
        "tema": "Sistemas lineales y no lineales",
        "tipo": "opcion",
        "enunciado": r"En el método de Newton para sistemas no lineales, en cada iteración se resuelve:",
        "opciones": [
            r"\(F(\mathbf{x})=0\) directamente",
            r"El sistema lineal \(J(\mathbf{x}^{(k)})\,\Delta = -F(\mathbf{x}^{(k)})\)",
            r"\(\mathbf{x}=T\mathbf{x}+\mathbf{c}\)",
            r"Las ecuaciones normales",
        ],
        "correcta": 1,
        "explicacion": r"Newton linealiza \(F\) con la jacobiana y resuelve un sistema lineal por paso.",
    },
    {
        "id": "g3",
        "tema": "Métodos directos e iterativos",
        "tipo": "opcion",
        "enunciado": "Para un sistema grande y disperso (millones de incógnitas, casi todos los coeficientes cero) se prefieren:",
        "opciones": [
            "Métodos directos, porque dan la solución exacta",
            "Métodos iterativos, porque solo usan los elementos no nulos y ahorran memoria",
            "Gauss-Jordan sin pivoteo",
            "Calcular la inversa",
        ],
        "correcta": 1,
        "explicacion": r"La eliminación rellena la matriz de no ceros y cuesta \(O(n^3)\); Jacobi/Gauss-Seidel cuestan \(O(\text{nnz})\) por iteración.",
    },
    {
        "id": "g4",
        "tema": "Gauss-Jordan",
        "tipo": "opcion",
        "enunciado": "Al terminar Gauss-Jordan sobre [A | b], la matriz queda en:",
        "opciones": [
            "Forma triangular superior",
            "Forma escalonada reducida: pivotes iguales a 1 y ceros arriba y abajo",
            "Forma diagonal con cualquier pivote",
            "Forma de Hessenberg",
        ],
        "correcta": 1,
        "explicacion": "No hace falta sustitución regresiva: la solución se lee en la última columna.",
    },
    {
        "id": "g5",
        "tema": "Gauss-Jordan",
        "tipo": "numero",
        "enunciado": r"Resuelve con Gauss-Jordan \(2x + y = 5,\; x - y = 1\). ¿Cuánto vale \(x\)?",
        "correcta": 2.0,
        "tolerancia": 1e-3,
        "explicacion": r"Sumando las ecuaciones: \(3x = 6 \Rightarrow x = 2,\ y = 1\).",
    },
    {
        "id": "g6",
        "tema": "Jacobi y Gauss-Seidel",
        "tipo": "numero",
        "enunciado": (
            r"Para \(\begin{cases}4x_1 + x_2 = 9\\2x_1 + 5x_2 = 13\end{cases}\) y "
            r"\(\mathbf{x}^{(0)}=\mathbf{0}\), ¿cuánto vale \(x_2^{(1)}\) con Gauss-Seidel?"
        ),
        "correcta": 1.7,
        "tolerancia": 5e-3,
        "explicacion": r"\(x_1^{(1)} = 9/4 = 2.25\) y Gauss-Seidel ya lo usa: \(x_2^{(1)} = (13 - 2\cdot2.25)/5 = 1.7\). Jacobi daría 2.6.",
    },
    {
        "id": "g7",
        "tema": "Jacobi y Gauss-Seidel",
        "tipo": "opcion",
        "enunciado": r"Un método iterativo \(\mathbf{x}^{(k+1)} = T\mathbf{x}^{(k)}+\mathbf{c}\) converge para todo \(\mathbf{x}^{(0)}\) si y solo si:",
        "opciones": [r"\(\det T \neq 0\)", r"\(\rho(T) < 1\)", r"\(T\) es simétrica", r"\(\lVert T\rVert_\infty > 1\)"],
        "correcta": 1,
        "explicacion": r"El radio espectral (mayor \(|\lambda|\)) menor que 1 es la condición necesaria y suficiente.",
    },
    {
        "id": "p1",
        "tema": "Sistemas no cuadrados",
        "tipo": "opcion",
        "enunciado": r"Un sistema \(A\mathbf{x}=\mathbf{b}\) con \(A\) de tamaño \(5\times 3\) y rango 3 es:",
        "opciones": ["Cuadrado", "Sobredeterminado", "Subdeterminado", "Siempre consistente"],
        "correcta": 1,
        "explicacion": "Tiene más ecuaciones (5) que incógnitas (3).",
    },
    {
        "id": "p2",
        "tema": "Sistemas no cuadrados",
        "tipo": "opcion",
        "enunciado": r"Si \(A\) es \(6\times 2\), ¿qué tamaño tiene la matriz de las ecuaciones normales \(A^TA\)?",
        "opciones": [r"\(6\times 6\)", r"\(2\times 6\)", r"\(2\times 2\)", r"\(6\times 2\)"],
        "correcta": 2,
        "explicacion": r"\((2\times 6)(6\times 2) = 2\times 2\): una ecuación por incógnita.",
    },
    {
        "id": "p3",
        "tema": "Sistemas no cuadrados",
        "tipo": "numero",
        "enunciado": (
            r"Para \(A=\begin{bmatrix}1&0\\0&1\\1&1\end{bmatrix}\), "
            r"\(\mathbf{b}=\begin{bmatrix}1\\1\\0\end{bmatrix}\), calcula \(\hat{x}_1\) (4 decimales)."
        ),
        "correcta": 1 / 3,
        "tolerancia": 5e-3,
        "explicacion": r"\(A^TA=\begin{bmatrix}2&1\\1&2\end{bmatrix}\), \(A^Tb=(1,1)^T\Rightarrow \hat{x}=(1/3,\,1/3)\).",
    },
    {
        "id": "p4",
        "tema": "Sistemas no cuadrados",
        "tipo": "opcion",
        "enunciado": r"En la solución de mínimos cuadrados, el residuo \(\mathbf{r}=\mathbf{b}-A\hat{\mathbf{x}}\) es ortogonal a:",
        "opciones": [
            r"Las filas de \(A\)",
            r"El vector \(\hat{\mathbf{x}}\)",
            r"Las columnas de \(A\)",
            r"El vector \(\mathbf{b}\)",
        ],
        "correcta": 2,
        "explicacion": r"\(A^T\mathbf{r}=0\): \(A\hat{x}\) es la proyección de \(b\) sobre el espacio columna.",
    },
    {
        "id": "p5",
        "tema": "Sistemas no cuadrados",
        "tipo": "opcion",
        "enunciado": r"Para un sistema subdeterminado con \(A\) de rango completo por filas, la solución de norma mínima es:",
        "opciones": [
            r"\(\mathbf{x}=(A^TA)^{-1}A^T\mathbf{b}\)",
            r"\(\mathbf{x}=A^T(AA^T)^{-1}\mathbf{b}\)",
            r"\(\mathbf{x}=A^{-1}\mathbf{b}\)",
            r"No existe solución",
        ],
        "correcta": 1,
        "explicacion": r"\(A^TA\) es singular cuando \(m<n\); se usa \(AA^T\), que es \(m\times m\) e invertible.",
    },
    {
        "id": "p6",
        "tema": "Sistemas no cuadrados",
        "tipo": "numero",
        "enunciado": r"Ajusta una recta \(y=c_0+c_1x\) a los puntos \((0,1),(1,3),(2,4)\). ¿Cuánto vale la pendiente \(c_1\)?",
        "correcta": 1.5,
        "tolerancia": 5e-3,
        "explicacion": r"\(A^TA=\begin{bmatrix}3&3\\3&5\end{bmatrix}\), \(A^Tb=(8,11)^T\Rightarrow c_1=1.5\), \(c_0=7/6\).",
    },
    {
        "id": "p7",
        "tema": "Sistemas no cuadrados",
        "tipo": "opcion",
        "enunciado": r"¿Por qué se prefiere QR a las ecuaciones normales en problemas mal condicionados?",
        "opciones": [
            "Porque QR da otra solución distinta",
            r"Porque \(\kappa(A^TA)=\kappa(A)^2\) y se pierde precisión",
            "Porque QR solo sirve para matrices cuadradas",
            r"Porque \(A^TA\) nunca es simétrica",
        ],
        "correcta": 1,
        "explicacion": r"Formar \(A^TA\) eleva al cuadrado el número de condición.",
    },
    {
        "id": "e1",
        "tema": "Estabilidad y convergencia",
        "tipo": "opcion",
        "enunciado": r"Si \(\kappa(A)\approx 10^{10}\) y trabajas en doble precisión (≈16 cifras), la solución tendrá aproximadamente:",
        "opciones": ["16 cifras correctas", "10 cifras correctas", "6 cifras correctas", "Ninguna cifra correcta"],
        "correcta": 2,
        "explicacion": r"Se pierden unas \(\log_{10}\kappa(A) = 10\) cifras: \(16 - 10 = 6\).",
    },
    {
        "id": "e2",
        "tema": "Estabilidad y convergencia",
        "tipo": "opcion",
        "enunciado": "La dominancia diagonal estricta de A es, para la convergencia de Jacobi:",
        "opciones": ["Necesaria y suficiente", "Suficiente pero no necesaria", "Necesaria pero no suficiente", "Irrelevante"],
        "correcta": 1,
        "explicacion": r"Garantiza \(\rho(T_J)<1\), pero hay matrices no dominantes con las que Jacobi también converge.",
    },
]


def preguntas_publicas():
    campos = ("id", "tema", "tipo", "enunciado", "opciones")
    return [{k: p[k] for k in campos if k in p} for p in PREGUNTAS]


def calificar(respuestas):
    detalle = []
    aciertos = 0
    for p in PREGUNTAS:
        dada = respuestas.get(p["id"])
        correcta = False
        if dada is not None and dada != "":
            try:
                if p["tipo"] == "opcion":
                    correcta = int(dada) == p["correcta"]
                else:
                    correcta = abs(float(str(dada).replace(",", ".")) - p["correcta"]) <= p["tolerancia"]
            except (TypeError, ValueError):
                correcta = False
        aciertos += correcta
        detalle.append({"id": p["id"], "correcta": correcta, "explicacion": p["explicacion"]})
    total = len(PREGUNTAS)
    return {"aciertos": aciertos, "total": total,
            "puntaje": round(100 * aciertos / total), "detalle": detalle}
