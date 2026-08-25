import Sidebar from './Sidebar'
import AppBottomNav from './AppBottomNav'

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto min-w-0 pb-14 md:pb-0">{children}</main>
      <AppBottomNav />
    </div>
  )
}
