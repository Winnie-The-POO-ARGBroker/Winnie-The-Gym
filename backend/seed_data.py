import os
import django
import datetime
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.base")
django.setup()

from apps.memberships.models import PlanMembresia
from apps.classes.models import Clase

# Crear planes
planes = [
    {
        "nombre": "Pase Libre - Sede Central",
        "precio": 45000,
        "duracion_dias": 30,
        "activo": True
    },
    {
        "nombre": "Pase x8 Clases",
        "precio": 32000,
        "duracion_dias": 30,
        "activo": True
    }
]

for p in planes:
    PlanMembresia.objects.get_or_create(nombre=p["nombre"], defaults=p)

# Crear clases
clases = [
    {
        "nombre": "CrossFit WOD Pro",
        "categoria": "crossfit",
        "descripcion": "Entrenamiento de alta intensidad",
        "dia": "lunes",
        "hora": datetime.time(7, 30),
        "duracion_min": 60,
        "sala": "Box Principal",
        "instructor": "Marcos Gómez",
        "cupo_maximo": 16,
        "estado": "activa"
    },
    {
        "nombre": "Spinning Endurance Ride",
        "categoria": "spinning",
        "descripcion": "Ciclismo indoor con intervalos",
        "dia": "lunes",
        "hora": datetime.time(8, 45),
        "duracion_min": 50,
        "sala": "Studio Ciclo Indoor",
        "instructor": "Sofía Chen",
        "cupo_maximo": 24,
        "estado": "activa"
    },
    {
        "nombre": "Power Yoga & Movilidad",
        "categoria": "yoga",
        "descripcion": "Secuencia dinámica de asanas",
        "dia": "martes",
        "hora": datetime.time(10, 0),
        "duracion_min": 60,
        "sala": "Studio Zen",
        "instructor": "Lucas Silva",
        "cupo_maximo": 18,
        "estado": "activa"
    }
]

for c in clases:
    Clase.objects.get_or_create(nombre=c["nombre"], defaults=c)

print("✅ Base de datos poblada con planes y clases iniciales exitosamente.")
