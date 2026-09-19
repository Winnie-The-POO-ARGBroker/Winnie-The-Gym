/**
 * Constantes de archivos y certificados (RF08)
 */
export const MAX_CERT_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export const ALLOWED_CERT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

export const ALLOWED_CERT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
]

export const CERT_ACCEPT_ATTR = '.pdf,image/png,image/jpeg,.jpg'
