"""Punto de entrada de Django en Vercel (función Python serverless).

Vercel enruta /api/* a este archivo (ver vercel.json) y busca la variable
`app`, que aquí es la aplicación WSGI de Django.
"""

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

# Crea o actualiza las tablas al arrancar la función. Con SQLite en /tmp es
# imprescindible (la base empieza vacía); con Postgres es una comprobación rápida.
from django.core.management import call_command  # noqa: E402

call_command("migrate", interactive=False, verbosity=0)

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
