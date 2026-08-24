# GvG Helper / AvernoBot Server

**GvG Helper** es un bot de Discord desarrollado en TypeScript y `discord.js` (ejecutado con Bun / Node.js) diseñado para la coordinación de eventos Guild vs Guild (GvG).

Cuenta con soporte para múltiples bots integrados (*Ataque* y *Defensa*), anuncios de audio por síntesis de voz (Text-To-Speech), gestión de temporizadores con offset y un servidor HTTP de API REST para recibir eventos externos de la aplicación cliente en tiempo real.

---

## 🛠️ Requisitos del Sistema

- **[Bun](https://bun.sh/)** o **Node.js (v18+)**: Para instalar dependencias y ejecutar la aplicación.
- **FFmpeg**: Requerido por `@discordjs/voice` para el procesamiento de audio TTS (incluido automáticamente mediante `ffmpeg-static`).
- **Aplicaciones de Discord Bot**: Al menos un Bot de Discord creado en el portal de desarrolladores con los siguientes permisos u OAuth2 scopes:
  - Scope: `bot`, `applications.commands`
  - Permisos de Bot: `Send Messages`, `Connect`, `Speak`, `Use Voice Activity`.

---

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en la siguiente configuración:

```env
DISCORD_TOKEN=tu_discord_bot_token
CLIENT_ID=tu_discord_client_id
GUILD_ID=tu_guild_id_desarrollo

DISCORD_TOKEN_ATAQUE=tu_discord_bot_token_ataque
CLIENT_ID_ATAQUE=tu_discord_client_id_ataque
GUILD_ID_ATAQUE=tu_guild_id_ataque

DISCORD_TOKEN_DEFENSA=tu_discord_bot_token_defensa
CLIENT_ID_DEFENSA=tu_discord_client_id_defensa
GUILD_ID_DEFENSA=tu_guild_id_defensa

ATAQUE_CANAL=Invitados
DEFENSA_CANAL=General

NODE_ENV=development
DEFAULT_LANGUAGE=es
PORT=3000
CLIENT_EVENT_TOKEN=averno_secret_client_token
TTS_SPEED=1.0
```

### Tabla de Variables de Entorno

| Variable | Descripción | Valor por Defecto | Requerido |
| :--- | :--- | :--- | :---: |
| `DISCORD_TOKEN` | Token principal del bot de Discord (fallback para Ataque). | `dummy-token` | Sí |
| `CLIENT_ID` | Client ID principal de la aplicación Discord. | `dummy-client-id` | Sí |
| `GUILD_ID` | ID del servidor de Discord de desarrollo predeterminado. | `dummy-guild-id` | Sí |
| `DISCORD_TOKEN_ATAQUE` | Token del bot de Ataque. Fallback a `DISCORD_TOKEN`. | `dummy-token-ataque` | No |
| `CLIENT_ID_ATAQUE` | Client ID del bot de Ataque. Fallback a `CLIENT_ID`. | `dummy-client-id-ataque` | No |
| `GUILD_ID_ATAQUE` | ID del servidor de Discord para el bot de Ataque. | `dummy-guild-id-ataque` | No |
| `DISCORD_TOKEN_DEFENSA` | Token del bot de Defensa. | `dummy-token-defensa` | No |
| `CLIENT_ID_DEFENSA` | Client ID del bot de Defensa. | `dummy-client-id-defensa` | No |
| `GUILD_ID_DEFENSA` | ID del servidor de Discord para el bot de Defensa. | `dummy-guild-id-defensa` | No |
| `ATAQUE_CANAL` | Nombre objetivo del canal de voz para el bot de Ataque. | `Invitados` | No |
| `DEFENSA_CANAL` | Nombre objetivo del canal de voz para el bot de Defensa. | `General` | No |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`). | `development` | No |
| `DEFAULT_LANGUAGE` | Código de idioma ISO 639-1 predeterminado para TTS. | `es` | No |
| `PORT` | Puerto de escucha para el servidor HTTP API REST. | `3000` | No |
| `CLIENT_EVENT_TOKEN` | Token secreto de autenticación para llamadas API POST del cliente. | `averno_secret_client_token` | No |
| `TTS_SPEED` | Multiplicador de velocidad de reproducción del TTS (ej. 1.0, 1.2). | `1.0` | No |

---

## 🚀 Instalación y Ejecución

### 1. Instalación de dependencias

```sh
bun install
```

### 2. Despliegue de Comandos Slash en Discord

Para desplegar los comandos slash (`/gvg`) en el servidor configurado:

```sh
bun run deploy
```

### 3. Iniciar en Desarrollo

Despliega comandos e inicia el servidor:

```sh
bun run dev
```

Modo lectura en tiempo real con auto-reload:

```sh
bun run dev:watch
```

---

## 🧪 Pruebas y Verificación del Código

| Comando | Descripción |
| :--- | :--- |
| `bun run test` / `npx tsx --test src/**/*.test.ts` | Ejecuta toda la suite de pruebas unitarias. |
| `bun run build` / `npx tsc` | Verificación estática de tipos TypeScript. |
| `bun run lint` | Análisis de código estático con Biome. |
| `bun run format` | Formateo automático de código con Biome. |
| `bun run check` | Aplica correcciones automáticas de linting y formateo. |

---

## 🎮 Comandos Slash de Discord (`/gvg`)

Los comandos están diseñados para ejecutarse desde canales de texto o voz del servidor:

- **`/gvg start`**: Inicia el temporizador de la GvG en `t = 30m`, conectando inmediatamente los bots de *Ataque* y *Defensa* a sus respectivos canales de voz.
- **`/gvg stop`**: Cancela el temporizador activo, detiene la reproducción y desconecta los bots de los canales de voz.
- **`/gvg offset [tiempo]`**: Ajusta un desplazamiento de tiempo inicial o sobre la marcha para el temporizador (ej. `35m`, `+5m`, `-2m`, `300s`).
- **`/gvg ping`**: Responde con `Pong!` para comprobar la operatividad del bot.

---

## 🌐 API HTTP REST (`/api/action`)

El servidor levanta un endpoint HTTP para comunicarse con la aplicación cliente.

### 1. Verificación de Estado (GET `/api/action`)

- **Método**: `GET`
- **Respuesta (200 OK)**:
```json
{
  "success": true,
  "status": "online",
  "message": "AvernoBot API active",
  "timestamp": "2026-08-24T16:00:00.000Z"
}
```

### 2. Disparo de Eventos de Cliente (POST `/api/action`)

- **Método**: `POST`
- **Headers**: `Content-Type: application/json`
- **Cuerpo de la Petición**:

```json
{
  "token": "averno_secret_client_token",
  "event": "key_press",
  "value": "Mensaje a reproducir por TTS",
  "scope": "global"
}
```

- **Valores posibles para `scope`**:
  - `"global"`: Reproduce el mensaje a través de ambos bots (*Ataque* y *Defensa*).
  - `"ataque"`: Reproduce el mensaje únicamente mediante el bot de *Ataque*.
  - `"defensa"`: Reproduce el mensaje únicamente mediante el bot de *Defensa*.

- **Respuestas**:
  - `200 OK`: Petición procesada correctamente.
  - `401 Unauthorized`: Token de identificación inválido.
  - `400 Bad Request`: Error de validación de esquema JSON.

---

## 📁 Estructura del Proyecto

```
GvG-Helper/
├── src/
│   ├── commands/             # Registro y definición de comandos Slash (/gvg)
│   │   ├── gvg/              # Subcomandos start, stop, offset, ping
│   │   └── index.ts          # Colección principal de comandos
│   ├── events/               # Manejadores de eventos Discord y esquemas de GvG
│   │   ├── clientEventSchemas.ts # Validación Zod para API HTTP
│   │   ├── eventHandler.ts   # Orquestador del temporizador GvG
│   │   ├── eventSchemas.ts   # Esquema Zod de eventos temporizados
│   │   ├── eventUtils.ts     # Cálculo de retardos y ordenación de eventos (funciones puras)
│   │   ├── interactionHandler.ts # Enrutador de interacciones slash
│   │   └── readyHandler.ts   # Conexión inicial de bots al estar listos
│   ├── services/             # Servicios de fondo de la aplicación
│   │   ├── apiServer.ts      # Servidor HTTP REST y rutas CORS
│   │   ├── clientEventHandler.ts # Procesamiento de eventos recibidos por la API HTTP
│   │   ├── tts.ts            # Servicio Singleton de gestión de voz con @discordjs/voice
│   │   └── ttsUtils.ts       # Generación de URLs de audio de Google TTS
│   ├── utils/                # Utilidades de uso general
│   │   ├── channelResolver.ts# Búsqueda y resolución funcional de canales de voz
│   │   ├── logger.ts         # Registrador estructurado Pino
│   │   └── timeConversion.ts # Funciones puras de conversión de cadenas de tiempo
│   ├── config.ts             # Validación Zod de variables de entorno
│   ├── deploy-commands.ts    # Script de despliegue de comandos en la API de Discord
│   └── index.ts              # Punto de entrada principal y bootstrap
├── biome.json                # Configuración de Linter y Formateador Biome
├── package.json              # Configuración de scripts y dependencias
└── tsconfig.json             # Configuración de compilación de TypeScript
```
