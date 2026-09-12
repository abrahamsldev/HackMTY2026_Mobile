# HackMTY 2026 · Mobile

Aplicación de banca personal con Expo SDK 57, React Native y A2UI. La experiencia financiera vive en una única pantalla: las respuestas del agente deben reemplazar su interfaz generativa según las peticiones del usuario. No hay tabs por funcionalidad.

El drawer contiene **Configuración**, **Cerrar sesión** y, temporalmente, **Componentes** para revisar la biblioteca visual. Configuración permite editar nombre y correo; la flecha del encabezado regresa a Inicio sin abandonar la superficie principal. El catálogo recupera las variantes anteriores y agrega una vista local de los cuatro componentes A2UI del agente, sin peticiones de red.

## Ejecutar

```bash
npm install
cp .env.example .env.local # Solo si todavía no existe tu configuración local.
npx expo start
```

Usa Node 22.13+ o 24.3+ compatible con las dependencias instaladas. Después de agregar dependencias nativas, recompila tu development build si no usas Expo Go.

## Sesión de Supabase

Configura en `.env.local`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

También se admite `EXPO_PUBLIC_SUPABASE_ANON_KEY` para proyectos con la clave pública anterior. Reinicia Metro después de cambiar estas variables. Las variables públicas se incluyen en el cliente: nunca uses `SUPABASE_SERVICE_ROLE_KEY`.

- `src/lib/supabase.ts` crea un cliente único con persistencia y renovación automática. Usa AsyncStorage en iOS/Android y el almacenamiento del navegador en web.
- `SessionProvider` restaura la sesión, escucha sus cambios y activa la renovación nativa solo mientras la app está en primer plano. `useSession()` expone sesión, perfil, carga, errores, actualización y cierre.
- El acceso a Inicio y Configuración está abierto, incluso sin sesión o sin variables de Supabase. No se crea una sesión anónima ni se agrega una pantalla de login.
- Con sesión, Configuración usa `auth.updateUser` para guardar `user_metadata.full_name` y correo. Si el correo necesita confirmación, se informa al usuario; la dirección anterior sigue vigente hasta confirmarse.
- Sin sesión, los datos se guardan en un perfil local de prueba separado. No se suben ni se fusionan automáticamente al iniciar sesión.
- Cerrar sesión usa `scope: 'local'`, elimina el perfil de prueba y reinicia las pantallas para descartar datos y borradores anteriores. Otros dispositivos conservan su sesión.

Para agregar autenticación obligatoria más adelante, conecta el flujo de login al mismo cliente y protege las rutas cuando termine `isLoading`. El backend debe validar la identidad por su cuenta.

## A2UI, agente y MCP

El flujo financiero es **app → agente → MCP → Supabase → agente → app**. El móvil solo habla con el agente. No importa archivos de los otros repositorios ni usa claves de MCP. Supabase Auth mantiene una conexión separada para sesión y perfil.

Inicio permite escribir consultas, elegir uno de los perfiles de demostración (`ana`, `luis`, `sofia`) y mostrar la respuesta en la misma pantalla. Ya no usa el dashboard estático de ejemplo.

### Agente desplegado

`.env.local` y `.env.example` apuntan al origen del agente, sin añadir la ruta del chat:

```dotenv
EXPO_PUBLIC_AGENT_URL=https://hackmty2026-agent-855447527444.us-west1.run.app
```

Reinicia Metro y recarga completamente la app, o recompila el bundle, al cambiar esta variable. No hay fallback a localhost; vaciarla deshabilita las consultas.

El cliente realiza `POST /api/v1/agent/chat` con:

```json
{ "query": "Revisar mis suscripciones", "user_id": "c1a3797d-b335-5a9d-98a1-402311f82c7a" }
```

