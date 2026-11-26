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

/** Ersetzt den Inhalt eines Elements. Leere Einträge (null, false) werden übersprungen statt als Text „null“ zu erscheinen. */
function fuellen(ziel, ...kinder) {
  ziel.replaceChildren(...kinder.flat().filter((k) => k !== null && k !== undefined && k !== false));
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
  fuellen(inhalt, 
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

  fuellen(inhalt, 
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
    fuellen(projekteBox, projekte.length
      ? el("div", { klasse: "raster" }, projekte.slice(0, 6).map(projektKarte))
      : el("div", { klasse: "leer", text: "Noch keine Projekte. Sobald du etwas erzeugst, erscheint es hier." }));
  }).catch((e) => fuellen(projekteBox, fehlerHinweis(e)));

  api("/api/auftraege?anzahl=6").then(({ eintraege }) => {
    auftraegeBox.className = "";
    fuellen(auftraegeBox, eintraege.length ? auftragsTabelle(eintraege)
      : el("div", { klasse: "leer", text: "Noch keine Aufträge." }));
  }).catch((e) => fuellen(auftraegeBox, fehlerHinweis(e)));
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
    fuellen(inhalt, kopf, projekte.length
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
    fuellen(inhalt, el("h1", { text: "Projekt" }), fehlerHinweis(e));
    return;
  }
  const medien = daten.dateien.filter((d) => d.art !== "andere");
  const titel = name.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
  const galerie = el("div", { klasse: "galerie" });
  let aktiv = "alle";

  const zeigen = () => {
    const liste = medien.filter((d) => aktiv === "alle" || (aktiv === "fertig" ? d.ordner === "fertig" : d.art === aktiv));
    fuellen(galerie, ...(liste.length ? liste.map((d) => kachel(name, d)) : [el("div", { klasse: "leer", text: "Hier ist noch nichts." })]));
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

  fuellen(inhalt, 
    el("div", { klasse: "kopfzeile" },
      el("div", {},
        el("p", { klasse: "unterzeile zurueck" }, el("a", { href: "#/projekte", text: "← Projekte" })),
        el("h1", { klasse: "gross-anfang", text: titel }),
        daten.kosten ? el("p", { klasse: "unterzeile eng", text: `Bisher erzeugt für ${credits(daten.kosten)}` }) : null),
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
      d.name),
    d.erzeugt ? el("div", { klasse: "kachel-erzeugt", text: erzeugtText(d.erzeugt) }) : null
  );
}

/** „Nano Banana 2 · 1,5 Credits“: womit eine Datei erzeugt wurde und was sie gekostet hat. */
function erzeugtText(e) {
  return [e.modell, e.credits === null ? "" : credits(e.credits)].filter(Boolean).join(" · ");
}

const credits = (n) => `${zahl(n)} ${n === 1 ? "Credit" : "Credits"}`;

function ansehen(projekt, d) {
  const dialog = document.getElementById("ansicht");
  const buehne = document.getElementById("ansicht-buehne");
  document.getElementById("ansicht-titel").textContent = [d.name, groesse(d.groesse), d.erzeugt ? erzeugtText(d.erzeugt) : ""].filter(Boolean).join(" · ");
  const url = dateiUrl(projekt, d.pfad);
  fuellen(buehne, 
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
    el("thead", {}, el("tr", {}, el("th", { text: "Wann" }), el("th", { text: "Was" }), el("th", { text: "Modell" }), el("th", { klasse: "betrag", text: "Credits" }))),
    el("tbody", {}, eintraege.map((t) => el("tr", {},
      el("td", { klasse: "zeit", text: datum(t.zeit, true) }),
      el("td", { text: t.beschreibung || t.art }),
      el("td", { klasse: "modellname", text: t.modell || "–" }),
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
    fuellen(box, alle.length ? auftragsTabelle(alle) : el("div", { klasse: "leer", text: "Noch keine Aufträge." }), knopf);
  };
  try { await laden(); } catch (e) { box.className = ""; fuellen(box, fehlerHinweis(e)); }
}

// ---------- Modelle ----------

const ART_REIHENFOLGE = ["video", "bild", "musik", "stimme", "lipsync"];
const SORTIERUNG = [["preis", "Günstigste zuerst"], ["teuer", "Teuerste zuerst"], ["name", "Nach Name"]];

function preisZeile(m) {
  if (m.preisVon === null) return el("div", { klasse: "modell-preis" }, el("span", { klasse: "modell-einheit", text: "Preis auf Anfrage" }));
  return el("div", { klasse: "modell-preis" },
    m.preisBis > m.preisVon ? el("span", { klasse: "modell-ab", text: "ab" }) : null,
    el("span", { klasse: "modell-zahl", text: zahl(m.preisVon) }),
    el("span", { klasse: "modell-einheit", text: `${m.preisVon === 1 ? "Credit" : "Credits"} ${m.einheit}` }));
}

/** Preistabelle eines Videomodells: je Dauer der Preis pro Auflösung, daneben der Aufschlag für Ton. */
function preisTabelle(m) {
  const zeilen = m.preise?.nachDauer;
  if (zeilen?.length) {
    const spalten = Object.keys(zeilen[0].preise);
    const mitTon = zeilen.some((z) => z.tonAufschlag);
    return el("table", { klasse: "tabelle preistabelle" },
      el("thead", {}, el("tr", {},
        el("th", { text: "Dauer" }),
        spalten.map((a) => el("th", { klasse: "betrag", text: a || "Preis" })),
        mitTon ? el("th", { klasse: "betrag", text: "mit Ton" }) : null)),
      el("tbody", {}, zeilen.map((z) => el("tr", {},
        el("td", { text: `${z.dauer} s` }),
        spalten.map((a) => el("td", { klasse: "betrag", text: zahl(z.preise[a]) })),
        mitTon ? el("td", { klasse: "betrag", text: z.tonAufschlag ? `+ ${zahl(z.tonAufschlag)}` : "–" }) : null))));
  }
  const nachAufloesung = Object.entries(m.preise?.nachAufloesung || {});
  if (nachAufloesung.length > 1) {
    return el("table", { klasse: "tabelle preistabelle" },
      el("thead", {}, el("tr", {}, el("th", { text: "Auflösung" }), el("th", { klasse: "betrag", text: "Credits" }))),
      el("tbody", {}, nachAufloesung.map(([a, p]) => el("tr", {}, el("td", { text: a }), el("td", { klasse: "betrag", text: zahl(p) })))));
  }
  return null;
}

function modellKarte(m, guthaben) {
  const angaben = [];
  if (m.dauer.length) angaben.push(["Dauer", m.dauer.length > 4 ? `${m.dauer[0]} bis ${m.dauer.at(-1)} Sekunden` : `${m.dauer.join(", ")} Sekunden`]);
  if (m.aufloesungen.length) angaben.push(["Auflösung", m.aufloesungen.join(", ")]);
  if (m.formate.length) angaben.push(["Format", m.formate.length > 6 ? `${m.formate.slice(0, 6).join(", ")} und ${m.formate.length - 6} weitere` : m.formate.join(", ")]);
  const reicht = guthaben !== null && m.preisVon > 0 ? Math.floor(guthaben / m.preisVon) : null;
  const tabelle = preisTabelle(m);
  return el("article", { klasse: "modell" },
    el("div", { klasse: "modell-kopf" },
      el("h3", { text: m.name }),
      m.standard ? el("span", { klasse: "abzeichen-fest", text: "Standard" }) : null),
    el("div", { klasse: "modell-kennung", text: m.id, title: "Kennung des Modells bei AIQORA" }),
    preisZeile(m),
    m.kann.length ? el("div", { klasse: "merkmale" }, m.kann.map((k) => el("span", { klasse: "merkmal", text: k }))) : null,
    angaben.length ? el("dl", { klasse: "modell-angaben" }, angaben.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })])) : null,
    reicht !== null ? el("div", { klasse: "modell-reicht", text: reicht > 0 ? `Dein Guthaben reicht für etwa ${zahl(reicht)}×` : "Dein Guthaben reicht dafür gerade nicht" }) : null,
    tabelle ? el("details", { klasse: "modell-preise" }, el("summary", { text: "Alle Preise" }), tabelle) : null
  );
}

