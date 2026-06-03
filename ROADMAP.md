# PeerSV Portaal - Roadmap

**Laatst bijgewerkt:** 29 mei 2026
**Live in productie:** V1.2.0

## Live omgevingen

| Omgeving | URL | Image tag | Auto-deploy |
|----------|-----|-----------|-------------|
| Dev | https://teampoint-dev.webbaas.be | `:latest` | Ja (bij push naar main) |
| Prod | https://teampoint.webbaas.be | `:1.2.0` | Nee (tag-gebaseerd) |

## V1.0 — Live

Kern features: leden CRUD, teams CRUD met trainer-koppelingen, trainers (aanmaken, vlinder-vlag, tarief, IBAN), prestaties registreren, admin overzicht met filters, markeer als betaald, uitbetalingen per trainer per maand, jaarplafond bewaking (€3233,91), CSV export, PWA installeerbaar, Auth.js login (admin + trainer), dev + prod environments met zero-downtime deploys.

## V1.1 — Live (1.1.0, 1.1.1, 1.1.2)

Wachtwoord wijzigen door trainer, admin password reset, deactivatie/heractivatie, migrations via init container, environment badge, backup systeem (Synology, retention via Task Scheduler).

## V1.2.0 — Live

- Aanwezigheden registreren per prestatie
- Aanwezigheidsoverzichten per lid en per team (statistieken + matrix)
- team_members tabel (leden in meerdere teams tegelijk, historiek bewaard)
- Responsive design (hamburger menu, card layouts op mobile)
- Anonymizer script voor GDPR-veilige prod-naar-dev data kopie
- Create-admin script + runbook

## V1.3 — In ontwikkeling: Kalender + admin basics

**Geschatte werkperiode:** 3-4 weken

### Kalender
- Events database (type: training, vergadering, evenement)
- Admin UI om events aan te maken
- Bulk-recurring events (bv. training elke woensdag 18u-19u30)
- ICS feed endpoints per team + clubbreed (publiek of met token)
- Ouders/spelers plakken URL in iPhone Agenda / Google Calendar / Outlook
- Architectuur: design met wedstrijdkalender in gedachten (komt in V2.x)

### Admin basics
- Admin aanmaken via UI (rol-selector in user-form, vervangt huidige create-admin script)
- `last_login_at` kolom op users + tonen in admin overzicht
- Settings UI voor jaarplafond bedrag (nu hardcoded)
- Batch-actie "markeer hele maand als betaald"

## V1.4 — Security hardening + email + pentest

**Geschatte werkperiode:** 4-6 weken

### Email infrastructuur (fundament)
- SMTP2GO setup (account + DNS + API key in K8s secret)
- Token-tabel voor magic links en password-reset tokens
- Wachtwoord-reset flow via email
- Admin/trainer invite via email (vervangt mondelinge wachtwoord-doorgifte)

### Security
- MFA voor admins (TOTP via Google Authenticator / Authy / 1Password / Bitwarden), recovery codes, "remember device" 30 dagen
- MFA optioneel voor trainers, verplicht voor admins
- Login audit log
- OWASP Top 10 interne checklist + fixes
- Rate limiting op login + sensitive endpoints
- Security headers review (CSP, HSTS, etc)
- **Externe pentest** (1500-5000 EUR via een bureau)

## V1.5 — Externe gebruikers (ouders + vrijwilligers + jeugdabo)

**Geschatte werkperiode:** 8-10 weken

Aandacht: deze release brengt externe gebruikers naar het systeem. Mag pas live ná succesvolle pentest in V1.4.

### Rol-architectuur
- Parent-rol toegevoegd aan user_role enum
- Volunteer-rol toegevoegd
- `guardians` tabel: koppelt parent-users aan members (één parent kan meerdere kinderen hebben)
- **Multi-role per user**: één persoon kan meerdere rollen tegelijk hebben (Admin én Trainer, Trainer én Ouder, etc.). Vandaag dwingt het schema dubbele accounts af (bv. Bram Van Eygen heeft 2 accounts). Migratie van users.role naar user_roles many-to-many tabel. Refactor van alle role-checks (session.user.role === "admin" wordt session.user.roles.includes("admin")).

