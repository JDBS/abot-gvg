# GvG Helper

GvG Helper is a Discord slash-command bot for Guild vs Guild utilities. It is built with Bun, TypeScript, and `discord.js`.

The bot currently registers a guild-scoped `/gvg` command with:

- `/gvg ping` - replies with a simple pong response.
- `/gvg timer start [offset]` - starts a GvG timer with an optional offset in seconds. Positive values delay the timer; negative values start it ahead.
- `/gvg timer stop` - stops a GvG timer.

Timer commands are intended to be run from a voice channel chat.

## Requirements

- [Bun](https://bun.sh/) for installing dependencies and running the bot.
- A Discord application with a bot user.
- The bot added to your target Discord server with permission to use slash commands.
- The Discord application client ID, bot token, and development guild ID.

## Setup

Install dependencies:

```sh
bun install
```

Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_development_guild_id
NODE_ENV=development
DEFAULT_LANGUAGE=es
```

`DISCORD_TOKEN`, `CLIENT_ID`, and `GUILD_ID` are required. `NODE_ENV` defaults to `development` and may be set to `production`. `DEFAULT_LANGUAGE` defines the default ISO 639-1 language code used for `/tts speak` when no language choice is provided (defaults to `es`).

## Development

Deploy slash commands and start the bot:

```sh
bun run dev
```

Run the bot in watch mode:

```sh
bun run dev:watch
```

Deploy slash commands without starting the bot:

```sh
bun run deploy
```

The deploy script registers commands to the configured guild using `Routes.applicationGuildCommands`, so command changes should appear quickly in the server identified by `GUILD_ID`.

## Checks

Type-check the project:

```sh
bun run build
```

Run Biome linting:

```sh
bun run lint
```

Format files:

```sh
bun run format
```

Run Biome checks and apply safe fixes:

```sh
bun run check
```

## Project Layout

- `src/index.ts` - creates the Discord client, logs in, and dispatches interactions to registered commands.
- `src/deploy-commands.ts` - deploys slash-command definitions to the configured guild.
- `src/config.ts` - validates required environment variables with Zod.
- `src/commands/` - command registration and implementations.
- `src/commands/gvg/` - `/gvg` command, subcommands, and command groups.