La app resuelve el correo del perfil seleccionado contra sus tres usuarios demo configurados y envía el UUID sembrado como `user_id`, separado de `query`. Un correo desconocido no habilita el asistente. Al cambiar de usuario, React remonta el espacio del asistente, cancela solicitudes, crea un procesador A2UI nuevo y elimina la superficie anterior antes de mostrar otra respuesta.

El OpenAPI desplegado define la respuesta actual como `{ "message": "…", "data": {}, "a2ui": null }`. La app muestra `message` como texto accesible en la pantalla principal. Valida `data` pero no muestra ni conserva ese contexto interno. El servidor actualmente declara que `a2ui` permanece nulo hasta disponer de las herramientas A2UI del MCP.

El frontend consume exclusivamente mensajes oficiales A2UI `v0.9.1`; rechaza `a2ui/v1`, versiones distintas, catálogos no permitidos y propiedades desconocidas. La respuesta HTTP sigue siendo un contrato de transporte de la aplicación —no un envelope A2UI— y puede usar `resource_uri` (implementación actual del agente) o `resourceUri` (especificación pendiente del agente):

```json
{
  "message": "Encontré una tabla permitida.",
  "data": {},
  "a2ui": {
    "resource_uri": "a2ui://database/overview",
    "messages": [
      { "version": "v0.9.1", "createSurface": {} },
      { "version": "v0.9.1", "updateComponents": {} },
      { "version": "v0.9.1", "updateDataModel": {} }
    ]
  }
}
```

Los cuerpos abreviados del ejemplo representan los envelopes completos. El agente debe resolver `_meta.ui.resourceUri`, leer la plantilla estática del MCP y devolver en `messages` la secuencia ordenada `createSurface` → `updateComponents` → `updateDataModel`. Expo no resuelve ni descarga `a2ui://...`, no habla directamente con MCP y no usa la URI como URL ejecutable.

La capa aislada `src/features/a2ui` valida los mensajes con Zod, mantiene estado inmutable por superficie, aplica actualizaciones incrementales y JSON Pointer RFC 6901, resuelve bindings y renderiza `root`. Permite exactamente el Basic Catalog oficial y `https://fluidbank.app/a2ui/catalogs/finance/v1`:

| A2UI | Adaptador React Native existente |
| --- | --- |
| `Text` | `TextBlock` |
| `Button` | `ActionButton` |
| `Card` | `Card` |
| `Column` | `Stack` vertical |
| `Chart` (solo Finance v1) | adaptador explícito a `AreaChart` o `HeatmapChart` |

Componentes Basic no implementados, `Chart` bajo Basic, catálogos desconocidos y propiedades adicionales fallan de forma acotada. El componente de red `Chart` usa `{kind: "area" | "heatmap", accessibleSummary?, props}` y vuelve a validar el valor resuelto antes de delegar. Acepta hasta 240 puntos y cuatro series de área o 500 celdas de heatmap; exige identificadores de serie estables, números finitos y fechas reales, y permite arreglos vacíos para reutilizar los estados vacíos existentes. No acepta callbacks, estilos, formateadores, elementos React, nombres de componente ni valores ejecutables. La galería incluye previews locales de ambos mensajes Finance completos.

El MCP publica la plantilla separada `data_chart.json` en `a2ui://finance/data-chart`. `visualize_allowed_data` consulta solo columnas reflejadas y permitidas, omite y cuenta filas con nulos requeridos, y devuelve texto, datos de dominio y un único `updateDataModel`. El agente obtiene y cachea la plantilla, la valida con su copia sincronizada del catálogo y entrega la secuencia completa; Expo nunca descarga recursos MCP.

`MCP_SERVER_URL`, `MCP_AUTH_MODE` y las credenciales de MCP son configuración exclusiva del agente. La app únicamente se conecta al agente y no envía tokens de Supabase ni credenciales de MCP en este transporte. Los perfiles `ana`, `luis` y `sofia` siguen siendo perfiles de demostración; su UUID se usa para filtrado de aplicación del MVP, no como una frontera de autorización de producción.

