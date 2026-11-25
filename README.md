# Métodos Numéricos · Unidad 03: Métodos de solución de sistemas de ecuaciones

Aplicación didáctica con **backend en Django** (NumPy + SymPy) y **frontend en Vite** (JavaScript, KaTeX, Chart.js,
three.js). Cada tema tiene teoría, un simulador paso a paso calculado en el servidor, gráficas y una práctica en Python.
Sigue la estructura del repositorio de referencia `gabrielkc18/numerical_methods` (teoría → ejercicios → simulador →
evaluación con ranking).

**En línea:** https://metodos-numericos-blush.vercel.app

## Resolver un ejercicio (`#/resolver`)

Se escribe el sistema como en el cuaderno, una ecuación por línea: `2x + y - z = 8`, `x/2 + y/3 = 1`, `x² + y² = 4`,
`xy = 1`, `2,5x`, `sin(x)`, `e^x`… La app detecta las incógnitas, si es lineal o no y si es cuadrado, recomienda un
método y lo resuelve paso a paso. Métodos disponibles: Gauss, Gauss-Jordan, LU, Cholesky, Cramer, inversa, Jacobi,
Gauss-Seidel, SOR, mínimos cuadrados, análisis de estabilidad, Newton-Raphson y punto fijo (simultáneo o tipo Seidel).
Los métodos directos dan **fracciones exactas** (7/3) cuando los datos son racionales.

Límites: hasta 10 ecuaciones y 10 incógnitas (Cramer hasta 6, Newton y punto fijo hasta 6 variables).
No interpreta enunciados en lenguaje natural: el ejercicio debe llegar ya como sistema de ecuaciones.

## Temas

| # | Tema | Simulador |
|---|---|---|
| 3.1 | Sistemas de ecuaciones lineales y no lineales | Clasificación por Rouché-Frobenius con gráfica de rectas · **Newton-Raphson** multivariable con jacobiana simbólica, curvas f(x, y) = 0 y orden de convergencia · **punto fijo** con ρ(J_G) |
| 3.2 | Métodos iterativos y directos | Gauss, LU (PA = LU), Cholesky y Cramer paso a paso; comparador directo frente a Jacobi, Gauss-Seidel y SOR |
| 3.3 | Eliminación de Gauss-Jordan | Paso a paso con pivote resaltado, pivoteo parcial opcional, clasificación (única / infinitas / ninguna), solución paramétrica, inversa con [A \| I] y conteo de operaciones |
| 3.4 | Método de Jacobi y Gauss-Seidel | Jacobi, Gauss-Seidel y SOR: desarrollo de las primeras iteraciones, convergencia en escala log, trayectoria en el plano (2 × 2), dominancia diagonal, ρ(T), ω óptimo y reordenamiento automático de filas |
| 3.5 ★ | Resolución de sistemas no cuadrados | Mínimos cuadrados: ecuaciones normales, norma mínima, pseudoinversa (SVD), ajuste de curvas y proyección en 3D |
| 3.6 | Análisis de estabilidad y convergencia | κ₁, κ₂, κ∞, cifras perdidas, valores singulares y propios, experimento de perturbación, ρ(T_J), ρ(T_GS) y experimento con matrices de Hilbert |
| 3.7 | Prácticas en Python | Seis scripts con NumPy (`frontend/src/practicas/`), uno por tema, para copiar o descargar |

Además: **evaluación** de 16 preguntas de todos los temas, calificada en el servidor, con ranking.

## Estructura

```
backend/                 Django
  sistemas/
    validacion.py        validación común de entradas
    directos.py          Gauss, Gauss-Jordan, LU, Cholesky, Cramer (exactos con Fraction o en coma flotante)
    iterativos.py        Jacobi, Gauss-Seidel, SOR, dominancia, radio espectral
    no_lineales.py       interpretar ecuaciones de texto, Newton-Raphson y punto fijo (ast → SymPy, sin eval)
    estabilidad.py       número de condición, perturbaciones, Hilbert
    solver.py            mínimos cuadrados y ajuste de curvas
    contenido.py         ejemplos y banco de preguntas
    views.py · urls.py   API JSON
    tests.py             45 pruebas
frontend/                Vite
  src/main.js            enrutador (#/tema/pestaña), menú, tema claro/oscuro
  src/temas.js           índice de la unidad
  src/paginas/           una página por tema (carga diferida)
  src/componentes/       editor de matrices, plano 2D, gráficas, código, UI
  src/practicas/*.py     prácticas en Python
api/index.py             entrada de Django como función de Vercel
vercel.json              despliegue (Vite estático + /api → Django)
```

## Ejecutar en local

```bash
# Backend (puerto 8000)
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (puerto 5173, otra terminal)
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. Vite redirige `/api` a Django. Pruebas: `cd backend && python manage.py test`.

## API

| Método | Ruta | Uso |
|---|---|---|
| POST | `/api/interpretar/` | `{texto: "2x + y = 5\nx - y = 1"}` → variables, lineal, A, b (también exactos) |
| POST | `/api/directos/gauss-jordan/` | `{A, b, modo: "sistema" \| "inversa", pivoteo, exacto}` |
| POST | `/api/directos/{gauss,lu,cholesky,cramer}/` | `{A, b, pivoteo, exacto}` |
| POST | `/api/no-lineales/punto-fijo/` | `{ecuaciones: ["x = cos(x)"], variables, x0, tol, max_iter, seidel}` |
| POST | `/api/iterativos/` | `{A, b, x0, metodo: "jacobi" \| "gauss_seidel" \| "sor", tol, max_iter, omega, criterio, reordenar, desarrollar}` |
| POST | `/api/no-lineales/newton/` | `{ecuaciones: ["x^2 + y^2 = 4", "x*y = 1"], variables: ["x", "y"], x0, tol, max_iter}` |
| POST | `/api/estabilidad/` | `{A, b, epsilon}` |
| GET | `/api/estabilidad/hilbert/` | κ(Hₙ) y error para n = 2…12 |
| POST | `/api/sistemas/resolver/` | `{A, b}` m × n por mínimos cuadrados |
| POST | `/api/ajuste/` | `{x, y, modelo, grado}` |
| GET | `/api/ejemplos/` | ejemplos por tema |
| GET/POST | `/api/quiz/preguntas/`, `/api/quiz/enviar/`, `/api/quiz/ranking/` | evaluación |
| GET | `/api/historial/` | últimas resoluciones |

Los errores de entrada devuelven HTTP 400 con `{"error": "mensaje legible"}`.

## Despliegue (Vercel)

Un solo proyecto: `frontend/dist` como sitio estático y `api/index.py` como función Python para `/api/*`.
Variables: `DJANGO_SECRET_KEY` (obligatoria) y `DATABASE_URL` (opcional, Postgres).

> Sin `DATABASE_URL`, Django usa SQLite en `/tmp`, que Vercel borra al reiniciar la función: el ranking y el
> historial no son permanentes. Con una base Postgres (por ejemplo, Supabase) sí lo son.
