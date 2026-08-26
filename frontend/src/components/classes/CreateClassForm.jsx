import React from 'react';

export default function CreateClassForm() {
  return (
    <div className="bg-bg-surface rounded-xl p-6 shadow-lg border border-subtle w-full md:w-[60%]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Crear nueva clase</h2>
          <p className="text-sm text-text-tertiary">Agrega una nueva clase al cronograma</p>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-text-primary px-6 py-2 rounded-lg font-semibold transition-colors">
          Crear clase
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Row 1 */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm text-text-secondary font-medium">Nombre de la clase</label>
            <input 
              type="text" 
              placeholder="Ej. Funcional Intensivo" 
              className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm text-text-secondary font-medium">Instructor</label>
            <select className="bg-bg-raised border border-subtle rounded-lg p-3 text-text-primary focus:outline-none focus:border-orange-500 appearance-none">
              <option>Seleccionar instructor...</option>
              <option>J. Doe</option>
              <option>M. Smith</option>
            </select>
          </div>
        </div>

        {/* Row 2: Days */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-text-secondary font-medium">Días que se dicta</label>
          <div className="flex gap-2">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => (
              <button 
                key={day} 
                className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${i < 3 ? 'bg-orange-500/20 text-orange-500 border border-orange-500/50' : 'bg-bg-raised text-text-secondary border border-subtle hover:border-strong'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Time, Capacity, Room */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-2 w-1/3">
            <label className="text-sm text-text-secondary font-medium">Horario</label>
            <div className="flex items-center gap-2">
              <input type="time" className="bg-bg-raised border border-subtle rounded-lg p-2 text-text-primary flex-1" defaultValue="08:00"/>
              <span className="text-text-tertiary">-</span>
              <input type="time" className="bg-bg-raised border border-subtle rounded-lg p-2 text-text-primary flex-1" defaultValue="09:00"/>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-1/3">
            <label className="text-sm text-text-secondary font-medium">Capacidad (Cupos)</label>
            <input type="number" defaultValue={20} className="bg-bg-raised border border-subtle rounded-lg p-2.5 text-text-primary" />
          </div>
          <div className="flex flex-col gap-2 w-1/3">
            <label className="text-sm text-text-secondary font-medium">Salón</label>
            <select className="bg-bg-raised border border-subtle rounded-lg p-2.5 text-text-primary">
              <option>Salón Principal</option>
              <option>Sala Musculación</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
