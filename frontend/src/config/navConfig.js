/**
 * navConfig.js — Single source of truth for navigation routes by role.
 *
 * Used by both Sidebar (desktop) and AppBottomNav (mobile).
 * Each role defines:
 *   - primary: items shown in the bottom bar (max 4 + "Más")
 *   - more:    items shown in the "Más" sheet (remaining routes + account items)
 *   - sidebar: full list for desktop sidebar (with optional dividers)
 */

// Icon keys map to NAV_ICON_MAP from constants/navIcons
export const NAV_CONFIG = {
  administrador: {
    primary: [
      { label: 'Dashboard', path: '/dashboard',        icon: 'chart' },
      { label: 'Planes',    path: '/admin/planes',      icon: 'card' },
      { label: 'Usuarios',  path: '/admin/usuarios',    icon: 'people' },
      { label: 'Reportes',  path: '/admin/reportes',    icon: 'chart-line' },
    ],
    more: [
      { label: 'Config',        path: '/configuracion',       icon: 'gear' },
      { label: 'Aforo',         path: '/recepcion/aforo',     icon: 'activity' },
      { label: 'Cobros',        path: '/recepcion/cobros',    icon: 'card' },
      { label: 'Mi credencial', path: '/socio/credencial',    icon: 'card' },
      { label: 'Reserva clases',path: '/socio/clases',        icon: 'calendar' },
    ],
    sidebar: [
      { label: 'Dashboard',         path: '/dashboard',           icon: 'chart' },
      { divider: true, label: 'Administración' },
      { label: 'Clases',            path: '/admin/clases',        icon: 'calendar' },
      { label: 'Socios',            path: '/admin/socios',        icon: 'people' },
      { label: 'Usuarios',          path: '/admin/usuarios',      icon: 'people' },
      { label: 'Planes',            path: '/admin/planes',        icon: 'card' },
      { label: 'Membresías',        path: '/admin/membresias',    icon: 'card' },
      { label: 'Pagos',             path: '/admin/pagos',         icon: 'card' },
      { label: 'Reportes',          path: '/admin/reportes',      icon: 'chart-line' },
      { divider: true, label: 'Control & Recepción' },
      { label: 'Acceso QR',         path: '/recepcion/acceso',    icon: 'scan' },
      { label: 'Historial accesos', path: '/admin/accesos',       icon: 'activity' },
      { label: 'Aforo en Vivo',     path: '/recepcion/aforo',     icon: 'activity' },
      { label: 'Cobros manuales',   path: '/recepcion/cobros',    icon: 'card' },
      { label: 'Caja diaria',       path: '/recepcion/caja',      icon: 'chart-line' },
      { divider: true, label: 'Portal Socio (Vista)' },
      { label: 'Mi Credencial',     path: '/socio/credencial',    icon: 'card' },
      { label: 'Reserva Clases',    path: '/socio/clases',        icon: 'calendar' },
      { divider: true, label: 'Sistema' },
      { label: 'Configuración',     path: '/configuracion',       icon: 'gear' },
    ],
  },

  recepcionista: {
    primary: [
      { label: 'Dashboard', path: '/dashboard',          icon: 'chart' },
      { label: 'Socios',    path: '/recepcion/socios',   icon: 'people' },
      { label: 'Clases',    path: '/admin/clases',       icon: 'calendar' },
      { label: 'Acceso',    path: '/recepcion/acceso',   icon: 'scan' },
      // "Más" is added automatically by AppBottomNav as the 5th item
    ],
    more: [
      { label: 'Aforo',    path: '/recepcion/aforo',    icon: 'activity' },
      { label: 'Cobros',   path: '/recepcion/cobros',   icon: 'card' },
      { label: 'Reportes', path: '/recepcion/reportes', icon: 'chart-line' },
      { label: 'Planes',   path: '/admin/planes',       icon: 'card' },
    ],
    sidebar: [
      { label: 'Dashboard',          path: '/dashboard',             icon: 'chart' },
      { label: 'Clases',             path: '/admin/clases',          icon: 'calendar' },
      { label: 'Acceso',             path: '/recepcion/acceso',      icon: 'scan' },
      { label: 'Historial accesos',  path: '/recepcion/accesos',     icon: 'activity' },
      { label: 'Aforo',              path: '/recepcion/aforo',       icon: 'activity' },
      { label: 'Socios',             path: '/recepcion/socios',      icon: 'people' },
      { label: 'Cobros',             path: '/recepcion/cobros',      icon: 'card' },
      { label: 'Caja diaria',        path: '/recepcion/caja',        icon: 'chart-line' },
      { label: 'Pagos',              path: '/recepcion/pagos',       icon: 'card' },
      { label: 'Reportes',           path: '/recepcion/reportes',    icon: 'chart-line' },
    ],
  },

  socio: {
    primary: [
      { label: 'Inicio',     path: '/dashboard',        icon: 'chart' },
      { label: 'Credencial', path: '/socio/credencial', icon: 'card' },
      { label: 'Clases',     path: '/socio/clases',     icon: 'calendar' },
      { label: 'Pagar',      path: '/socio/checkout',   icon: 'card', soloSocio: true },
    ],
    more: [
      { label: 'Mis Pagos',    path: '/socio/pagos',      icon: 'card' },
      { label: 'Mi Actividad', path: '/socio/actividad',  icon: 'activity' },
    ],
    sidebar: [
      { label: 'Dashboard',        path: '/dashboard',        icon: 'chart' },
      { label: 'Mi Credencial',    path: '/socio/credencial', icon: 'card' },
      { label: 'Clases',           path: '/socio/clases',     icon: 'calendar' },
      { label: 'Mi Actividad',     path: '/socio/actividad',  icon: 'activity' },
      { label: 'Mis Pagos',        path: '/socio/pagos',      icon: 'card' },
      { label: 'Pagar membresía',  path: '/socio/checkout',   icon: 'card' },
    ],
  },
}
