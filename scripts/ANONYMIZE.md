# Anonymizer Runbook

Anonimiseert prod data voor gebruik op dev. GDPR-compliant.

## Wat wordt geanonimiseerd
- users: voornaam, achternaam, email, telefoon, IBAN (passwordHash blijft!)
- members: voornaam, achternaam, email, telefoon, geboortedatum (jaar behouden)

## Wat blijft origineel
- teams, seasons, performances, attendances, team_members, team_trainers
- Alle ids en relaties

## Stappen

### 1. Pak een recente prod backup

```bash
scp peersv-backup@nas.webbaas.be:/volume1/Backups-K3S/peersv-prod/peersv-prod-LATEST.sql.gz .
```

(of kies een specifieke datum)

### 2. Start een aparte lokale postgres voor anonimisatie

```bash
docker run -d --name peersv-postgres-anon \
  -e POSTGRES_PASSWORD=peersv -e POSTGRES_USER=peersv -e POSTGRES_DB=peersv \
  -p 5434:5432 postgres:16
```

(Poort 5434 zodat we niet conflicteren met je lokale dev DB op 5433.)

### 3. Restore prod backup

```bash
sleep 5  # geef postgres tijd om op te starten
gunzip -c peersv-prod-LATEST.sql.gz | docker exec -i peersv-postgres-anon psql -U peersv -d peersv
```

### 4. Run anonymizer

```bash
cd ~/VDK/peersv-portaal
npx tsx scripts/anonymize-db.mts
```

Output verwacht: aantal users + members updated.

### 5. Dump geanonimiseerde DB

```bash
docker exec peersv-postgres-anon pg_dump -U peersv peersv \
  | gzip > peersv-anon-$(date +%Y%m%d).sql.gz
```

### 6. Laad in dev

```bash
# Vind de postgres pod in peersv-dev
POD=$(kubectl get pod -n peersv-dev -l app=peersv-postgres -o jsonpath='{.items[0].metadata.name}')

# Drop en herstel
kubectl exec -i -n peersv-dev "$POD" -- psql -U peersv -d postgres -c "DROP DATABASE peersv;"
kubectl exec -i -n peersv-dev "$POD" -- psql -U peersv -d postgres -c "CREATE DATABASE peersv;"
gunzip -c peersv-anon-*.sql.gz | kubectl exec -i -n peersv-dev "$POD" -- psql -U peersv -d peersv

# Restart app pods om migratie state te resetten
kubectl rollout restart deployment peersv-app -n peersv-dev
```

### 7. Cleanup

```bash
docker rm -f peersv-postgres-anon
rm peersv-prod-*.sql.gz peersv-anon-*.sql.gz
```

## Verificatie

Login op https://teampoint-dev.webbaas.be. Klik door leden lijst. Geen echte namen, geen echte emails, geen echte IBANs.

## Wanneer uitvoeren

- Eenmalig bij set-up
- Wanneer prod data significant veranderd is en je wilt dev synchroniseren
- NOOIT automatisch (gevaarlijk: zou per ongeluk live data exposen)
