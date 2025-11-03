# Konzept: DCTS Chat App

## Überblick

**DCTS (Direct Communication Through Sockets)** ist eine moderne Open-Source-Chat-App, entwickelt als Antwort auf die Probleme bestehender Plattformen wie Discord, Guilded, Fosscord, Revolt oder Matrix. DCTS kombiniert **einfache Nutzung**, **leistungsstarke Features** und **klare Skalierbarkeit**, ohne die Hürden oder Einschränkungen der Konkurrenz.

------

## Kern-Features

- **Out-of-the-Box nutzbar**: Chat und Voice funktionieren direkt nach Installation (VOIP & Screensharing funktionieren direkt, bei Bedarf sorgt TURN für maximale Kompatibilität).

- **TURN-Integration für maximale Kompatibilität**:

  - Stellt sicher, dass Voice & Screensharing **bei allen Clients** zuverlässig funktionieren, unabhängig von deren Netzwerkumgebung.
  - Einfache Einrichtung, kein Expertenwissen nötig.
  - Für Hosting-Anbieter ideal als **zusätzliche Leistung oder Upsell-Paket**.

- **Zentrale Konfiguration über `config.json`**:

  - Alle wichtigen Einstellungen an einem Ort.
  - Templates für verschiedene Kundenszenarien möglich.
  - Basis für **einfache Web-UIs**, die Hoster selbst anbieten können.

- **Terminal-Erweiterungen**: Instanzen können per Command-Line erweitert/verwaltet werden = flexible Anpassung für Admins.

- **Pro-Hoster-Features**: z. B. Slot-Limit zur Steuerung der maximalen Useranzahl.

- **Addon-System ohne API-Overhead**: Erweiterungen direkt integrierbar (Moderation, Themes, Tools).

- **Proof-of-Work (PoW) Schutz**: Verhindert Spam und Bot-Angriffe.

- **Skalierbarkeit integriert**

  - **MySQL-Support (empfohlen!)**
    - Schaltet viele **grundlegende Zusatzfunktionen** frei, darunter z. B. Message Reports/Edits, Embed Cache, erweiterte Verwaltung, etc
    - Macht Instanzen deutlich robuster und skalierbarer.
    - Für Hosting-Anbieter eine attraktive **Upsell-Möglichkeit** (Beispiel: Basis-Instanz ohne, Premium-Instanz mit MySQL).
  - **Cloudflare Image CDN**
    - Leistungsstarke, verteilte Medienbereitstellung für Bilder.
  - **Tenor API**
    - GIF-Suche und -Integration für moderne User-Experience.

- **Modernes, sauberes UI**: nicht wie bei Revolt oder Fosscord mit halbfertigen Konzept-Oberflächen, sondern klar und nutzerfreundlich.

- **Schlanker Stack**: ressourcenschonend, keine Electron-Überfrachtung.

- **Server + Client integriert**

  - Server liefert immer die passende Client-Version aus = keine Inkompatibilitäten.
  - Jeder Betreiber kann Server oder Client anpassen (voll Open Source).

  **Direkter Web-Client**

  - Sofort nach der Installation im Browser nutzbar.
  - Niedrigste Einstiegshürde für Endnutzer.

  **Standalone-Client (in Planung)**

  - Lädt den Web-Client wie ein Browser, bringt jedoch **eigene Zusatzfunktionen** mit:
    - **Verifizierungs-Checks** beim Connect (Blacklist, Verified, Partner-Status).
    - **Badges & Trust-System**: Nutzer sehen sofort, ob eine Instanz vertrauenswürdig ist.
    - Möglichkeit für weitere Features (z. B. System-Integration, Desktop-Notifications, Auto-Updates).
  - Stärkt **Sicherheit & Vertrauen**, da Missbrauch durch manipulierte Server erschwert wird.

------

## Abgrenzung zu bestehenden Lösungen

### Discord / Guilded

- Zentralisiert, Closed-Source, Datenkontrolle beim Anbieter.
- Electron-Overhead, hoher Ressourcenverbrauch.
- Support praktisch nicht nutzbar.

**DCTS Vorteil:** Selbstgehostet, leichtgewichtig, volle Datenkontrolle, Community-naher Support.

### Revolt

- UI wirkt unfertig, viele Bereiche Placeholder oder Konzept.
- Geringe Aktivität, kaum Weiterentwicklung.

**DCTS Vorteil:** Modernes, nutzerfreundliches Interface, aktive Releases.

### Fosscord

- Reverse-Engineered = rechtliche Risiken.
- VOIP & Screensharing nur mit Zusatzinstallationen.
- UI teils unfertig, wirkt unpoliert.
- Chaotische Entwicklung, schwieriges Onboarding.