async function modelleSeite() {
  seite("Modelle", "Was jedes Modell kann und was es kostet. Die Preise kommen direkt von AIQORA.",
    el("div", { klasse: "laden", text: "Modelle werden geladen …" }));
  const laden = async (neu) => {
    let daten;
    try {
      daten = await api(`/api/modelle${neu ? "?neu=1" : ""}`);
    } catch (e) {
      fuellen(inhalt, el("h1", { text: "Modelle" }), fehlerHinweis(e));
      return;
    }
    const guthaben = await (zustand.guthabenAnfrage ||= guthabenLaden()).catch(() => null);
    const arten = ART_REIHENFOLGE.filter((a) => daten.arten[a]?.length);
    let art = arten.includes(zustand.modellArt) ? zustand.modellArt : arten[0];
    let sortierung = "preis";
    const liste = el("div", { klasse: "modelle" });
    const suche = el("input", { klasse: "eingabe suche", type: "search", placeholder: "Modell oder Fähigkeit suchen, z. B. Ton", "aria-label": "Modelle durchsuchen" });

    const zeigen = () => {
      const wort = suche.value.trim().toLowerCase();
      const treffer = (daten.arten[art] || [])
        .filter((m) => !wort || `${m.name} ${m.id} ${m.aliase.join(" ")} ${m.kann.join(" ")}`.toLowerCase().includes(wort))
        .sort((a, b) => (sortierung === "name" ? a.name.localeCompare(b.name)
          : sortierung === "teuer" ? (b.preisVon ?? -1) - (a.preisVon ?? -1) : (a.preisVon ?? Infinity) - (b.preisVon ?? Infinity)));
      fuellen(liste, ...(treffer.length ? treffer.map((m) => modellKarte(m, guthaben))
        : [el("div", { klasse: "leer", text: "Kein Modell passt zu dieser Suche." })]));
    };
    suche.addEventListener("input", zeigen);

    const reiter = el("div", { klasse: "filter", role: "group", "aria-label": "Art der Modelle" },
      arten.map((a) => el("button", {
        type: "button", "aria-pressed": String(a === art), text: `${daten.titel[a]?.titel || a} (${daten.arten[a].length})`,
        onclick: (ev) => {
          art = zustand.modellArt = a;
          for (const b of reiter.children) b.setAttribute("aria-pressed", String(b === ev.currentTarget));
          zeigen();
        }
      })));
    const auswahl = el("select", { klasse: "eingabe auswahl", "aria-label": "Sortierung", onchange: (ev) => { sortierung = ev.currentTarget.value; zeigen(); } },
      SORTIERUNG.map(([wert, text]) => el("option", { value: wert, text })));

    fuellen(inhalt, 
      el("div", { klasse: "kopfzeile" },
        el("div", {},
          el("h1", { text: "Modelle" }),
          el("p", { klasse: "unterzeile eng", text: `Preise von AIQORA, Stand ${datum(daten.stand, true)}` })),
        el("button", { klasse: "knopf zweitrangig", type: "button", text: "Preise neu laden",
          onclick: (ev) => { ev.currentTarget.disabled = true; laden(true); } })),
      daten.veraltet ? hinweis("AIQORA ist gerade nicht erreichbar. Du siehst den zuletzt gespeicherten Stand; Preise können sich geändert haben.") : null,
      reiter,
      el("div", { klasse: "zeile werkzeugleiste" }, suche, auswahl),
      liste
    );
    zeigen();
  };
  await laden(false);
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
      fuellen(meldung, hinweis("Schlüssel wird bei AIQORA geprüft …"));
      try {
        await api("/api/schluessel", { body: { schluessel: eingabe.value } });
        eingabe.value = "";
        await einstellungenSeite();
        guthabenLaden();
        inhalt.prepend(hinweis("Gespeichert. Dein Schlüssel liegt verschlüsselt auf diesem Rechner.", "ok"));
      } catch (e) {
        eingabe.value = "";
        fuellen(meldung, fehlerHinweis(e));
        speichern.disabled = false;
      }
    }
  }, eingabe, speichern);

  fuellen(inhalt, 
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
            await api("/api/schluessel/entfernen", { body: {} }).catch((e) => fuellen(meldung, fehlerHinweis(e)));
            await einstellungenSeite();
            guthabenLaden();
          }
        })) : null
    ),
    el("section", { klasse: "feld-gruppe" },
      el("h2", { text: "Studio-Ordner" }),
      el("p", { klasse: "pfad", text: status.studio_ordner }),
      el("button", { klasse: "knopf zweitrangig", type: "button", text: "Ordner öffnen",
        onclick: () => api("/api/oeffnen", { body: {} }).catch((e) => fuellen(meldung, fehlerHinweis(e))) })
    )
  );
}

// ---------- Navigation ----------

const SEITEN = {
  "": ["start", startSeite],
  "projekte": ["projekte", projekteSeite],
  "auftraege": ["auftraege", auftraegeSeite],
  "modelle": ["modelle", modelleSeite],
  "einstellungen": ["einstellungen", einstellungenSeite]
};

async function navigieren() {
  const teile = location.hash.replace(/^#\/?/, "").split("/");
  let [name, fn] = SEITEN[teile[0]] || [];
  let args = [];
  if (teile[0] === "projekt" && teile[1]) { name = "projekte"; fn = projektSeite; args = [decodeURIComponent(teile[1])]; }
  if (!fn) { [name, fn] = SEITEN[""]; }
  for (const a of document.querySelectorAll(".navigation a")) a.classList.toggle("aktiv", a.dataset.seite === name);
  try { await fn(...args); } catch (e) { fuellen(inhalt, fehlerHinweis(e)); }
}

window.addEventListener("hashchange", navigieren);

(async () => {
  try { zustand.status = await api("/api/status"); } catch { /* Seite zeigt den Fehler selbst */ }
  if (zustand.status?.schluessel) zustand.guthabenAnfrage = guthabenLaden();
  navigieren();
})();
