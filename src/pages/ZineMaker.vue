<template>
  <div class="zine-maker-page">
    <ImageUploadModal 
      :visible="uiStore.showImageUploadModal" 
      @close="uiStore.showImageUploadModal = false"
      @image-added="addImageToCanvas"
    />
    <ExportModal 
      :visible="uiStore.showExportModal"
      :image-src="uiStore.exportImageData"
      @close="uiStore.showExportModal = false"
    />

    <ProjectsModal 
      v-if="uiStore.showProjectsModal"
      @close="uiStore.closeProjectsModal()"
    />

    <TemplateSelector v-if="uiStore.showTemplateSelector" />
    <div v-if="uiStore.showStorageNotice" class="notice-overlay" @click.self="uiStore.closeStorageNotice()">
      <div class="notice">
        <h3>About Your Projects</h3>
        <p>Your projects are saved in your browser (IndexedDB/localStorage). They are not stored in the cloud.</p>
        <p>A browser reset or clearing site data will remove local projects. Consider exporting regularly.</p>
        <button class="header-button header-button--red" @click="uiStore.closeStorageNotice()">Got it</button>
      </div>
    </div>
    
    <div v-else class="zine-maker">
      <header class="app-header">
        <div class="header-left">
          <AppLogo />
          <div v-if="projectStore.currentProject" class="project-info">
            <span class="project-name">{{ projectStore.currentProject.name }}</span>
            <span class="template-info">{{ projectStore.currentProject.template.name }}</span>
          </div>
        </div>
        <div class="header-center">
          <RssAudioPlayer />
        </div>
        
        <div class="header-right">
          <button v-if="isMobile" @click="uiStore.togglePageListCollapsed()" class="header-button icon-only" title="Toggle Pages" aria-label="Toggle Pages">
            <Sidebar :size="16" />
          </button>
          <button v-if="isMobile" @click="uiStore.togglePropertiesCollapsed()" class="header-button icon-only" title="Toggle Properties" aria-label="Toggle Properties">
            <Sliders :size="16" />
          </button>
          <a v-if="!isMobile" href="https://github.com/virgilvox/zine-maker" target="_blank" rel="noopener noreferrer" class="header-button icon-only" title="GitHub Repository" aria-label="GitHub">
            <Github :size="16" />
          </a>
          <router-link to="/markdown" class="header-button" title="Markdown Editor" aria-label="Markdown">
            <FileText :size="16" />
            <span>Markdown</span>
          </router-link>
          <button @click="uiStore.showTemplateSelectorModal()" class="header-button header-button--red" title="New Project">
            <FilePlus :size="16" />
            <span>New Project</span>
          </button>
          <button @click="manualSave" class="header-button icon-only" :disabled="saving" title="Save project" aria-label="Save">
            <Save :size="16" />
          </button>
          <button @click="uiStore.openProjectsModal()" class="header-button" title="Projects">
            <FolderOpen :size="16" />
            <span>Projects</span>
          </button>
        </div>
      </header>

      <!-- Mobile backdrop for expanded panels -->
      <div v-if="isMobile && ((uiStore.showPageList && !uiStore.pageListCollapsed) || (uiStore.showProperties && !uiStore.propertiesCollapsed))" class="panel-backdrop" @click="closeMobilePanels" />

      <div class="app-main">
        <PageList 
          v-if="uiStore.showPageList" 
          class="sidebar" 
        />
        <KonvaPageEditor class="editor" />
        <PropertiesPanel 
          v-if="uiStore.showProperties" 
          class="properties" 
          @close="uiStore.toggleProperties()"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import TemplateSelector from '@/components/TemplateSelector.vue';
import AppLogo from '@/components/AppLogo.vue';
import KonvaPageEditor from '@/components/KonvaPageEditor.vue';
import PropertiesPanel from '@/components/properties/PropertiesPanel.vue';
import PageList from '@/components/PageList.vue';
import ImageUploadModal from '@/components/ImageUploadModal.vue';
import ExportModal from '@/components/ExportModal.vue';
import RssAudioPlayer from '@/components/RssAudioPlayer.vue';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { useToolsStore } from '@/stores/tools';
import { FilePlus, FolderOpen, Github, Save, Sidebar, Sliders, FileText } from 'lucide-vue-next';
// @ts-ignore - Vue SFC type shim might be missing in this project setup
import ProjectsModal from '@/components/ProjectsModal.vue';
import { useAssetStore } from '@/stores/assetStore';
import { getLastOpenProjectId, loadProject } from '@/utils/persistence';

const projectStore = useProjectStore();
const uiStore = useUIStore();
const toolsStore = useToolsStore();
const assetStore = useAssetStore();

const theme = ref<'light'|'dark'>( (localStorage.getItem('theme') as any) || 'light');
const isMobile = ref(false);
function updateIsMobile() { 
  const wasMobile = isMobile.value;
  isMobile.value = window.matchMedia('(max-width: 900px)').matches; 
  
  // Auto-collapse panels when switching to mobile
  if (isMobile.value && !wasMobile) {
    uiStore.pageListCollapsed = true;
    uiStore.propertiesCollapsed = true;
  }
}
function applyTheme() { document.documentElement.setAttribute('data-theme', theme.value); }

