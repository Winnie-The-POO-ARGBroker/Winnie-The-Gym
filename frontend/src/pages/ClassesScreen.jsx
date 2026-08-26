import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

export default function ClassesScreen() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="p-8 w-full max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Gestión de Clases</h1>
            <p className="text-sm text-text-secondary">Administrá las clases y asistencias del gimnasio</p>
          </div>
          <button 
            onClick={() => navigate('/clases/crear')}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Nueva clase
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card for a mock class */}
          <div className="bg-bg-surface border border-subtle rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/30">Funcional</span>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">Funcional Intensivo</h3>
              <p className="text-sm text-text-secondary mb-4">Lun 9 Jun • 08:00 - 08:45 • Sala A</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-text-secondary">Inscriptos</span>
                <span className="text-text-primary font-bold">18/20</span>
              </div>
              
              <button 
                onClick={() => navigate('/clases/asistencia')}
                className="w-full py-2 bg-bg-raised border border-subtle text-text-primary rounded-lg hover:bg-subtle transition-colors text-sm font-semibold"
              >
                Ver asistencia
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
