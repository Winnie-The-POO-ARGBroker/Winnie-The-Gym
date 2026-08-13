import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto">{children}</main>
    </div>
  )
}
