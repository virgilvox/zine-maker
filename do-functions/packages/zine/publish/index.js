'use strict';
try {
  const undici = require('undici');
  if (typeof fetch === 'undefined' && undici.fetch) global.fetch = undici.fetch;
  if (typeof FormData === 'undefined' && undici.FormData) global.FormData = undici.FormData;
  if (typeof Blob === 'undefined' && undici.Blob) global.Blob = undici.Blob;
} catch {}

const TEXT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Access-Control-Allow-Headers': 'content-type,authorization,x-api-secret,X-API-SECRET',
  'Content-Type': 'application/json; charset=utf-8'
};

function dropletConfig(params) {
  const host = process.env.IPFS_DROPLET_HOST || params.IPFS_DROPLET_HOST;
  const pass = process.env.IPFS_DROPLET_ADMIN_PASS || params.IPFS_DROPLET_ADMIN_PASS;
  const user = process.env.IPFS_DROPLET_ADMIN_USER || params.IPFS_DROPLET_ADMIN_USER || 'ipfsadmin';
  const ipnsKey = process.env.IPFS_IPNS_KEY || params.IPFS_IPNS_KEY || 'manifest-key';
  const mfsPath = process.env.IPFS_MFS_MANIFEST_PATH || params.IPFS_MFS_MANIFEST_PATH || '/manifests/latest.json';
  const apiSecret = process.env.IPFS_API_SECRET || params.IPFS_API_SECRET;
  if (!host || !pass || !apiSecret) return null;
  const API = `http://${host}:5002/api/v0`;
  const GW  = `http://${host}:8080`;
  const auth = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  const headers = { Authorization: auth, 'X-API-SECRET': apiSecret };
  return { API, GW, ipnsKey, mfsPath, headers };
}

async function dropletAddJson(dc, name, obj) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const fd = new FormData();
  fd.set('file', blob, name);
  const r = await fetch(`${dc.API}/add?pin=true&cid-version=1`, { method: 'POST', headers: dc.headers, body: fd });
  if (!r.ok) throw new Error(`add ${r.status}`);
  const j = await r.json();
  return j.Hash;
}

async function dropletFilesRead(dc, path) {
  // Primary: read from MFS
  const r = await fetch(`${dc.API}/files/read?arg=${encodeURIComponent(path)}`, { method: 'POST', headers: dc.headers });
  if (r.ok) {
    const t = await r.text();
    try { return JSON.parse(t); } catch {/* fallthrough to stat+gateway */}
  }
  // Fallback: stat -> fetch via gateway (prevents nuking a valid registry on parse issues)
  try {
    const hash = await dropletFilesStat(dc, path);
    const g = await fetch(`${dc.GW}/ipfs/${hash}`, { redirect: 'follow' });
    if (!g.ok) throw new Error(`gw ${g.status}`);
    return await g.json();
  } catch {
    return null;
  }
}

async function dropletFilesWrite(dc, path, bytes) {
  const fd = new FormData();
  fd.set('data', new Blob([bytes], { type: 'application/json' }), 'data.json');
  const r = await fetch(`${dc.API}/files/write?arg=${encodeURIComponent(path)}&create=true&truncate=true&parents=true&flush=true`, { method: 'POST', headers: dc.headers, body: fd });
  if (!r.ok) throw new Error(`write ${r.status}: ${await r.text().catch(()=> '')}`);
}

async function dropletFilesStat(dc, path) {
  const r = await fetch(`${dc.API}/files/stat?arg=${encodeURIComponent(path)}`, { method: 'POST', headers: dc.headers });
  if (!r.ok) throw new Error(`stat ${r.status}: ${await r.text().catch(()=> '')}`);
  const j = await r.json();
  if (!j || !j.Hash) throw new Error('stat:no-hash');
  return j.Hash; // Qm...
}

async function resolveKeyName(dc, ipnsKey) {
  if (ipnsKey && !String(ipnsKey).startsWith('k51')) return String(ipnsKey); // already a name
  try {
    const r = await fetch(`${dc.API}/key/list`, { method: 'POST', headers: dc.headers });
    if (!r.ok) return 'manifest-key';
    const j = await r.json();
    const hit = (j?.Keys || []).find(k => k?.Id === ipnsKey) || (j?.Keys || []).find(k => k?.Name === 'manifest-key');
    return hit?.Name || 'manifest-key';
  } catch {
    return 'manifest-key';
  }
}