const saving = ref(false);
async function manualSave() {
  saving.value = true;
  try {
    await projectStore.manualSave();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  setupKeyboardShortcuts();
  await assetStore.initDB();
  applyTheme();
  updateIsMobile();
  window.addEventListener('resize', updateIsMobile);
  
  // Auto-collapse panels on mobile but keep them visible
  if (isMobile.value) {
    uiStore.pageListCollapsed = true;
    uiStore.propertiesCollapsed = true;
  }
  
  // Attempt to load the last open project
  const lastProjectId = getLastOpenProjectId();
  if (lastProjectId) {
    const project = await loadProject(lastProjectId);
    if (project) {
      projectStore.loadProject(project);
      uiStore.hideTemplateSelector();
      // First-time storage notice
      if (!localStorage.getItem('zineMaker.storageNoticeShown')) {
        uiStore.openStorageNotice();
        localStorage.setItem('zineMaker.storageNoticeShown', '1');
      }
      // Ensure canvas centers after project DOM is painted
      try {
        await Promise.resolve();
        uiStore.requestFit();
        setTimeout(() => uiStore.requestFit(), 0);
      } catch {}
    }
  }
});

onUnmounted(() => {
  cleanupKeyboardShortcuts();
  window.removeEventListener('resize', updateIsMobile);
});

function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', handleKeyDown);
}

function cleanupKeyboardShortcuts(): void {
  document.removeEventListener('keydown', handleKeyDown);
}

function handleKeyDown(event: KeyboardEvent): void {
  // Ignore if typing in input fields
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  // Tool shortcuts
  switch (event.key.toLowerCase()) {
    case 'v':
      toolsStore.setActiveTool('select');
      event.preventDefault();
      break;
    case 't':
      toolsStore.setActiveTool('text');
      event.preventDefault();
      break;
    case 'i':
      toolsStore.setActiveTool('image');
      event.preventDefault();
      break;
    case 's':
      toolsStore.setActiveTool('shape');
      event.preventDefault();
      break;
    case 'd':
      toolsStore.setActiveTool('draw');
      event.preventDefault();
      break;
    case 'h':
      toolsStore.setActiveTool('pan');
      event.preventDefault();
      break;
    case 'z':
      toolsStore.setActiveTool('zoom');
      event.preventDefault();
      break;
    case 'delete':
    case 'backspace':
      if (projectStore.selectedContentIds.length > 0) {
        projectStore.selectedContentIds.forEach(id => {
          projectStore.deleteContent(id);
        });
        event.preventDefault();
      }
      break;
  }

  // Undo/Redo shortcuts
  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    projectStore.undo();
    event.preventDefault();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key.toLowerCase() === 'z')) {
    projectStore.redo();
    event.preventDefault();
    return;
  }

  // Page navigation
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'ArrowLeft':
        if (projectStore.currentPageIndex > 0) {
          projectStore.setCurrentPage(projectStore.currentPageIndex - 1);
        }
        event.preventDefault();
        break;
      case 'ArrowRight':
        if (projectStore.currentPageIndex < projectStore.pageCount - 1) {
          projectStore.setCurrentPage(projectStore.currentPageIndex + 1);
        }
        event.preventDefault();
        break;
    }
  }
}

function closeMobilePanels(): void {
  if (!isMobile.value) return;
  uiStore.pageListCollapsed = true;
  uiStore.propertiesCollapsed = true;
}

