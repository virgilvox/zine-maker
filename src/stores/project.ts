import { defineStore } from 'pinia';
import { ref, computed, watch, toRaw } from 'vue';
import type { ZineProject, ZinePage, ZineContent, ZineTemplate, ExportOptions } from '@/types';
import { saveProject } from '@/utils/persistence';
import { debounce } from 'lodash-es';

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref<ZineProject | null>(null);
  const currentPageIndex = ref(0);
  const selectedContentIds = ref<string[]>([]);
  const isModified = ref(false);
  const isSaving = ref(false);

  // History (Command-style)
  type HistoryEntry = { name?: string; undo: () => void; redo: () => void };
  const undoStack = ref<HistoryEntry[]>([]);
  const redoStack = ref<HistoryEntry[]>([]);
  const isBatching = ref(false);
  let batchName: string | undefined;
  let batchEntries: HistoryEntry[] = [];

  function getPageById(pageId: string | undefined): ZinePage | undefined {
    if (!pageId) return undefined;
    return currentProject.value?.pages.find(p => p.id === pageId);
  }

  function pushHistory(entry: HistoryEntry) {
    if (isBatching.value) {
      batchEntries.push(entry);
    } else {
      undoStack.value.push(entry);
      redoStack.value = [];
    }
    isModified.value = true;
  }

  function beginBatch(name?: string): void {
    isBatching.value = true;
    batchEntries = [];
    batchName = name;
  }

  function endBatch(): void {
    if (!isBatching.value) return;
    isBatching.value = false;
    if (batchEntries.length === 0) return;
    const entries = batchEntries.slice();
    const entry: HistoryEntry = {
      name: batchName,
      undo: () => { for (let i = entries.length - 1; i >= 0; i--) entries[i].undo(); },
      redo: () => { for (let i = 0; i < entries.length; i++) entries[i].redo(); }
    };
    undoStack.value.push(entry);
    redoStack.value = [];
    batchEntries = [];
    batchName = undefined;
    isModified.value = true;
  }

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  function undo(): void {
    const entry = undoStack.value.pop();
    if (!entry) return;
    entry.undo();
    redoStack.value.push(entry);
    isModified.value = true;
  }

  function redo(): void {
    const entry = redoStack.value.pop();
    if (!entry) return;
    entry.redo();
    undoStack.value.push(entry);
    isModified.value = true;
  }

  // Auto-save watcher
  const debouncedSave = debounce((project: ZineProject) => {
    isSaving.value = true;
    Promise.resolve(saveProject(toRaw(project)))
      .then(() => { isModified.value = false; })
      .finally(() => { isSaving.value = false; });
  }, 600);

  watch(currentProject, (newValue) => {
    if (newValue && isModified.value) {
      debouncedSave(newValue);
    }
  }, { deep: true });

  const currentPage = computed(() => {
    if (!currentProject.value || currentPageIndex.value < 0) return null;
    return currentProject.value.pages[currentPageIndex.value] || null;
  });

  const pageCount = computed(() => {
    return currentProject.value?.pages.length || 0;
  });

  function createNewProject(name: string, template: ZineTemplate): void {
    const pages: ZinePage[] = [];
    
    // Create pages based on template
    for (let i = 0; i < template.pageCount; i++) {
      const pageNumber = i + 1;
      const title = pageNumber === 1
        ? 'Front Cover'
        : (pageNumber === template.pageCount ? 'Back Cover' : `Page ${pageNumber}`);
      pages.push({
        id: `page-${pageNumber}`,
        pageNumber,
        title,
        content: [],
        backgroundColor: '#ffffff'
      });
    }

    currentProject.value = {
      id: `project-${Date.now()}`,
      name,
      template,
      pages,
      createdAt: new Date(),
      modifiedAt: new Date(),
      metadata: {
        author: '',
        description: '',
        tags: []
      },
      formatVersion: 2 // New projects use corrected cover layout
    };

    currentPageIndex.value = 0;
    selectedContentIds.value = [];
    isModified.value = false;
    undoStack.value = [];
    redoStack.value = [];
  }

  function loadProject(project: ZineProject): void {
    // Ensure dates are correctly revived from JSON serialization
    project.createdAt = new Date(project.createdAt);
    project.modifiedAt = new Date(project.modifiedAt);

    // The migration now happens in persistence.ts when loading
    // This ensures it's saved immediately to database
    currentProject.value = project;
    currentPageIndex.value = 0;
    selectedContentIds.value = [];
    isModified.value = false;
    undoStack.value = [];
    redoStack.value = [];
  }

  function setCurrentPage(index: number): void {
    if (currentProject.value && index >= 0 && index < currentProject.value.pages.length) {
      currentPageIndex.value = index;
      selectedContentIds.value = [];
    }
  }

  function addContentToCurrentPage(content: Omit<ZineContent, 'id'>): void {
    if (!currentPage.value) return;

    const newContent: ZineContent = {
      ...content,
      id: `content-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    currentPage.value.content.push(newContent);
    isModified.value = true;

    const snapshot = JSON.parse(JSON.stringify(newContent)) as ZineContent;
    const pageId = currentPage.value.id;
    pushHistory({
      name: 'addContent',
      undo: () => {
        const page = getPageById(pageId);
        if (!page) return;
        const idx = page.content.findIndex(c => c.id === snapshot.id);
        if (idx !== -1) page.content.splice(idx, 1);
      },
      redo: () => {
        const page = getPageById(pageId);
        if (!page) return;
        if (!page.content.find(c => c.id === snapshot.id)) {
          page.content.push(JSON.parse(JSON.stringify(snapshot)));
        }
      }
    });
  }

  function updateContent(contentId: string, updates: Partial<ZineContent>): void {
    if (!currentPage.value) return;

    const contentIndex = currentPage.value.content.findIndex(c => c.id === contentId);
    if (contentIndex !== -1) {
      const existing = currentPage.value.content[contentIndex];
      const prev = JSON.parse(JSON.stringify(existing)) as ZineContent;
      const next = { ...existing, ...updates } as ZineContent;
      // Maintain z-order by sorting on zIndex after update
      currentPage.value.content.splice(contentIndex, 1, next);
      currentPage.value.content.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
      isModified.value = true;

      const after = JSON.parse(JSON.stringify(next)) as ZineContent;
      const pageId = currentPage.value.id;
      pushHistory({
        name: 'updateContent',
        undo: () => {
          const page = getPageById(pageId); if (!page) return;
          const idx = page.content.findIndex(c => c.id === prev.id);
          if (idx !== -1) {
            page.content.splice(idx, 1, JSON.parse(JSON.stringify(prev)));
            page.content.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
          }
        },
        redo: () => {
          const page = getPageById(pageId); if (!page) return;
          const idx = page.content.findIndex(c => c.id === after.id);
          if (idx !== -1) {
            page.content.splice(idx, 1, JSON.parse(JSON.stringify(after)));
            page.content.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
          }
        }
      });
    }
  }

  function deleteContent(contentId: string): void {
    if (!currentPage.value) return;

    const contentIndex = currentPage.value.content.findIndex(c => c.id === contentId);
    if (contentIndex !== -1) {
      const removed = currentPage.value.content[contentIndex];
      const removedSnapshot = JSON.parse(JSON.stringify(removed)) as ZineContent;
      currentPage.value.content.splice(contentIndex, 1);
      selectedContentIds.value = selectedContentIds.value.filter(id => id !== contentId);
      isModified.value = true;

      const indexForReinsert = contentIndex;
      const pageId = currentPage.value.id;
      pushHistory({
        name: 'deleteContent',
        undo: () => {
          const page = getPageById(pageId); if (!page) return;
          page.content.splice(indexForReinsert, 0, JSON.parse(JSON.stringify(removedSnapshot)));
        },
        redo: () => {
          const page = getPageById(pageId); if (!page) return;
          const idx = page.content.findIndex(c => c.id === removedSnapshot.id);
          if (idx !== -1) page.content.splice(idx, 1);
        }
      });
    }
  }

  function setContentVisibility(ids: string[], visible: boolean): void {
    if (!currentPage.value) return;
    const before = ids.map(id => {
      const c = currentPage.value!.content.find(i => i.id === id);
      return { id, visible: c?.visible } as { id: string; visible: boolean | undefined };
    });
    ids.forEach(id => {
      const c = currentPage.value!.content.find(i => i.id === id);
      if (c) c.visible = visible;
    });
    isModified.value = true;

    const pageId = currentPage.value.id;
    pushHistory({
      name: 'setVisibility',
      undo: () => {
        const page = getPageById(pageId); if (!page) return;
        before.forEach(({ id, visible }) => {
          const c = page.content.find(i => i.id === id);
          if (c) c.visible = visible;
        });
      },
      redo: () => {
        const page = getPageById(pageId); if (!page) return;
        ids.forEach(id => {
          const c = page.content.find(i => i.id === id);
          if (c) c.visible = visible;
        });
      }
    });
  }

  function setContentLocked(ids: string[], locked: boolean): void {
    if (!currentPage.value) return;
    const before = ids.map(id => {
      const c = currentPage.value!.content.find(i => i.id === id);
      return { id, locked: c?.locked } as { id: string; locked: boolean | undefined };
    });
    ids.forEach(id => {
      const c = currentPage.value!.content.find(i => i.id === id);
      if (c) c.locked = locked;
    });
    isModified.value = true;

    const pageId = currentPage.value.id;
    pushHistory({
      name: 'setLocked',
      undo: () => {
        const page = getPageById(pageId); if (!page) return;
        before.forEach(({ id, locked }) => {
          const c = page.content.find(i => i.id === id);
          if (c) c.locked = locked;
        });
      },
      redo: () => {
        const page = getPageById(pageId); if (!page) return;
        ids.forEach(id => {
          const c = page.content.find(i => i.id === id);
          if (c) c.locked = locked;
        });
      }
    });
  }

  function reorderContent(order: string[]): void {
    if (!currentPage.value) return;
    // order is array of content ids from back to front
    const prevOrder = currentPage.value.content.map(c => c.id);
    const newContent: ZineContent[] = [];
    order.forEach((id, idx) => {
      const item = currentPage.value!.content.find(c => c.id === id);
      if (item) {
        item.zIndex = idx;
        newContent.push(item);
      }
    });
    currentPage.value.content = newContent;
    isModified.value = true;

    const pageId = currentPage.value.id;
    pushHistory({
      name: 'reorder',
      undo: () => {
        const page = getPageById(pageId); if (!page) return;
        const rebuilt: ZineContent[] = [];
        prevOrder.forEach((id, idx) => {
          const item = page.content.find(c => c.id === id);
          if (item) {
            item.zIndex = idx;
            rebuilt.push(item);
          }
        });
        page.content = rebuilt;
      },
      redo: () => {
        const page = getPageById(pageId); if (!page) return;
        const rebuilt: ZineContent[] = [];
        order.forEach((id, idx) => {
          const item = page.content.find(c => c.id === id);
          if (item) {
            item.zIndex = idx;
            rebuilt.push(item);
          }
        });
        page.content = rebuilt;
      }
    });
  }

  function groupSelected(): string | null {
    if (!currentPage.value || selectedContentIds.value.length < 2) return null;
    const groupId = `group-${Date.now()}`;
    const before = selectedContentIds.value.map(id => {
      const item = currentPage.value!.content.find(c => c.id === id);
      return { id, groupId: item?.groupId } as { id: string; groupId?: string };
    });
    selectedContentIds.value.forEach(id => {
      const item = currentPage.value!.content.find(c => c.id === id);
      if (item) item.groupId = groupId;
    });
    isModified.value = true;

    const pageId = currentPage.value.id;
    const idsSnapshot = before.map(b => b.id);
    pushHistory({
      name: 'group',
      undo: () => {
        const page = getPageById(pageId); if (!page) return;
        before.forEach(({ id, groupId }) => {
          const item = page.content.find(c => c.id === id);
          if (item) item.groupId = groupId;
        });
      },
      redo: () => {
        const page = getPageById(pageId); if (!page) return;
        idsSnapshot.forEach(id => {
          const item = page.content.find(c => c.id === id);
          if (item) item.groupId = groupId;
        });
      }
    });
    return groupId;
  }

  function ungroupSelected(): void {
    if (!currentPage.value || selectedContentIds.value.length === 0) return;
    const before = selectedContentIds.value.map(id => {
      const item = currentPage.value!.content.find(c => c.id === id);
      return { id, groupId: item?.groupId } as { id: string; groupId?: string };
    });
    selectedContentIds.value.forEach(id => {
      const item = currentPage.value!.content.find(c => c.id === id);
      if (item) delete item.groupId;
    });
    isModified.value = true;

    const pageId = currentPage.value.id;
    const idsSnapshot = before.map(b => b.id);
    pushHistory({
      name: 'ungroup',
      undo: () => {
        const page = getPageById(pageId); if (!page) return;
        before.forEach(({ id, groupId }) => {
          const item = page.content.find(c => c.id === id);
          if (item) {
            if (groupId) item.groupId = groupId; else delete item.groupId;
          }
        });
      },
      redo: () => {
        const page = getPageById(pageId); if (!page) return;
        idsSnapshot.forEach(id => {
          const item = page.content.find(c => c.id === id);
          if (item) delete item.groupId;
        });
      }
    });
  }

  function selectContent(contentId: string, addToSelection = false): void {
    if (addToSelection) {
      if (!selectedContentIds.value.includes(contentId)) {
        selectedContentIds.value.push(contentId);
      }
    } else {
      selectedContentIds.value = [contentId];
    }
  }

  function clearSelection(): void {
    selectedContentIds.value = [];
  }

  function updatePageBackground(backgroundColor: string, backgroundImage?: string): void {
    if (!currentPage.value) return;
    const prevColor = currentPage.value.backgroundColor;
    const prevImage = currentPage.value.backgroundImage;
    currentPage.value.backgroundColor = backgroundColor;
    if (backgroundImage !== undefined) {
      currentPage.value.backgroundImage = backgroundImage;
    }
    isModified.value = true;

    const pageId = currentPage.value.id;
    pushHistory({
      name: 'updateBackground',
      undo: () => {
        const page = getPageById(pageId); if (!page) return;
        page.backgroundColor = prevColor;
        page.backgroundImage = prevImage;
      },
      redo: () => {
        const page = getPageById(pageId); if (!page) return;
        page.backgroundColor = backgroundColor;
        if (backgroundImage !== undefined) {
          page.backgroundImage = backgroundImage;
        }
      }
    });
  }

  function updateProjectMetadata(metadata: Partial<ZineProject['metadata']>): void {
    if (!currentProject.value) return;
    const prev = JSON.parse(JSON.stringify(currentProject.value.metadata));
    currentProject.value.metadata = {
      ...currentProject.value.metadata,
      ...metadata
    };
    currentProject.value.modifiedAt = new Date();
    isModified.value = true;

    const next = JSON.parse(JSON.stringify(currentProject.value.metadata));
    pushHistory({
      name: 'updateMetadata',
      undo: () => { if (!currentProject.value) return; currentProject.value.metadata = JSON.parse(JSON.stringify(prev)); },
      redo: () => { if (!currentProject.value) return; currentProject.value.metadata = JSON.parse(JSON.stringify(next)); }
    });
  }

  function updateProjectName(name: string): void {
    if (!currentProject.value) return;
    const prev = currentProject.value.name;
    currentProject.value.name = name;
    currentProject.value.modifiedAt = new Date();
    isModified.value = true;

    pushHistory({
      name: 'updateProjectName',
      undo: () => { if (!currentProject.value) return; currentProject.value.name = prev; },
      redo: () => { if (!currentProject.value) return; currentProject.value.name = name; }
    });
  }

  async function manualSave(): Promise<void> {
    if (!currentProject.value) return;
    isSaving.value = true;
    try {
      await saveProject(toRaw(currentProject.value));
      isModified.value = false;
    } finally {
      isSaving.value = false;
    }
  }

  function getContentById(contentId: string): ZineContent | null {
    if (!currentPage.value) return null;
    return currentPage.value.content.find(c => c.id === contentId) || null;
  }

  function duplicateContent(contentId: string): void {
    const content = getContentById(contentId);
    if (!content) return;

    const duplicated = {
      ...content,
      x: content.x + 20,
      y: content.y + 20
    };
    delete (duplicated as any).id; // Remove id so addContentToCurrentPage creates a new one
    addContentToCurrentPage(duplicated);
  }

  function exportProject(_options: ExportOptions): string {
    if (!currentProject.value) return '';
    
    // This would generate the actual export
    // For now, return a placeholder
    return 'export-data';
  }

  function renamePage(pageId: string, newTitle: string): void {
    if (!currentProject.value) return;
    const page = currentProject.value.pages.find(p => p.id === pageId);
    if (!page) return;
    page.title = newTitle;
    isModified.value = true;
  }

  return {
    currentProject,
    currentPageIndex,
    currentPage,
    pageCount,
    selectedContentIds,
    isModified,
    isSaving,
    // history API
    canUndo,
    canRedo,
    undo,
    redo,
    beginBatch,
    endBatch,
    createNewProject,
    loadProject,
    setCurrentPage,
    addContentToCurrentPage,
    updateContent,
    deleteContent,
    setContentVisibility,
    setContentLocked,
    reorderContent,
    groupSelected,
    ungroupSelected,
    selectContent,
    clearSelection,
    updatePageBackground,
    updateProjectMetadata,
    updateProjectName,
    manualSave,
    getContentById,
    duplicateContent,
    exportProject
    ,
    renamePage
  };
});