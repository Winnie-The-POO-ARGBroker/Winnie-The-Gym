---
id: BK-MOB-07
titulo: Formularios y botones táctiles (alto mínimo 44 px, fuente 16 px, inputMode/autoComplete, labels asociadas)
tipo: mobile
roles: [administrador, recepcionista, socio]
prioridad: P1
tamano: M
estado_en_codigo: ui-parcial
verificado_contra: 3bc4755 (2026-10-13)
depende_de: []
---

# BK-MOB-07 · Formularios y botones táctiles

## 1. Resumen
Casi todos los campos de la app usan `text-sm`/`text-xs` (12–14 px): iOS Safari hace zoom automático al enfocar cualquier `input`/`select`/`textarea` con fuente < 16 px y deja la pantalla ampliada. Ningún campo declara `inputMode` (DNI, teléfono, monto y cupos abren el teclado alfabético o el `number` genérico con flechas), los botones `md` miden ~40 px y los `sm` ~28 px, y varias etiquetas no están asociadas a su `input`. Son mejoras de bajo riesgo con alto impacto en el uso real desde el celular.

## 2. Objetivo de usuario
Como **recepcionista/socio** quiero **teclados adecuados, campos que no hagan zoom y botones fáciles de tocar** para **cargar DNI, teléfonos y montos rápido y sin errores desde el celular**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Input compartido | `frontend/src/components/ui/Input.jsx:7,19` | `label` sin `htmlFor`/`id` (no hay `id` ni `useId`); `className` va al contenedor, no al `<input>`; `<input>` sin `text-*` (hereda 16 px) y con `py-2` ≈ 42 px de alto. |
| Select compartido | `components/ui/Select.jsx:5-15` | Sí asocia `htmlFor={id}` pero solo si el consumidor pasa `id`; `py-2.5 px-3` ≈ 46 px. |
| SearchBar | `components/ui/SearchBar.jsx:47` | `text-sm` (14 px) → zoom iOS; sin `type="search"` ni `inputMode`/`enterKeyHint`. |
| Button | `components/ui/Button.jsx:10-14` | `sm: text-xs px-3 py-1.5` (≈ 28 px), `md: text-sm px-4 py-2.5` (≈ 40 px), `lg: text-sm px-6 py-3` (≈ 44 px). |
| Registro | `frontend/src/pages/RegisterPage.jsx:219-244` | `<label>` sin `htmlFor`; `<input {...register('dni')}>` y `telefono` sin `type`/`inputMode`/`autoComplete`; `text-sm`. Regex de DNI `^\d{7,8}$` (`RegisterPage.jsx:18`). |
| Completar perfil | `pages/CompleteProfilePage.jsx:19-24,78-82` | Campos desde `FIELDS` (`dni`, `telefono`), `<input {...register(name)}>` `text-sm`, sin `inputMode`. Regex DNI `^\d{7,8}$` (`:15`). |
| Perfil | `pages/ProfilePage.jsx:283-288` | `telefono` sin `type="tel"`, `text-sm`, borde cambiado con `onFocus`/`onBlur` inline (`e.target.style.borderColor`). |
| Alta en recepción | `components/recepcion/DatosPersonalesCard.jsx:17,18,28` | DNI con placeholder `"Ej. 30.111.222"` (con puntos) y sin `inputMode`; fecha de nacimiento como texto libre `dd/mm/aaaa` (sin `type="date"`); teléfono sí `type="tel"`. |
| Terminal de acceso | `components/recepcion/ScannerPanel.jsx:31-38` | DNI manual `type="text"` + `autoFocus` + `text-xl` aplicado al contenedor (el `className` de `Input` no llega al `<input>`, ver arriba). |
| Cobro manual | `pages/recepcion/CobroManualPage.jsx:309-318` | Monto `type="number" min="0.01" step="0.01"` sin `inputMode="decimal"`. Búsqueda con `role="combobox"` (`:182`) sin `enterKeyHint`. |
| Crear clase | `pages/CreateClassPage.jsx:268-275,349-380` | 4 `type="number"` (duración, cupo, lista de espera, cancelación) `text-sm` sin `inputMode="numeric"`; labels `<label className="block ...">` sin `htmlFor`. |
| Configuración | `pages/admin/AdminConfiguracionPage.jsx:105-111,146-147` | `aforo_maximo` `type="number"` sin `inputMode`; `telefono_contacto` sí `type="tel"`. |
| Gestión de socios | `pages/recepcion/gestionSocios.schema.js:6` | `dni: z.string().trim().min(7).max(12)` (acepta puntos); el modelo permite `CharField(max_length=20, unique=True)` (`backend/apps/members/models.py:19`). |
| Búsqueda socio (socio) | `pages/socio/ClasesPage.jsx:177-183` | `input` `text-xs`, `py-2`, ícono `absolute` fijo. |
| `inputMode` | `rg "inputMode" src` | Sin resultados en todo `frontend/src`. `autoComplete` aparece solo en login/registro/cambio de contraseña (`EmailPasswordForm.jsx:70,83`, `ResetPasswordPage.jsx:98,111`, `ChangePasswordModal.jsx:69,84,99`, `ForgotPasswordPage.jsx:100`, `CobroManualPage.jsx:181`). |
| Botones de ícono | `ui/Pagination.jsx:57,90`, `pages/admin/AdminSociosPage.jsx:234-261`, `TopBar.jsx:10-15` | `p-1.5`/`p-2` con íconos de 16–20 px → 28–36 px. |
| Fuente pequeña | `rg "text-\[(9\|10\|11)px\]" src` | Presente en `MemberLayout.jsx`, `ClassCalendarView.jsx`, `ClassListDetailView.jsx`, `SocioDetailModal.jsx`, `ClasesPage.jsx`, `CobroManualPage.jsx`, etc. `text-xs` aparece 302 veces en `src` (sin tests). |
| Tests | `components/ui/` | Hay tests de `DataTable`, `Modal` (`__tests__`); Existen `ui/__tests__/Button.test.jsx` y `ui/__tests__/SearchBar.test.jsx` (hay que ampliarlos); no existe test de `Input` ni de `Select`. |

