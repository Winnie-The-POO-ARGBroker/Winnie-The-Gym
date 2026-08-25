import Card from '../ui/Card';

const DEFAULT_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AsistenciaSemanalCard({ bars, labels = DEFAULT_LABELS }) {
  return (
    <Card className="flex flex-col min-h-[300px] p-6">
      <h3 className="font-semibold text-text-primary mb-6">Asistencia semanal</h3>

      <div className="flex-1 flex items-end gap-2 px-4 pb-6 pt-10">
        {bars.map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3">
            <div
              className="w-full bg-blue-500 rounded-t-sm"
              style={{ height: `${height}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between px-4 text-xs text-text-tertiary font-medium">
        {labels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
    </Card>
  );
}
