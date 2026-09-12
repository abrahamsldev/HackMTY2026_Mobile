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
{ "query": "Revisar mis suscripciones", "persona": "luis" }
```

El OpenAPI desplegado define la respuesta actual como `{ "message": "…", "data": {}, "a2ui": null }`. La app muestra `message` como texto accesible en la pantalla principal. Valida `data` pero no muestra ni conserva ese contexto interno. El servidor actualmente declara que `a2ui` permanece nulo hasta disponer de las herramientas A2UI del MCP.

El transporte también acepta las superficies anteriores `a2ui/v1` con sus cuatro componentes registrados. Si una versión futura devuelve un envelope MCP `{ resource_uri, messages }`, la app conserva la respuesta de texto y avisa que el detalle visual no está disponible; no descarga URIs ni ejecuta componentes desconocidos. El renderer de esos mensajes deberá implementarse cuando exista su contrato concreto.

`MCP_SERVER_URL`, `MCP_AUTH_MODE` y las credenciales de MCP son configuración exclusiva del agente. La app únicamente se conecta al agente y no envía tokens de Supabase ni credenciales de MCP en este transporte. Los perfiles `ana`, `luis` y `sofia` siguen siendo perfiles de demostración, independientes de la sesión autenticada del móvil.

Comprobaciones del despliegue: `/health` y `/openapi.json` respondieron HTTP 200. El preflight `OPTIONS /api/v1/agent/chat` para `Origin: http://localhost:8081` respondió HTTP 405, por lo que el backend necesita habilitar CORS para usar Expo Web. Esta restricción del navegador no aplica a peticiones nativas iOS/Android. La copia local `hackmty2026-agent` incluye la corrección de CORS y pruebas de preflight; todavía requiere desplegarse. Una consulta real autorizada con Ana respondió HTTP 200 y fue aceptada por el parser móvil, pero devolvió el mensaje de fallback de Gemini y `a2ui: null`; por tanto, esta prueba confirma conectividad y compatibilidad, no el funcionamiento completo de Gemini/MCP.

### Respuestas y acciones

- Cada respuesta válida reemplaza la anterior. Si falla la red o el contrato, conserva la última respuesta y ofrece reintentar. Las consultas tienen un límite de 60 segundos y pueden cancelarse.
- Cambiar de persona o cerrar sesión descarta la respuesta y cancela peticiones pendientes. Una respuesta anterior no puede reemplazar la de una consulta más reciente.
- Las superficies anteriores se validan con Zod antes de mostrarlas: versión, IDs únicos, componentes, propiedades y acciones. `A2UISurface` mantiene Banner, Button, InteractiveSlider y MetricCard con las preferencias locales de accesibilidad.
- Los botones anteriores producen `A2UI_DISPATCH`. El cliente serializa el evento dentro de `query`, junto con una petición legible, porque el endpoint solo recibe query y persona. Las acciones son consultas y simulaciones.
- La biblioteca `src/generative-ui` continúa disponible; su árbol `GenerativeNode` es un registro local, no un contrato que el agente desplegado emita actualmente.

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

Las pruebas de integración del cliente usan respuestas y transporte simulados, sin conexión al agente ni a un servidor local. Cubren el chat desplegado, envelopes futuros, las tres plantillas anteriores, solicitudes HTTP, validación, selección de meses, cancelación, timeout y errores.
