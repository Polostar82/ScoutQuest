// sq-app.jsx — ScoutQuest main app: routing, state, screens
const { useState, useEffect, useRef, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "soundOn": true,
  "photoStyle": "real",
  "buttonSize": "large",
  "gameState": "idle"
}/*EDITMODE-END*/;

function hasTargetGps(loc) {
  return Number.isFinite(Number(loc?.lat)) && Number.isFinite(Number(loc?.lon));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMeters(aLat, aLon, bLat, bLon) {
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation nicht verfügbar"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onGuest }) {
  const [groupId, setGroupId] = useState("Wölfe");
  const [pw, setPw] = useState("");

  return (
    <div className="screen" style={{ background: "var(--forest)", color: "var(--paper)", animation: "screenIn .4s ease" }}>
      {/* Map texture bg */}
      <div style={{
        position: "absolute", inset: 0,
        background:
          "radial-gradient(80% 60% at 50% 30%, rgba(91,229,132,.15), transparent 60%),"+
          "radial-gradient(50% 40% at 80% 80%, rgba(232,125,62,.20), transparent 60%)",
        pointerEvents: "none",
      }}/>
      {/* topo lines */}
      <svg viewBox="0 0 390 400" preserveAspectRatio="none"
           style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 400, opacity: .12, pointerEvents: "none" }}>
        {[0,1,2,3,4,5].map(i => (
          <ellipse key={i} cx="200" cy="220" rx={70 + i * 38} ry={36 + i * 20} fill="none" stroke="#FAF5E6" strokeWidth="1"/>
        ))}
      </svg>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "48px 28px 24px", position: "relative", zIndex: 1 }}>

        {/* Logo block */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18, marginTop: 12 }}>
          <Logo size={72} />
          <div>
            <div className="display" style={{ fontSize: 52, color: "var(--paper)", fontWeight: 800, lineHeight: .95 }}>
              Scout<br/>Quest
            </div>
            <div style={{ marginTop: 14, fontSize: 16, color: "rgba(250,245,230,.7)", fontWeight: 600, maxWidth: 280, lineHeight: 1.35 }}>
              Finde Orte. Sammle Punkte.<br/>Werdet das schnellste Team.
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field icon="🐺" label="Gruppenname" value={groupId} onChange={setGroupId} placeholder="z.B. Adler" />
          <Field icon="🔒" label="Passwort"     value={pw}      onChange={setPw}      placeholder="••••••" type="password" />

          <button className="btn-primary" style={{ marginTop: 6, background: "var(--neon)", color: "var(--forest)", boxShadow: "0 4px 0 #2EB85F, 0 12px 24px -8px rgba(91,229,132,.4)" }}
                  onClick={() => onLogin(groupId)}>
            Spiel starten →
          </button>

          <button onClick={onGuest} style={{
            background: "transparent", color: "rgba(250,245,230,.9)",
            border: "2px solid rgba(250,245,230,.25)",
            borderRadius: 18,
            padding: "14px 18px",
            fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15,
            cursor: "pointer",
            marginTop: 4,
          }}>
            Als Gast spielen
          </button>
        </div>

        <div style={{ marginTop: 18, fontSize: 11, textAlign: "center", color: "rgba(250,245,230,.5)", fontWeight: 600, letterSpacing: ".05em" }}>
          PFADFINDER-STADTRALLYE · v 1.0
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, value, onChange, placeholder, type = "text" }) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "rgba(250,245,230,.07)",
      border: "1.5px solid rgba(250,245,230,.18)",
      borderRadius: 16,
      padding: "12px 16px",
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(250,245,230,.5)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{
            width: "100%",
            background: "transparent", border: 0, outline: 0,
            color: "var(--paper)",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
            padding: "2px 0 0",
          }}/>
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// SETUP SCREEN — Spieldauer & Orte einstellen
// ─────────────────────────────────────────────────────────────

// Stats lookup table: avg / record found, indexed by minutes-per-location bucket.
// (Realistic-looking dataset from "60 played games" — used for the tip card.)
function getStats(duration, locations) {
  const mpl = duration / locations;            // minutes per location
  // Avg success rate falls off fast under 5 min/loc, plateaus around 12 min/loc.
  const successRate = Math.min(0.95, Math.max(0.32, 0.18 + (mpl - 3) * 0.085));
  const avgFound = Math.round(locations * successRate);
  // Record is normally 90-100% of locations, depending on difficulty
  const recordRate = Math.min(1, successRate + 0.22 + (mpl > 8 ? 0.05 : 0));
  const recordFound = Math.min(locations, Math.max(avgFound + 1, Math.round(locations * recordRate)));
  // Best-recorded time it took the record team: their pace ~ mpl * 0.75
  const recordMinutes = Math.max(8, Math.round(recordFound * mpl * 0.78));
  return { avgFound, recordFound, recordMinutes, mpl };
}

function getDifficulty(mpl) {
  if (mpl < 5)  return { label: "Sehr schwer", color: "var(--red)",    bg: "rgba(230,57,70,.14)" };
  if (mpl < 7)  return { label: "Anspruchsvoll", color: "var(--orange-d)", bg: "rgba(232,125,62,.16)" };
  if (mpl < 11) return { label: "Faire Pace",  color: "var(--neon-d)",  bg: "rgba(91,229,132,.20)" };
  return         { label: "Entspannt",         color: "var(--navy)",    bg: "rgba(31,61,92,.14)" };
}

function getPointsPerLocation(mpl) {
  // Anchor: 7 min/loc → 100 pts. Harder = more points. Clamp 60–180.
  const raw = Math.round(100 * (7 / Math.max(2, mpl)));
  return Math.min(180, Math.max(60, Math.round(raw / 5) * 5));
}

// Erzeugt Slider-Marks: für Dauer nur Zahlen in step-Schritten, für Orte jede 2. Zahl
function makeSliderMarks(min, max, step, isLocation) {
  if (isLocation) {
    // Für Orte: jede 2. Zahl + min/max
    const vals = [min];
    let current = min + step * 2;
    while (current < max) {
      vals.push(current);
      current += step * 2;
    }
    if (vals[vals.length - 1] !== max) vals.push(max);
    return vals.map(v => ({ v, label: String(v) }));
  }
  // Für Dauer: nur Zahlen (keine Suffix), step-Schritte
  const vals = [];
  for (let v = min; v <= max; v += step) {
    vals.push(v);
  }
  return vals.map(v => ({ v, label: String(v) }));
}

