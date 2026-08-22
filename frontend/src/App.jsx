import { Routes, Route, Navigate } from 'react-router-dom';
import ReceptionLayout from './layouts/ReceptionLayout';
import Acceso from './pages/recepcion/Acceso';
import Aforo from './pages/recepcion/Aforo';
import Socios from './pages/recepcion/Socios';
import Reportes from './pages/recepcion/Reportes';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/recepcion/socios" replace />} />
      
      <Route path="/recepcion" element={<ReceptionLayout><Navigate to="/recepcion/socios" replace /></ReceptionLayout>} />
      
      {/* Rutas con Layout */}
      <Route path="/recepcion/socios" element={<ReceptionLayout><Socios /></ReceptionLayout>} />
      <Route path="/recepcion/acceso" element={<ReceptionLayout><Acceso /></ReceptionLayout>} />
      <Route path="/recepcion/aforo" element={<ReceptionLayout><Aforo /></ReceptionLayout>} />
      <Route path="/recepcion/reportes" element={<ReceptionLayout><Reportes /></ReceptionLayout>} />
      
      {/* Rutas placeholder para el Sidebar */}
      <Route path="/recepcion/dashboard" element={<ReceptionLayout><div className="text-white">Dashboard</div></ReceptionLayout>} />
      <Route path="/recepcion/membresias" element={<ReceptionLayout><div className="text-white">Membresías</div></ReceptionLayout>} />
      <Route path="/recepcion/clases" element={<ReceptionLayout><div className="text-white">Clases</div></ReceptionLayout>} />
      <Route path="/recepcion/rutinas" element={<ReceptionLayout><div className="text-white">Rutinas</div></ReceptionLayout>} />
      <Route path="/recepcion/configuracion" element={<ReceptionLayout><div className="text-white">Configuración</div></ReceptionLayout>} />
    </Routes>
  );
}

export default App;
