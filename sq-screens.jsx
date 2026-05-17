// sq-screens.jsx — ScoutQuest screens, components, atoms
// All components attached to window for cross-script visibility.

const { useState, useEffect, useRef, useMemo } = React;

// ────────────────────────────────────────────────────────────────────
// Locations data (Unsplash-style real urban photos via picsum.photos)
// ────────────────────────────────────────────────────────────────────
const LOCATIONS_STORAGE_KEY = "scoutquest.locations.v1";

const DEFAULT_LOCATIONS = [
  { id: 1, name: "Alter Wasserturm",     seed: "scout-tower",   hint1: "In der Nähe einer Schule.", hint2: "Roter Backstein, 19. Jahrhundert.", isActive: true },
  { id: 2, name: "Markthalle",            seed: "scout-market",  hint1: "Wo es samstags duftet.",   hint2: "Großes Glasdach, Eisenträger.", isActive: true },
  { id: 3, name: "Brunnen am Ratsplatz",  seed: "scout-fountain",hint1: "Vor dem Rathaus.",          hint2: "Drei Figuren aus Bronze.", isActive: true },
  { id: 4, name: "Bahnhof-Vorplatz",      seed: "scout-station", hint1: "Wo viele Menschen ankommen.", hint2: "Uhr über dem Hauptportal.", isActive: true },
  { id: 5, name: "Stadtpark-Eingang",     seed: "scout-park",    hint1: "Grünes Tor mit zwei Säulen.", hint2: "Bank aus Eichenholz.", isActive: true },
  { id: 6, name: "Alte Steinbrücke",      seed: "scout-bridge",  hint1: "Über dem Fluss.",            hint2: "Sieben Bögen.", isActive: true },
  { id: 7, name: "Kapelle am Hügel",      seed: "scout-chapel",  hint1: "Höchster Punkt der Stadt.",  hint2: "Weiße Wände, rotes Dach.", isActive: true },
  { id: 8, name: "Buchhandlung im Hof",   seed: "scout-books",   hint1: "Schmaler Durchgang.",        hint2: "Schaufenster mit alten Karten.", isActive: true },
  { id: 9, name: "Hafenkran",             seed: "scout-harbor",  hint1: "Wo das Wasser ist.",         hint2: "Rost-orange Stahl.", isActive: true },
  { id:10, name: "Aussichtsturm",         seed: "scout-vista",   hint1: "Man sieht alles von dort.",  hint2: "248 Stufen hinauf.", isActive: true },
];

function normalizeLocation(loc, idx) {
  const fallback = DEFAULT_LOCATIONS[idx] || DEFAULT_LOCATIONS[0];
  const lat = Number(loc?.lat);
  const lon = Number(loc?.lon);
  return {
    id: Number(loc?.id) || fallback.id,
    name: String(loc?.name || fallback.name),
    seed: String(loc?.seed || fallback.seed),
    hint1: String(loc?.hint1 || fallback.hint1),
    hint2: String(loc?.hint2 || fallback.hint2),
    photoUrl: typeof loc?.photoUrl === "string" ? loc.photoUrl : "",
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    isActive: typeof loc?.isActive === "boolean" ? loc.isActive : true,
  };
}

function loadLocations() {
  try {
    const raw = localStorage.getItem(LOCATIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_LOCATIONS.map(normalizeLocation);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_LOCATIONS.map(normalizeLocation);
    }
    const normalized = parsed.map((loc, idx) => normalizeLocation(loc, idx));
    const activeOnly = normalized.filter((loc) => loc.isActive !== false);
    return activeOnly.length ? activeOnly : DEFAULT_LOCATIONS.map(normalizeLocation);
  } catch (err) {
    return DEFAULT_LOCATIONS.map(normalizeLocation);
  }
}

const LOCATIONS = loadLocations();

const photoUrl = (seed) => `https://picsum.photos/seed/${seed}/800/1000`;

function getLocationPhotoSrc(loc) {
  if (loc?.photoUrl) return loc.photoUrl;
  return photoUrl(loc?.seed || "scout-default");
}