function buildShuffledIndices(length) {
  if (!Number.isFinite(length) || length <= 0) return [];
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function SetupScreen({ groupName, initialDuration, initialLocations, onStart, onBack }) {
  const availableLocations = Math.max(1, Number(LOCATIONS?.length) || 0);
  const gsCfg = (() => { try { return JSON.parse(localStorage.getItem("scoutquest.admin.settings.v1") || "{}"); } catch(e) { return {}; } })();
  const durMin = Math.max(5,   (Number.isFinite(Number(gsCfg.durationMin))    && Number(gsCfg.durationMin)    > 0) ? Number(gsCfg.durationMin)    : 20);
  const durMax = Math.min(360, (Number.isFinite(Number(gsCfg.durationMax))    && Number(gsCfg.durationMax)    > 0) ? Number(gsCfg.durationMax)    : 180);
  const durDef = Math.max(durMin, Math.min(durMax, (Number.isFinite(Number(gsCfg.durationDefault)) && Number(gsCfg.durationDefault) > 0) ? Number(gsCfg.durationDefault) : 60));
  const [duration, setDuration]   = useState(initialDuration   ?? durDef);   // minutes
  const locations = availableLocations;

  const stats = getStats(duration, locations);
  const ppl   = getPointsPerLocation(stats.mpl);
  const gameEndLabel = new Date(Date.now() + duration * 60000).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="screen" style={{ background: "var(--paper)", animation: "screenIn .4s ease" }}>
      {/* Header */}
      <div style={{ padding: "20px 22px 18px", background: "var(--forest)", color: "var(--paper)", borderRadius: "0 0 22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{
            width: 36, height: 36, borderRadius: 12,
            background: "rgba(250,245,230,.10)", border: 0, cursor: "pointer",
            color: "var(--paper)",
            display: "grid", placeItems: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div className="label-cap" style={{ color: "rgba(250,245,230,.55)" }}>Spiel vorbereiten</div>
            <div className="display" style={{ fontSize: 24, marginTop: 2 }}>Bereit, <span style={{ color: "var(--neon)" }}>{groupName}</span>?</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "18px 18px 16px", minHeight: 0 }}>

        {/* Duration card */}
        <SettingCard
          icon="⏱"
          label="Spieldauer in Min"
          value={`${duration}`}
          unit="Min"
          min={durMin} max={durMax} step={30}
          sliderValue={duration}
          onSlide={setDuration}
          marks={makeSliderMarks(durMin, durMax, 30, false)}
        />

        {/* Stats tip card – fills remaining vertical space */}
        <div style={{
          padding: "18px 18px 16px",
          borderRadius: 22,
          background: "var(--forest)",
          color: "var(--paper)",
          marginBottom: 14,
          position: "relative",
          overflow: "hidden",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(91,229,132,.25), transparent 70%)" }}/>
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(232,125,62,.14), transparent 70%)" }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "var(--neon)", color: "var(--forest)",
              display: "grid", placeItems: "center", fontSize: 18,
            }}>📊</div>
            <div className="display" style={{ fontSize: 18, color: "var(--paper)" }}>Statistik für {duration} Min</div>
          </div>

          <div style={{
            flex: 1,
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            gap: 12,
            position: "relative",
          }}>
            <StatRow
              accent="var(--gold)"
              label="Im Durchschnitt finden Gruppen"
              big={`${stats.avgFound}`}
              small="Orte"
              sub={`in ${duration} Minuten`}
            />
            <div style={{ height: 1, background: "rgba(250,245,230,.12)" }}/>
            <StatRow
              accent="var(--neon)"
              label="Bestleistung in dieser Zeit"
              big={`${stats.recordFound}`}
              small="Orte"
              sub={`in ${stats.recordMinutes} Min`}
              trophy
            />
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: "rgba(250,245,230,.55)", fontWeight: 600, letterSpacing: ".04em", position: "relative" }}>
            Basierend auf 60 gespielten Runden in dieser Stadt
          </div>
        </div>

        {/* Start button */}
        <button className="btn-primary" onClick={() => onStart({ duration, locations, ppl })} style={{
          background: "var(--neon)", color: "var(--forest)",
          boxShadow: "0 4px 0 #2EB85F, 0 14px 28px -8px rgba(91,229,132,.5)",
        }}>
          <span style={{ fontSize: 22 }}>🚩</span>
          Spiel starten
        </button>

        <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "var(--ink-2)", fontWeight: 600 }}>
          Spielende um <b style={{ color: "var(--ink)" }}>{gameEndLabel}</b> · Start: <b style={{ color: "var(--ink)" }}>Kirche</b>
        </div>
      </div>
    </div>
  );
}

function SettingCard({ icon, label, value, unit, min, max, step, sliderValue, onSlide, marks }) {
  const pct = ((sliderValue - min) / (max - min)) * 100;
  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid rgba(20,24,26,.06)",
      borderRadius: 20,
      padding: "14px 16px 12px",
      marginBottom: 12,
      boxShadow: "0 1px 0 rgba(20,24,26,.03)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 11,
          background: "var(--paper-2)",
          display: "grid", placeItems: "center", fontSize: 18,
        }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div className="label-cap">{label}</div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <div className="display" style={{ fontSize: 30, color: "var(--forest)", lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 700 }}>{unit}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, position: "relative", height: 36 }}>
        {/* Track */}
        <div style={{
          position: "absolute", top: 14, left: 0, right: 0, height: 8,
          background: "var(--paper-2)", borderRadius: 99,
        }}/>
        {/* Filled */}
        <div style={{
          position: "absolute", top: 14, left: 0, height: 8,
          width: `${pct}%`,
          background: "linear-gradient(90deg, var(--forest), var(--moss-2))",
          borderRadius: 99,
        }}/>
        <input type="range"
          min={min} max={max} step={step}
          value={sliderValue}
          onChange={(e) => onSlide(Number(e.target.value))}
          style={{
            position: "absolute", inset: 0, width: "100%", height: 36,
            opacity: 0, cursor: "pointer", margin: 0,
          }}/>
        {/* Thumb */}
        <div style={{
          position: "absolute", top: 5, left: `calc(${pct}% - 13px)`,
          width: 26, height: 26, borderRadius: "50%",
          background: "var(--forest)",
          border: "3px solid var(--paper)",
          boxShadow: "0 3px 8px -2px rgba(20,24,26,.4)",
          pointerEvents: "none",
        }}/>
      </div>

      {/* Marks — positioned at actual track percentages */}
      <div style={{ position: "relative", height: 18, marginTop: 2 }}>
        {marks.map(m => {
          const mpct = ((m.v - min) / (max - min)) * 100;
          const active = Math.abs(sliderValue - m.v) <= (step / 2);
          return (
            <button key={m.v} onClick={() => onSlide(m.v)} style={{
              position: "absolute",
              left: `${mpct}%`,
              top: 0,
              transform: "translateX(-50%)",
              background: "transparent", border: 0, cursor: "pointer",
              padding: "0 2px",
              fontFamily: "var(--font-mono)", fontSize: 11,
              fontWeight: 700, whiteSpace: "nowrap",
              color: active ? "var(--forest)" : "var(--ink-2)",
            }}>{m.label}</button>
          );
        })}
      </div>
    </div>
  );
}

