// Einfache Schnitte mit ffmpeg. Nie über eine Shell, immer mit festen Argumenten.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Fehler, freierPfad, imStudio } from "./pfade.mjs";

function lauf(cmd, args, timeout = 30 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024, timeout }, (err, stdout, stderr) => {
      if (err) {
        if (err.code === "ENOENT") return reject(new Fehler(`${cmd} ist nicht installiert. Bitte ffmpeg installieren.`));
        const letzte = String(stderr || "").trim().split("\n").slice(-3).join(" ").slice(0, 300);
        return reject(new Fehler(`${cmd} ist fehlgeschlagen: ${letzte}`));
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function ffmpegVerfuegbar() {
  try { await lauf("ffmpeg", ["-hide_banner", "-version"], 15000); return true; } catch { return false; }
}

export async function info(pfad) {
  const voll = path.resolve(pfad);
  if (!existsSync(voll)) throw new Fehler("Die Datei gibt es nicht.");
  const { stdout } = await lauf("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", voll], 60000);
  const j = JSON.parse(stdout);
  const v = (j.streams || []).find((s) => s.codec_type === "video");
  const a = (j.streams || []).find((s) => s.codec_type === "audio");
  return {
    pfad: voll,
    dauer_s: j.format?.duration ? Number(Number(j.format.duration).toFixed(3)) : null,
    groesse_bytes: j.format?.size ? Number(j.format.size) : null,
    video: v ? { codec: v.codec_name, breite: v.width, hoehe: v.height, fps: v.r_frame_rate } : null,
    audio: a ? { codec: a.codec_name, abtastrate: Number(a.sample_rate), kanaele: a.channels } : null
  };
}

function ausgabePfad(eingabe, ausgabe, zusatz, endung) {
  if (ausgabe) {
    const voll = imStudio(ausgabe);
    if (existsSync(voll)) throw new Fehler("Die Ausgabedatei gibt es schon. Bitte einen anderen Namen wählen.");
    return voll;
  }
  const ext = endung || path.extname(eingabe) || ".mp4";
  return freierPfad(path.join(path.dirname(eingabe), path.basename(eingabe, path.extname(eingabe)) + zusatz + ext));
}

function zahl(v, name, min = 0) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw new Fehler(`${name} muss eine Zahl ab ${min} sein.`);
  return n;
}

function eingabeImStudio(p) {
  const voll = imStudio(p);
  if (!existsSync(voll)) throw new Fehler(`Die Datei gibt es nicht: ${path.basename(voll)}`);
  return voll;
}

const VIDEO_ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p"];
const AUDIO_ENC = ["-c:a", "aac", "-b:a", "192k"];

export async function kuerzen({ eingabe, start, ende, ausgabe }) {
  const ein = eingabeImStudio(eingabe);
  const s = zahl(start, "start"), e = zahl(ende, "ende");
  if (e <= s) throw new Fehler("ende muss nach start liegen.");
  const aus = ausgabePfad(ein, ausgabe, "-gekuerzt");
  const nurTon = /\.(mp3|wav|m4a|ogg|flac)$/i.test(ein);
  const enc = nurTon ? (path.extname(aus).toLowerCase() === ".wav" ? ["-c:a", "pcm_s16le"] : ["-c:a", "libmp3lame", "-q:a", "2"]) : [...VIDEO_ENC, ...AUDIO_ENC];
  await lauf("ffmpeg", ["-hide_banner", "-y", "-ss", String(s), "-i", ein, "-t", String(e - s), ...enc, aus]);
  return { ausgabe: aus };
}

export async function hochkant({ eingabe, ausgabe }) {
  const ein = eingabeImStudio(eingabe);
  const aus = ausgabePfad(ein, ausgabe, "-hochkant", ".mp4");
  const vf = "crop='min(iw,ih*9/16)':'min(ih,iw*16/9)',scale=1080:1920,setsar=1";
  await lauf("ffmpeg", ["-hide_banner", "-y", "-i", ein, "-vf", vf, ...VIDEO_ENC, "-c:a", "copy", aus]);
  return { ausgabe: aus };
}

export async function lautheit({ eingabe, ziel_lufs = -14, ausgabe }) {
  const ein = eingabeImStudio(eingabe);
  const ziel = Number(ziel_lufs);
  if (!Number.isFinite(ziel) || ziel < -30 || ziel > -5) throw new Fehler("ziel_lufs muss zwischen -30 und -5 liegen.");
  const aus = ausgabePfad(ein, ausgabe, "-lautheit");
  const nurTon = /\.(mp3|wav|m4a|ogg|flac)$/i.test(ein);
  const af = `loudnorm=I=${ziel}:TP=-1:LRA=11`;
  const enc = nurTon ? ["-c:a", path.extname(aus).toLowerCase() === ".wav" ? "pcm_s16le" : "libmp3lame", "-ar", "48000"] : ["-c:v", "copy", ...AUDIO_ENC, "-ar", "48000"];
  await lauf("ffmpeg", ["-hide_banner", "-y", "-i", ein, "-af", af, ...enc, aus]);
  return { ausgabe: aus, ziel_lufs: ziel };
}

export async function zusammenfuegen({ eingaben, ausgabe, tonspur }) {
  if (!Array.isArray(eingaben) || eingaben.length < 2) throw new Fehler("Bitte mindestens zwei Clips angeben.");
  if (eingaben.length > 200) throw new Fehler("Höchstens 200 Clips auf einmal.");
  const ein = eingaben.map(eingabeImStudio);
  const infos = await Promise.all(ein.map(info));
  const erstes = infos[0].video;
  if (!erstes) throw new Fehler("Der erste Clip hat kein Bild.");
  if (infos.some((i) => !i.video)) throw new Fehler("Alle Clips brauchen ein Bild.");
  const W = erstes.breite, H = erstes.hoehe;
  const [zn, nn] = String(erstes.fps || "24/1").split("/").map(Number);
  const fps = nn ? zn / nn : 24;
  const ton = tonspur ? eingabeImStudio(tonspur) : null;
  const alleMitTon = infos.every((i) => i.audio);
  const args = ["-hide_banner", "-y"];
  for (const p of ein) args.push("-i", p);
  if (ton) args.push("-i", ton);
  let filter = "";
  ein.forEach((_, i) => {
    filter += `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}[v${i}];`;
  });
  const mitClipTon = !ton && alleMitTon;
  if (mitClipTon) {
    ein.forEach((_, i) => { filter += `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${i}];`; });
    filter += ein.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${ein.length}:v=1:a=1[v][a]`;
  } else {
    filter += ein.map((_, i) => `[v${i}]`).join("") + `concat=n=${ein.length}:v=1:a=0[v]`;
  }
  args.push("-filter_complex", filter, "-map", "[v]");
  if (mitClipTon) args.push("-map", "[a]", ...AUDIO_ENC);
  else if (ton) args.push("-map", `${ein.length}:a`, ...AUDIO_ENC, "-shortest");
  const aus = ausgabePfad(ein[0], ausgabe, "-zusammen", ".mp4");
  args.push(...VIDEO_ENC, "-movflags", "+faststart", aus);
  await lauf("ffmpeg", args);
  return { ausgabe: aus, clips: ein.length, tonspur: ton ? path.basename(ton) : (mitClipTon ? "aus den Clips" : "keine") };
}
