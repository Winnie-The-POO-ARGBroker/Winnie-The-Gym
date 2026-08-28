from datetime import date


def dar_baja(socio):
    """Mark a Socio as given de baja, setting estado=BAJA and fecha_baja=today.

    Idempotent: calling on an already-baja socio is safe.
    """
    socio.estado = socio.Estado.BAJA
    socio.fecha_baja = date.today()
    socio.save(update_fields=['estado', 'fecha_baja', 'updated_at'])
    return socio
