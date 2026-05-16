# PeerSV dev environment

Kubernetes manifests voor de dev-deploy van PeerSV Portaal in cluster `k3s-homelab`.

De ArgoCD `Application` verwijst naar `apps/peersv-dev` in [github.com/kcydnavnaad/k3s-homelab](https://github.com/kcydnavnaad/k3s-homelab). Kopieer `deployment.yaml` daarheen en commit. ArgoCD picks it up automatisch.

## Eerste deploy: secrets aanmaken

Secrets staan bewust niet in deze repo. Maak ze één keer aan op het cluster:

```bash
kubectl create namespace peersv-dev

kubectl create secret generic postgres-credentials -n peersv-dev \
  --from-literal=username=peersv \
  --from-literal=password=<KIES STERK WACHTWOORD> \
  --from-literal=database=peersv

kubectl create secret generic app-secrets -n peersv-dev \
  --from-literal=database-url='postgresql://peersv:<ZELFDE WACHTWOORD>@postgres:5432/peersv' \
  --from-literal=auth-secret='<GENEREER MET: openssl rand -base64 32>'
```

De StatefulSet leest `username`/`password`/`database` uit `postgres-credentials`. De app leest `database-url` en `auth-secret` uit `app-secrets`.

## Migrations Job

Het manifest bevat een `Job` met naam `peersv-migrate-INSERT_GIT_SHA_HERE`. Vervang `INSERT_GIT_SHA_HERE` bij elke deploy door de short SHA van de commit die je deployt:

```bash
sed -i "s/INSERT_GIT_SHA_HERE/$(git rev-parse --short HEAD)/" deployment.yaml
```

Reden: Kubernetes Jobs zijn immutable op `metadata.name`. Een nieuwe naam dwingt een nieuwe run af bij elke deploy. De migrations zelf (drizzle-kit) zijn idempotent — al toegepaste migrations worden geskipt.

De productie-image bevat `drizzle-kit`, `tsx`, `typescript`, `drizzle.config.ts`, `src/db/schema.ts` en de `drizzle/` migrations folder. `npx drizzle-kit migrate` werkt dus rechtstreeks in dezelfde image als de app.

## Resources

- `PersistentVolumeClaim` `postgres-data` — 5Gi, storageClassName `local-path` (K3s default), RWO.
- `Service` `postgres` — ClusterIP, port 5432, intern.
- `StatefulSet` `postgres` — Postgres 16-alpine, 1 replica, mount op `/var/lib/postgresql/data` met subPath `pgdata`, pg_isready probes.
- `Deployment` `peersv-app` — image `ghcr.io/kcydnavnaad/peersv-portaal:latest`, `imagePullPolicy: Always` zodat `kubectl rollout restart deploy/peersv-app -n peersv-dev` de nieuwste `latest` opnieuw pullt.
- `Service` `peersv-app` — LoadBalancer met MetalLB-annotatie `metallb.io/loadBalancerIPs: 192.168.1.157`, port 80 → targetPort 3000.
- `Job` `peersv-migrate-…` — migrations runner met DATABASE_URL uit `app-secrets`.

## Rollout van een nieuwe versie

```bash
# Nieuwe image is al gebouwd door GitHub Actions en gepushed naar GHCR als :latest.
kubectl rollout restart deployment/peersv-app -n peersv-dev
```

Als de schema is gewijzigd: pas de Job-naam aan, push naar k3s-homelab, ArgoCD synct, Job draait.
