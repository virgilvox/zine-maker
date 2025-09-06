'use strict';
// Ensures fetch/FormData/Blob exist in Node runtime (DO Functions)
try {
  const undici = require('undici');
  if (typeof fetch === 'undefined' && undici.fetch) global.fetch = undici.fetch;
  if (typeof FormData === 'undefined' && undici.FormData) global.FormData = undici.FormData;
  if (typeof Blob === 'undefined' && undici.Blob) global.Blob = undici.Blob;
} catch {}

// DigitalOcean Functions (OpenWhisk) action entry
// Web-exported; expects JSON body. Publishes a project/manifest to your IPFS node (droplet).

const TEXT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'content-type,authorization,x-api-secret,X-API-SECRET',
  'Content-Type': 'application/json; charset=utf-8'
};

// Pinata removed; we exclusively use internal IPFS droplet below

// --- Internal IPFS (Droplet) helpers ---
function dropletConfig(params) {
  const host = process.env.IPFS_DROPLET_HOST || params.IPFS_DROPLET_HOST;
  const pass = process.env.IPFS_DROPLET_ADMIN_PASS || params.IPFS_DROPLET_ADMIN_PASS;
  const user = process.env.IPFS_DROPLET_ADMIN_USER || params.IPFS_DROPLET_ADMIN_USER || 'ipfsadmin';
  const ipnsKey = process.env.IPFS_IPNS_KEY || params.IPFS_IPNS_KEY || 'manifest-key';
  const mfsPath = process.env.IPFS_MFS_MANIFEST_PATH || params.IPFS_MFS_MANIFEST_PATH || '/manifests/latest.json';
  const apiSecret = process.env.IPFS_API_SECRET || params.IPFS_API_SECRET;
  if (!host || !pass) return null;
  const API = `http://${host}:5002/api/v0`;
  const GW = `http://${host}:8080`;
  const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  const baseHeaders = { Authorization: auth };
  if (apiSecret) (baseHeaders)['X-API-SECRET'] = apiSecret;
  return { API, GW, auth, ipnsKey, mfsPath, headers: baseHeaders };
}

async function dropletAddJson(dc, name, obj) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const fd = new FormData();
  fd.set('file', blob, name);
  const res = await fetch(`${dc.API}/add?pin=true&cid-version=1`, { method: 'POST', headers: dc.headers, body: fd });
  if (!res.ok) throw new Error(`Droplet add failed ${res.status}`);
  const j = await res.json();
  return j.Hash;
}

async function dropletFilesRead(dc, path) {
  const res = await fetch(`${dc.API}/files/read?arg=${encodeURIComponent(path)}`, { method: 'POST', headers: dc.headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[publish] files/read failed', { path, status: res.status, body: body?.slice?.(0, 200) });
    return null;
  }
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (e) {
    console.error('[publish] files/read JSON parse failed, falling back to stat+gateway', { path, error: e && e.message ? e.message : String(e) });
    try {
      const cid = await dropletFilesStat(dc, path);
      const gw = `${dc.GW}/ipfs/${cid}`;
      const r2 = await fetch(gw, { redirect: 'follow' });
      if (!r2.ok) throw new Error(`HTTP ${r2.status}`);
      return await r2.json();
    } catch (e2) {
      console.error('[publish] gateway fallback failed', { path, error: e2 && e2.message ? e2.message : String(e2) });
      return null;
    }
  }
}

async function dropletFilesWrite(dc, path, bytes) {
  const fd = new FormData();
  fd.set('data', new Blob([bytes], { type: 'application/json' }), 'data.json');
  const res = await fetch(`${dc.API}/files/write?arg=${encodeURIComponent(path)}&create=true&truncate=true&parents=true&flush=true`, { method: 'POST', headers: dc.headers, body: fd });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[publish] files/write failed', { path, status: res.status, body: body?.slice?.(0, 200) });
    throw new Error(`Droplet write failed ${res.status}`);
  }
}

