

export default function AttendanceTable() {
  const attendees = [
    { name: 'Socio 1', id: '34.567.890', status: 'Presente', statusColor: 'bg-green-900/30 text-green-500 border-green-500/50' },
    { name: 'Socio 2', id: '35.123.456', status: 'Presente', statusColor: 'bg-green-900/30 text-green-500 border-green-500/50' },
    { name: 'Socio 3', id: '32.987.654', status: 'Ausente', statusColor: 'bg-red-900/30 text-red-500 border-red-500/50' },
    { name: 'Socio 4', id: '40.111.222', status: 'Justificado', statusColor: 'bg-yellow-900/30 text-yellow-500 border-yellow-500/50' },
    { name: 'Socio 5', id: '39.444.555', status: 'Pendiente', statusColor: 'bg-gray-800 text-text-secondary border-subtle' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full">
      {/* Table Area */}
      <div className="flex-1 bg-bg-surface rounded-xl p-6 shadow-lg border border-subtle">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            Asistencia <span className="text-text-tertiary">- Funcional</span>
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              className="bg-bg-raised border border-subtle rounded-lg p-2 text-sm text-text-primary focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <span className="px-3 py-1 rounded-full border border-subtle bg-bg-raised text-xs text-text-primary cursor-pointer hover:bg-gray-700">Todos</span>
          <span className="px-3 py-1 rounded-full border border-green-500/50 bg-green-900/20 text-xs text-green-500 cursor-pointer hover:bg-green-900/40">Presentes</span>
          <span className="px-3 py-1 rounded-full border border-red-500/50 bg-red-900/20 text-xs text-red-500 cursor-pointer hover:bg-red-900/40">Ausentes</span>
        </div>

        <div className="w-full">
          <div className="flex text-xs text-text-tertiary uppercase font-semibold pb-2 border-b border-subtle mb-2">
            <div className="w-1/2">Alumno</div>
            <div className="w-1/4">DNI</div>
            <div className="w-1/4">Estado</div>
            <div className="w-24 text-right">Acción</div>
          </div>
          
          <div className="flex flex-col gap-2">
            {attendees.map((a, idx) => (
              <div key={idx} className="flex items-center text-sm py-2 border-b border-subtle/50 hover:bg-bg-raised rounded px-2 transition-colors -mx-2">
                <div className="w-1/2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-text-primary">
                    {a.name.charAt(0)}
                  </div>
                  <span className="text-text-secondary">{a.name}</span>
                </div>
                <div className="w-1/4 text-text-tertiary">{a.id}</div>
                <div className="w-1/4">
                  <span className={`px-2 py-1 rounded-full border text-[10px] font-medium ${a.statusColor}`}>
                    {a.status}
                  </span>
                </div>
                <div className="w-24 flex justify-end gap-2">
                  <button className="text-green-500 hover:text-green-400 p-1" title="Presente">✓</button>
                  <button className="text-red-500 hover:text-red-400 p-1" title="Ausente">✗</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar Stats */}
      <div className="w-full md:w-72 flex flex-col gap-6">
        <div className="bg-bg-surface rounded-xl p-6 shadow-lg border border-subtle">
          <h3 className="text-text-primary font-bold mb-4">Resumen de la clase</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-sm border-b border-subtle pb-2">
              <span className="text-text-secondary">Total inscriptos</span>
              <span className="text-text-primary font-bold">20</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-subtle pb-2">
              <span className="text-text-secondary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Presentes</span>
              <span className="text-text-primary font-bold">15</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-subtle pb-2">
              <span className="text-text-secondary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Ausentes</span>
              <span className="text-text-primary font-bold">3</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Justificados</span>
              <span className="text-text-primary font-bold">2</span>
            </div>
          </div>
          <button className="w-full bg-bg-raised border border-subtle hover:bg-gray-700 text-text-primary py-2 rounded-lg mt-6 text-sm transition-colors">
            Cerrar asistencia
          </button>
        </div>
      </div>
    </div>
  );
}