Comprobaciones del despliegue: `/health` y `/openapi.json` respondieron HTTP 200. El preflight `OPTIONS /api/v1/agent/chat` para `Origin: http://localhost:8081` respondió HTTP 405, por lo que el backend necesita habilitar CORS para usar Expo Web. Esta restricción del navegador no aplica a peticiones nativas iOS/Android. La copia local `hackmty2026-agent` incluye la corrección de CORS y pruebas de preflight; todavía requiere desplegarse. Una consulta real autorizada con Ana respondió HTTP 200 y fue aceptada por el parser móvil, pero devolvió el mensaje de fallback de Gemini y `a2ui: null`; por tanto, esta prueba confirma conectividad y compatibilidad, no el funcionamiento completo de Gemini/MCP.

### Respuestas y acciones

- Cada respuesta válida actualiza el texto y procesa sus mensajes en orden. Una respuesta solo textual o con A2UI inválido conserva las últimas superficies válidas. Si falla la red o el contrato HTTP, conserva la última respuesta y ofrece reintentar. Las consultas tienen un límite de 60 segundos y pueden cancelarse.
- Cambiar de persona o cerrar sesión descarta la respuesta y cancela peticiones pendientes. Una respuesta anterior no puede reemplazar la de una consulta más reciente.
- Los botones producen la acción oficial con `name`, `surfaceId`, `sourceComponentId`, `timestamp` y el `context` declarado resuelto contra el modelo de datos. El adaptador conserva temporalmente la acción serializada dentro de `query` y envía `user_id` como campo separado; el renderer no conoce esta compatibilidad. Las acciones siguen siendo consultas o simulaciones de solo lectura.
- La biblioteca `src/generative-ui` continúa disponible; su árbol `GenerativeNode` es un registro local, no un contrato que el agente desplegado emita actualmente.

El agente local ya puede resolver y combinar superficies Basic y Finance cuando una llamada MCP devuelve `_meta.ui`. Para usar el gráfico con preguntas bancarias reales todavía se debe desplegar esta versión de los tres repositorios, configurar el allowlist de tablas/vistas y enseñar al flujo de selección de herramientas del agente cuándo y con qué columnas invocar `visualize_allowed_data`.

## Banco de preguntas

Inicio incluye un banco desplegable con **13 áreas y 25 preguntas**: resumen financiero, movimientos, análisis de gastos, flujo de efectivo, presupuestos, pagos recurrentes, tarjeta de crédito, deudas, transferencias, seguridad de tarjeta, metas de ahorro, información bancaria y educación financiera.

La fuente reutilizable es `src/features/assistant/question-bank.json`. Cada área conserva un identificador, las preguntas naturales, la vista esperada (`expectedDisplay`) y las acciones posibles (`possibleActions`). Estos últimos campos describen requisitos del producto, no capacidades implementadas del backend.

El banco permite buscar por tema o pregunta sin distinguir mayúsculas ni acentos. Al abrir un área se muestran sus ejemplos y su referencia funcional. Elegir un ejemplo llena el campo de consulta y permite editarlo; no lo envía automáticamente ni ejecuta una operación. El banco se puede consultar sin configurar el agente; el envío sigue requiriendo su URL desplegada.

## Verificar

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo export --platform all
```

Prueba manual: abrir/cerrar el drawer, entrar a Configuración y volver; guardar datos de invitado y recargar; cerrar sesión y comprobar que el formulario se limpia. Con una cuenta de prueba autenticada, comprobar restauración al reiniciar, edición de nombre/correo y cierre de sesión. No se necesita una cuenta para navegar.

Las pruebas de integración del cliente usan respuestas y transporte simulados, sin conexión al agente ni a un servidor local. Cubren los cuatro envelopes oficiales, procesamiento incremental, bindings, acciones, límites de render, JSON Pointer, superficies independientes, solicitudes HTTP, cancelación, timeout y errores.