## 4. Alcance
**Incluye:** (a) `Input`: `id` automático con `useId`, `label htmlFor`, prop `inputClassName`, `inputMode`/`enterKeyHint` pass-through, `text-base md:text-sm` y `min-h-11`; (b) `Select`/`SearchBar` con `text-base md:text-sm` y `min-h-11`; (c) `Button` con `min-h-11` en móvil; (d) `inputMode` + `autoComplete` + `maxLength` en DNI, teléfono, montos y cupos; (e) reemplazar los `<input>` crudos de Registro, Completar perfil, Perfil y CreateClass por `Input`; (f) botones de ícono de 44 px; (g) barra de acción primaria fija al pie en formularios largos (CreateClass, alta de socio); (h) test que impida regresiones.
**No incluye:** rediseño visual, validaciones de negocio nuevas (formato de DNI en backend), `type="date"` para fecha de nacimiento (decisión abierta), teclado de PIN para el terminal.

## 5. Contrato de API
Sin cambios de API. (Si se normaliza el DNI a solo dígitos en el frontend, el body de `POST` de socios sigue enviando `dni` como string.)

## 6. Modelo de datos
Sin cambios de modelo.

## 7. Diseño frontend
### Atributos por campo (propuesta concreta)
| Campo | Dónde | Atributos |
|---|---|---|
| DNI | `RegisterPage:221`, `CompleteProfilePage:78`, `DatosPersonalesCard:17`, `ScannerPanel:31`, `SocioFormModal` (campo `dni`) | `inputMode="numeric" pattern="[0-9]*" maxLength={8} autoComplete="off"` (en alta de socio por recepción: `maxLength={10}` si se aceptan puntos, o quitar puntos con `onChange={e => onChange('dni', e.target.value.replace(/\D/g, ''))}`). Placeholder sin puntos: `12345678`. |
| Teléfono | `RegisterPage:237`, `CompleteProfilePage` (`telefono`), `ProfilePage:283`, `SocioFormModal` | `type="tel" inputMode="tel" autoComplete="tel" maxLength={30}` (el modelo permite 30: `members/models.py:22`). |
| Monto | `CobroManualPage:309` | mantener `type="number"` y agregar `inputMode="decimal"`; o `type="text" inputMode="decimal"` si se quiere evitar las flechas (decisión §11). |
| Cupos/duración | `CreateClassPage:268,349,362,375`, `AdminConfiguracionPage:105` | `inputMode="numeric"`. |
| Búsquedas | `SearchBar:41`, `TopBar:67`, `ClasesPage:177`, `CobroManualPage:172` | `type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="none"`. |
| Email | `SocioFormModal`, `DatosPersonalesCard:27`, `StaffFormModal` | `type="email" inputMode="email" autoComplete="email" autoCapitalize="none"`. |
### Componentes
- `Input.jsx`: `const id = props.id ?? useId()`; `<label htmlFor={id}>`; `inputClassName` (se concatena al `<input>`) y `className` sigue yendo al contenedor (retrocompatible); clases del `<input>`: `... text-base md:text-sm min-h-11 md:min-h-10` en lugar de `py-2` fijo. Ajustar `ScannerPanel.jsx:36` a `inputClassName="text-center text-xl font-bold tracking-widest"` (hoy el `text-xl` no llega al input).
- `Select.jsx`: `text-base md:text-sm min-h-11`; exigir/generar `id` con `useId`.
- `SearchBar.jsx:47`: `text-base md:text-sm` y `type="search"`.
- `Button.jsx:10-14`: `sm: 'text-xs px-3 py-1.5 min-h-9 md:min-h-0'`, `md: 'text-sm px-4 py-2.5 min-h-11'`, `lg: 'text-sm px-6 py-3 min-h-12'`; para botones de ícono agregar `size="icon"`: `h-11 w-11 p-0`.
- Páginas con `<input>` crudo (`RegisterPage`, `CompleteProfilePage`, `ProfilePage`): migrar a `Input` (+ prop `error` opcional) y quitar `onFocus`/`onBlur` inline de `ProfilePage.jsx:286-287` a favor de `focus:ring` de `Input`.
- Formularios largos: contenedor de acciones `sticky bottom-0 -mx-4 px-4 py-3 bg-bg-surface border-t pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0` en `CreateClassPage` y alta de socio (`GestionSociosPage` pestaña "nuevo", donde hoy los botones están en el `TopBar`).
- Opcional (red de seguridad global): en `index.css` dentro de `@layer base`, `@media (max-width: 767px) { input:not([type=checkbox]):not([type=radio]), select, textarea { font-size: 16px !important } }` — con `!important` (el repo ya lo usa para autofill, `index.css:84-91`); tradeoff: oculta futuros `text-sm` en móvil. Recomendado como segunda línea de defensa, no como reemplazo.
### Estados / textos / responsive
Mensajes de error existentes (`text-xs text-error-500`); asociarlos con `aria-describedby` (BK-MOB-11). Textos nuevos: ninguno obligatorio. 375 px: campos de ≥ 44 px, 16 px; 768 px+: `md:text-sm`, `md:min-h-10` (aspecto actual).

