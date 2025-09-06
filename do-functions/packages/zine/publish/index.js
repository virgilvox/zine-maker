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
  const GW = `http://${host}:8080`;
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
  const r = await fetch(`${dc.API}/files/read?arg=${encodeURIComponent(path)}`, { method: 'POST', headers: dc.headers });
  if (r.ok) {
    const t = await r.text();
    try { return JSON.parse(t); } catch {}
  }
  // fallback: stat -> gateway fetch
  const cid = await dropletFilesStat(dc, path);
  const r2 = await fetch(`${dc.GW}/ipfs/${cid}`, { method: 'GET', redirect: 'follow' });
  if (!r2.ok) throw new Error(`read via gw ${r2.status}`);
  return await r2.json();
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
  return j.Hash;
}

async function dropletPublishIpns(dc, cid) {
  let keyName = dc.ipnsKey || 'self';
  if (keyName && keyName.startsWith('k51')) {
    try {
      const list = await fetch(`${dc.API}/key/list`, { method: 'POST', headers: dc.headers });
      if (list.ok) {
        const j = await list.json();
        const hit = (j?.Keys || []).find(k => k?.Id === keyName);
        if (hit?.Name) keyName = hit.Name;
      }
    } catch {}
  }
  const target = `/ipfs/${cid}`;
  const r = await fetch(`${dc.API}/name/publish?key=${encodeURIComponent(keyName)}&allow-offline=true&arg=${encodeURIComponent(target)}`, { method: 'POST', headers: dc.headers });
  if (!r.ok) throw new Error(`publish ${r.status}: ${await r.text().catch(()=> '')}`);
  return r.json();
}

exports.main = async function (params) {
  if ((params.__ow_method || '').toUpperCase() === 'OPTIONS') {
    return { statusCode: 204, headers: TEXT_HEADERS, body: '' };
  }
  try {
    const dc = dropletConfig(params);
    if (!dc) return { statusCode: 400, headers: TEXT_HEADERS, body: { error: 'Missing IPFS droplet configuration (host/pass/secret)' } };

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

    // update registry (MFS) and publish IPNS
    let registryCid;
    try {
      let current = await dropletFilesRead(dc, dc.mfsPath).catch(() => null);
      if (!current || typeof current !== 'object') current = { schema: 'v1', entries: [] };
      if (!Array.isArray(current.entries)) current.entries = [];

      const entry = {
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
        const k = e.manifestCid || e.cid || e.id || e.title;
        if (k && k !== manifestCid) byKey.set(k, e);
      }
      byKey.set(manifestCid, entry);
      current.entries = Array.from(byKey.values());

      await dropletFilesWrite(dc, dc.mfsPath, JSON.stringify(current));
      registryCid = await dropletFilesStat(dc, dc.mfsPath);
      await dropletPublishIpns(dc, registryCid);
    } catch (e) {
      console.error('[publish] registry/ipns failed:', e?.message || String(e));
    }

    const link = (cid) => cid ? `${dc.GW}/ipfs/${cid}` : undefined;
    return {
      statusCode: 200,
      headers: TEXT_HEADERS,
      body: {
        projectCid, manifestCid, backupCid,
        links: { project: link(projectCid), manifest: link(manifestCid), backup: link(backupCid) },
        registryCid, registryPath: dc.mfsPath
      }
    };
  } catch (e) {
    const msg = e?.message || 'Server error';
    return { statusCode: 400, headers: TEXT_HEADERS, body: { error: msg } };
  }
};
