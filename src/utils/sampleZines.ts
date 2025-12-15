import type { ZineProject } from '@/types';
import { saveProject } from '@/utils/persistence';

type SampleCard = { id: string; name: string; description: string };
let cachedSamples: SampleCard[] | null = null;

// Files are served from public/samples-json/*.json
const SAMPLE_FILE_MAP: Record<string, string> = {};

function resolveFileBase(id: string): string | null {
  if (SAMPLE_FILE_MAP[id]) return SAMPLE_FILE_MAP[id];
  // treat id as file base; allow explicit filename without .json
  return id && id.indexOf('/') === -1 ? id.replace(/\.json$/i, '') : null;
}

async function loadProjectFromJSON(idOrFileBase: string): Promise<ZineProject | null> {
  const fileBase = resolveFileBase(idOrFileBase) || idOrFileBase.replace(/\.json$/i, '');
  if (!fileBase) return null;
  const url = `/samples-json/${fileBase}.json`;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const data = await res.json();
    const project: ZineProject = (data.project || data) as ZineProject;
    // Normalize dates
    (project as any).createdAt = new Date((project as any).createdAt);
    (project as any).modifiedAt = new Date((project as any).modifiedAt);
    // Add formatVersion to samples if missing (they should use new layout)
    if (!project.formatVersion) {
      project.formatVersion = 2;
    }
    return project;
  } catch (err) {
    console.error('Failed to load sample JSON', fileBase, err);
    return null;
  }
}

async function loadSampleIndex(): Promise<string[] | null> {
  try {
    const res = await fetch('/samples-json/samples-manifest.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const list = await res.json();
    if (Array.isArray(list)) {
      return list
        .map((f: any) => typeof f === 'string' ? f : f?.file)
        .filter((f: any) => typeof f === 'string' && f.toLowerCase().endsWith('.json')) as string[];
    }
    return null;
  } catch {
    return null;
  }
}

async function buildSampleCards(): Promise<SampleCard[]> {
  const index = await loadSampleIndex();
  const files = index || [];
  const cards: SampleCard[] = [];
  for (const file of files) {
    try {
      const url = `/samples-json/${file}`;
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const data = await res.json();
      const project: ZineProject = (data.project || data) as ZineProject;
      const fileBase = file.replace(/\.json$/i, '');
      const id = fileBase;
      const name = project.name || fileBase.replace(/[_-]/g, ' ');
      const description = project.metadata?.description || `${project.template?.pageCount || ''} pages`;
      cards.push({ id, name, description });
    } catch {}
  }
  return cards;
}

export async function installSamples(): Promise<void> {
  const index = await loadSampleIndex();
  const files = index || Object.values(SAMPLE_FILE_MAP).map((b) => `${b}.json`);
  for (const file of files) {
    const base = file.replace(/\.json$/i, '');
    const p = await loadProjectFromJSON(base);
    if (p) await saveProject(p);
  }
}

export async function getSamples(): Promise<SampleCard[]> {
  if (cachedSamples) return cachedSamples;
  cachedSamples = await buildSampleCards();
  return cachedSamples;
}

export async function createSample(id: string): Promise<ZineProject | null> {
  return await loadProjectFromJSON(id);
}


