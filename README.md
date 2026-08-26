<img src="./assets/header.png" width='100%'>

<h2 align='center'>🏋️ Winnie the Gym 💪</h2>
<br>
El proyecto <b>Winnie The Gym</b> nace como respuesta a una problemática concreta en la gestión de gimnasios: <b>la dependencia de sistemas desconectados y registros manuales que generan vulnerabilidades operativas, cuellos de botella en recepción y falta de trazabilidad.</b> A través de una aplicación web integral, el sistema centraliza la administración de socios, membresías, clases y accesos, automatizando el control de ingresos mediante <b>códigos QR dinámicos</b> y monitoreando el aforo en <b>tiempo real con WebSockets</b>.

<br>

Este proyecto permite aplicar los conocimientos adquiridos en el módulo FullStack II, integrando desarrollo frontend y backend bajo metodología Scrum con sprints de 3 semanas, y promoviendo soluciones tecnológicas con impacto real en la gestión deportiva.

<br>

<h2 align='center'>🏫 Contexto académico</h2>

<br>

| Campo | Detalle |
|:---|:---|
| **Institución** | Instituto Superior Politécnico Córdoba (ISPC) |
| **Carrera** | Tecnicatura Superior en Desarrollo de Software |
| **Módulo** | FullStack II |
| **Año** | 2026 |
| **Metodología** | Scrum — sprints de 3 semanas |

<br>

<h2 align='center'>🎯 Objetivo general</h2>

<br>

Desarrollar una aplicación web integral para la gestión de gimnasios que automatice el control de accesos mediante QR dinámico, administre socios, membresías y clases, y provea monitoreo de aforo en tiempo real — todo bajo un sistema multi-rol con autenticación local y Google OAuth.

<br>

<h2 align='center'>🎯 Objetivos específicos</h2>

- Desarrollar el módulo ABM de socios y planes de membresía con el 100% de las operaciones CRUD antes del Sprint 3.
- Implementar el acceso por código QR dinámico logrando validar ingresos en menos de 2 segundos.
- Desarrollar el módulo de reservas permitiendo que los socios gestionen el 100% de sus reservas de forma autónoma antes del Sprint 4.
- Implementar un dashboard de aforo con actualización automática en tiempo real mediante WebSockets.
- Completar y desplegar el MVP funcional con Docker Compose antes de la fase de cierre del proyecto.

<br>

<h2 align='center'>🗺️ Funcionalidades del MVP</h2>

<br>

| Módulo | Descripción |
|:---|:---|
| **Gestión de socios** | ABM completo: alta, baja, modificación y consulta de socios con datos personales y certificados médicos |
| **Membresías y pagos** | Planes configurables, suscripciones, seguimiento de vencimientos y procesamiento de pagos |
| **Clases grupales** | Creación de clases con horarios, control de cupos y sistema de reservas autónomo para socios |
| **Acceso por QR** | Generación de códigos QR dinámicos por socio; validación en menos de 2 segundos en recepción |
| **Aforo en tiempo real** | Dashboard con WebSockets que actualiza la ocupación del gimnasio automáticamente |
| **Logs de auditoría** | Historial de ingresos y eventos almacenado en MongoDB para trazabilidad completa |
| **Reportes** | Exportación de datos en formato PDF y CSV para administración |
| **Autenticación multi-rol** | Roles diferenciados: Administrador, Recepcionista y Socio, con JWT y OAuth Google |

<br>

<h2 align='center'>💻 Tecnologías Aplicadas</h2>

