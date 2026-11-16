// AIQORA Studio – Oberfläche. Ohne Bibliotheken.
// Alle Texte aus Daten werden über textContent gesetzt, nie als HTML.

const inhalt = document.getElementById("inhalt");
const zustand = { status: null, guthaben: null };

// ---------- Hilfen ----------

function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "text") e.textContent = v;
    else if (k === "klasse") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kinder.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}

async function api(pfad, optionen = {}) {
  const init = { headers: {}, ...optionen };
  if (optionen.body !== undefined) {
    init.method = "POST";
    init.headers = { "Content-Type": "application/json", "X-Aiqora-Studio": "1" };
    init.body = JSON.stringify(optionen.body);
  }
  const r = await fetch(pfad, init);
  let daten = {};
  try { daten = await r.json(); } catch { /* leer */ }
  if (!r.ok) throw Object.assign(new Error(daten.fehler || "Etwas ist schiefgelaufen."), { schluessel: daten.schluessel, status: r.status });
  return daten;
}

const dateiUrl = (projekt, pfad) => `/datei?projekt=${encodeURIComponent(projekt)}&pfad=${encodeURIComponent(pfad)}`;

const zahl = (n) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(n);

function datum(iso, mitZeit = false) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("de-DE", mitZeit ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

function groesse(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${zahl(bytes / 1024 / 1024)} MB`;
}

function hinweis(text, art = "") {
  return el("div", { klasse: `hinweis ${art}`, role: art === "fehler" ? "alert" : "status", text });
}

function fehlerHinweis(e) {
  if (e.schluessel) {
    return el("div", { klasse: "hinweis fehler", role: "alert" },
      `${e.message} `, el("a", { href: "#/einstellungen", text: "Schlüssel eintragen" }));
  }
  return hinweis(e.message, "fehler");
}

function seite(titel, unterzeile, ...kinder) {
  inhalt.replaceChildren(
    el("h1", { text: titel }),
    unterzeile ? el("p", { klasse: "unterzeile", text: unterzeile }) : null,
    ...kinder
  );
  inhalt.focus({ preventScroll: true });
}

function vorschau(projekt, datei, { autoplay = false } = {}) {
  const url = dateiUrl(projekt, datei.pfad);
  if (datei.art === "bild") return el("img", { src: url, alt: datei.name || "", loading: "lazy", decoding: "async" });
  if (datei.art === "video") {
    const v = el("video", { src: `${url}#t=0.5`, preload: "metadata", muted: true, playsinline: true });
    v.muted = true;
    if (autoplay) { v.controls = true; v.autoplay = true; v.muted = false; v.src = url; }
    return v;
  }
  if (datei.art === "audio") return el("span", { klasse: "kachel-audio", "aria-hidden": "true", text: "♪" });
  return el("span", { text: "Datei" });
}

// ---------- Guthaben ----------

async function guthabenLaden() {
  const klein = document.getElementById("guthaben-klein");
  try {
    const k = await api("/api/konto");
    zustand.guthaben = k.guthaben;
    document.getElementById("guthaben-klein-wert").textContent = k.guthaben === null ? "–" : `${zahl(k.guthaben)} Credits`;
    klein.hidden = false;
  } catch {
    zustand.guthaben = null;
    klein.hidden = true;
  }
  return zustand.guthaben;
}

// ---------- Seiten ----------

function projektKarte(p) {
  const bild = el("div", { klasse: "karte-bild" },
    p.titelbild ? vorschau(p.name, { ...p.titelbild, name: "" }) : el("span", { text: "Noch keine Bilder" }));
  const teile = [];
  if (p.bilder) teile.push(`${p.bilder} ${p.bilder === 1 ? "Bild" : "Bilder"}`);
  if (p.videos) teile.push(`${p.videos} ${p.videos === 1 ? "Video" : "Videos"}`);
  if (p.audios) teile.push(`${p.audios} Audio`);
  return el("a", { klasse: "karte", href: `#/projekt/${encodeURIComponent(p.name)}` },
    bild,
    el("div", { klasse: "karte-text" },
      el("div", { klasse: "karte-titel", text: p.titel }),
      el("div", { klasse: "karte-meta", text: [p.datum ? datum(p.datum) : "", teile.join(" · ")].filter(Boolean).join(" · ") || "Leer" })
    )
  );
}

