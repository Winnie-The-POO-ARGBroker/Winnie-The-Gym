import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { REPORT_FETCH_LIMIT } from '../../constants/pagination'

export const REPORTES_QUERY_KEY = ['reportes', 'metrics']
export const REPORTES_RESUMEN_QUERY_KEY = (params = {}) => ['reportes', 'resumen', params]

/**
 * Fetches server-side pre-computed report summary from /api/reportes/resumen/.
 * Accepts optional filters: { mes: 'YYYY-MM', plan_id: number }.
 *
 * Returns the raw API shape:
 *   ingresos: { mes_actual, mes_anterior, variacion_pct, serie_6_meses }
 *   morosos:  { cantidad, monto_total, tasa_pct }
 *   membresias: { activas, por_vencer_7d, nuevas_mes }
 *   asistencia: { promedio_dia: { lun, mar, mie, jue, vie, sab, dom } }
 */
export function useReportesResumen({ mes, plan_id } = {}) {
  const params = {}
  if (mes) params.mes = mes
  if (plan_id) params.plan_id = plan_id

  return useQuery({
    queryKey: REPORTES_RESUMEN_QUERY_KEY(params),
    queryFn: async () => {
      const res = await api.get('/reportes/resumen/', { params })
      return res.data
    },
    staleTime: 2 * 60_000,
    retry: 1,
  })
}

/**
 * Fetches the three raw data sources needed to compute dashboard metrics,
 * then derives the metric values from the combined payload.
 *
 * Returns: { metrics, isLoading, isError }
 */
export function useReportMetrics() {
  return useQuery({
    queryKey: REPORTES_QUERY_KEY,
    queryFn: async () => {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() // 0-indexed

      const [memRes, pagosRes, logsRes] = await Promise.all([
        // ultima: una fila por socio, así membresías ya renovadas no inflan la morosidad
        api.get('/memberships/membresias/', { params: { ultima: true, page_size: REPORT_FETCH_LIMIT } }).catch(() => ({ data: [] })),
        api.get('/payments/pagos/', { params: { estado: 'aprobado', page_size: REPORT_FETCH_LIMIT } }).catch(() => ({ data: [] })),
        api.get('/access/logs/', { params: { page_size: REPORT_FETCH_LIMIT } }).catch(() => ({ data: [] })),
      ])

      // ── Membresías ───────────────────────────────────────────────────────────
      const membresias = memRes.data.results || (Array.isArray(memRes.data) ? memRes.data : [])

      let activas = 0
      let porVencer = 0
      let nuevasMes = 0
      let morosos = 0
      let adeudadoTotal = 0

      const sieteDiasMs = 7 * 24 * 60 * 60 * 1000

      membresias.forEach((m) => {
        const precioPlan = Number(m.plan?.precio || 0)
        const estado = m.estado?.toLowerCase()

        if (estado === 'activa') {
          activas++
          if (m.fecha_fin) {
            const fin = new Date(m.fecha_fin)
            const diff = fin.getTime() - now.getTime()
            if (diff >= 0 && diff <= sieteDiasMs) porVencer++
          }
          if (m.fecha_inicio) {
            const ini = new Date(m.fecha_inicio)
            if (ini.getFullYear() === currentYear && ini.getMonth() === currentMonth) nuevasMes++
          }
        } else if (estado === 'vencida' || estado === 'pendiente_pago') {
          morosos++
          adeudadoTotal += precioPlan
        }
      })

      const totalMembresias = membresias.length
      const morosidadPct = totalMembresias > 0 ? Math.round((morosos / totalMembresias) * 100) : 0

      // ── Pagos e Ingresos ─────────────────────────────────────────────────────
      const pagos = pagosRes.data.results || (Array.isArray(pagosRes.data) ? pagosRes.data : [])

      let ingresosMesActual = 0
      let ingresosMesAnterior = 0

      pagos.forEach((p) => {
        const pDate = new Date(p.paid_at || p.created_at)
        const monto = Number(p.monto || 0)
        if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
          ingresosMesActual += monto
        } else if (
          (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth - 1) ||
          (currentMonth === 0 && pDate.getFullYear() === currentYear - 1 && pDate.getMonth() === 11)
        ) {
          ingresosMesAnterior += monto
        }
      })

      let vsAnterior = '+0%'
      if (ingresosMesAnterior > 0) {
        const diffPct = Math.round(((ingresosMesActual - ingresosMesAnterior) / ingresosMesAnterior) * 100)
        vsAnterior = `${diffPct >= 0 ? '+' : ''}${diffPct}%`
      } else if (ingresosMesActual > 0) {
        vsAnterior = '+100%'
      }

      // ── Access Logs ──────────────────────────────────────────────────────────
      const logs = logsRes.data.results || (Array.isArray(logsRes.data) ? logsRes.data : [])

      const dayCounts = [0, 0, 0, 0, 0, 0, 0]
      logs.forEach((log) => {
        if (log.access_type === 'ENTRY') {
          const jsDay = new Date(log.timestamp).getDay()
          const dayIdx = jsDay === 0 ? 6 : jsDay - 1
          dayCounts[dayIdx]++
        }
      })

      const maxDayCount = Math.max(...dayCounts, 1)
      const asistenciaBars = dayCounts.map((c) => Math.max(12, Math.round((c / maxDayCount) * 90)))

      return {
        ingresosMesFormatted: `$ ${ingresosMesActual.toLocaleString('es-AR')}`,
        vsAnteriorFormatted: vsAnterior,
        // TODO: compute real chart points from ingresos data — placeholder until backend endpoint exists
        chartPath: 'M 0,70 L 60,65 L 130,50 L 200,60 L 270,40 L 340,45 L 400,25',
        asistenciaBars,
        morososCount: morosos,
        adeudadoFormatted: `$ ${adeudadoTotal.toLocaleString('es-AR')}`,
        morosidadTasa: `${morosidadPct}%`,
        morosidadPct,
        activasCount: activas.toLocaleString('es-AR'),
        porVencerCount: porVencer,
        nuevasMesCount: nuevasMes,
      }
    },
    staleTime: 2 * 60_000, // 2 minutes — dashboard metrics don't need to be real-time
    retry: 1,
  })
}
