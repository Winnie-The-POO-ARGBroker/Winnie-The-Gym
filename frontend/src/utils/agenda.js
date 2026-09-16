export function generateDaysAgenda() {
  const hoy = new Date()
  const dias = []
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]

  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(hoy.getDate() + i)
    const id = d.toISOString().split('T')[0]
    const diaSemana = nombresDias[d.getDay()]
    const diaNum = String(d.getDate()).padStart(2, '0')
    const mesNombre = nombresMeses[d.getMonth()]
    dias.push({
      id,
      diaNombre: diaSemana,
      diaNumero: diaNum,
      fechaCompleta: `${diaSemana} ${diaNum} de ${mesNombre}`,
      esHoy: i === 0,
    })
  }
  return dias
}