async function startSeite() {
  const guthabenZahl = el("div", { klasse: "zahl", text: "…" });
  const held = el("section", { klasse: "held" },
    el("div", {},
      el("h1", { text: "Willkommen in deinem Studio" }),
      el("p", { text: "Hier siehst du deine Projekte, Bilder, Videos und Songs, dein Guthaben und alles, was du zuletzt bei AIQORA erzeugt hast." })
    ),
    el("div", { klasse: "guthaben-gross" }, guthabenZahl, el("div", { klasse: "einheit", text: "Credits" }))
  );
  const projekteBox = el("div", { klasse: "laden", text: "Projekte werden geladen …" });
  const auftraegeBox = el("div", { klasse: "laden", text: "Aufträge werden geladen …" });
  const hinweise = el("div");

  inhalt.replaceChildren(
    hinweise,
    held,
    el("section", { klasse: "abschnitt" },
      el("div", { klasse: "abschnitt-kopf" }, el("h2", { text: "Letzte Projekte" }), el("a", { href: "#/projekte", text: "Alle Projekte →" })),
      projekteBox),
    el("section", { klasse: "abschnitt" },
      el("div", { klasse: "abschnitt-kopf" }, el("h2", { text: "Letzte Aufträge" }), el("a", { href: "#/auftraege", text: "Alle Aufträge →" })),
      auftraegeBox)
  );

  if (zustand.status && !zustand.status.schluessel) {
    hinweise.append(el("div", { klasse: "hinweis", role: "status" },
      "Damit das Studio dein Guthaben und deine Aufträge zeigen kann, braucht es deinen AIQORA-Schlüssel. ",
      el("a", { href: "#/einstellungen", text: "Jetzt eintragen" })));
  }

  (zustand.guthabenAnfrage ||= guthabenLaden()).then((g) => { guthabenZahl.textContent = g === null ? "–" : zahl(g); });

  api("/api/projekte").then(({ projekte }) => {
    projekteBox.className = "";
    projekteBox.replaceChildren(projekte.length
      ? el("div", { klasse: "raster" }, projekte.slice(0, 6).map(projektKarte))
      : el("div", { klasse: "leer", text: "Noch keine Projekte. Sobald du etwas erzeugst, erscheint es hier." }));
  }).catch((e) => projekteBox.replaceChildren(fehlerHinweis(e)));

  api("/api/auftraege?anzahl=6").then(({ eintraege }) => {
    auftraegeBox.className = "";
    auftraegeBox.replaceChildren(eintraege.length ? auftragsTabelle(eintraege)
      : el("div", { klasse: "leer", text: "Noch keine Aufträge." }));
  }).catch((e) => auftraegeBox.replaceChildren(fehlerHinweis(e)));
}

async function projekteSeite() {
  seite("Projekte", "Jedes Vorhaben hat einen eigenen Ordner mit Bildern, Clips, Ton und dem fertigen Ergebnis.",
    el("div", { klasse: "laden", text: "Projekte werden geladen …" }));
  try {
    const { projekte } = await api("/api/projekte");
    const kopf = el("div", { klasse: "kopfzeile" },
      el("div", {}, el("h1", { text: "Projekte" }), el("p", { klasse: "unterzeile eng", text: `${projekte.length} Projekte` })),
      el("button", { klasse: "knopf zweitrangig", type: "button", onclick: () => api("/api/oeffnen", { body: {} }).catch(() => {}), text: "Studio-Ordner öffnen" })
    );
    inhalt.replaceChildren(kopf, projekte.length
      ? el("div", { klasse: "raster" }, projekte.map(projektKarte))
      : el("div", { klasse: "leer", text: "Noch keine Projekte." }));
  } catch (e) {
    inhalt.append(fehlerHinweis(e));
  }
}

const FILTER = [["alle", "Alle"], ["fertig", "Fertig"], ["bild", "Bilder"], ["video", "Videos"], ["audio", "Audio"]];

async function projektSeite(name) {
  seite("Projekt", "", el("div", { klasse: "laden", text: "Projekt wird geladen …" }));
  let daten;
  try {
    daten = await api(`/api/projekt?name=${encodeURIComponent(name)}`);
  } catch (e) {
    inhalt.replaceChildren(el("h1", { text: "Projekt" }), fehlerHinweis(e));
    return;
  }
  const medien = daten.dateien.filter((d) => d.art !== "andere");
  const titel = name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
  const galerie = el("div", { klasse: "galerie" });
  let aktiv = "alle";

  const zeigen = () => {
    const liste = medien.filter((d) => aktiv === "alle" || (aktiv === "fertig" ? d.ordner === "fertig" : d.art === aktiv));
    galerie.replaceChildren(...(liste.length ? liste.map((d) => kachel(name, d)) : [el("div", { klasse: "leer", text: "Hier ist noch nichts." })]));
  };

  const filter = el("div", { klasse: "filter", role: "group", "aria-label": "Dateien filtern" },
    FILTER.map(([wert, beschriftung]) => {
      const anzahl = wert === "alle" ? medien.length : medien.filter((d) => (wert === "fertig" ? d.ordner === "fertig" : d.art === wert)).length;
      return el("button", {
        type: "button", "aria-pressed": String(wert === aktiv), text: `${beschriftung} (${anzahl})`,
        onclick: (ev) => {
          aktiv = wert;
          for (const b of filter.children) b.setAttribute("aria-pressed", String(b === ev.currentTarget));
          zeigen();
        }
      });
    }));

  inhalt.replaceChildren(
    el("div", { klasse: "kopfzeile" },
      el("div", {},
        el("p", { klasse: "unterzeile zurueck" }, el("a", { href: "#/projekte", text: "← Projekte" })),
        el("h1", { klasse: "gross-anfang", text: titel })),
      el("button", { klasse: "knopf zweitrangig", type: "button", text: "Ordner öffnen",
        onclick: () => api("/api/oeffnen", { body: { projekt: name } }).catch(() => {}) })
    ),
    filter,
    galerie,
    daten.notizen ? el("details", { klasse: "notizen" }, el("summary", { text: "Notizen" }), el("pre", { text: daten.notizen })) : null
  );
  zeigen();
}

