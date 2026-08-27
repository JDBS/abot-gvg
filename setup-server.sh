#!/bin/bash
# ==============================================================================
# Script de preparación del servidor Linux (Clouding / Ubuntu / Debian)
# para GvG-Helper (Discord.js Voice + Audio + Encriptación Sodium/Opus)
# ==============================================================================

set -e

echo "🚀 Iniciando configuración de dependencias del servidor..."

# 1. Actualizar repositorios e instalar paquetes del sistema operativo
echo "📦 Instalando paquetes del sistema (ffmpeg, libsodium, herramientas de compilación)..."
sudo apt-get update -y
sudo apt-get install -y ffmpeg libsodium-dev build-essential python3

# 2. Detectar gestor de paquetes (bun, pnpm o npm)
if command -v bun &> /dev/null; then
    PKG_MGR="bun"
    INSTALL_CMD="bun add"
elif command -v pnpm &> /dev/null; then
    PKG_MGR="pnpm"
    INSTALL_CMD="pnpm add"
else
    PKG_MGR="npm"
    INSTALL_CMD="npm install"
fi

echo "📌 Gestor de paquetes detectado: $PKG_MGR"

# 3. Instalación de librerías de encriptación de voz y Opus para @discordjs/voice
echo "🔒 Instalando librerías de encriptación de voz (sodium, ciphers) y Opus..."
$INSTALL_CMD libsodium-wrappers @noble/ciphers @stablelib/xchacha20poly1305 sodium-native @discordjs/opus

# 4. Asegurar permisos de ejecución en ffmpeg-static si existe en node_modules
if [ -f "node_modules/ffmpeg-static/ffmpeg" ]; then
    echo "🔑 Otorgando permisos de ejecución a ffmpeg-static..."
    chmod +x node_modules/ffmpeg-static/ffmpeg
fi

# 5. Comprobar estado del Firewall (ufw) para tráfico UDP de voz
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
    echo "🛡️ Habilitando puerto UDP de salida en el firewall (ufw)..."
    sudo ufw allow out proto udp
fi

echo "✅ ¡Configuración completada con éxito!"
echo "💡 Ahora puedes iniciar tu bot con: $PKG_MGR run src/index.ts"