async function addImageToCanvas(assetId: number) {
  const file = await assetStore.getAsset(assetId);
  if (!file) return;

  const src = URL.createObjectURL(file);

  const { width, height } = await getImageDimensions(src);

  const imageContent = {
    type: 'image' as const,
    x: 50,
    y: 50,
    width,
    height,
    rotation: 0,
    zIndex: Date.now(),
    properties: {
      src,
      alt: file.name,
      opacity: 1,
      assetId: assetId
    }
  };
  projectStore.addContentToCurrentPage(imageContent);
  toolsStore.setActiveTool('select');
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(scaleToFit(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function scaleToFit(width: number, height: number, maxDimension = 300): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}
</script>

<style>
/* Mobile touch optimizations */
button, .tool-button, .header-button {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
}

/* Prevent text selection on UI elements */
.app-header, .app-toolbar, .page-list-header, .properties-header {
  user-select: none;
  -webkit-user-select: none;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8fafc;
  color: #1f2937;
  /* Mobile optimizations */
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.zine-maker {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile */
  display: flex;
  flex-direction: column;
  /* Prevent mobile scaling issues */
  overflow: hidden;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: var(--panel);
  border-bottom: 1px solid var(--border-soft);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  height: 64px;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: nowrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 0 0 auto;
}

.header-left h1 {
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.project-name {
  font-weight: 500;
  color: var(--ui-ink);
  /* More aggressive fluid scaling: min 12px, scales with viewport, max 18px */
  font-size: clamp(0.75rem, 1.8vw, 1.125rem);
}

.template-info {
  font-size: 0.9rem;
  color: var(--ui-ink);
}

.header-right {
  display: flex;
  gap: 1rem;
  flex: 0 0 auto;
  flex-wrap: nowrap;
  align-items: center;
  min-width: 0; /* Allow shrinking */
}

.header-center {
  display: flex;
  flex: 1 1 0;
  justify-content: center;
  align-items: center;
  min-width: 160px;
}

.header-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border-soft);
  background: var(--surface);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  color: var(--ui-ink);
  white-space: nowrap;
}
.header-button.icon-only { padding: 0.5rem; }
.header-button--red { 
  background: var(--accent-red); 
  color: #fff; 
  border: 1.5px solid var(--border); 
  box-shadow: 2px 2px 0 #000;
  transform: translate(0,0);
}
.header-button--red:hover { 
  transform: translate(-1px,-1px); 
  box-shadow: 3px 3px 0 #000; 
}

.header-button--green {
  background: var(--accent-green);
  color: #000;
  border: 1.5px solid var(--border);
  box-shadow: 2px 2px 0 #000;
  transform: translate(0,0);
}
.header-button--green:hover {
  transform: translate(-1px,-1px);
  box-shadow: 3px 3px 0 #000;
}

.header-button:hover {
  background: var(--panel);
  border-color: var(--border);
}

/* Responsive: collapse header button text to icons on smaller widths */
@media (max-width: 1200px) {
  .app-header .header-right .header-button span { display: none; }
  .app-header .header-right .header-button { padding: 0.5rem; }
  .app-header .header-left .project-info { display: none; }
}

/* Better mobile header layout - keep it simple */
@media (max-width: 768px) {
  .app-header {
    padding: 0.5rem 0.8rem;
    height: 60px;
    gap: 0.5rem;
  }
  
  .header-left {
    flex: 1 1 auto;
    min-width: 0;
  }
  
  .header-center {
    min-width: 120px;
  }
  
  .header-right {
    flex: 0 0 auto;
    gap: 0.4rem;
  }
  
  .header-button {
    padding: 0.4rem;
    font-size: 0.8rem;
    min-width: 40px;
    min-height: 40px;
  }
  
  .header-button.icon-only {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 0.4rem 0.6rem;
    height: 56px;
    gap: 0.4rem;
  }
  
  .header-button {
    padding: 0.3rem;
    min-width: 36px;
    min-height: 36px;
    font-size: 0.75rem;
  }
  
  .header-button.icon-only {
    width: 36px;
    height: 36px;
  }
  
  .header-right {
    gap: 0.3rem;
  }
  
  .header-center {
    min-width: 100px;
  }
}

/* Very small mobile - hide radio */
@media (max-width: 560px) {
  .header-center {
    display: none;
  }
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: calc(100vh - 64px);
  min-height: 0; /* Allow flex shrinking */
}

.editor {
  flex: 1;
  min-width: 0; /* Allow flex item to shrink below content size */
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--surface);
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
}

.properties {
  width: 280px;
  flex-shrink: 0;
}

/* Mobile responsive layout - proper side panels that collapse */
@media (max-width: 900px) {
  .app-main { 
    position: relative;
    height: calc(100vh - 64px); /* Full remaining viewport height */
  }
  .editor { 
    flex: 1 1 auto; 
  }
  .sidebar, .properties {
    position: absolute;
    top: 50px; /* Account for toolbar height */
    bottom: 0;
    background: var(--panel);
    z-index: 2000;
    height: auto; /* Let it fill available space */
    max-height: calc(100% - 50px);
    overflow-y: auto;
    box-shadow: 0 0 20px rgba(0,0,0,.2);
    transition: transform .3s ease;
    will-change: transform;
  }
  .sidebar { 
    left: 0; 
    width: min(80vw, 320px); 
  }
  .properties { 
    right: 0; 
    width: min(80vw, 360px); 
  }
  
  /* Collapsed panels show just their header */
  .sidebar.collapsed {
    width: 40px;
    transform: translateX(0);
  }
  .properties.collapsed {
    width: 40px;
    transform: translateX(0);
  }
  
  /* Expanded panels slide in fully */
  .sidebar:not(.collapsed) { transform: translateX(0%); }
  .properties:not(.collapsed) { transform: translateX(0%); }
  
  .panel-backdrop { 
    position: fixed; 
    inset: 114px 0 0 0; /* Header (64px) + Toolbar (~50px) */
    background: rgba(0,0,0,.35); 
    z-index: 900;
  }
}

.notice-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 2200; /* Above other modals */ }
.notice { background: var(--panel); border: 1.5px solid var(--border); border-radius: 12px; padding: 1.25rem; width: min(520px, 90vw); box-shadow: 4px 4px 0 #000; }
.notice h3 { margin: 0 0 .5rem 0; }
.notice p { margin: .25rem 0; color: var(--ui-ink); }
.notice button { margin-top: .75rem; }
</style>