## 8. Archivos a crear / modificar
- Modificar `components/ui/{Input,Select,SearchBar,Button}.jsx`, `components/layout/TopBar.jsx` (campo de búsqueda), `pages/{RegisterPage,CompleteProfilePage,ProfilePage,CreateClassPage}.jsx`, `pages/admin/AdminConfiguracionPage.jsx`, `pages/recepcion/CobroManualPage.jsx`, `components/recepcion/{DatosPersonalesCard,ScannerPanel}.jsx`, `components/admin/{SocioFormModal,StaffFormModal}.jsx`, `pages/socio/ClasesPage.jsx`, `index.css` (opcional).
- Crear `components/ui/__tests__/Input.test.jsx` (y `Select.test.jsx`); ampliar los existentes `Button.test.jsx` y `SearchBar.test.jsx`.

## 9. Plan de pruebas (TDD)
Convención y comandos: ver BK-MOB-01 §9. Primero, en rojo:
1. `Input.test.jsx`: `getByLabelText('Nombre')` encuentra el `<input>` (label asociada por `useId`); `inputClassName` se aplica al `<input>`; `inputMode`/`enterKeyHint` pasan al DOM; clases `text-base` y `min-h-11` presentes.
2. `Button.test.jsx`: `size="md"` incluye `min-h-11`; `size="icon"` incluye `h-11 w-11`.
3. `SearchBar.test.jsx`: `type="search"` y `text-base`.
4. `RegisterPage` (ya existe `pages/__tests__/RegisterPage.test.jsx`): el campo DNI tiene `inputMode="numeric"` y `maxLength=8`; el campo teléfono `type="tel"`; `getByLabelText('DNI')` funciona.
5. `CompleteProfilePage.test.jsx`, `ProfilePage.test.jsx`, `CobroManualPage` (monto `inputMode="decimal"`), `CreateClassPage.test.jsx` (cupos `inputMode="numeric"`), `ScannerPanel` (DNI `inputMode="numeric"`): un caso por página.
6. Test "sin regresión": `rg`-style en Vitest que recorre `src/**/*.jsx` con `fs` y falla si encuentra `<input` sin `inputMode`/`type` conocido (opcional; evaluar costo de mantenimiento).
7. Playwright (ampliar `scripts/mobile-walkthrough.mjs`): en `/registro`, `/completar-perfil`, `/recepcion/acceso`, para cada `input` visible `getComputedStyle(el).fontSize >= 16` y `getBoundingClientRect().height >= 44` a 375 px.
Manual: iPhone real o Safari responsive: enfocar DNI y teléfono (teclado numérico/telefónico, sin zoom), enviar con "Ir/Buscar".

