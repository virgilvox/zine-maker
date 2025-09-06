'use strict';
try {
  const undici = require('undici');
  if (typeof fetch === 'undefined' && undici.fetch) global.fetch = undici.fetch;
  if (typeof FormData === 'undefined' && undici.FormData) global.FormData = undici.FormData;
  if (typeof Blob === 'undefined' && undici.Blob) global.Blob = undici.Blob;
} catch {}

// Web-exported function to fetch or update a global zine registry manifest stored on IPFS.
// Uses your internal IPFS node (droplet) if configured; otherwise falls back to public gateways for reads.

const TEXT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
  'Access-Control-Allow-Headers': 'content-type,authorization,x-api-secret,X-API-SECRET',
  'Content-Type': 'application/json; charset=utf-8'
};

function gatewayUrl(base, path) {
  const b = (base || '').replace(/\/$/, '');
  const p = path.startsWith('ipfs/') || path.startsWith('ipns/') ? path : `ipfs/${path}`;
  return b ? `${b}/${p}` : `https://dweb.link/${p}`;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(t) };
}

async function fetchFromBases(path, bases, timeoutMs = 7000) {
  const uniq = Array.from(new Set(bases.filter(Boolean).map(b => b.replace(/\/$/, ''))));
  let lastErr;
  for (const base of uniq) {
    try {
      const url = gatewayUrl(base, path);
      const { signal, cancel } = withTimeout(timeoutMs);
      const res = await fetch(url, { redirect: 'follow', signal });
      cancel();
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status}`); continue; }
      const txt = await res.text();
      try { return JSON.parse(txt); } catch (e) { lastErr = new Error('Invalid JSON'); }
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Failed to fetch JSON');
}

// Pinata removed for registry writes; registry is maintained via droplet MFS in publish flow.

exports.main = async function (params) {
  if ((params.__ow_method || '').toUpperCase() === 'OPTIONS') {
    return { statusCode: 204, headers: TEXT_HEADERS, body: '' };
  }

  try {
    const method = (params.__ow_method || 'GET').toUpperCase();
    // Droplet config (A)
    const host = process.env.IPFS_DROPLET_HOST || params.IPFS_DROPLET_HOST;
    const pass = process.env.IPFS_DROPLET_ADMIN_PASS || params.IPFS_DROPLET_ADMIN_PASS;
    const user = process.env.IPFS_DROPLET_ADMIN_USER || params.IPFS_DROPLET_ADMIN_USER || 'ipfsadmin';
    const API = host ? `http://${host}:5002/api/v0` : undefined;
    const GW = host ? `http://${host}:8080` : undefined;
    const auth = (host && pass) ? 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') : undefined;
    const apiSecret = process.env.IPFS_API_SECRET || params.IPFS_API_SECRET;
    const headers = auth ? (apiSecret ? { Authorization: auth, 'X-API-SECRET': apiSecret } : { Authorization: auth }) : undefined;
    const mfsPath = process.env.IPFS_MFS_MANIFEST_PATH || params.IPFS_MFS_MANIFEST_PATH || '/manifests/latest.json';

    if (method === 'GET') {
      // F) Fetch a specific project JSON by CID (prefer dweb)
      if (params.projectCid) {
        const cid = String(params.projectCid || '').trim();
        if (!cid) return { statusCode: 400, headers: TEXT_HEADERS, body: JSON.stringify({ error: 'Missing projectCid' }) };
        try {
          const json = await fetchFromBases(`ipfs/${cid}`, ['https://dweb.link', GW, 'https://cloudflare-ipfs.com', 'https://ipfs.io']);
          return { statusCode: 200, headers: TEXT_HEADERS, body: JSON.stringify(json) };
        } catch (e) {
          console.error('[registry] projectCid fetch failed', { cid, error: e && e.message ? e.message : String(e) });
          return { statusCode: 502, headers: TEXT_HEADERS, body: JSON.stringify({ error: e?.message || 'Fetch failed' }) };
        }
      }
      // C) Read manifest from MFS (preferred)
      if (API && headers) {
        try {
          const { signal, cancel } = withTimeout(6000);
          const body = new URLSearchParams();
          body.set('arg', mfsPath);
          const res = await fetch(`${API}/files/read`, { method: 'POST', headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' }, body, signal });
          cancel();
          if (res.ok) {
            const txt = await res.text();
            try { const json = JSON.parse(txt); return { statusCode: 200, headers: TEXT_HEADERS, body: JSON.stringify(json) }; } catch (e) {
              console.error('[registry] Invalid JSON from MFS read', { mfsPath, error: e && e.message ? e.message : String(e) });
              // fall through to gateway
            }
          }
          else {
            const body = await res.text().catch(() => '');
            console.error('[registry] MFS read failed', { mfsPath, status: res.status, body: body?.slice?.(0, 200) });
          }
        } catch (e) {
          // Continue to fallback paths
          console.error('[registry] MFS read threw', { mfsPath, error: e && e.message ? e.message : String(e) });
        }
        // Try alternate legacy path automatically if primary fails
        try {
          const altPath = mfsPath.includes('/manifest/') ? mfsPath.replace('/manifest/', '/manifests/') : mfsPath.replace('/manifests/', '/manifest/');
          if (altPath !== mfsPath) {
            const { signal, cancel } = withTimeout(4000);
            const body = new URLSearchParams();
            body.set('arg', altPath);
            const res = await fetch(`${API}/files/read`, { method: 'POST', headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' }, body, signal });
            cancel();
            if (res.ok) {
              const txt = await res.text();
              try { const json = JSON.parse(txt); return { statusCode: 200, headers: TEXT_HEADERS, body: JSON.stringify(json) }; } catch {}
            }
          }
        } catch {}
      }
      // D) Get IPNS id for manifest-key
      let manifestId = undefined;
      const ipnsId = process.env.IPFS_IPNS_KEY || params.IPFS_IPNS_KEY;
      if (ipnsId && typeof ipnsId === 'string' && ipnsId.startsWith('k51')) {
        manifestId = ipnsId;
      } else if (API && headers) {
        try {
          const list = await fetch(`${API}/key/list`, { method: 'POST', headers });
          if (list.ok) {
            const j = await list.json();
            manifestId = (j?.Keys || []).find(k => k?.Name === 'manifest-key')?.Id;
          } else {
            const body = await list.text().catch(() => '');
            console.error('[registry] key/list failed', { status: list.status, body: body?.slice?.(0, 200) });
          }
        } catch {}
      }
      if (!manifestId) {
        return { statusCode: 404, headers: TEXT_HEADERS, body: JSON.stringify({ error: 'No manifest IPNS id' }) };
      }
      // E) Fallback: fetch manifest via gateway (droplet -> dweb)
      try {
        const json = await fetchFromBases(`ipns/${manifestId}`, [GW, 'https://dweb.link', 'https://cloudflare-ipfs.com', 'https://ipfs.io'], 7000);
        return { statusCode: 200, headers: TEXT_HEADERS, body: JSON.stringify(json) };
      } catch (e) {
        console.error('[registry] gateway/IPNS fetch failed', { id: manifestId, error: e && e.message ? e.message : String(e) });
        return { statusCode: 502, headers: TEXT_HEADERS, body: JSON.stringify({ error: e?.message || 'Fetch failed' }) };
      }
    }

    if (method === 'POST') {
      return { statusCode: 405, headers: TEXT_HEADERS, body: JSON.stringify({ error: 'Writes disabled here; publish handles registry updates' }) };
    }

    return { statusCode: 405, headers: TEXT_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (e) {
    console.error('[registry] unhandled error', { error: e && e.message ? e.message : String(e) });
    return { statusCode: 500, headers: TEXT_HEADERS, body: JSON.stringify({ error: e && e.message ? e.message : 'Server error' }) };
  }
};


