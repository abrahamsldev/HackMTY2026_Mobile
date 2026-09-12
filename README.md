# HackMTY 2026 · Mobile

Aplicación de banca personal con Expo SDK 57, React Native y A2UI. La experiencia financiera vive en una única pantalla: las respuestas del agente deben reemplazar su interfaz generativa según las peticiones del usuario. No hay tabs por funcionalidad.

El drawer contiene únicamente **Configuración** y **Cerrar sesión**. Configuración permite editar nombre y correo; la flecha del encabezado regresa a Inicio sin abandonar la superficie principal.

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

La navegación es solo el contenedor de la experiencia. Las acciones financieras deben volver al agente como eventos y sus respuestas deben actualizar Inicio, sin añadir rutas para cuentas, gastos o simulaciones.

Se revisaron `hackmty2026-agent` y `hackmty2026-mcp` como contexto, sin importar sus archivos ni modificar sus servicios:

- El agente ofrece `POST /api/v1/agent/chat`, con `{ query, persona }`, y devuelve `a2ui/v1` con `meta` y `surface`. Sus componentes son `Banner`, `Button`, `InteractiveSlider` y `MetricCard`.
- El renderer móvil actual usa un árbol `GenerativeNode` y un registro de componentes validado por Zod. Inicio todavía muestra datos sintéticos y captura `UIActionEvent` localmente; **la conexión HTTP y el adaptador al contrato `a2ui/v1` del agente siguen pendientes**. No se debe enviar ese payload directamente al renderer actual ni confundirlo con su árbol local.
- MCP es de solo lectura y proporciona contexto financiero al agente. El móvil no llama a MCP ni escribe en sus tablas. La configuración de cuenta usa exclusivamente Supabase Auth.
- El endpoint actual del agente selecciona personas de demostración; todavía no vincula el JWT de Supabase con el usuario financiero.

La biblioteca y sus reglas de validación están documentadas en [src/components/README.MD](src/components/README.MD).

Configuración basada en la documentación de [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Drawer de Expo Router](https://docs.expo.dev/router/advanced/drawer/) y [Supabase Auth para React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).

## Verificar

```bash
npx tsc --noEmit
npm run lint
npm run test:auth
npx expo export --platform web
```

Prueba manual: abrir/cerrar el drawer, entrar a Configuración y volver; guardar datos de invitado y recargar; cerrar sesión y comprobar que el formulario se limpia. Con una cuenta de prueba autenticada, comprobar restauración al reiniciar, edición de nombre/correo y cierre de sesión. No se necesita una cuenta para navegar.