async function dropletPublishIpns(dc, cid) {
  // Publish bare CID; Kubo will map to /ipfs/<cid>
  const keyName = await resolveKeyName(dc, dc.ipnsKey);
  const r = await fetch(`${dc.API}/name/publish?key=${encodeURIComponent(keyName)}&allow-offline=true&arg=${encodeURIComponent(cid)}`, { method: 'POST', headers: dc.headers });
  if (!r.ok) throw new Error(`publish ${r.status}: ${await r.text().catch(()=> '')}`);
  return r.json();
}

function coerceRegistryShape(json) {
  const now = new Date().toISOString();
  // If it's an array, treat as legacy entries array
  if (Array.isArray(json)) {
    return { schema: 'v1', updatedAt: now, files: [], entries: json };
  }
  // If it's not an object, start fresh
  if (!json || typeof json !== 'object') {
    return { schema: 'v1', updatedAt: now, files: [], entries: [] };
  }
  const entries =
    Array.isArray(json.entries) ? json.entries :
    Array.isArray(json.items)   ? json.items   :
    Array.isArray(json.files)   ? json.files   : [];
  return {
    schema: json.schema || 'v1',
    updatedAt: now,
    files: Array.isArray(json.files) ? json.files : [],
    entries
  };
}

exports.main = async function (params) {
  if ((params.__ow_method || '').toUpperCase() === 'OPTIONS') {
    return { statusCode: 204, headers: TEXT_HEADERS, body: '' };
  }
  try {
    const dc = dropletConfig(params);
    if (!dc) {
      return { statusCode: 400, headers: TEXT_HEADERS, body: { error: 'Missing IPFS droplet configuration (host/pass/secret)' } };
    }

    const payload = typeof params.__ow_body === 'string'
      ? JSON.parse(Buffer.from(params.__ow_body, 'base64').toString('utf8'))
      : (params.payload || params);

    const project = payload.project;
    if (!project || !project.name) {
      return { statusCode: 400, headers: TEXT_HEADERS, body: { error: 'Missing project' } };
    }

    const projectCid = await dropletAddJson(dc, 'project.json', project);
    let backupCid;
    if (payload.backup) backupCid = await dropletAddJson(dc, 'backup.json', payload.backup);

    const manifest = {
      schema: 'v1',
      title: project.name,
      description: payload.description || project?.metadata?.description,
      tags: (payload.tags || []).map(String).filter(Boolean),
      language: 'en',
      createdAt: new Date().toISOString(),
      project: { cid: projectCid },
      backup: backupCid ? { cid: backupCid, optional: true } : undefined,
      author: payload.author || undefined,
      pinnedVia: ['droplet'],
      app: { name: 'Zine Maker', version: '0.0.0' }
    };
    if (payload.signature?.armored) manifest.signature = payload.signature;

    const manifestCid = await dropletAddJson(dc, 'manifest.json', manifest);

    // Read/normalize registry, upsert entry, write, stat, publish
    let registryCid;
    let registryError;
    try {
      let current = await dropletFilesRead(dc, dc.mfsPath);
      current = coerceRegistryShape(current);
      const entryKey = manifestCid;

      // de-dup by key then append
      const byKey = new Map();
      for (const e of current.entries) {
        const k = e.manifestCid || e.cid || e.id || e.title;
        if (k && k !== entryKey) byKey.set(k, e);
      }
      byKey.set(entryKey, {
        title: manifest.title,
        name: manifest.title,
        description: manifest.description,
        author: manifest.author?.name || manifest.author?.contact || undefined,
        manifestCid,
        projectCid,
        tags: manifest.tags || [],
        createdAt: new Date().toISOString()
      });
      current.entries = Array.from(byKey.values());

      await dropletFilesWrite(dc, dc.mfsPath, JSON.stringify(current));
      registryCid = await dropletFilesStat(dc, dc.mfsPath);
      await dropletPublishIpns(dc, registryCid);
    } catch (e) {
      registryError = e?.message || String(e);
      console.error('[publish] registry/ipns failed:', registryError);
    }

    const link = (cid) => cid ? `${dc.GW}/ipfs/${cid}` : undefined;
    return {
      statusCode: 200,
      headers: TEXT_HEADERS,
      body: {
        projectCid, manifestCid, backupCid,
        links: { project: link(projectCid), manifest: link(manifestCid), backup: link(backupCid) },
        registryCid, registryPath: dc.mfsPath,
        registryError: registryError || null
      }
    };
  } catch (e) {
    const msg = e?.message || 'Server error';
    return { statusCode: 400, headers: TEXT_HEADERS, body: { error: msg } };
  }
};