function kachel(projekt, d) {
  return el("button", { klasse: "kachel", type: "button", title: d.pfad, onclick: () => ansehen(projekt, d) },
    d.ordner === "fertig" ? el("span", { klasse: "abzeichen fertig", text: "Fertig" })
      : d.art === "video" ? el("span", { klasse: "abzeichen", text: "Video" }) : null,
    el("div", { klasse: "kachel-bild" }, vorschau(projekt, d)),
    el("div", { klasse: "kachel-name" },
      d.ordner ? el("span", { klasse: "kachel-ordner", text: `${d.ordner}/` }) : null,
      d.name)
  );
}

function ansehen(projekt, d) {
  const dialog = document.getElementById("ansicht");
  const buehne = document.getElementById("ansicht-buehne");
  document.getElementById("ansicht-titel").textContent = `${d.name} · ${groesse(d.groesse)}`;
  const url = dateiUrl(projekt, d.pfad);
  buehne.replaceChildren(
    d.art === "bild" ? el("img", { src: url, alt: d.name })
      : d.art === "video" ? el("video", { src: url, controls: true, autoplay: true, playsinline: true })
        : el("audio", { src: url, controls: true, autoplay: true })
  );
  document.getElementById("ansicht-ordner").onclick = () => api("/api/oeffnen", { body: { projekt, pfad: d.pfad.split("/").slice(0, -1).join("/") } }).catch(() => {});
  dialog.showModal();
}

document.getElementById("ansicht-zu").addEventListener("click", () => document.getElementById("ansicht").close());
document.getElementById("ansicht").addEventListener("close", () => document.getElementById("ansicht-buehne").replaceChildren());
document.getElementById("ansicht").addEventListener("click", (ev) => { if (ev.target.id === "ansicht") ev.target.close(); });

function auftragsTabelle(eintraege) {
  return el("table", { klasse: "tabelle" },
    el("thead", {}, el("tr", {}, el("th", { text: "Wann" }), el("th", { text: "Was" }), el("th", { klasse: "betrag", text: "Credits" }))),
    el("tbody", {}, eintraege.map((t) => el("tr", {},
      el("td", { klasse: "zeit", text: datum(t.zeit, true) }),
      el("td", { text: t.beschreibung || t.art }),
      el("td", { klasse: `betrag ${t.betrag < 0 ? "minus" : "plus"}`, text: `${t.betrag > 0 ? "+" : ""}${zahl(t.betrag)}` })
    )))
  );
}

async function auftraegeSeite() {
  seite("Aufträge", "Alles, was du bei AIQORA erzeugt hast, mit den Kosten. Fehlgeschlagene Aufträge bucht AIQORA zurück.",
    el("div", { klasse: "laden", text: "Aufträge werden geladen …" }));
  const box = inhalt.lastElementChild;
  const alle = [];
  const laden = async (vor) => {
    const { eintraege, weiter } = await api(`/api/auftraege?anzahl=30${vor ? `&vor=${encodeURIComponent(vor)}` : ""}`);
    alle.push(...eintraege);
    const knopf = weiter ? el("div", { klasse: "mehr" }, el("button", {
      klasse: "knopf zweitrangig", type: "button", text: "Ältere laden",
      onclick: (ev) => { ev.currentTarget.disabled = true; laden(weiter).catch((e) => box.append(fehlerHinweis(e))); }
    })) : null;
    box.className = "";
    box.replaceChildren(alle.length ? auftragsTabelle(alle) : el("div", { klasse: "leer", text: "Noch keine Aufträge." }), knopf);
  };
  try { await laden(); } catch (e) { box.className = ""; box.replaceChildren(fehlerHinweis(e)); }
}

