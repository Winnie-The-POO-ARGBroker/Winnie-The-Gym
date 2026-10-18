import qrcode from 'qrcode-generator'

/**
 * Builds the module matrix (1 = dark, 0 = light) of a QR code for `text`.
 *
 * Encoding goes through `qrcode-generator`, which implements ISO/IEC 18004 in full
 * (all versions, multi-block error correction). The previous hand-rolled encoder
 * produced matrices no reader could decode, and silently returned an empty one for
 * anything over 213 bytes: the 222-character access token never rendered.
 *
 * Error correction is level M: the centre logo covers about 5% of the symbol,
 * well inside what M can recover (15%).
 *
 * @param {string} text
 * @returns {number[][]} square matrix, or [] when the text cannot be encoded
 */
export function generateQRMatrix(text) {
  try {
    const qr = qrcode(0, 'M') // type number 0 = pick the smallest version that fits
    qr.addData(text, 'Byte')
    qr.make()

    const size = qr.getModuleCount()
    return Array.from({ length: size }, (_, r) =>
      Array.from({ length: size }, (_, c) => (qr.isDark(r, c) ? 1 : 0)),
    )
  } catch {
    return []
  }
}