async function dropletFilesStat(dc, path) {
  const res = await fetch(`${dc.API}/files/stat?arg=${encodeURIComponent(path)}`, { method: 'POST', headers: dc.headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[publish] files/stat failed', { path, status: res.status, body: body?.slice?.(0, 200) });
    throw new Error(`Droplet stat failed ${res.status}`);
  }
  const j = await res.json();
  return j.Hash;
}

async function dropletPublishIpns(dc, cid) {
  // Accept either key NAME (preferred) or IPNS ID (k51...). If ID is supplied, resolve to its name.
  let keyName = dc.ipnsKey || 'self';
  if (keyName && keyName.startsWith('k51')) {
    try {
      const list = await fetch(`${dc.API}/key/list`, { method: 'POST', headers: dc.headers });
      if (list.ok) {
        const j = await list.json();
        const hit = (j?.Keys || []).find((k) => k?.Id === keyName);
        if (hit?.Name) keyName = hit.Name;
      }
    } catch {}
  }
  const res = await fetch(`${dc.API}/name/publish?key=${encodeURIComponent(keyName)}&allow-offline=true&arg=${cid}`, { method: 'POST', headers: dc.headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[publish] name/publish failed', { keyName, cid, status: res.status, body: body?.slice?.(0, 200) });
    throw new Error(`Droplet IPNS publish failed ${res.status}`);
  }
  return res.json();
}

exports.main = async function (params) {
  // CORS preflight
  if ((params.__ow_method || '').toUpperCase() === 'OPTIONS') {
    return { statusCode: 204, headers: TEXT_HEADERS, body: '' };
  }

  try {
    const must = async (step, fn) => {
      try { return await fn(); } catch (e) { console.error('[publish]', step, e && e.message ? e.message : e); throw new Error(`${step}:${e?.message || e}`); }
    };
    const dc = dropletConfig(params);
    if (!dc) {
      return { statusCode: 400, headers: TEXT_HEADERS, body: { error: 'Missing IPFS droplet configuration' } };
    }

    // Accept either direct body from web action or params.payload
    const payload = typeof params.__ow_body === 'string'
      ? JSON.parse(Buffer.from(params.__ow_body, 'base64').toString('utf8'))
      : (params.payload || params);

    const project = payload.project;
    if (!project || !project.name) {
      return { statusCode: 400, headers: TEXT_HEADERS, body: { error: 'Missing project' } };
    }

    // Serialize project
    const projectJson = JSON.stringify(project, (_k, v) => (v && v.toISOString ? v.toISOString() : v));

    // Upload project as JSON (prefer droplet)
    const projectCid = await must('add_project', () => dropletAddJson(dc, 'project.json', JSON.parse(projectJson)));

    let backupCid;
    if (payload.backup) {
      backupCid = await must('add_backup', () => dropletAddJson(dc, 'backup.json', payload.backup));
    }

    // Build manifest aligned with src/types ZineManifest
    const manifest = {
      schema: 'v1',
      title: project.name,
      description: payload.description || project?.metadata?.description,
      tags: (payload.tags || []).map(s => String(s)).filter(Boolean),
      language: 'en',
      createdAt: new Date().toISOString(),
      project: { cid: projectCid },
      backup: backupCid ? { cid: backupCid, optional: true } : undefined,
      author: payload.author || undefined,
      pinnedVia: ['droplet'],
      app: { name: 'Zine Maker', version: '0.0.0' }
    };

    // Note: Skipping upload of embedded public key to avoid FormData; optional feature can be re-added with a multipart client if needed

    // Optionally sign manifest: caller can send precomputed signature
    if (payload.signature && payload.signature.armored) {
      manifest.signature = payload.signature;
    }

    // Upload manifest as JSON
    const manifestCid = await must('add_manifest', () => dropletAddJson(dc, 'manifest.json', manifest));

    // Upsert this publication into a multi-project registry at MFS (entries[]), then publish IPNS
    let newRegistryCid;
    let registryUpdated = false;
    try {
      let current = await must('read_mfs', () => dropletFilesRead(dc, dc.mfsPath));
      if (!current || typeof current !== 'object') current = { schema: 'v1', entries: [] };
      // Normalize shape: support legacy { files: [] } or { items: [] }
      if (!Array.isArray(current.entries)) {
        const maybe = Array.isArray(current.items) ? current.items : (Array.isArray(current.files) ? current.files : []);
        current.entries = Array.isArray(current.entries) ? current.entries : [];
        // If legacy files array exists and entries is empty, carry it over minimally
        if (current.entries.length === 0 && maybe.length) {
          current.entries = maybe.map((f) => ({
            title: f.title || f.path || f.name || 'Untitled',
            name: f.name || f.path || f.title || 'untitled',
            description: f.description,
            manifestCid: f.manifestCid || f.cid,
            projectCid: f.projectCid || undefined,
            tags: f.tags || [],
            createdAt: f.createdAt || new Date().toISOString()
          })).filter((e) => e.manifestCid);
        }
      }
      const add = {
        title: manifest.title,
        name: manifest.title,
        description: manifest.description,
        author: manifest.author?.name || manifest.author?.contact || undefined,
        manifestCid,
        projectCid,
        tags: manifest.tags || [],
        createdAt: new Date().toISOString()
      };
      const byKey = new Map();
      for (const e of current.entries) {
        const key = e.manifestCid || e.cid || e.id || e.title;
        if (key && key !== manifestCid) byKey.set(key, e);
      }
      byKey.set(manifestCid, add);
      current.entries = Array.from(byKey.values());
      await must('write_mfs', () => dropletFilesWrite(dc, dc.mfsPath, JSON.stringify(current)));
      const mCid = await must('stat_mfs', () => dropletFilesStat(dc, dc.mfsPath));
      await must('ipns_publish', () => dropletPublishIpns(dc, mCid));
      newRegistryCid = mCid;
      registryUpdated = true;
    } catch (e) {
      console.error('[publish] registry_upsert failed', e && e.message ? e.message : String(e));
    }

    const toIpfs = (cid) => cid ? `${dc.GW}/ipfs/${cid}` : undefined;
    const links = {
      manifest: { ipfs: toIpfs(manifestCid) },
      project: { ipfs: toIpfs(projectCid) },
      backup: { ipfs: toIpfs(backupCid) }
    };

    return {
      statusCode: 200,
      headers: TEXT_HEADERS,
      body: { manifestCid, projectCid, backupCid, links, registryCid: newRegistryCid, registryUpdated, registryPath: dc.mfsPath }
    };
  } catch (e) {
    const msg = e && e.message ? e.message : 'Server error';
    const step = typeof msg === 'string' && msg.includes(':') ? msg.split(':')[0] : undefined;
    console.error('[publish] unhandled error', { step: step || 'publish_error', error: msg });
    return {
      statusCode: 400,
      headers: TEXT_HEADERS,
      body: { error: 'There was an error processing your request.', code: step || 'publish_error', detail: msg }
    };
  }
};


