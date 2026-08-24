import { NavLink, useLocation } from 'react-router-dom';
import { BarChart2, Users, IdCard, Calendar, Dumbbell, LineChart, Settings, User, AudioLines } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart2 },
    { name: 'Socios', path: '/recepcion/socios', icon: Users },
    { name: 'Membresías', path: '/membresias', icon: IdCard },
    { name: 'Clases', path: '/clases', icon: Calendar },
    { name: 'Rutinas', path: '/rutinas', icon: Dumbbell },
    { name: 'Reportes', path: '/recepcion/reportes', icon: LineChart },
    { name: 'Configuración', path: '/configuracion', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col h-full">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ff5a36] rounded-md flex items-center justify-center">
            <AudioLines className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Winnie<span className="text-[#ff5a36]">.</span></span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive && item.path !== '#'
                  ? 'bg-[#ff5a36] text-white font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center">
            <User className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">Usuario</p>
            <p className="text-xs text-gray-500">Recepcionista</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