function StatRow({ accent, label, big, small, sub, trophy }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(250,245,230,.08)",
        border: `1.5px solid ${accent}`,
        color: accent,
        display: "grid", placeItems: "center",
      }}>
        {trophy
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M5 6H3v2a3 3 0 003 3M19 6h2v2a3 3 0 01-3 3"/><path d="M9 17h6M12 13v4M8 21h8"/>
            </svg>
          : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>
            </svg>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "rgba(250,245,230,.68)", fontWeight: 600 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
          <div className="display" style={{ fontSize: 22, color: accent, lineHeight: 1 }}>{big}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(250,245,230,.75)" }}>{small}</div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "rgba(250,245,230,.55)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GAME SCREEN
// ─────────────────────────────────────────────────────────────
function GameScreen({ groupName, score, found, total, timer, rank, currentLoc,
                      photoStyle, buttonSize,
                      hintsUsed, onOpenHint, onSkip, onCheckGps }) {
  const loc = currentLoc || LOCATIONS[0] || DEFAULT_LOCATIONS[0];
  const btnSize = buttonSize === "huge" ? 26 : buttonSize === "medium" ? 19 : 22;
  const btnPad  = buttonSize === "huge" ? "28px 24px" : buttonSize === "medium" ? "18px 22px" : "22px 24px";

  return (
    <div className="screen" style={{ animation: "screenIn .4s ease" }}>
      <TopBar groupName={groupName} score={score} found={found} total={total} timer={timer} rank={rank} />

      {/* Scrollable middle: cue + photo + secondary */}
      <div className="screen-scroll" style={{ padding: "12px 18px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 9, background: "var(--orange)", color: "var(--paper)",
                        display: "grid", placeItems: "center", fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {String(found + 1).padStart(2, "0")}
          </div>
          <div>
            <div className="label-cap" style={{ color: "var(--ink-2)", fontSize: 10 }}>Aktueller Auftrag</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--forest)", lineHeight: 1 }}>
              Findet diesen Ort
            </div>
          </div>
        </div>

        <LocationPhoto loc={loc} style={photoStyle} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <button className="btn-hint" onClick={onOpenHint} style={{ padding: "12px 12px", fontSize: 14 }}>
            <span>💡</span> Hinweis
            <span style={{ marginLeft: "auto", background: "rgba(31,58,43,.18)", color: "var(--forest)", padding: "2px 7px", borderRadius: 99, fontSize: 11 }}>
              {2 - hintsUsed}
            </span>
          </button>
          <button className="btn-skip" onClick={onSkip} style={{ padding: "12px 12px", fontSize: 14 }}>
            <span>⏭</span> Überspringen
          </button>
        </div>
      </div>

      {/* Pinned primary action */}
      <div style={{
        flexShrink: 0,
        padding: "8px 18px 14px",
        background: "linear-gradient(to top, var(--paper) 60%, rgba(250,245,230,0))",
      }}>
        <button className="btn-primary"
          onClick={onCheckGps}
          style={{
            background: "var(--neon)",
            color: "var(--forest)",
            boxShadow: "0 4px 0 #2EB85F, 0 14px 28px -8px rgba(91,229,132,.5)",
            fontSize: btnSize, padding: btnPad,
          }}>
          <span style={{ fontSize: btnSize + 2 }}>📍</span>
          Wir sind da!
        </button>
        <div style={{
          marginTop: 6, textAlign: "center",
          fontSize: 10.5, color: "var(--ink-2)", fontWeight: 600, letterSpacing: ".04em",
        }}>
          GPS wird erst beim Drücken geprüft · Radius 20 m
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RANKING SCREEN
// ─────────────────────────────────────────────────────────────
function RankingScreen({ groupName, isGuest, teams: teamsProp }) {
  const [filter, setFilter] = useState("all");
  const teams = useMemo(() => teamsProp.map(t => ({ ...t, you: !isGuest && t.name === groupName })), [teamsProp, groupName, isGuest]);
  const filtered = useMemo(() => {
    if (filter === "active") return teams.filter(t => t.live);
    if (filter === "members") return teams.filter(t => !t.guest);
    if (filter === "guests") return teams.filter(t => t.guest);
    return teams;
  }, [teams, filter]);
  const showPodium = filtered.length >= 3;
  const filterLabel = { all: "Alle Teams", active: "Aktive Teams", members: "Mitglieder", guests: "Gast-Teams" }[filter];
  return (
    <div className="screen papery" style={{ animation: "screenIn .4s ease" }}>
      <div style={{ padding: "18px 22px 8px", background: "var(--forest)", color: "var(--paper)", borderRadius: "0 0 22px 22px" }}>
        <div className="label-cap" style={{ color: "rgba(250,245,230,.55)" }}>Live</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 2 }}>
          <div className="display" style={{ fontSize: 30 }}>Ranking</div>
          <div className="mono" style={{ fontSize: 13, color: "rgba(250,245,230,.7)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--neon)", animation: "timerTick 1.4s infinite" }}/>
            aktualisiert
          </div>
        </div>
        <div style={{ marginTop: 14, marginBottom: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pill active={filter === "all"} onClick={() => setFilter("all")}>Alle Teams</Pill>
          <Pill active={filter === "active"} onClick={() => setFilter("active")}>Aktiv</Pill>
          <Pill active={filter === "members"} onClick={() => setFilter("members")}>Mitglieder</Pill>
          <Pill active={filter === "guests"} onClick={() => setFilter("guests")}>Gäste</Pill>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 14, fontSize: 11, color: "rgba(250,245,230,.7)", fontWeight: 600 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--neon)" }}/>aktiv
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: "#9A9A9A" }}/>beendet
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ padding: "1px 6px", borderRadius: 5, background: "rgba(242,201,76,.22)", color: "var(--gold)", fontSize: 9, fontWeight: 800, letterSpacing: ".1em" }}>GAST</span>
            Gast-Team
          </span>
        </div>
      </div>

      <div className="screen-scroll" style={{ padding: "16px 18px 18px" }}>
        {showPodium && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1.15fr 1fr", gap: 8,
            marginBottom: 16, alignItems: "end",
          }}>
            <Podium team={filtered[1]} place={2} h={88}  color="#C2C2C2" />
            <Podium team={filtered[0]} place={1} h={108} color="var(--gold)" />
            <Podium team={filtered[2]} place={3} h={74}  color="#B98559" />
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", borderRadius: 16, background: "var(--paper-2)", border: "1px dashed rgba(20,24,26,.15)", color: "var(--ink-2)", fontWeight: 600 }}>
            Keine Teams in <b style={{ color: "var(--ink)" }}>{filterLabel}</b>.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(t => <TeamRow key={t.rank} t={t} />)}
          </div>
        )}

        {isGuest && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: "var(--paper-2)", border: "1px dashed rgba(20,24,26,.15)", fontSize: 13, color: "var(--ink-2)", fontWeight: 600, textAlign: "center" }}>
            Als Gast erscheint ihr nach <b style={{ color: "var(--ink)" }}>4 gefundenen Orten</b> im Ranking.
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 99,
      fontSize: 12, fontWeight: 700,
      background: active ? "var(--paper)" : "transparent",
      color: active ? "var(--forest)" : "rgba(250,245,230,.7)",
      border: active ? "1px solid var(--paper)" : "1px solid rgba(250,245,230,.18)",
      cursor: "pointer", fontFamily: "inherit",
    }}>{children}</button>
  );
}

