import { openDB, type IDBPDatabase } from 'idb';
import type { ZineProject } from '@/types';

const DB_NAME = 'ZineMakerDB';
const PROJECTS_STORE_NAME = 'projects';
const LAST_PROJECT_ID_KEY = 'lastOpenProjectId';

let db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        if (!database.objectStoreNames.contains('assets')) {
          database.createObjectStore('assets', { keyPath: 'id', autoIncrement: true });
        }
      }
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
          database.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
        }
      }
    },
  });
  return db;
}

export async function saveProject(project: ZineProject): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');

  // Serialize to plain JSON to avoid DataCloneError from proxies or complex instances
  const plain = JSON.parse(JSON.stringify(project, (_key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  }));

  await tx.store.put(plain);
  await tx.done;
  await saveLastOpenProjectId(project.id);
}

export async function loadProject(id: string): Promise<ZineProject | undefined> {
  const db = await getDb();
  const raw: any = await db.get(PROJECTS_STORE_NAME, id);
  if (!raw) return undefined;

  // Revive dates
  raw.createdAt = new Date(raw.createdAt);
  raw.modifiedAt = new Date(raw.modifiedAt);

  // Add formatVersion if missing (auto-migrate old projects)
  // AND save the migration back to database
  if (!raw.formatVersion) {
    raw.formatVersion = 2;
    // Save the migrated version back to database
    const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
    await tx.store.put(raw);
    await tx.done;
  }

  return raw as ZineProject;
}

export async function getAllProjects(): Promise<ZineProject[]> {
  const db = await getDb();
  const projects = await db.getAll(PROJECTS_STORE_NAME);

  // Migrate any projects missing formatVersion
  const projectsToUpdate: any[] = [];

  projects.forEach((p: any) => {
    // Ensure dates are Date objects
    p.createdAt = new Date(p.createdAt);
    p.modifiedAt = new Date(p.modifiedAt);

    // Add formatVersion if missing
    if (!p.formatVersion) {
      p.formatVersion = 2;
      projectsToUpdate.push(p);
    }
  });

  // Save any migrated projects back to database
  if (projectsToUpdate.length > 0) {
    const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
    for (const project of projectsToUpdate) {
      await tx.store.put(project);
    }
    await tx.done;
  }

  return projects;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
  await tx.store.delete(id);
  await tx.done;
}

export async function renameProject(id: string, newName: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
  const project: any = await tx.store.get(id);
  if (!project) return;
  project.name = newName;
  project.modifiedAt = new Date().toISOString();
  await tx.store.put(project);
  await tx.done;
}

export async function deleteAllProjects(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(PROJECTS_STORE_NAME, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function saveLastOpenProjectId(id: string): Promise<void> {
  localStorage.setItem(LAST_PROJECT_ID_KEY, id);
}

export function getLastOpenProjectId(): string | null {
  return localStorage.getItem(LAST_PROJECT_ID_KEY);
}
