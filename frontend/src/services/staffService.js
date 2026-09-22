import api from './api'

const STAFF_URL = '/users/staff/'

/**
 * List all staff users (administrador + recepcionista).
 * Admin-only.
 * @returns {Promise<Array>}
 */
export function getStaffList() {
  return api.get(STAFF_URL).then((r) => r.data)
}

/**
 * Create a new staff user (admin-only).
 * Triggers activation email server-side.
 * @param {{ email: string, rol: string, first_name: string, last_name: string }} data
 * @returns {Promise<{ id, email, rol }>}
 */
export function createStaff(data) {
  return api.post(STAFF_URL, data).then((r) => r.data)
}

/**
 * Re-send activation email for a staff member.
 * Admin-only.
 * @param {number|string} id
 * @returns {Promise<{ detail: string }>}
 */
export function resendActivation(id) {
  return api.post(`${STAFF_URL}${id}/resend-activation/`).then((r) => r.data)
}
