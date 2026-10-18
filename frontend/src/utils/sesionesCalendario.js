/**
 * The calendar draws sessions, but the API sends them as bare rows:
 * `{ id, clase, fecha, estado, hora_efectiva, cupo_efectivo }`. Name, room and
 * category live on the class, so each session is joined with its class here.
 *
 * `id` stays the class id (the detail and attendee views are per class) and the
 * session id travels as `sesion_id`.
 *
 * @param {Array} sesiones
 * @param {Array} clases
 * @returns {Array} calendar items; sessions whose class is unknown are dropped
 */
export function combinarSesionesConClases(sesiones = [], clases = []) {
  const clasePorId = new Map(clases.map((c) => [c.id, c]))

  return sesiones.flatMap((sesion) => {
    const clase = clasePorId.get(sesion.clase)
    if (!clase) return []

    return [{
      ...clase,
      sesion_id: sesion.id,
      fecha: sesion.fecha,
      estado: sesion.estado,
      hora: sesion.hora_efectiva ?? clase.hora,
      cupo_maximo: sesion.cupo_efectivo ?? clase.cupo_maximo,
    }]
  })
}
