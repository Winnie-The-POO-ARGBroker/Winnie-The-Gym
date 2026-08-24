import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function RecepcionLayout() {
  return (
    <div className="flex h-screen bg-[#111111] text-white font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#141414] p-8">
        <Outlet />
      </main>
    </div>
  );
}
