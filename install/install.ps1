# AIQORA Studio – Installation für Windows
# Ausführen: Rechtsklick → "Mit PowerShell ausführen"
# oder: powershell -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = 'Stop'

function Schritt($text) { Write-Host "`n» $text" -ForegroundColor Magenta }
function Hat($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

Schritt 'Prüfe Node.js'
$nodeOk = $false
if (Hat node) { $nodeOk = ([int]((node --version).TrimStart('v').Split('.')[0])) -ge 20 }
if (-not $nodeOk) {
  Write-Host 'Node.js 20 oder neuer wird installiert. Wenn ein Fenster nach Erlaubnis fragt: "Ja" klicken.'
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
}

Schritt 'Prüfe ffmpeg (optional)'
if (-not (Hat ffmpeg)) {
  try { winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements }
  catch { Write-Host 'ffmpeg konnte nicht installiert werden. Das Studio funktioniert trotzdem, nur ohne einfache Schnitte auf dem Rechner.' }
}

Schritt 'Prüfe Claude Code'
if (-not (Hat claude)) {
  Write-Host 'Claude Code ist nicht installiert. Bitte zuerst installieren: https://claude.com/claude-code' -ForegroundColor Yellow
  exit 1
}

Schritt 'Installiere das AIQORA Studio Plugin'
claude plugin marketplace add ZeldoGiQ/aiqora-studio
claude plugin install aiqora-studio@aiqora

Schritt 'Lege den Studio-Ordner und den Startknopf an'
$docs = [Environment]::GetFolderPath('MyDocuments')
$studio = Join-Path $docs 'AIQORA-Studio'
New-Item -ItemType Directory -Force -Path $studio | Out-Null
$desktop = [Environment]::GetFolderPath('Desktop')
$bat = "@echo off`r`ncd /d `"$studio`"`r`nclaude `"/aiqora-studio:start`"`r`n"
[IO.File]::WriteAllText((Join-Path $desktop 'AIQORA Studio.bat'), $bat, (New-Object Text.ASCIIEncoding))

Write-Host "`nFertig! Doppelklicke auf dem Desktop 'AIQORA Studio'." -ForegroundColor Green
Write-Host 'Beim ersten Start fragt Claude Code nach deinem AIQORA-Schlüssel (aiqora.ai/settings → "MCP API Keys").'
