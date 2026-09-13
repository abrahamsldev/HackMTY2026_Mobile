# Preferencias globales de accesibilidad

Configuración → Accesibilidad permite editar diez variables validadas por Zod. `AccessibilityProvider`, dentro de `SessionProvider`, las expone con `useAccessibility()` a las pantallas, biblioteca local y renderer A2UI.

**El panel de Configuración → Accesibilidad es la única forma de fijar estas preferencias**, y está disponible también desde la pantalla de inicio de sesión (`src/app/sign-in.tsx` monta `AccessibilitySettings` completo antes de que exista una cuenta). El cuestionario de onboarding que se llenaba durante el registro **ya no existe**: `onboarding.ts` y `registration-questions.tsx` fueron eliminados porque quedaron inalcanzables y derivaban un segundo juego de valores a partir de preguntas indirectas. `tests/accessibility-privacy.test.mjs` verifica que no reaparezcan.

| Variable | Opciones | Aplicación |
| --- | --- | --- |
| `textScale` | 1, 1.25, 1.5, 2 | Textos y campos; se combina con la escala del sistema, sin límite impuesto por la app. |
| `lineSpacing` | 1, 1.3, 1.6 | Interlineado relativo, respetando la altura de la fuente. |
| `letterSpacing` | 0, 1, 2 | Separación adicional entre letras. |
| `boldText` | boolean | Negritas; también se respeta el ajuste del sistema en iOS. |
| `appearance` | system, light, dark | Tema de contenido y navegación. |
| `highContrast` | boolean | Texto secundario, estados y bordes reforzados. |
| `colorPalette` | default, blue-orange, monochrome, banorte | Colores semánticos y gráficos. Las series de áreas usan trazos distintos en paletas alternativas. |
| `reduceMotion` | boolean | Evita animaciones decorativas de logo, splash, colapsables y gráfico de áreas. El sistema puede activarlo aunque la preferencia local sea falsa. |
| `largeTargets` | boolean | Mínimos de 64 puntos, frente a los 48 habituales, conservando mínimos mayores del componente. |
| `chartDataTable` | boolean | Listas de valores y controles accesibles para los gráficos. También se muestran con lector de pantalla detectado, ampliación de texto o controles grandes. |

`settings` contiene los valores efectivos y los derivados `minTargetSize` y `showChartData`. Las señales de movimiento y lector de pantalla se observan mediante `AccessibilityInfo`; en iOS también negritas. No se intenta encender o apagar VoiceOver/TalkBack desde la aplicación.

Los elementos SVG y las cuadrículas compactas conservan su geometría de gráfico. La lista de datos ofrece textos ampliados y botones completos equivalentes. El subconjunto A2UI actual no incluye controles de entrada; las animaciones propias de navegación del drawer siguen bajo control de la librería de navegación.

## Persistencia

AsyncStorage usa `accessibility:v1:guest` o `accessibility:v1:user:<id>`. Son preferencias de cada perfil **en este dispositivo**, sin sincronización en Supabase ni envío al agente/MCP. Tampoco llegan a `user_metadata`: el alta de cuenta (`auth-service.ts:registerAccount`) envía exclusivamente `full_name`, y una prueba lo afirma en lugar de suponerlo. El cierre de sesión conserva estas preferencias y cambia al perfil de invitado. La carga valida versión, opciones y valores; ante errores muestra recuperación mediante reintento o restablecimiento. Las escrituras se serializan para evitar que cambios rápidos se guarden fuera de orden.

## Componentes nuevos y A2UI

- Importar `Text`, `TextInput` y `Pressable` de `@/components/accessible-primitives`; `TextInputHandle` es el tipo de la referencia nativa.
- Usar `useTheme()` para colores y bordes. Los controles compactos solo pueden usar `compact` si ofrecen una alternativa accesible de tamaño completo.
- Respetar `settings.reduceMotion` para animaciones nuevas y ofrecer valores textuales en nuevos gráficos.
- No introducir alturas fijas para párrafos o controles con texto. Las etiquetas importantes deben poder ajustarse a varias líneas.
- El renderer A2UI `v0.9.1` usa los componentes visuales existentes, que ya consumen tema y preferencias locales. La accesibilidad del protocolo se limita a sus atributos documentados; no se añadieron los antiguos campos `meta.accessibility` ni etiquetas arbitrarias al contrato de red.

Pruebas: validación y recuperación de preferencias, aislamiento de cuentas, persistencia ordenada y reintentos, precedencia de señales del sistema y contraste de tokens de texto sobre las tres superficies del tema (4.5:1 habitual y 7:1 con alto contraste). Esto no constituye una auditoría completa WCAG ni sustituye pruebas de VoiceOver/TalkBack en dispositivos.

Referencias: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo) y [Text](https://reactnative.dev/docs/text).

La paleta `banorte` usa el rojo indicado `#EF2945` y blanco `#FFFFFF`, con matices rojos para superficies y gráficos. Conserva el tema oscuro cuando está seleccionado. Sobre el rojo exacto, los botones usan texto negro para mantener legibilidad; alto contraste usa rojo profundo `#8C1024` con texto blanco. Las preferencias existentes conservan su paleta y Banorte se elige desde Configuración → Accesibilidad.
