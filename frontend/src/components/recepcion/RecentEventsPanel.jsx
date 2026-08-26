import Card from '../ui/Card';
import { TrendingUp, UserPlus, UserMinus } from 'lucide-react';

export default function RecentEventsPanel({ events }) {
  return (
    <Card className="flex flex-col p-6">
      <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" /> Actividad Reciente
      </h3>
      <div className="flex-1 overflow-y-auto space-y-4">
        {events.map(event => (
          <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-bg-raised border border-subtle">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${event.type === 'in' ? 'bg-success-500/20 text-success-500' : 'bg-error-500/20 text-error-500'}`}>
                {event.type === 'in' ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{event.name}</p>
                <p className="text-xs text-text-secondary">{event.type === 'in' ? 'Entrada' : 'Salida'}</p>
              </div>
            </div>
            <span className="text-xs text-text-tertiary">{event.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