## 10. Criterios de aceptación
- **Dado** 375 px **cuando** enfoco cualquier campo **entonces** la pantalla no hace zoom (fuente ≥ 16 px).
- **Dado** el campo DNI o teléfono **entonces** se abre el teclado numérico/telefónico.
- **Dado** cualquier botón/campo táctil **entonces** mide ≥ 44 px de alto en móvil.
- **Dado** un lector de pantalla **entonces** cada campo tiene su etiqueta asociada.
- **Dado** ≥ 768 px **entonces** la apariencia es la actual.

## 11. Riesgos y decisiones abiertas
1. DNI: hoy hay tres reglas distintas en el frontend (`^\d{7,8}$` en `RegisterPage.jsx:18` y `CompleteProfilePage.jsx:15`; `^\d{7,10}$` en `SocioFormModal.jsx:64`; `min(7).max(12)` sin exigir dígitos en `gestionSocios.schema.js:6`). Recomendación: unificar en un único esquema (7–8 dígitos). ¿Solo dígitos (recomendado: sí, con `replace(/\D/g,'')`) o con puntos? El backend lo guarda como string sin validador visible (`CharField(max_length=20, unique=True)`), por lo que "30.111.222" y "30111222" serían socios distintos; no se corrige aquí (ver BK-SOC-07, validaciones del ABM de socios).
2. Monto: `type="number"` + `inputMode="decimal"` (flechas y rueda del mouse en escritorio) vs `type="text"`. Recomendación: mantener `number` con `inputMode`.
3. Fecha de nacimiento: texto libre `dd/mm/aaaa` vs `type="date"` (selector nativo). Recomendación: `type="date"` en móvil; requiere ajustar parsing en el alta.
4. Cambiar `Button md` a 44 px agranda botones en escritorio si no se acota con `md:min-h-0`: usar variantes responsive como en §7.

## 12. Referencias
Figma (opcional): `WuBKhksfVVcBjNKbDVX5EM`, "vistas live", columna "05 · Mobile", módulos Registro/Socios/Acceso (No verificado los frames exactos). BK-MOB-03, BK-MOB-04, BK-MOB-06, BK-MOB-11.

## 13. Prompt listo para un agente de IA
> Repo Winnie-The-Gym, `frontend/` (React 18, Tailwind 3, react-hook-form + zod, vitest/RTL). Objetivo: formularios táctiles. Leé `src/components/ui/{Input,Select,SearchBar,Button}.jsx`, `src/pages/{RegisterPage,CompleteProfilePage,ProfilePage,CreateClassPage}.jsx`, `src/pages/recepcion/CobroManualPage.jsx`, `src/components/recepcion/{DatosPersonalesCard,ScannerPanel}.jsx`, `src/pages/admin/AdminConfiguracionPage.jsx`. TDD: primero `Input.test.jsx` (label asociada con `useId`, `inputClassName`, `inputMode` pass-through, `text-base`/`min-h-11`), `Button.test.jsx`, `SearchBar.test.jsx` y casos por página que exijan `inputMode="numeric"` en DNI/cupos, `type="tel" inputMode="tel"` en teléfono, `inputMode="decimal"` en monto. Luego: `Input` con `id` automático, `inputClassName`, `text-base md:text-sm min-h-11 md:min-h-10`; `Select`/`SearchBar` igual; `Button` con `min-h-11` en `md` y `size="icon"`; migrá los `<input>` crudos a `Input`; acciones fijas al pie en `CreateClassPage`. Mantené la apariencia ≥768 px. UI en español rioplatense. Terminado: lint, `npx vitest run --coverage` y `npm run build` verdes; a 375 px ningún campo tiene fuente < 16 px ni alto < 44 px.
