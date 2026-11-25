import json

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import contenido
from .directos import gauss_jordan
from .estabilidad import analizar, experimento_hilbert
from .iterativos import iterar
from .models import Evaluacion, Resolucion
from .no_lineales import newton
from .solver import ajustar_curva, resolver_sistema
from .validacion import ErrorEntrada


def _error(mensaje, estado=400):
    return JsonResponse({"error": mensaje}, status=estado)


def _json(request):
    try:
        datos = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ErrorEntrada("El cuerpo de la petición no es JSON válido.") from None
    if not isinstance(datos, dict):
        raise ErrorEntrada("Se esperaba un objeto JSON.")
    return datos


def _registrar(tipo, filas, columnas, forma, metodo, entrada, norma_residuo):
    try:
        Resolucion.objects.create(tipo=tipo, filas=filas, columnas=columnas, forma=forma, metodo=metodo,
                                  entrada=entrada, norma_residuo=norma_residuo)
    except Exception:  # noqa: BLE001 - el historial nunca debe tumbar un cálculo
        pass


def _api(vista):
    """Convierte errores de entrada en respuestas 400 con mensaje legible."""

    def envoltura(request, *args, **kwargs):
        try:
            return vista(request, *args, **kwargs)
        except ErrorEntrada as e:
            return _error(str(e))

    envoltura.__name__ = vista.__name__
    return envoltura


@require_GET
def estado(request):
    return JsonResponse({
        "estado": "en línea",
        "tema": "Unidad 03 · Métodos de solución de sistemas de ecuaciones",
        "rutas": {
            "POST /api/sistemas/resolver/": "Resuelve A x = b (m × n) por mínimos cuadrados",
            "POST /api/directos/gauss-jordan/": "Gauss-Jordan con pasos (sistema o inversa)",
            "POST /api/iterativos/": "Jacobi, Gauss-Seidel y SOR con análisis de convergencia",
            "POST /api/no-lineales/newton/": "Newton-Raphson para sistemas no lineales",
            "POST /api/estabilidad/": "Condicionamiento, perturbaciones y radio espectral",
            "GET /api/estabilidad/hilbert/": "Crecimiento de κ en matrices de Hilbert",
            "POST /api/ajuste/": "Ajuste de curvas (polinomial, exponencial, potencia, logarítmico)",
            "GET /api/ejemplos/": "Sistemas de ejemplo",
            "GET /api/quiz/preguntas/": "Preguntas del cuestionario",
            "POST /api/quiz/enviar/": "Califica y guarda las respuestas",
            "GET /api/quiz/ranking/": "Top 10",
            "GET /api/historial/": "Últimas resoluciones",
        },
    })


@require_GET
def ejemplos(request):
    return JsonResponse({"ejemplos": contenido.EJEMPLOS})


@csrf_exempt
@require_POST
@_api
def resolver(request):
    datos = _json(request)
    resultado = resolver_sistema(datos.get("A"), datos.get("b"))
    _registrar("sistema", resultado["m"], resultado["n"], resultado["forma"], resultado["metodo"],
               {"A": datos["A"], "b": datos["b"]}, resultado["norma_residuo"])
    return JsonResponse(resultado)


@csrf_exempt
@require_POST
@_api
def ajuste(request):
    datos = _json(request)
    resultado = ajustar_curva(
        datos.get("x"), datos.get("y"),
        modelo=datos.get("modelo", "polinomial"), grado=datos.get("grado", 1),
    )
    _registrar("ajuste", resultado["puntos"], resultado["parametros"], resultado["sistema"]["forma"],
               resultado["modelo"], {k: datos.get(k) for k in ("x", "y", "modelo", "grado")},
               resultado["sistema"]["norma_residuo"])
    return JsonResponse(resultado)


@csrf_exempt
@require_POST
@_api
def vista_gauss_jordan(request):
    d = _json(request)
    r = gauss_jordan(d.get("A"), d.get("b"), modo=d.get("modo", "sistema"), pivoteo=bool(d.get("pivoteo", True)))
    _registrar("gauss_jordan", r["m"], r["n"], r.get("clasificacion", "inversa"), "gauss_jordan",
               {"A": d.get("A"), "b": d.get("b")}, r.get("residuo") or 0.0)
    return JsonResponse(r)


@csrf_exempt
@require_POST
@_api
def vista_iterativos(request):
    d = _json(request)
    r = iterar(d.get("A"), d.get("b"), d.get("x0"), metodo=d.get("metodo", "jacobi"), tol=d.get("tol"),
               max_iter=d.get("max_iter"), omega=d.get("omega"), criterio=d.get("criterio", "absoluto"),
               reordenar=bool(d.get("reordenar", False)))
    residuo = r["historial"][-1]["residuo"]
    _registrar("iterativo", r["n"], r["n"], r["estado"], r["metodo"], {"A": d.get("A"), "b": d.get("b")},
               residuo if residuo is not None else -1.0)
    return JsonResponse(r)


@csrf_exempt
@require_POST
@_api
def vista_newton(request):
    d = _json(request)
    r = newton(d.get("ecuaciones"), d.get("variables"), d.get("x0"), tol=d.get("tol"), max_iter=d.get("max_iter"))
    norma = r["historial"][-1].get("norma_F")
    n = len(r["variables"])
    _registrar("no_lineal", n, n, r["estado"], "newton",
               {k: d.get(k) for k in ("ecuaciones", "variables", "x0")}, norma if norma is not None else -1.0)
    return JsonResponse(r)


@csrf_exempt
@require_POST
@_api
def vista_estabilidad(request):
    d = _json(request)
    return JsonResponse(analizar(d.get("A"), d.get("b"), epsilon=d.get("epsilon")))


@require_GET
def vista_hilbert(request):
    return JsonResponse({"hilbert": experimento_hilbert()})


@require_GET
def historial(request):
    filas = Resolucion.objects.all()[:15]
    return JsonResponse({"historial": [
        {"tipo": r.get_tipo_display(), "tamano": f"{r.filas}×{r.columnas}", "forma": r.forma,
         "metodo": r.metodo, "norma_residuo": r.norma_residuo, "creado": r.creado.isoformat()}
        for r in filas
    ]})


@require_GET
def preguntas(request):
    return JsonResponse({"preguntas": contenido.preguntas_publicas()})


@csrf_exempt
@require_POST
@_api
def enviar_quiz(request):
    datos = _json(request)
    nombre = str(datos.get("nombre", "")).strip()[:120]
    correo = str(datos.get("correo", "")).strip().lower()
    respuestas = datos.get("respuestas")
    if not nombre:
        raise ErrorEntrada("Escribe tu nombre.")
    try:
        validate_email(correo)
    except ValidationError:
        raise ErrorEntrada("El correo no es válido.") from None
    if not isinstance(respuestas, dict):
        raise ErrorEntrada("Faltan las respuestas.")

    nota = contenido.calificar(respuestas)
    Evaluacion.objects.update_or_create(
        correo=correo,
        defaults={"nombre": nombre, "puntaje": nota["puntaje"], "aciertos": nota["aciertos"],
                  "total": nota["total"], "respuestas": respuestas},
    )
    return JsonResponse(nota)


@require_GET
def ranking(request):
    top = Evaluacion.objects.all()[:10]
    return JsonResponse({"ranking": [
        {"nombre": e.nombre, "puntaje": e.puntaje, "aciertos": e.aciertos, "total": e.total}
        for e in top
    ]})
