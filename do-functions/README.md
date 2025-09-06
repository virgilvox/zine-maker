# DigitalOcean Functions for Zine Maker (ipfs-share)

This directory contains DigitalOcean Functions for publishing zines to your own IPFS node (droplet) and maintaining a public registry manifest (MFS + IPNS).

Structure:
- `project.yml` — Functions project descriptor
- `packages/zine/publish` — Publishes project/backup/manifest to the droplet, updates MFS registry, publishes IPNS
- `packages/zine/registry` — Reads the registry (by CID/IPNS or by `?key=<ipns-name>`); writes are handled by publish

Deploy (via CLI):
- Ensure you have `doctl` configured.
- Deploy using remote build:
```
doctl serverless deploy do-functions --remote-build
```

App Platform:
- An App Platform spec is provided in `.do/app.yaml` to create a separate app that watches the `ipfs-share` branch and exposes routes under `/api/`.

Environment Variables (Functions component):
- `IPFS_DROPLET_HOST` (required): droplet IP/host (no scheme)
- `IPFS_DROPLET_ADMIN_USER` (default: ipfsadmin)
- `IPFS_DROPLET_ADMIN_PASS` (required, secret)
- `IPFS_API_SECRET` (optional, secret): extra header `X-API-SECRET`
- `IPFS_MFS_MANIFEST_PATH` (default: `/manifests/latest.json`)
- `IPFS_IPNS_KEY` (default: `manifest-key`)
- `REGISTRY_CID` (optional): default read pointer (CID or `ipns/k51...`)

HTTP usage:
- Publish: `POST /api/zine/publish` with JSON body `{ project, description?, tags?, author?, backup? }`
- Registry: 
  - `GET /api/zine/registry?key=manifest-key` → resolves via droplet and returns JSON

Notes:
- Web actions return JSON and include permissive CORS for ease of use.
- Manifest JSON aligns with `src/types/index.ts` `ZineManifest`.
