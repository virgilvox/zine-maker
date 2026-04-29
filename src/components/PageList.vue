<template>
  <div class="page-list" :class="{ collapsed: uiStore.pageListCollapsed }">
    <div class="page-list-header">
      <h3>Pages</h3>
      <span class="page-count">{{ projectStore.pageCount }} pages</span>
      <button class="collapse-button" @click="uiStore.togglePageListCollapsed()">
        <ChevronRight v-if="uiStore.pageListCollapsed" :size="20" />
        <ChevronDown v-else :size="20" />
      </button>
    </div>

    <div class="pages-grid" ref="pagesGridRef">
      <div 
        v-for="(page, index) in projectStore.currentProject?.pages" 
        :key="page.id"
        class="page-item"
        :class="{ active: index === projectStore.currentPageIndex }"
        @click="projectStore.setCurrentPage(index)"
      >
        <div class="page-preview">
          <div class="page-number">{{ page.pageNumber }}</div>
          <div class="page-content-preview">
            <div class="mini-page">
              <div class="mini-content" v-for="(_, i) in page.content.slice(0,4)" :key="i" :style="{ width: (24 + (i%3)*18) + '%'}"></div>
            </div>
          </div>
        </div>
        <div class="page-info">
          <div class="page-title" @dblclick.stop="startEdit(page)" v-if="editingId !== page.id">{{ pageTitle(page) }}</div>
          <input v-else class="title-input" :value="editValue" @input="onEditInput($event)" @keydown.enter.prevent="commitEdit(page)" @keydown.esc.prevent="cancelEdit" @blur="commitEdit(page)" />
          <div class="page-stats">{{ page.content.length }} items</div>
        </div>
      </div>
    </div>

    <div class="page-actions">
      <div class="export-options">
        <label><input type="checkbox" v-model="uiStore.showPageNumbers" /> Page numbers</label>
        <label><input type="checkbox" v-model="uiStore.showFoldMarks" /> Fold marks</label>
        <label><input type="checkbox" v-model="uiStore.showCutMarks" /> Cut marks</label>
      </div>
      <button @click="exportZine" class="export-button export-button--green">Export Zine for Printing</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSortable } from '@vueuse/integrations/useSortable';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { useAssetStore } from '@/stores/assetStore';
import { exportZineForTemplate } from '@/composables/useZineExport';
import { ChevronRight, ChevronDown } from 'lucide-vue-next';

const projectStore = useProjectStore();
const uiStore = useUIStore();
const assetStore = useAssetStore();

const editingId = ref<string | null>(null);
const editValue = ref('');

const pagesGridRef = ref<HTMLElement | null>(null);
const pageIds = computed(() => projectStore.currentProject?.pages.map(p => p.id) ?? []);

useSortable(pagesGridRef, pageIds, {
  animation: 150,
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  dragClass: 'sortable-drag',
  filter: '.title-input',
  preventOnFilter: false,
  onEnd(evt) {
    const { oldIndex, newIndex } = evt;
    if (oldIndex != null && newIndex != null && oldIndex !== newIndex) {
      projectStore.reorderPages(oldIndex, newIndex);
    }
  },
});

function pageTitle(page: any): string {
  const tpl = projectStore.currentProject?.template;
  if (!tpl) return page.title;
  if (page.pageNumber === 1) return 'Front Cover';
  if (page.pageNumber === tpl.pageCount) return 'Back Cover';
  return page.title;
}

function startEdit(page: any): void {
  editingId.value = page.id;
  editValue.value = page.title;
}
function onEditInput(e: Event): void {
  editValue.value = (e.target as HTMLInputElement).value;
}
function commitEdit(page: any): void {
  if (editingId.value !== page.id) { editingId.value = null; return; }
  const val = editValue.value.trim();
  if (val && val !== page.title) {
    projectStore.renamePage(page.id, val);
  }
  editingId.value = null;
}
function cancelEdit(): void { editingId.value = null; }

async function exportZine(): Promise<void> {
  if (!projectStore.currentProject) {
    console.error('No current project to export.');
    return;
  }
  try {
    const { images, pdfData, width, height } = await exportZineForTemplate(
      projectStore.currentProject,
      (id) => assetStore.getAsset(id),
      {
        showPageNumbers: uiStore.showPageNumbers,
        showFoldMarks: uiStore.showFoldMarks,
        showCutMarks: uiStore.showCutMarks,
        pixelRatio: 2,
      }
    );
    uiStore.exportImageWidth = width;
    uiStore.exportImageHeight = height;
    uiStore.exportImages = images;
    uiStore.exportImageData = images[0];
    uiStore.exportPdfData = pdfData;
    uiStore.showExportModal = true;

  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please check the console for details.');
  }
}

