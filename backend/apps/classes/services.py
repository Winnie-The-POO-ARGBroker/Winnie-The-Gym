from rest_framework.exceptions import ValidationError

from .models import InscripcionClase


def inscribir_socio(clase, socio):
    """Enroll a socio in a clase, placing them on the wait-list when cupo is full.

    Raises:
        ValidationError: if the socio is already enrolled, or both cupo and
                         lista de espera are at capacity.

    Returns:
        The newly created InscripcionClase instance.
    """
    if InscripcionClase.objects.filter(clase=clase, socio=socio).exists():
        raise ValidationError({'detail': 'Ya estás inscripto en esta clase.'})

    cupos_ocupados = clase.inscripciones.filter(en_espera=False).count()
    en_espera = cupos_ocupados >= clase.cupo_maximo

    if en_espera:
        en_lista = clase.inscripciones.filter(en_espera=True).count()
        if en_lista >= clase.lista_espera_max:
            raise ValidationError({'detail': 'La clase y su lista de espera están completas.'})

    return InscripcionClase.objects.create(
        clase=clase,
        socio=socio,
        en_espera=en_espera,
    )
