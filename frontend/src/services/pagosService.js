import api from './api'

/**
 * Crea una preferencia de MercadoPago Checkout Pro para el plan dado.
 * El backend registra un Pago en estado `pendiente` y devuelve los URLs.
 * @param {number} planId
 * @returns {{ pago_id, preference_id, init_point, sandbox_init_point, external_reference }}
 */
export async function crearPreferencia(planId) {
  const res = await api.post('/payments/preferencias/', { plan_id: planId })
  return res.data
}

/**
 * Devuelve la URL de pago correcta según la variable de entorno VITE_MP_SANDBOX.
 * En desarrollo se usa el sandbox; en producción se usa el init_point real.
 * @param {{ init_point: string, sandbox_init_point: string }} preferencia
 * @returns {string}
 */
export function resolverInitPoint(preferencia) {
  const useSandbox = import.meta.env.VITE_MP_SANDBOX === 'true'
  return useSandbox && preferencia.sandbox_init_point
    ? preferencia.sandbox_init_point
    : preferencia.init_point
}

/**
 * Registra un cobro manual realizado por el recepcionista.
 * Activa la membresía del socio en el acto.
 * @param {{ socio_id, plan_id, monto, observacion? }} payload
 * @returns {Pago} El objeto Pago creado y aprobado
 */
export async function cobrarManual(payload) {
  const res = await api.post('/payments/cobros-manuales/', payload)
  return res.data
}

/**
 * Lista pagos con filtros opcionales.
 * @param {object} params  e.g. { socio: id, estado: 'aprobado', page: 1 }
 * @returns {{ count, results }}
 */
export async function listarPagos(params = {}) {
  const res = await api.get('/payments/pagos/', { params })
  return res.data
}