// ────────────────────────────────────────────────────────────────────
// Atoms
// ────────────────────────────────────────────────────────────────────

function Logo({ size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: "var(--forest)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 3px 0 #0E2218, inset 0 0 0 2px rgba(250,245,230,.15)",
      position: "relative",
    }}>
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        {/* Compass needle on a peak */}
        <path d="M3 19 L9 9 L14 14 L21 19 Z" fill="#5BE584"/>
        <circle cx="12" cy="11" r="2.8" fill="#FAF5E6"/>
        <path d="M12 8.2 L13 11 L12 13.8 L11 11 Z" fill="#E87D3E"/>
      </svg>
    </div>
  );
}

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Logo size={36} />
      <div className="display" style={{ fontSize: 24, color: "var(--forest)", fontWeight: 800 }}>
        ScoutQuest
      </div>
    </div>
  );
}

// Photo (real or striped placeholder)
function LocationPhoto({ loc, style = "real", round = 24, label = "Such-Foto" }) {
  if (style === "real") {
    return (
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 4.4",
        borderRadius: round,
        overflow: "hidden",
        background: "var(--moss)",
        boxShadow: "0 20px 40px -20px rgba(20,24,26,.45), 0 0 0 4px rgba(31,58,43,.06)",
      }}>
        <img src={getLocationPhotoSrc(loc)}
             alt=""
             style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
             onError={(e) => { e.target.style.display = "none"; }} />
        {/* Stamp */}
        <div style={{
          position: "absolute", top: 14, left: 14,
          background: "rgba(20,24,26,.55)",
          color: "var(--paper)",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase",
          backdropFilter: "blur(8px)",
        }}>
          {label}
        </div>
        {/* zoom hint */}
        <div style={{
          position: "absolute", bottom: 14, right: 14,
          background: "rgba(250,245,230,.85)",
          color: "var(--ink)",
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 11, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
          Pinch / Doppeltipp
        </div>
      </div>
    );
  }
  // Placeholder mode
  return (
    <div className="photo-stripes" style={{
      position: "relative",
      width: "100%",
      aspectRatio: "4 / 4.4",
      borderRadius: round,
      overflow: "hidden",
      boxShadow: "0 20px 40px -20px rgba(20,24,26,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "rgba(20,24,26,.65)",
        color: "var(--paper)",
        padding: "10px 16px",
        borderRadius: 12,
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
        letterSpacing: ".04em",
      }}>
        photo_{loc.seed}.jpg
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Top bar (in-game)
// ────────────────────────────────────────────────────────────────────
function TopBar({ groupName, score, found, total, timer, rank }) {
  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");
  return (
    <div style={{
      padding: "16px 18px 12px",
      background: "var(--forest)",
      color: "var(--paper)",
      borderRadius: "0 0 22px 22px",
      boxShadow: "0 6px 12px -8px rgba(20,24,26,.6)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: "var(--neon)", color: "var(--forest)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16,
          }}>
            {groupName.slice(0, 1)}
          </div>
          <div>
            <div style={{ fontSize: 10, opacity: .6, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>Gruppe</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, lineHeight: 1 }}>{groupName}</div>
          </div>
        </div>
        <div className="mono" style={{
          background: "rgba(250,245,230,.08)",
          border: "1px solid rgba(250,245,230,.15)",
          padding: "6px 10px", borderRadius: 999,
          fontSize: 14, fontWeight: 700,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--neon)", animation: "timerTick 1.4s ease-in-out infinite" }}/>
          {mm}:{ss}
        </div>
      </div>

      {/* Score row */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Stat label="Punkte"      value={score}          accent={score < 0 ? "var(--red)" : "var(--neon)"} />
        <Stat label="Gefunden"    value={found} accent="var(--gold)" />
        <Stat label="Position"    value={`#${rank ?? 1}`}    accent="var(--orange)" />
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12, height: 6, borderRadius: 99, background: "rgba(250,245,230,.12)", overflow: "hidden" }}>
        <div style={{
          width: `${(found / total) * 100}%`,
          height: "100%",
          background: "linear-gradient(90deg, var(--neon), var(--gold))",
          borderRadius: 99,
          animation: "barFill 800ms ease-out",
        }}/>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      background: "rgba(250,245,230,.06)",
      border: "1px solid rgba(250,245,230,.10)",
      borderRadius: 12,
      padding: "8px 10px",
    }}>
      <div style={{ fontSize: 9, opacity: .55, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Bottom Navigation
// ────────────────────────────────────────────────────────────────────
function BottomNav({ tab, onChange }) {
  const items = [
    { id: "game",    label: "Spiel",   icon: NavIconCompass },
    { id: "ranking", label: "Ranking", icon: NavIconTrophy },
    { id: "profile", label: "Profil",  icon: NavIconBook },
  ];
  return (
    <div style={{
      flexShrink: 0,
      background: "var(--paper)",
      borderTop: "1px solid rgba(20,24,26,.08)",
      padding: "10px 12px 14px",
      display: "flex",
      gap: 8,
    }}>
      {items.map(it => {
        const active = tab === it.id;
        const Icon = it.icon;
        return (
          <button key={it.id}
            onClick={() => onChange(it.id)}
            style={{
              flex: 1,
              border: 0,
              background: active ? "var(--forest)" : "transparent",
              color: active ? "var(--paper)" : "var(--ink-2)",
              borderRadius: 16,
              padding: "10px 6px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              cursor: "pointer",
              fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 12,
              transition: "background .2s ease",
            }}>
            <Icon size={22} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const NavIconCompass = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M15.5 8.5L13 13l-4.5 2.5L11 11z" fill="currentColor" stroke="none"/>
  </svg>
);
const NavIconTrophy = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4h10v4a5 5 0 01-10 0V4z"/>
    <path d="M5 6H3v2a3 3 0 003 3M19 6h2v2a3 3 0 01-3 3"/>
    <path d="M9 17h6M12 13v4M8 21h8"/>
  </svg>
);
const NavIconBook = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z"/>
    <path d="M9 7h6M9 11h6M9 15h4"/>
  </svg>
);

// ────────────────────────────────────────────────────────────────────
// GPS Check Overlay
// ────────────────────────────────────────────────────────────────────
function GpsOverlay({ state, onClose, errorDistance }) {
  // state: 'checking' | 'success' | 'error' | null
  if (!state) return null;

  if (state === "checking") {
    return (
      <Overlay>
        <div style={{ position: "relative", width: 140, height: 140, display: "grid", placeItems: "center" }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              border: "3px solid var(--neon)",
              opacity: .6,
              animation: `pulseRing 1.8s ease-out ${i * 0.6}s infinite`,
            }}/>
          ))}
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--forest)",
            display: "grid", placeItems: "center",
            boxShadow: "0 12px 30px -10px rgba(31,58,43,.6)",
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--neon)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z"/>
              <circle cx="12" cy="9" r="2.5" fill="var(--neon)"/>
            </svg>
          </div>
        </div>
        <div className="display" style={{ fontSize: 26, color: "var(--paper)", marginTop: 22 }}>GPS-Prüfung läuft…</div>
        <div style={{ marginTop: 8, color: "rgba(250,245,230,.7)", fontSize: 15, fontWeight: 500 }}>Wir messen euren Standort</div>
        <div className="mono" style={{ marginTop: 18, fontSize: 13, color: "var(--neon)", letterSpacing: ".1em" }}>
          ±  8 m  •  signal good
        </div>
      </Overlay>
    );
  }

  if (state === "success") {
    return (
      <Overlay onClick={onClose}>
        <Confetti />
        <div style={{ animation: "pop 600ms cubic-bezier(.2,.9,.3,1.2)" }}>
          <div style={{
            width: 120, height: 120, borderRadius: "50%",
            background: "var(--neon)",
            display: "grid", placeItems: "center",
            boxShadow: "0 0 0 12px rgba(91,229,132,.25), 0 20px 40px -10px rgba(46,184,95,.55)",
          }}>
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7"/>
            </svg>
          </div>
        </div>
        <div className="display" style={{ fontSize: 36, color: "var(--paper)", marginTop: 22 }}>
          Ort gefunden!
        </div>
        <div style={{ marginTop: 8, color: "rgba(250,245,230,.8)", fontSize: 16, fontWeight: 600 }}>+ 100 Punkte</div>

        <div style={{ marginTop: 28, padding: "16px 22px", borderRadius: 18, background: "rgba(250,245,230,.10)", border: "1px solid rgba(250,245,230,.18)" }}>
          <div className="mono" style={{ fontSize: 12, color: "var(--neon)", letterSpacing: ".1em", textTransform: "uppercase" }}>geschafft in</div>
          <div className="mono" style={{ fontSize: 28, color: "var(--paper)", fontWeight: 700 }}>04:12</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
          marginTop: 24, padding: "14px 24px",
          background: "var(--paper)", color: "var(--forest)",
          border: 0, borderRadius: 16,
          fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
          cursor: "pointer",
        }}>
          Nächster Ort →
        </button>
      </Overlay>
    );
  }

  if (state === "error") {
    return (
      <Overlay onClick={onClose} bg="rgba(20,24,26,.85)">
        <div style={{ animation: "shake .5s cubic-bezier(.36,.07,.19,.97)" }}>
          <div style={{
            width: 110, height: 110, borderRadius: "50%",
            background: "var(--red)",
            display: "grid", placeItems: "center",
            boxShadow: "0 0 0 10px rgba(230,57,70,.22)",
          }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--paper)" strokeWidth="3" strokeLinecap="round">
              <path d="M12 8v5M12 16.5v.5"/>
              <path d="M12 21s-7-7.5-7-12a7 7 0 1114 0c0 4.5-7 12-7 12z" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div className="display" style={{ fontSize: 28, color: "var(--paper)", marginTop: 22, textAlign: "center", padding: "0 24px" }}>
          Ihr seid noch nicht nah genug.
        </div>
        <div className="mono" style={{ marginTop: 14, fontSize: 14, color: "rgba(250,245,230,.7)" }}>
          {Number.isFinite(errorDistance) ? `${Math.round(errorDistance)} m entfernt` : "Abstand konnte nicht bestimmt werden"}
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            padding: "14px 22px",
            background: "var(--paper)", color: "var(--forest)",
            border: 0, borderRadius: 16,
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            cursor: "pointer",
          }}>
            Weitersuchen
          </button>
        </div>
      </Overlay>
    );
  }
  return null;
}

