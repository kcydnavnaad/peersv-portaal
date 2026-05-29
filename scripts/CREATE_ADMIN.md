# Create-Admin Runbook

Maakt een nieuwe admin user aan via een interactief script.

## Lokaal gebruik (testen)

```bash
# Start lokale postgres (als die nog niet draait)
docker start peersv-postgres

# Run het script (default connect naar localhost:5433)
cd ~/VDK/peersv-portaal
npx tsx scripts/create-admin.mts
```

Het script vraagt voornaam, achternaam, email. Bij succes toont het een random wachtwoord 1x.

## Productie gebruik

Verbind via kubectl port-forward zodat je niet via de publieke URL hoeft te gaan.

```bash
# In tab 1: open port-forward (laat draaien)
kubectl port-forward -n peersv-prod postgres-0 5433:5432

# In tab 2: run script tegen de port-forwarded prod DB
cd ~/VDK/peersv-portaal
ADMIN_DB_URL="postgres://peersv:<prod-password>@localhost:5433/peersv" \
  npx tsx scripts/create-admin.mts
```

Het prod wachtwoord vind je in K8s secret:

```bash
kubectl get secret -n peersv-prod postgres-secret -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d
```

(Of in je wachtwoordmanager.)

## Workflow voor het toevoegen van een admin

1. Run het script
2. Vul de gegevens in
3. Kopieer het getoonde wachtwoord
4. Stuur naar de gebruiker via een veilig kanaal (Whatsapp/Signal, niet email)
5. Vraag de gebruiker om in te loggen op https://teampoint.webbaas.be
6. Vraag ze om via /profiel het wachtwoord te wijzigen

## Beveiliging

- Wachtwoord wordt slechts 1x getoond, niet opgeslagen
- 14 karakters, geen ambigue tekens (geen 0/O, 1/l/I)
- Bcrypt hash met saltRounds 10 (consistent met de rest van de app)
