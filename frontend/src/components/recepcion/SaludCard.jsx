import { useState } from 'react'
import { FileText, Calendar, UploadCloud, CheckCircle2, AlertCircle, X } from 'lucide-react'
import Card from '../ui/Card'
import Input from '../ui/Input'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB (RF08)

export default function SaludCard({
  onFileChange,
  onChange,
  currentCertificateUrl = null,
}) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamaño máximo 5 MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('El archivo supera el límite de 5 MB.')
      setSelectedFile(null)
      if (onFileChange) onFileChange(null)
      return
    }

    setFileError(null)
    setSelectedFile(file)
    if (onFileChange) onFileChange(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setFileError(null)
    if (onFileChange) onFileChange(null)
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Salud y Certificado Médico (RF08)
          </h2>
          <p className="text-xs text-text-secondary">
            Sube el apto médico en formato PDF o imagen (máx. 5 MB)
          </p>
        </div>
        <span className="text-xs bg-bg-raised text-text-secondary px-2 py-1 rounded-lg">
          Recomendado
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="w-full">
          <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Apto Médico
          </label>

          {currentCertificateUrl && !selectedFile && (
            <div className="mb-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Certificado registrado
              </span>
              <a
                href={currentCertificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-400"
              >
                Ver actual
              </a>
            </div>
          )}

          <div className="relative">
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFile}
              className="w-full bg-bg-base border border-subtle rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-orange-500 transition-colors py-2 pl-3 pr-3 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-500/10 file:text-orange-500 hover:file:bg-orange-500/20 cursor-pointer"
            />
          </div>

          {selectedFile && (
            <div className="mt-2 flex items-center justify-between text-xs p-2 rounded-lg bg-bg-raised border border-subtle">
              <span className="truncate max-w-[200px] text-text-primary">
                📄 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-text-secondary hover:text-rose-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {fileError && (
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {fileError}
            </p>
          )}
        </div>

        {onChange && (
          <Input
            label="VENCE"
            placeholder="dd/mm/aaaa"
            icon={Calendar}
            onChange={(e) => onChange('venceMedico', e.target.value)}
          />
        )}
      </div>

      {onChange && (
        <Input
          label="OBSERVACIONES / LESIONES"
          placeholder="Sin observaciones"
          onChange={(e) => onChange('observaciones', e.target.value)}
        />
      )}
    </Card>
  )
}
