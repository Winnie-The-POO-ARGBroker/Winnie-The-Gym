import Card from '../ui/Card';
import { Activity } from 'lucide-react';

export default function OccupancyCard({ aforo, maxAforo }) {
  const aforoPercentage = (aforo / maxAforo) * 100;
  const isHighCapacity = aforoPercentage > 85;

  return (
    <Card className="col-span-2 relative overflow-hidden flex flex-col justify-center min-h-[300px]">
      <div className="absolute top-6 left-6 flex items-center gap-2 text-text-secondary">
        <Activity className="w-5 h-5" />
        <span className="font-semibold uppercase tracking-wider text-sm">Ocupación Actual</span>
      </div>

      <div className="text-center z-10">
        <div className="flex items-baseline justify-center gap-2">
          <span className={`text-8xl font-black tracking-tighter ${isHighCapacity ? 'text-primary' : 'text-text-primary'}`}>
            {aforo}
          </span>
          <span className="text-3xl text-text-tertiary font-bold">/ {maxAforo}</span>
        </div>
        <p className="text-text-secondary mt-4 text-lg">
          {aforoPercentage.toFixed(1)}% de capacidad
        </p>
      </div>

      {/* Progress bar background */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-bg-raised">
        <div
          className={`h-full transition-all duration-1000 ${isHighCapacity ? 'bg-primary' : 'bg-success-500'}`}
          style={{ width: `${aforoPercentage}%` }}
        />
      </div>
    </Card>
  );
}
