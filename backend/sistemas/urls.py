from django.urls import path

from . import views

urlpatterns = [
    path("", views.estado, name="estado"),
    path("ejemplos/", views.ejemplos, name="ejemplos"),
    path("sistemas/resolver/", views.resolver, name="resolver"),
    path("ajuste/", views.ajuste, name="ajuste"),
    path("directos/gauss-jordan/", views.vista_gauss_jordan, name="gauss_jordan"),
    path("directos/<str:metodo>/", views.vista_directo, name="directo"),
    path("interpretar/", views.vista_interpretar, name="interpretar"),
    path("no-lineales/punto-fijo/", views.vista_punto_fijo, name="punto_fijo"),
    path("iterativos/", views.vista_iterativos, name="iterativos"),
    path("no-lineales/newton/", views.vista_newton, name="newton"),
    path("estabilidad/", views.vista_estabilidad, name="estabilidad"),
    path("estabilidad/hilbert/", views.vista_hilbert, name="hilbert"),
    path("historial/", views.historial, name="historial"),
    path("quiz/preguntas/", views.preguntas, name="preguntas"),
    path("quiz/enviar/", views.enviar_quiz, name="enviar_quiz"),
    path("quiz/ranking/", views.ranking, name="ranking"),
]
