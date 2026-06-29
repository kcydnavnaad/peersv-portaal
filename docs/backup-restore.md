# Backup en restore — PeerSV Portaal

## Backup-systeem

Automatische backups draaien als K8s CronJobs in beide namespaces:

- **prod**: dagelijks om 03:00 UTC (CronJob `postgres-backup` in `peersv-prod`)
- **dev**: wekelijks op zondag om 03:00 UTC (CronJob `postgres-backup` in `peersv-dev`)

Werking: het CronJob spawned een pod met de `peersv-portaal-backup` image. Die doet:

1. `pg_dump` op de postgres-pod in dezelfde namespace
2. Gzip het resultaat
3. SCP naar Synology NAS via gebruiker `peersv-backup@192.168.1.233`
4. Bestand belandt in `/Backups-K3S/peersv-prod/` of `/Backups-K3S/peersv-dev/`

Backup-bestanden heten `peersv-{namespace}-{timestamp}.sql.gz`.

SSH credentials: K8s secret `backup-ssh-key` (private key) in elke namespace.

## Handmatige backup triggeren

Om een backup direct te draaien (bijv. voor een prod-release):

```bash
kubectl create job --from=cronjob/postgres-backup pre-release-backup -n peersv-prod
```

Status checken:

```bash
kubectl get jobs -n peersv-prod | grep pre-release-backup
kubectl logs job/pre-release-backup -n peersv-prod
```

Verwacht: "upload complete" + "done: peersv-prod-{timestamp}.sql.gz" in de logs.

## Restore-procedure

Restore gebeurt naar een **fresh, lege** postgres-instantie. Restoren bovenop bestaande data geeft conflicten op types/tables die al bestaan.

### Stap 1: download de backup van Synology

```bash
scp -i ~/.ssh/peersv-backup \
  peersv-backup@192.168.1.233:/Backups-K3S/peersv-prod/peersv-prod-YYYY-MM-DD-HHMMSS.sql.gz \
  /tmp/restore.sql.gz
```

Lijst beschikbare backups:

```bash
ssh -i ~/.ssh/peersv-backup peersv-backup@192.168.1.233 "ls -lh /Backups-K3S/peersv-prod/"
```

### Stap 2: start een fresh postgres container

Voor verificatie of test-restore — gebruik lokale Docker:

```bash
docker run -d --name peersv-restore-test \
  -e POSTGRES_USER=peersv \
  -e POSTGRES_PASSWORD=peersv \
  -e POSTGRES_DB=peersv \
  -p 5434:5432 \
  postgres:16-alpine
```

Wacht ~5s tot postgres opgestart is.

### Stap 3: restore

```bash
gunzip -c /tmp/restore.sql.gz | docker exec -i peersv-restore-test psql -U peersv -d peersv
```

Errors filteren:

```bash
gunzip -c /tmp/restore.sql.gz | docker exec -i peersv-restore-test psql -U peersv -d peersv 2>&1 | grep -iE "error|fail"
```

Verwacht: geen errors (output is leeg).

### Stap 4: verifieer data

```bash
docker exec peersv-restore-test psql -U peersv -d peersv -c "
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM members) AS members,
  (SELECT COUNT(*) FROM teams) AS teams,
  (SELECT COUNT(*) FROM performances) AS performances,
  (SELECT COUNT(*) FROM events) AS events,
  (SELECT COUNT(*) FROM seasons) AS seasons;
"
```

Vergelijk met live productie:

```bash
kubectl exec -n peersv-prod postgres-0 -- psql -U peersv -d peersv -c "
SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM members) AS members,
  (SELECT COUNT(*) FROM teams) AS teams,
  (SELECT COUNT(*) FROM performances) AS performances,
  (SELECT COUNT(*) FROM events) AS events,
  (SELECT COUNT(*) FROM seasons) AS seasons;
"
```

Counts moeten identiek zijn voor een geldige backup.

### Stap 5: cleanup

```bash
docker stop peersv-restore-test
docker rm peersv-restore-test
rm /tmp/restore.sql.gz
```

## Restore naar live productie (DISASTER recovery)

⚠️ **Alleen in disaster recovery scenario.** Verlies van data of complete prod-corruptie.

Werkstroom:

1. Zet `peersv-app` replicas op 0 om writes te stoppen:
```bash
   kubectl scale deployment peersv-app --replicas=0 -n peersv-prod
```

2. Backup de huidige (mogelijk gecorrumpeerde) state als laatste redmiddel:
```bash
   kubectl exec -n peersv-prod postgres-0 -- pg_dump -U peersv peersv | gzip > /tmp/pre-restore-snapshot.sql.gz
```

3. Drop de bestaande database in prod:
```bash
   kubectl exec -n peersv-prod postgres-0 -- psql -U peersv -d postgres -c "DROP DATABASE peersv;"
   kubectl exec -n peersv-prod postgres-0 -- psql -U peersv -d postgres -c "CREATE DATABASE peersv;"
```

4. Download en restore de gewenste backup:
```bash
   scp -i ~/.ssh/peersv-backup peersv-backup@192.168.1.233:/Backups-K3S/peersv-prod/peersv-prod-YYYY-MM-DD-HHMMSS.sql.gz /tmp/
   gunzip -c /tmp/peersv-prod-YYYY-MM-DD-HHMMSS.sql.gz | \
     kubectl exec -i -n peersv-prod postgres-0 -- psql -U peersv -d peersv
```

5. Verifieer counts kloppen met wat verwacht wordt.

6. Schaal app terug:
```bash
   kubectl scale deployment peersv-app --replicas=1 -n peersv-prod
```

7. Test met een browser-login + sanity check op /admin/users en /admin/teams.

## Retention

Op de Synology staan backups nog niet automatisch opgeruimd. RETENTION_DAYS is niet ingesteld in de CronJob.

Aanbeveling (V1.5): zet `RETENTION_DAYS=30` voor prod en `RETENTION_DAYS=14` voor dev in de CronJob ConfigMaps.

Voor nu: handmatig opruimen via SSH:

```bash
ssh -i ~/.ssh/peersv-backup peersv-backup@192.168.1.233 \
  "find /Backups-K3S/peersv-prod/ -name '*.sql.gz' -mtime +30 -delete"
```

## Testlog

Laatste succesvolle restore-test:

- **Datum**: 2026-06-10
- **Backup-bestand**: `peersv-prod-2026-06-10-105806.sql.gz`
- **Resultaat**: counts identiek aan live prod (12 users, 78 members, 6 teams, 0 performances, 1 event, 2 seasons)

Aanbevolen frequentie: maandelijks een restore-test uitvoeren om backup-integriteit te valideren.
