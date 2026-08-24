import { Routes, Route, Navigate } from 'react-router-dom';
import RecepcionLayout from './layouts/RecepcionLayout';
import AccesoTerminal from './pages/recepcion/AccesoTerminal';
import AforoMonitor from './pages/recepcion/AforoMonitor';
import GestionSocios from './pages/recepcion/GestionSocios';
import Reportes from './pages/recepcion/Reportes';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/recepcion/aforo" replace />} />
      <Route path="/recepcion" element={<RecepcionLayout />}>
        <Route path="acceso" element={<AccesoTerminal />} />
        <Route path="aforo" element={<AforoMonitor />} />
        <Route path="socios" element={<GestionSocios />} />
        <Route path="reportes" element={<Reportes />} />
      </Route>
    </Routes>
  );
}

export default App;
