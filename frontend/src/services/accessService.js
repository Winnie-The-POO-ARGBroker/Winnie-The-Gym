import api from './api';

/**
 * Escanea el código QR para validar el acceso.
 * @param {string} qrToken - El JWT dinámico del QR.
 * @param {string} accessType - 'ENTRY' o 'EXIT'.
 * @param {Object} [options] - Optional overrides.
 * @param {boolean} [options.override] - Staff override flag (#149).
 * @returns {Promise<Object>} Resultado del acceso (status, message, etc.)
 */
export const scanQR = async (qrToken, accessType = 'ENTRY', options = {}) => {
  const response = await api.post('/access/qr/scan/', {
    qr_token: qrToken,
    access_type: accessType,
    ...(options.override ? { override: true } : {}),
  });
  return response.data;
};

/**
 * Valida manualmente el acceso de un socio por su DNI.
 * @param {string} dni - DNI del socio.
 * @param {string} accessType - 'ENTRY' o 'EXIT'.
 * @returns {Promise<Object>} Resultado del acceso (status, message, etc.)
 */
export const manualAccess = async (dni, accessType = 'ENTRY') => {
  const response = await api.post('/access/manual/', {
    dni,
    access_type: accessType,
  });
  return response.data;
};

/**
 * Returns the list of socios currently inside the gym (presentes ahora).
 * @returns {Promise<Object>} { count, presentes: [...] }
 */
export const getPresentes = async () => {
  const response = await api.get('/access/presentes/');
  return response.data;
};

/**
 * Registers a manual exit for one or more socios.
 * @param {number[]} socioIds - Array of socio IDs to check out.
 * @param {string} [motivo] - Optional reason.
 * @returns {Promise<Object>} { created_count, access_logs, warnings? }
 */
export const salidaManual = async (socioIds, motivo = '') => {
  const response = await api.post('/access/salida-manual/', {
    socio_ids: socioIds,
    motivo,
  });
  return response.data;
};

/**
 * Closes the day: creates EXIT logs for all presentes. Admin-only.
 * @returns {Promise<Object>} { closed_count, message, timestamp_cierre }
 */
export const cerrarDia = async () => {
  const response = await api.post('/access/cerrar-dia/', { confirm: true });
  return response.data;
};