### Ouder-toegang
- Ouder login
- Gepersonaliseerde ICS feed per gezin (alle kinderen samen)
- Overzicht trainingen + aanwezigheden per kind

### Communicatie module
- Admin/trainer kan bericht sturen naar alle ouders van team X
- Email als primair kanaal, push als secundair
- Verzendlog (wie wat wanneer)

### Jeugdabonnement via Mollie
- Ouder koopt abonnement per kind via portaal
- Mollie checkout (Bancontact, kaart, etc)
- Webhook verwerkt status (paid, expired, refunded)
- Admin overzicht: wie heeft abonnement, openstaand bedrag, automatische herinneringen

### Push notifications
- Web Push API
- Werkt op Android out of the box
- Werkt op iOS 16.4+ alleen als PWA geïnstalleerd ("Voeg toe aan beginscherm")
- Communicatie naar ouders: maak duidelijk hoe ze PWA installeren

## V1.6 — Planningstool voor events

**Geschatte werkperiode:** 4-6 weken

### Helpers-pool
- Admin onderhoudt een permanente pool van users (uit alle rollen: trainers, admins, ouders, vrijwilligers)
- Wie in de pool zit, krijgt automatisch toegang tot helpers-sectie

### Polls per event
- Per event in de kalender: admin start een poll met tijdblokken
- Pool-leden geven beschikbaarheid aan per tijdblok (kan / kan niet)
- Algemene beschikbaarheid: user kan ééns aangeven "ik kan altijd zaterdag avond", systeem vult per event automatisch in (override mogelijk)

### Event scheduling
- Admin ziet realtime dashboard: wie kan wanneer, bezetting per shift
- Admin maakt definitieve planning
- Planning delen via email/push naar betrokkenen

## V2.0 — Multi-tenant beslissing

**Geschatte werkperiode:** 1-2 maanden indien gekozen voor multi-tenant SaaS

Beslismoment: wanneer 2-3 klanten in zicht zijn, vermoedelijk begin 2027.

| Optie | Voordeel | Nadeel |
|-------|----------|--------|
| Custom per klant | Snelle eerste deals | Niet schaalbaar boven 5-10 klanten |
| Multi-tenant SaaS | Schaalbaar | Refactor van auth, data isolatie, billing |

## Volgend seizoen (2026-2027) — Lidgeld + boekhouding

- Lidgeld beheer (jaarlijkse facturatie per lid)
- Fiscale attesten genereren
- Automatische herinneringen
- Boekhoudkoppeling (Octopus / Yuki / Exact)

## V2.x — Geparkeerd, niet vastgepind

Beslissen wanneer relevant.

- Wedstrijdkalender (Voetbal Vlaanderen integratie) - architectuur uit V1.3 ondersteunt dit
- Statistieken per speler
- Native app via Capacitor (PWA werk niet weggegooid)
- Webshop
- Sponsorbeheer

## Infrastructure roadmap (devops)

### Voor V1.3 of V1.4
- Restore-test automatiseren (wekelijks restore een backup naar test DB)
- Off-site backup naar Cloudflare R2 (gratis tier, echte off-site)
- Monitoring via UptimeRobot of healthchecks.io
- Migrate-image SHA pinning voor prod (consistent met app image)

### Voor V2.0
- Centralized backup pipeline (Restic + S3-compatible storage)
- Centralized logging (Loki of vergelijkbaar)
- Per-klant SSH keys / namespaces

## Commercieel (kritisch los van versies)

Moet GEDAAN zijn vóór V1.5 (externe gebruikers):
- DPA verwerkersovereenkomst
- Privacy policy publiceren in portaal
- Privacyverklaring per club
- Cookie banner indien analytics ooit toegevoegd
