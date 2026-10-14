---
id: BK-AAA-00            # prefijo de área + número, ej. BK-FIN-01
titulo: Título corto y concreto
tipo: bug | feature | ui-estado | mobile | idea | deuda-tecnica
roles: [administrador, recepcionista, socio]   # quién lo usa
prioridad: P0 | P1 | P2 | P3                    # P0 = rompe algo hoy; P1 = alto valor; P2 = mejora; P3 = idea a validar
tamano: S | M | L | XL                          # S <= 0,5 día; M <= 2 días; L <= 1 semana; XL > 1 semana
estado_en_codigo: no-existe | backend-sin-ui | ui-parcial | roto | solo-idea
verificado_contra: <sha corto> (<fecha>)        # commit contra el que se revisó el código
depende_de: []                                  # otros ids BK-
---

# BK-AAA-00 · Título

## 1. Resumen
2–3 líneas: qué falta y por qué importa.

## 2. Objetivo de usuario
Como **<rol>** quiero **<acción>** para **<resultado>**.

## 3. Estado actual en el código (evidencia)
| Capa | Archivo:línea | Qué hay hoy |
|---|---|---|
| Backend modelo | `backend/...:N` | ... |
| Backend API | `backend/...:N` | ... |
| Frontend ruta/página | `frontend/src/...:N` | ... |
| Frontend componente/hook | `frontend/src/...:N` | ... |

Cada fila debe haberse verificado leyendo el archivo. Si algo no se pudo verificar, escribir **"No verificado"** en vez de suponer.

## 4. Alcance
**Incluye:** lista exacta.
**No incluye:** lista exacta (para evitar scope creep).

## 5. Contrato de API
Para cada endpoint (existente o a crear): método + ruta, permisos/roles (clase de permiso en código), parámetros de query, body de request y response con los **nombres de campo exactos del serializer**, códigos de error y mensajes. Marcar **[EXISTE]** o **[A CREAR]**.

## 6. Modelo de datos
Modelo, campos, tipos, constraints, migración necesaria. Si no aplica: "Sin cambios de modelo".

## 7. Diseño frontend
- **Rutas y guard de rol** (cómo se declaran hoy en `frontend/src/App.jsx` o equivalente).
- **Páginas y componentes a reutilizar** (rutas de archivo reales, con sus props).
- **Componentes/hooks/servicios nuevos** (nombres y ubicación siguiendo las convenciones del repo: cómo se llaman las queries, el cliente HTTP, los stores).
- **Estados de UI**: loading (skeleton), vacío, error (toast/inline), éxito.
- **Textos de UI** en español rioplatense (voseo) tal como se usarían.
- **Responsive/mobile**: comportamiento a 375 px y a 768 px.

## 8. Archivos a crear / modificar
Lista con ruta y propósito de cada cambio.

## 9. Plan de pruebas (TDD)
Primero los tests. Indicar dónde viven y con qué convención (pytest/vitest/RTL), qué fixtures existen, y los casos concretos:
- Backend: casos felices, permisos por rol (403 para roles no autorizados), validaciones, casos borde.
- Frontend: render, estados, interacción, accesibilidad básica.
- Verificación manual en el navegador (pasos con cuenta de prueba por rol).

## 10. Criterios de aceptación
- **Dado** … **cuando** … **entonces** …

## 11. Riesgos y decisiones abiertas
Preguntas concretas para el dueño del producto (con una recomendación por defecto).

## 12. Referencias
Specs (`openspec/`, `speckit/`), PRs, documentos, y — **solo como apoyo visual opcional** — la pantalla equivalente en Figma (archivo `WuBKhksfVVcBjNKbDVX5EM`, página "vistas live", columna Hi-Fi/Mobile y módulo).

## 13. Prompt listo para un agente de IA
Un bloque de texto autocontenido que se pueda pegar tal cual a un agente de código: contexto mínimo, qué construir, archivos clave, tests a escribir primero, y la definición de terminado.
