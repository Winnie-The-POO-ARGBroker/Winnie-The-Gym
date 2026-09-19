import api from './api';

/**
 * Escanea el código QR para validar el acceso.
 * @param {string} qrToken - El JWT dinámico del QR.
 * @param {string} accessType - 'ENTRY' o 'EXIT'.
 * @returns {Promise<Object>} Resultado del acceso (status, message, etc.)
 */
export const scanQR = async (qrToken, accessType = 'ENTRY') => {
  const response = await api.post('/access/qr/scan/', {
    qr_token: qrToken,
    access_type: accessType,
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
