import AforoCard from '../AforoCard'
import MovementList from '../MovementList'
import AlertList from '../AlertList'
import ClassCapacityList from '../ClassCapacityList'

export default function AdminDashboardView({ navigate, mockMovements, mockAlerts, mockClasses }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="flex flex-col gap-6">
        <AforoCard current={150} max={200} entries={232} exits={76} />
        <MovementList movements={mockMovements} />
      </div>

      <div className="flex flex-col gap-6">
        <AlertList alerts={mockAlerts} />
        <ClassCapacityList classes={mockClasses} />
      </div>
    </div>
  )
}