// generatePDF moved to composable
</script>

<style scoped>
.page-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.75rem;
  background: var(--panel);
  border-right: 1px solid var(--border-soft);
}
.page-list.collapsed { width: 40px; }
.page-list.collapsed .pages-grid, .page-list.collapsed .page-actions, .page-list.collapsed .page-count { display: none; }
.page-list.collapsed .page-list-header h3 { display: none; }

.page-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-soft);
}

.page-list-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ui-ink);
}

.page-count {
  color: var(--ui-ink);
  font-size: 0.8rem;
}
.collapse-button { 
  border: none; 
  background: transparent; 
  color: var(--ui-ink); 
  cursor: pointer; 
  padding: 0.4rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
}

.collapse-button:hover {
  background: var(--surface);
}

.pages-grid {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-right: -0.5rem;
  padding-right: 0.5rem;
}

.page-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s ease;
}

.page-item:active {
  cursor: grabbing;
}

.page-item.sortable-ghost {
  opacity: 0.3;
  border-color: #000;
  border-style: dashed;
}

.page-item.sortable-chosen {
  box-shadow: 3px 3px 0 #000;
  border-color: #000;
  background: #e7ffe7;
}

.page-item.sortable-drag {
  opacity: 0.9;
}

.page-item:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.page-item.active {
  border-color: #000;
  box-shadow: 2px 2px 0 #000;
  background: #e7ffe7;
}

.page-preview {
  position: relative;
  width: 64px;
  height: 48px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.page-number {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
}

.page-content-preview {
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
}
.mini-page { background: #fff; border: 1px solid var(--border-soft); width: 100%; height: 100%; position: relative; }
.mini-content { height: 3px; background: var(--border); margin: 2px; }
.mini-icon { position: absolute; right: 2px; bottom: 2px; width: 16px; height: 16px; opacity: 0.9; }

.page-info {
  flex: 1;
  min-width: 0;
}

.page-title {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.9rem;
  margin-bottom: 0.125rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title-input { font-size: 0.9rem; padding: 2px 4px; border: 1px solid var(--border-soft); border-radius: 4px; width: 100%; }

.page-stats {
  font-size: 0.75rem;
  color: #6b7280;
}

.page-actions {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}

.export-options { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; color: var(--ui-ink); }
.export-options label { display: inline-flex; gap: 0.35rem; align-items: center; font-size: 0.85rem; }

.export-button {
  width: 100%;
  padding: 0.6rem;
  background: var(--accent-green);
  color: #000;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 2px 2px 0 #000;
  transform: translate(0,0);
  transition: transform .04s, box-shadow .04s;
}

.export-button:hover { transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #000; }

/* Mobile responsive page list */
@media (max-width: 768px) {
  .page-list {
    padding: 0.5rem;
    /* Improve touch scrolling */
    -webkit-overflow-scrolling: touch;
  }
  
  .page-item {
    padding: 0.6rem;
    gap: 0.6rem;
  }
  
  .page-preview {
    width: 56px;
    height: 42px;
  }
  
  .page-title {
    font-size: 0.85rem;
  }
  
  .page-stats {
    font-size: 0.7rem;
  }
  
  .export-button {
    padding: 0.7rem;
    font-size: 0.85rem;
    /* Larger touch target */
    min-height: 48px;
  }
  
  .export-options label {
    font-size: 0.8rem;
    /* Larger touch targets for checkboxes */
    padding: 0.2rem;
  }
  
  .export-options input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 480px) {
  .page-list {
    padding: 0.4rem;
  }
  
  .page-item {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .page-preview {
    width: 48px;
    height: 36px;
  }
  
  .page-title {
    font-size: 0.8rem;
  }
  
  .page-stats {
    font-size: 0.65rem;
  }
  
  .export-options {
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .export-options label {
    font-size: 0.75rem;
    min-width: 0;
    flex: 0 0 auto;
  }
  
  .collapse-button {
    min-width: 36px;
    min-height: 36px;
    padding: 0.5rem;
  }
}
</style>
