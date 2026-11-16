# AIQORA Studio mit OpenAI Codex

> **Stand:** Entwurf. Das Format der Codex-Einstellungen vor der Veröffentlichung gegen die aktuelle Codex-Dokumentation prüfen.

Das Studio funktioniert auch mit Codex. Statt der Plugin-Installation richtest du die Verbindungen einmal von Hand ein.

## 1. Repo herunterladen

Lade das Repo als ZIP herunter oder klone es, zum Beispiel nach `~/aiqora-studio`.

## 2. Schlüssel als Umgebungsvariablen

Trage die Schlüssel als **Umgebungsvariablen deines Systems** ein, nie in eine Datei:

| Variable | Wofür |
|---|---|
| `AIQORA_API_KEY` | Dein AIQORA-Schlüssel (aiqora.ai/settings → „MCP API Keys“) |
| `AIQORA_BYOK_WAVESPEED`, `AIQORA_BYOK_FAL`, `AIQORA_BYOK_ELEVENLABS` | Optional, eigene Anbieter-Schlüssel (nur mit Abo) |

## 3. Verbindungen in `~/.codex/config.toml`

```toml
[mcp_servers.aiqora]
url = "https://sfqaotcueeifbrlttasu.supabase.co/functions/v1/mcp"
bearer_token_env_var = "AIQORA_API_KEY"

[mcp_servers.aiqora-local]
command = "node"
args = ["/PFAD/ZU/aiqora-studio/local/server.mjs"]
env_vars = ["AIQORA_BYOK_WAVESPEED", "AIQORA_BYOK_FAL", "AIQORA_BYOK_ELEVENLABS"]
```

`/PFAD/ZU/` durch den Ordner aus Schritt 1 ersetzen.

## 4. Studio einrichten

Starte Codex in einem leeren Ordner (z. B. `Dokumente/AIQORA-Studio`) und schreibe: „Richte das AIQORA Studio ein.“ Der lokale Helfer legt dann die Anleitung `AGENTS.md` an. Sie verweist auf die Befehle im Repo.
