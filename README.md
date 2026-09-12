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

### Activar después del despliegue

En `.env.local`, configura el origen del agente, sin añadir `/api/v1/agent/chat`:

```dotenv
EXPO_PUBLIC_AGENT_URL=https://your-deployed-agent.example.com
```

Reinicia Metro o recompila el bundle al cambiar esta variable. Por ahora queda vacía: **no hay fallback a localhost, no se inicia ningún servidor y no se envían consultas sin configuración**. La app muestra que el asistente estará disponible cuando se configure su conexión.

El cliente realiza `POST /api/v1/agent/chat` con el contrato que ya acepta el agente:

```json
{ "query": "Revisar mis suscripciones", "persona": "luis" }
```

`MCP_SERVER_URL`, `MCP_AUTH_MODE` y `HORIZON_API_KEY` son configuración exclusiva del agente. No deben exponerse como variables `EXPO_PUBLIC_*`. El despliegue del agente debe conectar MCP por su cuenta. Su código de referencia actual usa stdio local para MCP; la conexión al MCP remoto debe resolverse en ese repositorio. Para usar la versión web, el agente también debe permitir su origen mediante CORS.

### Renderizado y acciones

- `src/features/assistant/agent.ts` valida `a2ui/v1`, `meta`, `surface`, IDs únicos, tipos, propiedades y acciones usando Zod. Rechaza versiones, componentes o propiedades no soportadas antes de mostrar la respuesta.
- `A2UISurface` registra `Banner`, `Button`, `InteractiveSlider` y `MetricCard`, que corresponden a las tres plantillas actuales: liquidez, suscripciones y simulación. Aplica tamaño de texto, contraste y controles grandes desde `meta.accessibility` y los tags conocidos.
- Cada respuesta válida reemplaza la superficie anterior, incluso si reutiliza IDs. Si falla la red o el contrato, conserva la última respuesta y ofrece reintentar. Las consultas tienen un límite de 60 segundos y pueden cancelarse.
- Cambiar de persona o cerrar sesión descarta la superficie y cancela peticiones pendientes. Una respuesta anterior no puede reemplazar la de una consulta más reciente.
- Los botones producen un evento `A2UI_DISPATCH`. Como el backend actual no tiene un endpoint de acciones, el cliente lo serializa dentro de `query`, junto con una petición legible, y usa el mismo endpoint de chat. No envía campos adicionales que el backend no procese.
- Al confirmar una simulación, `months` se obtiene del slider y se valida contra su rango y paso. Los demás campos del payload del agente se conservan. Las acciones son consultas y simulaciones: no contratan préstamos ni modifican suscripciones.

El endpoint usa personas de demostración, todavía no una identidad financiera derivada del JWT de Supabase. El agente puede usar su fallback interno cuando MCP o Gemini fallen; su respuesta actual no incluye un indicador de procedencia. Por ello, la app identifica toda esta experiencia como demostración y no afirma que sean datos de una cuenta autenticada.

El clasificador de fallback del agente de referencia fija el plazo en seis meses. El móvil sí envía el plazo seleccionado; para respetarlo también cuando Gemini no esté disponible, el agente deberá interpretarlo en su fallback. El móvil muestra lo que devuelve el servidor.

La biblioteca anterior `src/generative-ui` continúa disponible, pero su árbol `GenerativeNode` no es el contrato de red. La integración nueva usa directamente el formato de `hackmty2026-agent/schemas/a2ui.py`; no ejecuta código ni estilos enviados por el agente.

Configuración basada en la documentación de [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Slider compatible con SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/slider/) y [Supabase Auth para React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).

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

Las pruebas de integración del cliente usan respuestas y transporte simulados, sin conexión al agente ni a un servidor local. Cubren las tres plantillas, solicitudes HTTP, validación, selección de meses, cancelación, timeout y errores. Después del despliegue, comprueba las tres consultas sugeridas y confirma una simulación con un plazo distinto de seis meses.
