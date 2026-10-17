import { useState, useRef } from 'react'
import { FileCheck, FileX, Upload, ExternalLink, Clock, AlertTriangle } from 'lucide-react'
import Badge from '../ui/Badge'
import api from '../../services/api'

/**
 * Maps the backend apto_estado value to a Badge variant and display label.
 */
const APTO_CONFIG = {
  sin_apto:   { variant: 'neutral',  label: 'Sin apto'     },
  vigente:    { variant: 'success',  label: 'Vigente'      },
  por_vencer: { variant: 'warning',  label: 'Por vencer'   },
  vencido:    { variant: 'danger',   label: 'Vencido'      },
}

function formatDateAR(dateStr) {
  if (!dateStr) return '—'
  // Append T12:00:00 to avoid timezone shift
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * AptoEstadoBadge — renders the apto_estado badge inline.
 *
 * @param {'sin_apto'|'vigente'|'por_vencer'|'vencido'} aptoEstado
 */
export function AptoEstadoBadge({ aptoEstado }) {
  const config = APTO_CONFIG[aptoEstado] ?? APTO_CONFIG.sin_apto
  return (
    <span data-testid="apto-estado-badge">
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    </span>
  )
}

/**
 * CertificadoCard — upload form (multipart PATCH) + signed URL viewer.
 *
 * Props:
 *  - socioId:            number|string — the socio's ID (required for API calls)
 *  - aptoEstado:         'sin_apto'|'vigente'|'por_vencer'|'vencido'
 *  - certificadoEmitidoEn: string|null — ISO date
 *  - certificadoVenceEn:   string|null — ISO date
 *  - onUploadSuccess:    () => void — called after a successful upload
 */
export default function CertificadoCard({
  socioId,
  aptoEstado = 'sin_apto',
  certificadoEmitidoEn = null,
  certificadoVenceEn = null,
  onUploadSuccess,
}) {
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [file, setFile] = useState(null)
  const [emitidoEn, setEmitidoEn] = useState('')
  const [venceEn, setVenceEn] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const fileInputRef = useRef(null)

  const hasApto = aptoEstado !== 'sin_apto'

  const handleVerCertificado = async () => {
    if (!socioId) return
    setFetchingUrl(true)
    try {
      const res = await api.get(`/members/socios/${socioId}/certificado/url/`)
      const { url } = res.data
      // Note: URL expires in 5 minutes
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // silently fail — toast handled by the api interceptor
    } finally {
      setFetchingUrl(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !emitidoEn || !venceEn) return

    const formData = new FormData()
    formData.append('archivo', file)
    formData.append('certificado_emitido_en', emitidoEn)
    formData.append('certificado_vence_en', venceEn)

    setUploading(true)
    setUploadError(null)
    try {
      await api.patch(`/members/socios/${socioId}/certificado/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setShowUploadForm(false)
      setFile(null)
      setEmitidoEn('')
      setVenceEn('')
      onUploadSuccess?.()
    } catch (err) {
      const data = err?.response?.data
      const msg =
        (data?.detail) ||
        (data?.archivo && Array.isArray(data.archivo) ? data.archivo.join(', ') : null) ||
        'Error al subir el certificado.'
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-3.5 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
          Certificado Médico (Apto Físico)
        </span>
        <AptoEstadoBadge aptoEstado={aptoEstado} />
      </div>

      {/* State block */}
      {hasApto ? (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-success-500/10 border border-success-500/20 text-success-500">
          <FileCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-xs font-medium">Certificado vigente cargado</span>
            {certificadoEmitidoEn && (
              <span className="text-[11px] text-success-500/80">
                Emitido: {formatDateAR(certificadoEmitidoEn)}
              </span>
            )}
            {certificadoVenceEn && (
              <span className="text-[11px] text-success-500/80">
                Vence: {formatDateAR(certificadoVenceEn)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleVerCertificado}
            disabled={fetchingUrl}
            className="inline-flex items-center gap-1 text-xs font-semibold underline hover:text-emerald-400 transition-colors disabled:opacity-60 shrink-0"
            title="La URL firmada expira en 5 minutos"
          >
            {fetchingUrl ? 'Cargando...' : (
              <>Ver archivo <ExternalLink className="w-3 h-3" /></>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-500/10 border border-error-500/20 text-error-500 text-xs font-medium">
          <FileX className="w-4 h-4" />
          <span>No posee certificado médico cargado en el sistema</span>
        </div>
      )}

      {/* Expiry note for signed URL */}
      {hasApto && (
        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <Clock className="w-3 h-3" />
          <span>El enlace de visualización expira en 5 minutos por seguridad.</span>
        </div>
      )}

      {/* Upload form toggle */}
      {!showUploadForm ? (
        <button
          type="button"
          onClick={() => setShowUploadForm(true)}
          className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {hasApto ? 'Reemplazar certificado' : 'Subir certificado'}
        </button>
      ) : (
        <form onSubmit={handleUpload} className="flex flex-col gap-3 pt-1 border-t border-subtle">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            Subir nuevo certificado
          </p>

          {/* Date fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Emitido el <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                value={emitidoEn}
                onChange={(e) => setEmitidoEn(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-bg-base border border-subtle text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-primary transition-colors"
                data-testid="emitido-en-input"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                Vence el <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                value={venceEn}
                onChange={(e) => setVenceEn(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-bg-base border border-subtle text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-primary transition-colors"
                data-testid="vence-en-input"
              />
            </div>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">
              Archivo (PDF, JPG, PNG — máx. 5 MB) <span className="text-error-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-text-primary file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-colors"
              data-testid="certificado-file-input"
            />
          </div>

          {/* Error message */}
          {uploadError && (
            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-error-500/10 border border-error-500/20 text-error-500 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false)
                setFile(null)
                setEmitidoEn('')
                setVenceEn('')
                setUploadError(null)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary border border-subtle hover:bg-bg-raised transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !emitidoEn || !venceEn}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-700 text-white hover:bg-primary/90 disabled:opacity-60 transition-colors gap-1.5 inline-flex items-center"
              data-testid="certificado-submit-btn"
            >
              <Upload className="w-3 h-3" />
              {uploading ? 'Subiendo...' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