function Podium({ team, place, h, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: "var(--forest)", color: "var(--paper)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20,
        border: `3px solid ${color}`,
      }}>{team.name.slice(0, 1)}</div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--forest)" }}>{team.name}</div>
      <div className="mono" style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 700 }}>{team.score}</div>
      <div style={{
        width: "100%", height: h,
        background: color,
        borderRadius: "10px 10px 4px 4px",
        display: "grid", placeItems: "start center",
        padding: "10px 0",
        color: "var(--forest)",
        fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22,
        boxShadow: "inset 0 -8px 0 rgba(20,24,26,.12)",
      }}>{place}</div>
    </div>
  );
}

function TeamRow({ t }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px",
      borderRadius: 16,
      background: t.you ? "var(--forest)" : "var(--paper)",
      color: t.you ? "var(--paper)" : "var(--ink)",
      border: t.you ? "0" : "1px solid rgba(20,24,26,.06)",
      boxShadow: t.you ? "0 8px 18px -8px rgba(31,58,43,.45)" : "0 1px 0 rgba(20,24,26,.04)",
    }}>
      <div className="mono" style={{
        width: 32, textAlign: "center",
        fontSize: 18, fontWeight: 700,
        color: t.you ? "var(--neon)" : "var(--ink-2)",
      }}>#{t.rank}</div>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: t.you ? "var(--neon)" : "var(--paper-2)",
        color: t.you ? "var(--forest)" : "var(--forest)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16,
      }}>{t.name.slice(0, 1)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{t.name}</div>
          {t.you && <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".1em", padding: "2px 6px", borderRadius: 6, background: "var(--neon)", color: "var(--forest)" }}>DU</span>}
          {t.guest && <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: ".1em",
            padding: "2px 6px", borderRadius: 6,
            background: "rgba(242,201,76,.22)",
            color: t.you ? "var(--gold)" : "var(--orange-d)",
            border: t.you ? "1px solid rgba(242,201,76,.35)" : "1px solid rgba(232,125,62,.35)",
          }}>GAST</span>}
          <span style={{ width: 7, height: 7, borderRadius: 99, background: t.live ? "var(--neon)" : "#9A9A9A", marginLeft: "auto" }}/>
        </div>
        <div style={{ fontSize: 12, color: t.you ? "rgba(250,245,230,.65)" : "var(--ink-2)", fontWeight: 600, marginTop: 1 }}>
          {t.found} Orte · {t.time}
        </div>
      </div>
      <div className="mono" style={{
        fontSize: 20, fontWeight: 700,
        color: t.you ? "var(--neon)" : "var(--forest)",
      }}>{t.score}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROFILE / RULES SCREEN
// ─────────────────────────────────────────────────────────────
function ProfileScreen({ groupName, score, found, total, soundOn, onToggleSound, onLogout }) {
  return (
    <div className="screen papery" style={{ animation: "screenIn .4s ease" }}>
      <div style={{ padding: "20px 22px 22px", background: "var(--forest)", color: "var(--paper)", borderRadius: "0 0 22px 22px" }}>
        <div className="label-cap" style={{ color: "rgba(250,245,230,.55)" }}>Profil</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "var(--neon)", color: "var(--forest)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30,
          }}>{groupName.slice(0,1)}</div>
          <div>
            <div className="display" style={{ fontSize: 26 }}>{groupName}</div>
            <div style={{ fontSize: 13, color: "rgba(250,245,230,.7)", fontWeight: 600 }}>
              {found}/{total} Orte · {score} Punkte
            </div>
          </div>
        </div>
      </div>

      <div className="screen-scroll" style={{ padding: "16px 18px 20px" }}>
        {/* Rules card */}
        <Card title="So funktioniert's">
          <Rule num="1" title="Foto ansehen" body="Auf dem Bild seht ihr einen Ort in eurer Stadt." />
          <Rule num="2" title="Hingehen"     body="Lauft als Gruppe gemeinsam zu diesem Ort." />
          <Rule num="3" title="Bestätigen"   body="Drückt am Ort den grünen Button „Wir sind da!“." />
          <Rule num="4" title="Punkte holen" body="Innerhalb von 20 m gibt's Punkte – je schneller, desto mehr." />
        </Card>

        <Card title="Punkte">
          <PointLine label="Ort gefunden"       points="+100"  good />
          <PointLine label="Schnell gefunden"   points="+50"   good />
          <PointLine label="Hinweis genutzt"    points="–30" />
          <PointLine label="Überspringen"       points="–150" bad />
        </Card>

        <Card title="Einstellungen">
          <SettingRow icon="🔊" label="Sounds"
            right={<Toggle on={soundOn} onChange={onToggleSound} />} />
          <SettingRow icon="📍" label="GPS-Berechtigung" right={<div className="chip">Aktiv</div>} />
          <SettingRow icon="🌍" label="Sprache" right={<div className="chip">Deutsch</div>} />
        </Card>

        <button onClick={onLogout} style={{
          width: "100%", marginTop: 14,
          background: "transparent",
          border: "2px solid rgba(230,57,70,.4)",
          color: "var(--red)",
          padding: "14px 18px",
          borderRadius: 16,
          fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 15,
          cursor: "pointer",
        }}>
          Spiel verlassen
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{
      background: "var(--paper)",
      border: "1px solid rgba(20,24,26,.06)",
      borderRadius: 20,
      padding: "14px 16px",
      marginBottom: 12,
      boxShadow: "0 1px 0 rgba(20,24,26,.03)",
    }}>
      <div className="label-cap" style={{ marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function Rule({ num, title, body }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div className="mono" style={{
        width: 30, height: 30, borderRadius: 10,
        background: "var(--forest)", color: "var(--neon)",
        display: "grid", placeItems: "center",
        fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>{num}</div>
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.35 }}>{body}</div>
      </div>
    </div>
  );
}

function PointLine({ label, points, good, bad }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      <div className="mono" style={{
        fontWeight: 700, fontSize: 14,
        color: good ? "var(--neon-d)" : bad ? "var(--red)" : "var(--ink-2)",
      }}>{points}</div>
    </div>
  );
}

