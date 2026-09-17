import {
  LayoutDashboard,
  Users,
  CreditCard,
  MonitorPlay,
  LineChart,
  Settings,
  ScanLine,
  Activity,
  Home,
  CalendarDays,
} from 'lucide-react'

export const NAV_ICON_MAP = {
  chart:        LayoutDashboard,
  people:       Users,
  card:         CreditCard,   // 'credit' era alias duplicado — unificado en 'card'
  monitor:      MonitorPlay,
  'chart-line': LineChart,
  gear:         Settings,
  scan:         ScanLine,
  activity:     Activity,
  home:         Home,
  calendar:     CalendarDays,
}
