#!/usr/bin/env bash
# AIQORA Studio – Installation für Mac (und Linux)
# Ausführen: bash install.sh
set -euo pipefail

schritt() { printf '\n\033[35m» %s\033[0m\n' "$1"; }
hat() { command -v "$1" >/dev/null 2>&1; }

schritt "Prüfe Node.js"
if ! hat node || [ "$(node --version | sed 's/^v//' | cut -d. -f1)" -lt 20 ]; then
  if hat brew; then brew install node
  else echo "Bitte Node.js 20 oder neuer installieren: https://nodejs.org"; exit 1; fi
fi

schritt "Prüfe ffmpeg (optional)"
if ! hat ffmpeg; then
  if hat brew; then brew install ffmpeg || echo "ffmpeg konnte nicht installiert werden. Das Studio funktioniert trotzdem."
  else echo "ffmpeg fehlt. Das Studio funktioniert trotzdem, nur ohne einfache Schnitte auf dem Rechner."; fi
fi

schritt "Prüfe Claude Code"
if ! hat claude; then
  echo "Claude Code ist nicht installiert. Bitte zuerst installieren: https://claude.com/claude-code"; exit 1
fi

schritt "Installiere das AIQORA Studio Plugin"
claude plugin marketplace add ZeldoGiQ/aiqora-studio
claude plugin install aiqora-studio@aiqora

schritt "Lege den Studio-Ordner und den Startknopf an"
STUDIO="$HOME/Documents/AIQORA-Studio"
mkdir -p "$STUDIO"
PROGRAMM="$(node -e 'const m=require(require("os").homedir()+"/.claude/plugins/known_marketplaces.json");process.stdout.write(m.aiqora.installLocation)')"
STARTER="$PROGRAMM/local/oberflaeche.mjs"
if [ "$(uname)" = "Darwin" ]; then
  START="$HOME/Desktop/AIQORA Studio.command"
  if [ -e "$START" ] && ! grep -qE 'oberflaeche\.mjs|aiqora-studio:start' "$START"; then
    START="$HOME/Desktop/AIQORA Studio (neu).command"
    echo 'Auf dem Desktop gibt es schon einen eigenen "AIQORA Studio"-Knopf. Der neue heißt "AIQORA Studio (neu)".'
  fi
  printf '#!/bin/bash\nnode "%s"\n' "$STARTER" > "$START"
  chmod +x "$START"
fi

schritt "Öffne das Studio"
node "$STARTER" >/dev/null

printf '\n\033[32mFertig!\033[0m Das Studio ist im Browser offen. Künftig startest du es mit "AIQORA Studio" auf dem Desktop.\n'
echo 'Beim ersten Mal trägst du unter "Einstellungen" deinen AIQORA-Schlüssel ein (aiqora.ai/settings → "MCP API Keys").'