**DCTS Vorteil:** Rechtlich sauber, Voice & Screensharing direkt dabei, stabiles UI, einfache Nutzung.

### Matrix

- Mächtig, aber für Normalnutzer zu komplex und technisch.

**DCTS Vorteil:** Intuitiv, sofort verständlich, ohne technische Hürden.

------

## Nutzen für Hosting-Unternehmen

- **Neue Umsatzmöglichkeiten**:
  - TURN als **Upsell oder Zusatzpaket** für Kunden.
  - Slot-Limits und Addons als skalierbare Produkt-Tiers.
- **Einfache Bereitstellung**: Konfiguration über eine `config.json` = schnelle Anpassung, Vorlagen für Kundenszenarien.
- **Automatisierbar**: Web-UIs oder Admin-Dashboards leicht aufsetzbar.
- **Flexibel**: Erweiterbare Terminal-Befehle erlauben individuelle Anpassungen.
- **Skalierbar**: MySQL, CDN & APIs machen DCTS für kleine Gruppen und große Communities attraktiv.
- **Rechtlich sicher**: kein Reverse-Engineering, Open-Source-Basis.

------

## Zukunftsperspektive

DCTS soll die **einfache, moderne und sichere Alternative** zu zentralisierten und unfertigen Chat-Apps werden.
 Mit Community-Wachstum, einem wachsenden Addon-Ökosystem und **strategischen Partnerschaften mit Hosting-Unternehmen** wird DCTS eine attraktive Lösung für Endnutzer *und* Provider.

------

## Wie Hoster helfen können

Für mich als Einzelentwickler ist **finanzielle Unterstützung durch Hosting-Anbieter entscheidend**, damit ich DCTS **vollzeit** weiterentwickeln kann. Es geht nicht um kostenlose Server, sondern konkret um **monatliches Sponsoring**.

- **Mehr Unterstützung = mehr Entwicklungszeit**
  - Je mehr Sponsoring zusammenkommt, desto mehr Zeit kann ich in die Entwicklung investieren.
  - Ab ca. **2.500 € monatlich** wären meine Grundkosten vollständig gedeckt = ich könnte mich **vollzeit und ohne Ablenkungen** auf DCTS konzentrieren.
- **Alles darüber hinaus** stärkt das Projekt zusätzlich:
  - Reserve für unvorhergesehene Situationen (finanzielle Engpässe, Hardware, etc).
  - Langfristige Sicherheit für kontinuierliche Weiterentwicklung.
  - Möglichkeit, noch mehr Zeit oder zusätzliche Ressourcen (z. B. Tests, Promotion, Community-Management) einzusetzen.
  - Sponsoren sichern damit nicht nur den laufenden Betrieb, sondern auch die langfristige Weiterentwicklung.
- **Flexible Partnerschaften**
  - Ein Sponsor mit ~2.500 €/Monat könnte das Projekt alleine tragen.
  - Bei kleineren Beträgen können sich mehrere Hoster beteiligen = jeder entscheidet, wie viel Exklusivität ihm wichtig ist.
- **Mehrwert für Sponsoren**
  - **Offizieller Partnerstatus**: klare Sichtbarkeit als Partner (Website, GitHub, Community) = direkter Marketingvorteil.
  - **Einfluss auf die Entwicklung**: Sponsoren können ihre Ansichten und Anforderungen direkt einbringen, von Hoster-spezifischen Features bis hin zu Addons. Partner profitieren außerdem davon, dass ihre Wünsche priorisiert und frühzeitig umgesetzt werden, sofern möglich.
  - **Attraktiv für Endnutzer ohne Technik-Wissen**: Viele Community-Betreiber möchten keinen Linux-Server verwalten, sondern einfach nur *“Start drücken und loslegen”*. Hier können Hosting-Anbieter mit DCTS ein **perfektes Komplettpaket** anbieten: fertig konfiguriert, sofort einsatzbereit.

------

## Geplante Selbstfinanzierung

Langfristig soll DCTS zusätzlich durch **eigene Einnahmequellen** unterstützt werden, ohne die freie Open-Source-Basis einzuschränken:

- **Offizielle Addons**
  - z. B. erweiterte Moderation, 2FA, Security-Features, ...
- **Optionale Services**
  - Einrichtung & Konfiguration von Instanzen.
  - Support-Pakete für Communities und Firmen.
  - Beratung und individuelle Anpassungen.

Falls Hoster diese Leistungen nicht selbst übernehmen, können sie direkt von mir bereitgestellt werden.

GitHub: [DCTS v5.4.3](https://github.com/hackthedev/dcts-shipping/releases/tag/v5.4.3)
Community Subreddit: [r/dcts](https://www.reddit.com/r/dcts/)
Stand: 30.08.2025