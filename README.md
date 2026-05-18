# ScoutQuest

ScoutQuest ist ein browserbasiertes Stadt-Rallye-Spiel für Gruppen. Teams suchen reale Orte anhand von Fotos und Hinweisen, prüfen ihren Standort per GPS und sammeln Punkte. Die App ist als mobiler Prototyp umgesetzt und kann direkt als statische Website betrieben werden.

## Ziel der App

ScoutQuest eignet sich für Pfadfindergruppen, Jugendgruppen oder ähnliche Veranstaltungen, bei denen mehrere Teams gegeneinander antreten. Der Spielablauf ist bewusst einfach gehalten:

1. Team anmelden oder als Gast spielen
2. Spieldauer festlegen
3. Orte anhand von Fotos und Hinweisen finden
4. Standort per GPS prüfen
5. Punkte sammeln und Ranking ansehen

## Funktionen

- Mobile-first Oberfläche für Smartphones
- Team-Login mit Name und Passwort
- Gastmodus mit späterer Ergebnissicherung
- GPS-Prüfung beim Button-Klick
- Punktevergabe pro gefundenem Ort
- Punktabzug für Hinweise und Überspringen
- Live-Ranking mit Filter für aktive Teams, Mitglieder und Gäste
- Admin-Oberfläche zur Verwaltung von Orten, Teams und Daten
- Import und Export von Standorten, Teams, Sessions und Komplettbackup
- Lokale Speicherung im Browser über `localStorage`
- GitHub-Pages-tauglich, da keine Server-Komponente erforderlich ist

## Projektstruktur

```text
ScoutQuest/
├── index.html                  # Einstiegspunkt der App
├── ScoutQuest.html             # Alternative/Standalone-Version der App
├── sq-app.jsx                  # Hauptlogik: Routing, Login, Spielablauf, GPS, Ranking
├── sq-screens.jsx              # UI-Komponenten, Screens, Overlays und Standortdaten
├── sq-admin.html               # Admin-Oberfläche für Orte, Teams, Daten und Einstellungen
├── tweaks-panel.jsx            # Entwicklungs-/Tweak-Panel für Prototyp-Anpassungen
├── scoutquest-locations.json   # Exportierte Standortdaten
├── scoutquest-teams.json       # Exportierte Teamdaten
└── scoutquest-sessions.json    # Exportierte Spielsessions
```

## App starten

### Variante 1: Direkt über GitHub Pages

Wenn GitHub Pages für das Repository aktiviert ist, kann die App direkt über die Pages-URL geöffnet werden:

```text
https://polostar82.github.io/ScoutQuest/
```

Die Teamdaten werden in der aktuellen App über die veröffentlichte JSON-Datei aus GitHub Pages geladen.

### Variante 2: Lokal im Browser

Das Repository klonen:

```bash
git clone https://github.com/Polostar82/ScoutQuest.git
cd ScoutQuest
```

Danach einen lokalen Webserver starten, zum Beispiel mit Python:

```bash
python -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080/
```

Ein lokaler Webserver ist sinnvoller als ein direkter Doppelklick auf die HTML-Datei, weil Browser bei lokalen Dateien manche Funktionen und Fetch-Aufrufe einschränken können.

## Spielablauf

### 1. Login

Teams melden sich mit Teamname und Passwort an. Alternativ kann ein Spiel als Gast gestartet werden.

### 2. Spiel vorbereiten

Vor dem Start wird die Spieldauer festgelegt. Die App berechnet daraus eine erwartete Schwierigkeit und die Punkte pro Standort.

### 3. Standort finden

Das Team bekommt ein Foto oder Platzhalterbild sowie Hinweise zum aktuellen Ort. Hinweise können geöffnet werden, kosten aber Punkte.

### 4. GPS prüfen

Mit dem Button **„Wir sind da!“** wird der aktuelle Standort des Geräts abgefragt. Die App prüft die Entfernung zum Zielort. Liegt das Team im erlaubten Radius, zählt der Ort als gefunden.

### 5. Ranking

Das Ranking zeigt Teams, Punkte, gefundene Orte und Status. Gäste werden separat markiert. Gast-Ergebnisse können nach dem Spiel gespeichert werden.

## Punkte- und Spiellogik

Aktuell gelten folgende Grundregeln:

| Aktion | Auswirkung |
|---|---:|
| Ort gefunden | Punkte abhängig von Spieldauer und Anzahl der Orte |
| Hinweis öffnen | -30 Punkte |
| Ort überspringen | -150 Punkte |
| GPS-Prüfung erfolgreich | nächster Ort wird geladen |
| Timer abgelaufen | Spiel endet automatisch |

Der GPS-Radius ist im aktuellen Prototyp auf 20 Meter ausgelegt.


## Sinnvolle nächste Schritte

- Backend für Teams, Sessions, Ranking und Admin-Daten ergänzen
- Sichere Authentifizierung für Admin und Teams einbauen
- Ranking serverseitig speichern
- Gastnamen moderieren oder sperren
- Missbrauchsfilter für Namen ergänzen
- Uploads für Standortfotos zentral speichern
- Spielsessions eindeutig versionieren
- QR-Code oder Kurzlink pro Spielrunde erzeugen
- Offline- oder Wiederaufnahme-Logik robuster machen
- Admin-Bereich gegen unbefugten Zugriff schützen

## Technische Hinweise

Die App verwendet React direkt im Browser. Die JSX-Dateien werden als Prototyp-Skripte eingebunden. Dadurch ist kein Build-System notwendig.

Für eine langfristige Weiterentwicklung wäre eine Umstellung auf ein modernes Setup sinnvoll, zum Beispiel:

- Vite
- React
- TypeScript
- Backend/API, zum Beispiel Node.js, Supabase oder Firebase
- Datenbank für Teams, Standorte und Sessions

## Lizenz

Aktuell ist im Repository keine Lizenzdatei enthalten. Vor öffentlicher Weitergabe oder Mitarbeit durch andere sollte eine passende Lizenz ergänzt werden.

## Autor

ScoutQuest wird von Polostar82 entwickelt.
