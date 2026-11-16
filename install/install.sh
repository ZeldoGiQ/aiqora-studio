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
if [ "$(uname)" = "Darwin" ]; then
  START="$HOME/Desktop/AIQORA Studio.command"
  printf '#!/bin/bash\ncd "%s" && claude "/aiqora-studio:start"\n' "$STUDIO" > "$START"
  chmod +x "$START"
fi

printf '\n\033[32mFertig!\033[0m Doppelklicke auf dem Desktop "AIQORA Studio".\n'
echo 'Beim ersten Start fragt Claude Code nach deinem AIQORA-Schlüssel (aiqora.ai/settings → "MCP API Keys").'