function Overlay({ children, onClick, bg = "rgba(20,24,26,.78)" }) {
  return (
    <div onClick={onClick} style={{
      position: "absolute", inset: 0,
      background: bg,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 30,
      padding: "0 20px",
      animation: "screenIn .35s ease",
    }}>
      {children}
    </div>
  );
}

// ── Confetti (subtle, paper colors) ────────────────────────────
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["#5BE584", "#F2C94C", "#E87D3E", "#FAF5E6"];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[i % colors.length],
      delay: Math.random() * 0.4,
      tx: (Math.random() * 200 - 100) + "px",
      rot: (Math.random() * 720 - 360) + "deg",
      size: 6 + Math.random() * 8,
      duration: 1.6 + Math.random() * 1.2,
    }));
  }, []);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {pieces.map(p => (
        <span key={p.id} style={{
          position: "absolute",
          top: -10,
          left: p.left + "%",
          width: p.size, height: p.size * 0.4,
          background: p.color,
          borderRadius: 2,
          ["--tx"]: p.tx,
          ["--rot"]: p.rot,
          animation: `confettiFall ${p.duration}s ${p.delay}s linear forwards`,
        }}/>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Hint Sheet
// ────────────────────────────────────────────────────────────────────
function HintSheet({ open, loc, hintsUsed, onUseHint, onClose }) {
  if (!open) return null;
  const hints = [loc.hint1, loc.hint2];
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0,
      background: "rgba(20,24,26,.6)",
      backdropFilter: "blur(8px)",
      zIndex: 25,
      display: "flex", alignItems: "flex-end",
      animation: "screenIn .25s ease",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%",
        background: "var(--paper)",
        borderRadius: "24px 24px 0 0",
        padding: "18px 22px 28px",
        boxShadow: "0 -10px 30px -10px rgba(20,24,26,.4)",
        animation: "screenIn .35s cubic-bezier(.2,.9,.3,1.1)",
      }}>
        <div style={{ width: 44, height: 5, background: "var(--sand-2)", borderRadius: 99, margin: "0 auto 14px" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "var(--gold)", color: "var(--forest)",
            display: "grid", placeItems: "center", fontSize: 22,
          }}>💡</div>
          <div>
            <div className="display" style={{ fontSize: 22, color: "var(--forest)" }}>Hinweise</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600 }}>{hintsUsed} / 2 verwendet — jeder kostet 30 Punkte</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {hints.map((h, i) => {
            const revealed = i < hintsUsed;
            return (
              <div key={i} style={{
                borderRadius: 16,
                padding: "14px 16px",
                background: revealed ? "rgba(242,201,76,.18)" : "var(--paper-2)",
                border: revealed ? "1.5px solid var(--gold)" : "1.5px dashed rgba(20,24,26,.15)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: revealed ? "var(--gold)" : "transparent",
                  border: revealed ? 0 : "1.5px dashed rgba(20,24,26,.25)",
                  display: "grid", placeItems: "center",
                  color: "var(--forest)", fontWeight: 800, fontFamily: "var(--font-mono)",
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  {revealed ? (
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{h}</div>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>
                      Verborgen — kostet 30 Punkte
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Schließen</button>
          <button onClick={() => { if (hintsUsed < 2) onUseHint(); }}
                  disabled={hintsUsed >= 2}
                  style={{
                    flex: 1.4,
                    background: hintsUsed >= 2 ? "var(--sand-2)" : "var(--gold)",
                    color: "var(--forest)",
                    border: 0, borderRadius: 16,
                    padding: "14px 18px",
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
                    cursor: hintsUsed >= 2 ? "not-allowed" : "pointer",
                    boxShadow: hintsUsed >= 2 ? "none" : "0 3px 0 #C49B1B",
                  }}>
            {hintsUsed >= 2 ? "Keine mehr" : "Hinweis öffnen (–30)"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Skip confirm dialog
// ────────────────────────────────────────────────────────────────────
function SkipDialog({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <Overlay onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--paper)",
        borderRadius: 22,
        padding: "26px 22px 22px",
        width: "calc(100% - 48px)",
        maxWidth: 340,
        animation: "pop .35s cubic-bezier(.2,.9,.3,1.1)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "rgba(232,125,62,.15)", color: "var(--orange-d)",
          display: "grid", placeItems: "center", marginBottom: 14,
          fontSize: 28,
        }}>⏭</div>
        <div className="display" style={{ fontSize: 24, color: "var(--forest)", lineHeight: 1.1 }}>
          Ort wirklich überspringen?
        </div>
        <div style={{ marginTop: 10, fontSize: 14, color: "var(--ink-2)", fontWeight: 600 }}>
          Das kostet euch <b style={{ color: "var(--red)" }}>150 Punkte</b>. Der nächste Ort erscheint dann sofort.
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Zurück</button>
          <button onClick={onConfirm} style={{
            flex: 1.2,
            background: "var(--red)", color: "var(--paper)",
            border: 0, borderRadius: 16,
            padding: "14px 18px",
            fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16,
            boxShadow: "0 3px 0 #A0202B",
            cursor: "pointer",
          }}>
            Ja, überspringen
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ────────────────────────────────────────────────────────────────────
// Expose to window
// ────────────────────────────────────────────────────────────────────
Object.assign(window, {
  LOCATIONS, DEFAULT_LOCATIONS, LOCATIONS_STORAGE_KEY, photoUrl,
  Logo, Wordmark, LocationPhoto,
  TopBar, Stat,
  BottomNav, NavIconCompass, NavIconTrophy, NavIconBook,
  GpsOverlay, Overlay, Confetti,
  HintSheet, SkipDialog,
});