[![React](https://img.shields.io/badge/React-%2361DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)&nbsp;&nbsp;&nbsp;
[![JavaScript](https://img.shields.io/badge/JavaScript-%23F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)&nbsp;&nbsp;&nbsp;
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-%2306B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)&nbsp;&nbsp;&nbsp;
[![Python](https://img.shields.io/badge/Python-%233776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)&nbsp;&nbsp;&nbsp;
[![Django](https://img.shields.io/badge/Django-%23092620?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)&nbsp;&nbsp;&nbsp;
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%234169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)&nbsp;&nbsp;&nbsp;
[![MongoDB](https://img.shields.io/badge/MongoDB-%2347A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)&nbsp;&nbsp;&nbsp;
[![Redis](https://img.shields.io/badge/Redis-%23DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)&nbsp;&nbsp;&nbsp;
[![Docker](https://img.shields.io/badge/Docker-%232496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<h2 align='center'>📦 Stack de Librerías</h2>

| Lado | Librería | Por qué |
|:---:|:---:|:---|
| Frontend | TanStack Query | Manejo de estado del servidor — caché, loading states y refetching automático |
| Frontend | Zustand | Estado del cliente (auth, UI) — API mínima, cero boilerplate |
| Frontend | React Router v6 | Routing declarativo con soporte para layouts anidados |
| Frontend | React Hook Form | Formularios con mínimos re-renders, validación integrada |
| Frontend | Zod | Schema validation TypeScript-first, reutilizable en forms y respuestas de API |
| Frontend | clsx + tailwind-merge | Clases de Tailwind condicionales sin conflictos |
| Frontend | Axios | Cliente HTTP con interceptores para auth JWT |
| Backend | Django REST Framework | API REST robusta y configurable sobre Django |
| Backend | SimpleJWT | Autenticación stateless con tokens JWT |
| Backend | django-allauth | OAuth social (Google y otros providers) |
| Backend | dj-rest-auth | Endpoints de auth listos para DRF con soporte social |
| Backend | django-cors-headers | Permite requests cross-origin desde el frontend React |
| Backend | psycopg2-binary | Adaptador PostgreSQL para Django |
| Backend | python-decouple | Variables de entorno tipadas y con defaults |
| Backend | Django Channels | WebSockets para el dashboard de aforo en tiempo real y notificaciones |
| Backend | channels-redis | Channel layer de Redis requerido por Django Channels para mensajería entre procesos |
| Backend | pymongo | Conector nativo de MongoDB para almacenamiento de logs de auditoría e historial de accesos QR |

<h2 align='center'>👤 Desarrolladores</h2>

|Participantes|Rol|Perfil|
|:---:|:---:|:---:|
|**Rodrigo Valdez**|![Rol](https://img.shields.io/badge/Dev%20Backend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/Dev%20Frontend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/UX%2FUI-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E)| [![GitHub](https://img.shields.io/badge/GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MrForii)|
|**Magali Bechis**|![Rol](https://img.shields.io/badge/Scrum%20Master-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/Dev%20Frontend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/QA%20Tester-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E)| [![GitHub](https://img.shields.io/badge/GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MagaBechis)|
|**Gianna Giavarini**|![Rol](https://img.shields.io/badge/Dev%20Backend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/Dev%20Frontend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/Datos-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E)| [![GitHub](https://img.shields.io/badge/GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/giannagiava)|
|**Franco Arce**|![Rol](https://img.shields.io/badge/Dev%20Backend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/Datos-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E)| [![GitHub](https://img.shields.io/badge/GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Franco-Arce)|
|**Gisele Lavisse**|![Rol](https://img.shields.io/badge/Dev%20Frontend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/QA%20Tester-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E)| [![GitHub](https://img.shields.io/badge/GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/gigilvsarg)|
|**Jimena Gallegillo**|![Rol](https://img.shields.io/badge/Dev%20Frontend-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E) <br> ![Rol](https://img.shields.io/badge/QA%20Tester-red?style=for-the-badge&logo=code&logoColor=white&color=735D3E)| [![GitHub](https://img.shields.io/badge/GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Jimenna)|


<br>

<h2 align='center'>🗂️ Estructura del Proyecto</h2>

<h3>Frontend <code>frontend/</code></h3>

```
frontend/
├── public/                  # Assets estáticos servidos directamente
├── index.html
└── src/
    ├── components/          # Componentes reutilizables sin lógica de negocio
    │   ├── ui/              # Atómicos: Button, Input, Modal, Badge, Card
    │   └── shared/          # Compuestos: MemberCard, ClassCard, QRDisplay
    ├── pages/               # Un componente por ruta de la aplicación
    │   ├── auth/            # Login, callback de Google OAuth
    │   ├── admin/           # Dashboard, gestión de socios, clases, reportes
    │   ├── receptionist/    # Terminal de validación de acceso por QR
    │   └── member/          # Portal del socio: credencial, QR, reservas
    ├── layouts/             # Wrappers de ruta por rol (AdminLayout, MemberLayout)
    ├── hooks/               # Custom hooks: useAuth, useWebSocket, useQR
    ├── stores/              # Zustand: authStore (sesión y rol), uiStore (UI global)
    ├── services/            # Llamadas a la API por dominio: members.js, classes.js
    └── lib/                 # Utilidades: cn() para Tailwind, formatters, validators
```

> **Regla:** `components/` nunca importa de `stores/` ni `services/`. La lógica va en `hooks/` y el estado global en `stores/`. Las `pages/` orquestan todo.

<h3>Backend <code>backend/</code></h3>

```
backend/
├── core/                    # Configuración del proyecto Django
│   ├── settings/
│   │   ├── base.py          # Configuración compartida (apps, middleware, DRF, auth)
│   │   ├── development.py   # DEBUG=True, CORS para localhost:5173
│   │   └── production.py    # Variables de entorno, ALLOWED_HOSTS, STATIC_ROOT
│   ├── urls.py              # URLs raíz del proyecto
│   ├── asgi.py              # Requerido para Django Channels (WebSockets)
│   └── wsgi.py
├── apps/                    # Una app Django por dominio de negocio
│   ├── users/               # Autenticación JWT, OAuth Google, roles (Admin/Recep/Socio)
│   ├── members/             # Perfil de socios, certificados médicos
│   ├── memberships/         # Planes, suscripciones, procesamiento de pagos
│   ├── classes/             # Clases grupales, horarios, control de cupos y reservas
│   ├── access/              # Motor QR: generación de tokens, validación, logs de ingreso
│   └── reports/             # Motor de exportación PDF/CSV
├── requirements/
│   ├── base.txt             # Dependencias de producción
│   ├── development.txt      # Herramientas de desarrollo (django-extensions)
│   └── production.txt       # Servidor WSGI (gunicorn)
├── manage.py
└── .env.example             # Variables de entorno requeridas (copiar a .env)
```

> **Regla:** cada app en `apps/` es autónoma. No importes modelos de otra app directamente — usá las relaciones de FK de Django o eventos/signals. La comunicación entre apps va por la capa de servicio, no por imports directos.

<br>

<br>

<h2 align='center'>🚀 Cómo levantar el proyecto</h2>

### Requisitos previos

#### Con Docker (recomendado — instalación mínima)

| Herramienta | Versión | Para qué se usa |
|:---|:---:|:---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x+ | Corre todos los servicios en contenedores (incluye Docker Compose) |
| [Git](https://git-scm.com/) | cualquiera | Clonar y versionar el repositorio |

> Con Docker no necesitás instalar Node, Python ni PostgreSQL localmente. Todo corre dentro de los contenedores.

#### Sin Docker (desarrollo local)

| Herramienta | Versión | Para qué se usa |
|:---|:---:|:---|
| [Git](https://git-scm.com/) | cualquiera | Clonar y versionar el repositorio |
| [Node.js](https://nodejs.org/) | 20 LTS+ | Ejecutar el frontend React + Vite |
| [npm](https://www.npmjs.com/) | 10+ | Gestionar dependencias del frontend (viene con Node) |
| [Python](https://www.python.org/) | 3.12+ | Ejecutar el backend Django |
| [pip](https://pip.pypa.io/) | cualquiera | Instalar dependencias Python (viene con Python) |
| [PostgreSQL](https://www.postgresql.org/) | 16+ | Base de datos relacional principal |

### Con Docker (recomendado)

**1. Clonar el repositorio**
```bash
git clone https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym.git
cd Winnie-The-Gym
```

**2. Configurar variables de entorno**
```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores si es necesario
```

**3. Levantar todos los servicios**
```bash
docker compose up
```

El sistema estará disponible en:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000/api
- **Health check:** http://localhost:8000/api/health/
- **Admin Django:** http://localhost:8000/admin

**4. Crear migraciones y superusuario (primera vez)**
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

---

### Sin Docker (desarrollo local)

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements/development.txt
cp .env.example .env            # Configurar con DB local
python manage.py migrate
python manage.py runserver
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

<h2 align='center'>🌿 Estrategia de Branching</h2>

| Rama | Propósito |
|:---:|:---|
| `main` | Código estable listo para producción — protegida, solo merge via PR |
| `develop` | Rama de integración — todas las features se mergean aquí primero |
| `feature/nombre` | Nueva funcionalidad — se crea desde `develop` |
| `fix/nombre` | Corrección de bugs — se crea desde `develop` |
| `hotfix/nombre` | Fix urgente en producción — se crea desde `main` |

**Flujo de trabajo:**
`feature/X` → PR a `develop` → revisión → merge → eventualmente PR de `develop` a `main`

<br>

<h2 align='center'>✅ Definition of Done</h2>

Una Historia de Usuario se considera **Terminada** cuando cumple:

- Código desarrollado y pusheado en la rama correcta según la estrategia de branching.
- 100% de los criterios de aceptación del Product Manager satisfechos.
- Pull Request revisado y aprobado por al menos un desarrollador distinto al autor.
- Maquetación alineada con los prototipos de Figma y la guía de estilos del proyecto.
- QA/Tester validó el flujo sin defectos críticos o bloqueantes.
- Sistema ejecutable localmente con un único comando: `docker compose up`.

<h2 align='center'>📝 Changelog</h2>

| Versión | Fecha | Descripción | Autor |
|:---:|:---:|:---|:---:|
| [v0.4.0](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/CHANGELOG#040--2026-08-21) | 2026-08-21 | Dashboard con vistas por rol, design system, componentes UI | @MagaBechis |
| [v0.3.0](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/CHANGELOG#030--2026-08-13) | 2026-08-13 | Google OAuth, JWT, perfil de usuario, frontend SPA | @MrForii |
| [v0.2.0](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/CHANGELOG#020--2026-08-10) | 2026-08-10 | Motor QR dinámico, anti-replay Redis, logs MongoDB | @Franco-Arce |
| [v0.1.0](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/CHANGELOG#010--2026-08-08) | 2026-08-08 | Scaffold inicial, Docker Compose, estructura base | @MrForii |

> 📋 Historial completo en la [Wiki — CHANGELOG](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/CHANGELOG)

<h2 align='center'>🤝 Contribuir al proyecto</h2>

Antes de abrir un PR o una Issue, revisá los templates y convenciones del equipo:

| Recurso | Descripción |
|:---|:---|
| [📋 Template de PR](.github/pull_request_template.md) | Checklist y estructura para Pull Requests |
| [✨ Template Feature](.github/ISSUE_TEMPLATE/feature.md) | Para proponer nuevas funcionalidades |
| [🐛 Template Bug](.github/ISSUE_TEMPLATE/bug_report.md) | Para reportar comportamientos incorrectos |
| [📌 Template Tarea](.github/ISSUE_TEMPLATE/task.md) | Para tareas técnicas y chores |
| [🌿 Estrategia de Branching](https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki/Estrategia-de-Branching) | Naming de ramas y convenciones de commits |

> Todos los PRs deben apuntar a `develop` y pasar revisión de **@MrForii** antes del merge.

<h2 align='center'>🎯 Nuestra Wiki</h2>

<h3 align='center'>🏋️ <a href="https://github.com/Winnie-The-POO-ARGBroker/Winnie-The-Gym/wiki" align='center'>Link a Wiki</a></h3>