function SettingRow({ icon, label, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{label}</div>
      {right}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 50, height: 28, borderRadius: 99, border: 0,
      background: on ? "var(--neon-d)" : "rgba(20,24,26,.18)",
      position: "relative", cursor: "pointer",
      transition: "background .2s ease",
    }}>
      <span style={{
        position: "absolute", top: 3, left: on ? 25 : 3,
        width: 22, height: 22, borderRadius: 99,
        background: "var(--paper)",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        transition: "left .2s ease",
      }}/>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// GAME COMPLETE SCREEN
// ─────────────────────────────────────────────────────────────
function CompleteScreen({ groupName, score, found, total, time, rank, isGuest, onOpenGuestSave, onRestart }) {
  return (
    <div className="screen" style={{ background: "var(--forest)", color: "var(--paper)", animation: "screenIn .4s ease" }}>
      <Confetti />
      <div style={{ position: "absolute", inset: 0,
        background: "radial-gradient(60% 50% at 50% 30%, rgba(91,229,132,.22), transparent 60%)",
        pointerEvents: "none" }}/>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "36px 24px 22px", position: "relative", zIndex: 1 }}>
        <div className="label-cap" style={{ color: "rgba(250,245,230,.55)", textAlign: "center" }}>Spiel beendet</div>
        <div className="display" style={{ fontSize: 44, fontWeight: 800, textAlign: "center", lineHeight: .95, marginTop: 6 }}>
          Geschafft,<br/>
          <span style={{ color: "var(--neon)" }}>{groupName}!</span>
        </div>

        {isGuest && (
          <div style={{
            marginTop: 12, padding: "4px 12px",
            borderRadius: 99,
            background: "rgba(242,201,76,.18)", color: "var(--gold)",
            border: "1px solid rgba(242,201,76,.35)",
            fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase",
            alignSelf: "center",
          }}>Gast-Spiel</div>
        )}

        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <BigStat label="Punkte"      value={score}        accent="var(--neon)"   />
          <BigStat label="Position"    value={`#${rank}`}   accent="var(--gold)"   />
          <BigStat label="Orte"        value={`${found}/${total}`} accent="var(--paper)" />
          <BigStat label="Zeit"        value={time}         accent="var(--orange)" mono />
        </div>

        {/* Medal */}
        <div style={{ flex: 1, display: "grid", placeItems: "center", margin: "4px 0" }}>
          <div style={{ position: "relative", width: 130, height: 130 }}>
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              background: "conic-gradient(from 220deg, var(--gold), var(--orange), var(--gold))",
              animation: "spin 16s linear infinite",
            }}/>
            <div style={{
              position: "absolute", inset: 8,
              borderRadius: "50%",
              background: "var(--forest)",
              display: "grid", placeItems: "center",
              border: "3px solid var(--gold)",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 34 }}>🏆</div>
                <div className="display" style={{ fontSize: 12, color: "var(--gold)", letterSpacing: ".05em" }}>SILBER</div>
              </div>
            </div>
          </div>
        </div>

        {isGuest ? (
          <button className="btn-primary" onClick={onOpenGuestSave}
                  style={{ background: "var(--neon)", color: "var(--forest)", boxShadow: "0 4px 0 #2EB85F, 0 14px 24px -8px rgba(91,229,132,.4)", fontSize: 19, padding: "18px 22px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
            Ergebnis sichern
          </button>
        ) : (
          <button className="btn-primary" onClick={onRestart}
                  style={{ background: "var(--neon)", color: "var(--forest)", boxShadow: "0 4px 0 #2EB85F, 0 14px 24px -8px rgba(91,229,132,.4)" }}>
            Nochmal spielen →
          </button>
        )}
        <button onClick={onRestart} style={{
          marginTop: 8, background: "transparent",
          border: "2px solid rgba(250,245,230,.25)", color: "var(--paper)",
          padding: "14px", borderRadius: 16,
          fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>
          {isGuest ? "Ohne Speichern beenden" : "Ranking ansehen"}
        </button>
      </div>
    </div>
  );
}

function BigStat({ label, value, accent, mono }) {
  return (
    <div style={{
      background: "rgba(250,245,230,.07)",
      border: "1px solid rgba(250,245,230,.15)",
      borderRadius: 16,
      padding: "12px 14px",
    }}>
      <div style={{ fontSize: 10, color: "rgba(250,245,230,.55)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div className={mono ? "mono" : "display"} style={{ fontSize: 28, color: accent, fontWeight: 800, marginTop: 2, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // App routing
  const [screen, setScreen] = useState("login");       // login | setup | app | complete
  const [tab, setTab] = useState("game");              // game | ranking | profile
  const [groupName, setGroupName] = useState("Wölfe");
  const [isGuest, setIsGuest] = useState(false);
  const [showGuestSave, setShowGuestSave] = useState(false);

  // Setup
  const [duration, setDuration]   = useState(60);   // minutes
  const [locations, setLocations] = useState(Math.max(1, Number(LOCATIONS?.length) || 0));
  const [ppl, setPpl]             = useState(100);  // points per location

  // Game state
  const [score, setScore] = useState(0);
  const [found, setFound] = useState(0);
  const total = locations;
  const [timer, setTimer] = useState(1834);
  const [roundOrder, setRoundOrder] = useState(() => buildShuffledIndices(LOCATIONS.length));
  const [roundPos, setRoundPos] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);

  // Teams ranking
  const [teams, setTeams] = useState([]);

  // Modal state
  const [hintOpen, setHintOpen] = useState(false);
  const [skipOpen, setSkipOpen] = useState(false);
  const [gpsState, setGpsState] = useState(null); // 'checking' | 'success' | 'error' | null
  const [gpsErrorDistance, setGpsErrorDistance] = useState(null);

  const currentLoc = useMemo(() => {
    if (!LOCATIONS.length) return null;
    if (!roundOrder.length) return LOCATIONS[0];
    const idx = roundOrder[Math.max(0, Math.min(roundPos, roundOrder.length - 1))];
    return LOCATIONS[idx] || LOCATIONS[0];
  }, [roundOrder, roundPos]);

  // Live-Position aus dem Ranking
  const myRank = useMemo(() => {
    const sorted = [...teams].sort((a, b) => b.score - a.score).map((t, i) => ({ ...t, rank: i + 1 }));
    const myTeam = sorted.find(t => t.name === groupName);
    return myTeam ? myTeam.rank : 1;
  }, [teams, groupName]);

  const advanceToNextLocation = () => {
    if (!LOCATIONS.length) return;
    if (!roundOrder.length || roundPos >= roundOrder.length - 1) {
      setRoundOrder(buildShuffledIndices(LOCATIONS.length));
      setRoundPos(0);
      return;
    }
    setRoundPos((pos) => pos + 1);
  };

  // Timer tick (countdown)
  useEffect(() => {
    if (screen !== "app") return;
    const id = setInterval(() => setTimer(x => Math.max(0, x - 1)), 1000);
    return () => clearInterval(id);
  }, [screen]);

  useEffect(() => {
    if (screen !== "app") return;
    if (timer <= 0) {
      setScreen("complete");
    }
  }, [timer, screen]);

  // Tweak: gameState → drive overlay
  useEffect(() => {
    if (screen !== "app") return;
    if (t.gameState === "idle")     { setGpsState(null); }
    if (t.gameState === "checking") { setGpsState("checking"); }
    if (t.gameState === "success")  { setGpsState("success"); }
    if (t.gameState === "error")    { setGpsState("error"); }
  }, [t.gameState, screen]);

  // Handlers
  const handleLogin = (name) => { setGroupName(name || "Wölfe"); setIsGuest(false); setScreen("setup"); };
  const handleGuest = ()    => { setGroupName("Gast"); setIsGuest(true); setScreen("setup"); };
  const handleLogout = ()   => { setScreen("login"); };

  // Load teams from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("scoutquest.teams.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter(t => t.name && t.name.trim()).sort((a, b) => (b.score ?? b.points ?? 0) - (a.score ?? a.points ?? 0));
        const ranked = filtered.map((t, i) => ({ ...t, score: t.score ?? t.points ?? 0, rank: i + 1, live: true, you: false, guest: t.guest === true }));
        setTeams(ranked);
      }
    } catch (e) { console.error(e); }
  }, []);

  const handleStartGame = ({ duration: d, locations: l, ppl: p }) => {
    setDuration(d); setLocations(l); setPpl(p);
    setFound(0); setScore(0); setTimer(d * 60);
    setRoundOrder(buildShuffledIndices(LOCATIONS.length));
    setRoundPos(0);
    setScreen("app"); setTab("game");
  };

  const handleCheckGps = async () => {
    if (!LOCATIONS.length) {
      setGpsErrorDistance(null);
      setTweak("gameState", "error");
      return;
    }
    setGpsErrorDistance(null);
    setTweak("gameState", "checking");

    if (hasTargetGps(currentLoc)) {
      try {
        const pos = await getCurrentPosition();
        const distance = haversineMeters(
          Number(currentLoc.lat),
          Number(currentLoc.lon),
          pos.coords.latitude,
          pos.coords.longitude
        );
        setGpsErrorDistance(distance);
        setTweak("gameState", distance <= 20 ? "success" : "error");
      } catch (err) {
        setGpsErrorDistance(null);
        setTweak("gameState", "error");
      }
      return;
    }

    setTimeout(() => {
      // Ohne Zielkoordinaten bleibt der Prototyp-Modus wie bisher simuliert.
      const win = Math.random() > 0.35;
      setTweak("gameState", win ? "success" : "error");
    }, 1800);
  };

  const closeOverlay = () => {
    if (gpsState === "success") {
      setScore(s => s + ppl);
      setFound(f => f + 1);
      advanceToNextLocation();
      setHintsUsed(0);
    }
    setGpsErrorDistance(null);
    setTweak("gameState", "idle");
  };

  const handleSkipConfirm = () => {
    setSkipOpen(false);
    setScore(s => s - 150);
    advanceToNextLocation();
    setHintsUsed(0);
  };

  const handleUseHint = () => {
    if (hintsUsed < 2) {
      setHintsUsed(h => h + 1);
      setScore(s => s - 30);
    }
  };

  // Render
  let body;
  if (screen === "login")    body = <LoginScreen onLogin={handleLogin} onGuest={handleGuest} />;
  else if (screen === "setup") body = <SetupScreen groupName={groupName} initialDuration={duration} initialLocations={locations} onStart={handleStartGame} onBack={() => setScreen("login")} />;
  else if (screen === "complete") body = <CompleteScreen groupName={groupName} score={score} found={found} total={total} time={fmt(timer)} rank={myRank} isGuest={isGuest} onOpenGuestSave={() => setShowGuestSave(true)} onRestart={() => { setScreen("setup"); setFound(0); setScore(0); setTimer(0); setRoundOrder(buildShuffledIndices(LOCATIONS.length)); setRoundPos(0); }} />;
  else {
    const tabBody = tab === "game"
      ? <GameScreen
          groupName={groupName} score={score} found={found} total={total} timer={timer}
          rank={myRank}
          currentLoc={currentLoc}
          photoStyle={t.photoStyle} buttonSize={t.buttonSize}
          hintsUsed={hintsUsed}
          onOpenHint={() => setHintOpen(true)}
          onSkip={() => setSkipOpen(true)}
          onCheckGps={handleCheckGps}
        />
      : tab === "ranking"
        ? <RankingScreen groupName={groupName} isGuest={isGuest} teams={teams} />
        : <ProfileScreen
            groupName={groupName} score={score} found={found} total={total}
            soundOn={t.soundOn} onToggleSound={(v) => setTweak("soundOn", v)}
            onLogout={handleLogout}
          />;
    body = (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{tabBody}</div>
        <BottomNav tab={tab} onChange={setTab} />
        <HintSheet open={hintOpen} loc={currentLoc || LOCATIONS[0] || DEFAULT_LOCATIONS[0]} hintsUsed={hintsUsed}
                   onUseHint={handleUseHint} onClose={() => setHintOpen(false)} />
        <SkipDialog open={skipOpen} onCancel={() => setSkipOpen(false)} onConfirm={handleSkipConfirm} />
        <GpsOverlay state={gpsState} onClose={closeOverlay} errorDistance={gpsErrorDistance} />
      </div>
    );
  }

  return (
    <>
      {body}
      <GuestSaveSheet
        open={showGuestSave}
        groupName={groupName}
        score={score} found={found} total={total}
        onClose={() => setShowGuestSave(false)}
        onSaved={(savedName, savedMode, savedPw) => {
          const timeStr = fmt(Math.max(0, duration * 60 - timer));
          const finalName = savedName && savedName.trim() ? savedName.trim() : (groupName || "Gast");
          const isRegister = savedMode === "register";
          const others = teams.filter(t => t.name !== finalName);
          const newTeamId = Date.now();
          const newTeam = { id: newTeamId, name: finalName, score, found, time: timeStr, live: false, you: false, guest: true, password: isRegister ? (savedPw || "") : "" };
          const updated = [...others, newTeam].sort((a, b) => b.score - a.score).map((t, i) => ({ ...t, rank: i + 1 }));
          localStorage.setItem("scoutquest.teams.v1", JSON.stringify(updated));
          setTeams(updated);
          if (isRegister) {
            try {
              const raw = localStorage.getItem("scoutquest.guest-requests.v1");
              const reqs = raw ? JSON.parse(raw) : [];
              reqs.push({ type: "register", teamId: newTeamId, name: finalName, password: savedPw || "", score, found, requestedAt: new Date().toISOString() });
              localStorage.setItem("scoutquest.guest-requests.v1", JSON.stringify(reqs));
            } catch(e) { console.error(e); }
          }
          setGroupName(finalName);
          setIsGuest(true);
          setShowGuestSave(false);
          setScreen("app");
          setTab("ranking");
        }}
      />

      <TweaksPanel title="ScoutQuest">
        <TweakSection label="Game state" />
        <TweakRadio label="Status" value={t.gameState}
          options={["idle", "checking", "success", "error"]}
          onChange={(v) => setTweak("gameState", v)} />
        <div style={{ fontSize: 10.5, color: "rgba(41,38,27,.55)", lineHeight: 1.4 }}>
          Springt direkt in den GPS-Check, Erfolg oder Fehler.
        </div>

        <TweakSection label="Look & feel" />
        <TweakRadio label="Foto" value={t.photoStyle}
          options={["real", "placeholder"]}
          onChange={(v) => setTweak("photoStyle", v)} />
        <TweakRadio label="Hauptbutton" value={t.buttonSize}
          options={["medium", "large", "huge"]}
          onChange={(v) => setTweak("buttonSize", v)} />

        <TweakSection label="Audio" />
        <TweakToggle label="Sounds aktiv" value={t.soundOn}
          onChange={(v) => setTweak("soundOn", v)} />

        <TweakSection label="Navigation" />
        <TweakSelect label="Screen" value={screen === "app" ? tab : screen}
          options={["login", "setup", "game", "ranking", "profile", "complete"]}
          onChange={(v) => {
            if (v === "login")    { setScreen("login"); }
            else if (v === "setup") { setScreen("setup"); }
            else if (v === "complete") { setScreen("complete"); }
            else { setScreen("app"); setTab(v); }
          }} />
      </TweaksPanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// GUEST SAVE SHEET — choose: save only OR save + register account
// ─────────────────────────────────────────────────────────────
function GuestSaveSheet({ open, groupName, score, found, total, onClose, onSaved }) {
  const [step, setStep] = useState("choose"); // choose | register | saved
  const [name, setName] = useState(groupName === "Gast" ? "" : groupName);
  const [pw, setPw]   = useState("");
  const [pw2, setPw2] = useState("");
  const [mode, setMode] = useState(null); // 'save' | 'register'

  useEffect(() => {
    if (open) { setStep("choose"); setMode(null); setName(groupName === "Gast" ? "" : groupName); setPw(""); setPw2(""); }
  }, [open, groupName]);

  if (!open) return null;

  const nameValid = name.trim().length >= 2;
  const pwValid   = pw.length >= 4 && pw === pw2;

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0,
      background: "rgba(20,24,26,.7)",
      backdropFilter: "blur(10px)",
      zIndex: 40,
      display: "flex", alignItems: "flex-end",
      animation: "screenIn .25s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%",
        background: "var(--paper)",
        borderRadius: "24px 24px 0 0",
        padding: "16px 22px 24px",
        boxShadow: "0 -10px 30px -10px rgba(20,24,26,.4)",
        animation: "screenIn .35s cubic-bezier(.2,.9,.3,1.1)",
        maxHeight: "92%", overflowY: "auto",
      }}>
        <div style={{ width: 44, height: 5, background: "var(--sand-2)", borderRadius: 99, margin: "0 auto 14px" }}/>

        {step === "choose" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: "var(--neon)", color: "var(--forest)",
                            display: "grid", placeItems: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7"/>
                </svg>
              </div>
              <div>
                <div className="display" style={{ fontSize: 22, color: "var(--forest)" }}>Ergebnis sichern</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>Wie möchtet ihr weitermachen?</div>
              </div>
            </div>

            {/* result preview */}
            <div className="papery-dark" style={{
              padding: "12px 14px", borderRadius: 16,
              color: "var(--paper)",
              marginBottom: 14,
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            }}>
              <Mini label="Punkte"   value={score}            accent="var(--neon)" />
              <Mini label="Gefunden" value={`${found}/${total}`} accent="var(--gold)" />
              <Mini label="Status"   value="Gast"             accent="var(--orange)" />
            </div>

            <button onClick={() => { setMode("save"); setStep("saved"); }} style={optionBtn(false)}>
              <OptIcon><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg></OptIcon>
              <div style={{ textAlign: "left", flex: 1 }}>
                <div className="display" style={{ fontSize: 17, color: "var(--forest)" }}>Nur Ergebnis speichern</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600, marginTop: 2 }}>
                  Erscheint im Ranking als Gast-Team
                </div>
              </div>
            </button>

            <button onClick={() => { setMode("register"); setStep("register"); }} style={optionBtn(true)}>
              <OptIcon highlight>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M19 8v6M22 11h-6"/>
                </svg>
              </OptIcon>
              <div style={{ textAlign: "left", flex: 1 }}>
                <div className="display" style={{ fontSize: 17, color: "var(--paper)" }}>Speichern + Profil anlegen</div>
                <div style={{ fontSize: 12, color: "rgba(250,245,230,.7)", fontWeight: 600, marginTop: 2 }}>
                  Gruppe registrieren mit Passwort
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </button>

            <button onClick={onClose} style={{
              width: "100%", marginTop: 12,
              background: "transparent", border: 0,
              color: "var(--ink-2)",
              padding: "10px",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
              cursor: "pointer",
            }}>
              Verwerfen und beenden
            </button>
          </>
        )}

        {step === "register" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button onClick={() => setStep("choose")} style={{
                width: 32, height: 32, borderRadius: 10,
                background: "var(--paper-2)", border: 0, cursor: "pointer",
                color: "var(--ink)",
                display: "grid", placeItems: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6"/>
                </svg>
              </button>
              <div>
                <div className="display" style={{ fontSize: 22, color: "var(--forest)" }}>Profil anlegen</div>
                <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>Damit eure Gruppe wiederkommen kann</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <LightField label="Gruppenname" value={name} onChange={setName} placeholder="z.B. Sommerlager 2026" valid={nameValid} hint="mind. 2 Zeichen" />
              <LightField label="Passwort"       value={pw}  onChange={setPw}  placeholder="••••••" type="password" valid={pw.length >= 4} hint="mind. 4 Zeichen" />
              <LightField label="Passwort bestätigen" value={pw2} onChange={setPw2} placeholder="••••••" type="password" valid={pw2.length >= 4 && pw === pw2} hint={pw2.length > 0 && pw !== pw2 ? "Passwörter stimmen nicht überein" : "muss übereinstimmen"} />
            </div>

            <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "var(--paper-2)",
                          fontSize: 12, color: "var(--ink-2)", fontWeight: 600, display: "flex", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔒</span>
              <span>Eure Daten bleiben in der App, kein Tracking, kein Standort-Teilen.</span>
            </div>

            <button onClick={() => { if (nameValid && pwValid) setStep("saved"); }}
                    disabled={!(nameValid && pwValid)}
                    className="btn-primary"
                    style={{
                      marginTop: 14,
                      background: "var(--forest)",
                      color: "var(--paper)",
                      boxShadow: "0 4px 0 #0E2218, 0 12px 24px -8px rgba(31,58,43,.5)",
                      opacity: (nameValid && pwValid) ? 1 : .5,
                    }}>
              Profil erstellen
            </button>
          </>
        )}

        {step === "saved" && (
          <>
            <div style={{ display: "grid", placeItems: "center", padding: "16px 0 8px" }}>
              <div style={{
                width: 84, height: 84, borderRadius: "50%",
                background: "var(--neon)", color: "var(--forest)",
                display: "grid", placeItems: "center",
                boxShadow: "0 0 0 10px rgba(91,229,132,.18)",
                animation: "pop .45s cubic-bezier(.2,.9,.3,1.2)",
              }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7"/>
                </svg>
              </div>
            </div>
            <div className="display" style={{ fontSize: 24, color: "var(--forest)", textAlign: "center", marginTop: 4 }}>
              {mode === "register" ? "Profil angelegt!" : "Ergebnis gespeichert"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600, textAlign: "center", marginTop: 6, padding: "0 16px" }}>
              {mode === "register"
                ? <>Ihr seid jetzt als <b style={{ color: "var(--forest)" }}>{name}</b> registriert. Beim nächsten Login einfach Name + Passwort eingeben.</>
                : <>Euer Ergebnis erscheint im Ranking als Gast-Team unter dem Namen <b style={{ color: "var(--forest)" }}>{groupName}</b>.</>}
            </div>
            <button onClick={() => onSaved(name || groupName, mode, pw)} className="btn-primary" style={{
              marginTop: 18,
              background: "var(--neon)", color: "var(--forest)",
              boxShadow: "0 4px 0 #2EB85F, 0 12px 24px -8px rgba(91,229,132,.4)",
            }}>
              Zum Ranking →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function optionBtn(highlight) {
  return {
    width: "100%",
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 14px",
    marginBottom: 10,
    background: highlight ? "var(--forest)" : "var(--paper)",
    border: highlight ? "0" : "1.5px solid rgba(20,24,26,.10)",
    borderRadius: 18,
    cursor: "pointer",
    boxShadow: highlight ? "0 4px 0 #0E2218, 0 12px 22px -10px rgba(31,58,43,.45)" : "0 1px 0 rgba(20,24,26,.04)",
    textAlign: "left",
  };
}

function OptIcon({ children, highlight }) {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: 12,
      background: highlight ? "var(--neon)" : "var(--paper-2)",
      color: "var(--forest)",
      display: "grid", placeItems: "center", flexShrink: 0,
    }}>{children}</div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "rgba(250,245,230,.55)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.1, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function LightField({ label, value, onChange, placeholder, type = "text", valid, hint }) {
  const touched = value.length > 0;
  return (
    <label style={{
      display: "block",
      background: "var(--paper-2)",
      border: `1.5px solid ${touched ? (valid ? "rgba(91,229,132,.55)" : "rgba(230,57,70,.45)") : "transparent"}`,
      borderRadius: 14,
      padding: "10px 14px",
      transition: "border-color .15s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 10, color: "var(--ink-2)", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
        {touched && <div style={{ fontSize: 10, color: valid ? "var(--neon-d)" : "var(--red)", fontWeight: 700 }}>{valid ? "✓ OK" : hint}</div>}
      </div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: "100%", marginTop: 2,
          background: "transparent", border: 0, outline: 0,
          color: "var(--ink)",
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17,
        }}/>
    </label>
  );
}

function fmt(s) {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