const QUELLEN = {
  plugin: "aus Claude Code (Plugin-Einstellungen)",
  gespeichert: "sicher auf diesem Rechner gespeichert",
  umgebung: "aus einer Umgebungsvariable deines Systems"
};

async function einstellungenSeite() {
  seite("Einstellungen", "", el("div", { klasse: "laden", text: "Wird geladen …" }));
  const status = zustand.status = await api("/api/status");
  const meldung = el("div");

  const eingabe = el("input", {
    klasse: "eingabe", type: "password", autocomplete: "off", spellcheck: "false",
    placeholder: "Schlüssel hier einfügen", "aria-label": "AIQORA-Schlüssel"
  });
  const speichern = el("button", { klasse: "knopf", type: "submit", text: "Prüfen und speichern" });
  const formular = el("form", {
    klasse: "zeile",
    onsubmit: async (ev) => {
      ev.preventDefault();
      speichern.disabled = true;
      meldung.replaceChildren(hinweis("Schlüssel wird bei AIQORA geprüft …"));
      try {
        await api("/api/schluessel", { body: { schluessel: eingabe.value } });
        eingabe.value = "";
        await einstellungenSeite();
        guthabenLaden();
        inhalt.prepend(hinweis("Gespeichert. Dein Schlüssel liegt verschlüsselt auf diesem Rechner.", "ok"));
      } catch (e) {
        eingabe.value = "";
        meldung.replaceChildren(fehlerHinweis(e));
        speichern.disabled = false;
      }
    }
  }, eingabe, speichern);

  inhalt.replaceChildren(
    el("h1", { text: "Einstellungen" }),
    el("p", { klasse: "unterzeile", text: `AIQORA Studio ${status.version}` }),
    meldung,
    el("section", { klasse: "feld-gruppe" },
      el("h2", { text: "AIQORA-Schlüssel" }),
      el("p", {},
        el("span", { klasse: `status-punkt ${status.schluessel ? "an" : "aus"}`, "aria-hidden": "true" }),
        status.schluessel ? `Eingetragen, ${QUELLEN[status.schluessel_quelle] || ""}.` : "Noch nicht eingetragen."),
      el("p", {}, "Deinen Schlüssel findest du unter ",
        el("a", { href: "https://aiqora.ai/settings", target: "_blank", rel: "noopener noreferrer", text: "aiqora.ai/settings" }),
        " bei „MCP API Keys“. Er wird nur auf diesem Rechner gespeichert und nie angezeigt."),
      formular,
      status.schluessel_quelle === "gespeichert" ? el("div", { klasse: "abstand-oben" },
        el("button", {
          klasse: "knopf gefahr", type: "button", text: "Gespeicherten Schlüssel entfernen",
          onclick: async () => {
            if (!confirm("Den gespeicherten Schlüssel von diesem Rechner entfernen?")) return;
            await api("/api/schluessel/entfernen", { body: {} }).catch((e) => meldung.replaceChildren(fehlerHinweis(e)));
            await einstellungenSeite();
            guthabenLaden();
          }
        })) : null
    ),
    el("section", { klasse: "feld-gruppe" },
      el("h2", { text: "Studio-Ordner" }),
      el("p", { klasse: "pfad", text: status.studio_ordner }),
      el("button", { klasse: "knopf zweitrangig", type: "button", text: "Ordner öffnen",
        onclick: () => api("/api/oeffnen", { body: {} }).catch((e) => meldung.replaceChildren(fehlerHinweis(e))) })
    )
  );
}

// ---------- Navigation ----------

const SEITEN = {
  "": ["start", startSeite],
  "projekte": ["projekte", projekteSeite],
  "auftraege": ["auftraege", auftraegeSeite],
  "einstellungen": ["einstellungen", einstellungenSeite]
};

async function navigieren() {
  const teile = location.hash.replace(/^#\/?/, "").split("/");
  let [name, fn] = SEITEN[teile[0]] || [];
  let args = [];
  if (teile[0] === "projekt" && teile[1]) { name = "projekte"; fn = projektSeite; args = [decodeURIComponent(teile[1])]; }
  if (!fn) { [name, fn] = SEITEN[""]; }
  for (const a of document.querySelectorAll(".navigation a")) a.classList.toggle("aktiv", a.dataset.seite === name);
  try { await fn(...args); } catch (e) { inhalt.replaceChildren(fehlerHinweis(e)); }
}

window.addEventListener("hashchange", navigieren);

(async () => {
  try { zustand.status = await api("/api/status"); } catch { /* Seite zeigt den Fehler selbst */ }
  if (zustand.status?.schluessel) zustand.guthabenAnfrage = guthabenLaden();
  navigieren();
})();
