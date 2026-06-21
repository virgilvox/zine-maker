<template>
  <div class="modal-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="close-button" @click="$emit('close')">×</button>
      
      <div class="modal-header">
        <h3>Export Zine</h3>
        <p>Preview and download your zine layout for printing.</p>
      </div>

      <div class="export-tabs">
        <button 
          @click="activeTab = 'png'" 
          :class="{ active: activeTab === 'png' }"
          class="tab-button"
        >
          PNG Preview
        </button>
        <button 
          @click="activeTab = 'pdf'" 
          :class="{ active: activeTab === 'pdf' }"
          class="tab-button"
        >
          PDF Preview
        </button>
      </div>

      <div class="preview-container">
        <div v-if="activeTab === 'png' && currentPng" class="png-wrapper">
          <div class="page-label" v-if="uiStore.exportImages.length >= 1">{{ sideLabel }}</div>
          <img :src="currentPng" alt="Zine Preview" class="png-image" />
        </div>
        <div v-else-if="activeTab === 'png'" class="no-preview">
          <p>PNG preview not available</p>
          <p class="debug">No images generated</p>
        </div>
        <iframe 
          v-else-if="activeTab === 'pdf' && pdfSrc" 
          :src="pdfSrc" 
          class="pdf-preview"
        ></iframe>
        <div v-else class="no-preview">
          <p>PDF preview not available</p>
          <p class="debug">PDF data length: {{ pdfSrc ? pdfSrc.length : 0 }}</p>
        </div>
      </div>

      <div class="pager-row" v-if="activeTab==='png' && uiStore.exportImages.length > 1">
        <button class="pager-btn" @click="prevPage" :disabled="pageIndex===0">← Prev</button>
        <span class="pager-indicator">{{ pageIndex + 1 }} / {{ uiStore.exportImages.length }}</span>
        <button class="pager-btn" @click="nextPage" :disabled="pageIndex===uiStore.exportImages.length-1">Next →</button>
      </div>

      <div class="export-actions">
        <button @click="downloadPng" class="download-button png-button">
          <Download :size="16" />
          <span>Download PNG</span>
        </button>
        <button @click="downloadPdf" class="download-button pdf-button">
          <FileText :size="16" />
          <span>Download PDF</span>
        </button>
      </div>

      <div class="print-instructions">
        <h4>Printing Instructions:</h4>
        <ul>
          <li>Print at 100% scale (no scaling). Use standard size paper (letter: 8.5" × 11", A4: 210mm × 297mm)</li>
          <li>For quarter-fold: Fold in half horizontally, then vertically. For half-fold: Fold in half along the center line.</li>
          <li>Cut along fold lines if needed to separate pages</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Download, FileText } from 'lucide-vue-next';
import { useUIStore } from '@/stores/ui';

const props = defineProps<{ visible: boolean; imageSrc: string }>();

defineEmits<{
  (e: 'close'): void;
}>();

const uiStore = useUIStore();
const activeTab = ref<'png' | 'pdf'>('png');
const pageIndex = ref(0);
const currentPng = computed(() => uiStore.exportImages.length ? uiStore.exportImages[pageIndex.value] : props.imageSrc);

function nextPage() { if (pageIndex.value < uiStore.exportImages.length - 1) pageIndex.value++; }
function prevPage() { if (pageIndex.value > 0) pageIndex.value--; }

const sideLabel = computed(() => {
  if (uiStore.exportImages.length === 2) return pageIndex.value === 0 ? 'Front (Side 1)' : 'Back (Side 2)';
  return 'Sheet';
});

const pdfSrc = computed(() => {
  // If exportPdfData is a data URL, convert to blob URL for better iframe compatibility
  const data = uiStore.exportPdfData;
  if (!data) return null;
  if (data.startsWith('data:application/pdf')) {
    try {
      const base64 = data.split(',')[1];
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch {
      return data;
    }
  }
  return data;
});

function downloadPng() {
  const link = document.createElement('a');
  link.href = currentPng.value || props.imageSrc;
  link.download = `zine-export-${pageIndex.value + 1}.png`;
  link.click();
}

function downloadPdf() {
  if (uiStore.exportPdfData) {
    const link = document.createElement('a');
    link.href = uiStore.exportPdfData;
    link.download = 'zine-export.pdf';
    link.click();
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100; /* Above mobile panels */
}
.modal-content {
  background: var(--panel);
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 80vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
}
.close-button {
  position: absolute;
  top: 1rem; right: 1rem;
  background: none; border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #9ca3af;
}
.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;
}
.modal-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.export-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #374151;
}

.tab-button.active {
  color: var(--ink);
  border-bottom-color: var(--border);
}

.preview-container {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  /* overflow: scroll; */
  height: 60vh; /* fixed viewport area so image can scale to fit */
}
.png-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.png-image {
  display: block;
  width: 30%;
  height: 30%;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.page-label {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0,0,0,.65);
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  letter-spacing: .02em;
}
.pdf-preview {
  width: 75%;
  height: 75%;
  min-height: 400px;
  border: none;
  border-radius: 4px;
}

.no-preview {
  color: #6b7280;
  text-align: center;
}

.debug {
  font-size: 0.7rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

.export-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding-top: 1.5rem;
}

.pager-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .75rem;
  margin-top: .75rem;
}
.pager-btn { border: 1px solid var(--border-soft); background: var(--surface); color: var(--ui-ink); padding: .4rem .7rem; border-radius: 6px; cursor: pointer; }
.pager-btn:disabled { opacity: .5; cursor: not-allowed; }
.pager-indicator { color: var(--ui-ink); font-size: .9rem; }

.download-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.png-button {
  background: #10b981;
  color: white;
}

.png-button:hover {
  background: #059669;
}

.pdf-button {
  background: #dc2626;
  color: white;
}

.pdf-button:hover {
  background: #b91c1c;
}

.print-instructions {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.print-instructions h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: #374151;
}

.print-instructions ul {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.7rem;
  color: #6b7280;
  line-height: 1.4;
}

.print-instructions li {
  margin-bottom: 0.25rem;
}

/* Mobile responsive export modal */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-width: 95vw;
    max-height: 95vh;
    padding: 1.5rem;
  }
  
  .preview-container {
    height: 50vh;
  }
  
  .png-image {
    width: 50%;
    height: 50%;
  }
  
  .pdf-preview {
    width: 90%;
    height: 90%;
    min-height: 300px;
  }
  
  .export-actions {
    flex-direction: column;
    gap: 0.8rem;
  }
  
  .download-button {
    width: 100%;
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 98vw;
    padding: 1rem;
    border-radius: 6px;
  }
  
  .modal-header h3 {
    font-size: 1.1rem;
  }
  
  .preview-container {
    height: 45vh;
  }
  
  .png-image {
    width: 70%;
    height: 70%;
  }
  
  .print-instructions {
    margin-top: 1rem;
    padding: 0.8rem;
  }
  
  .print-instructions h4 {
    font-size: 0.75rem;
  }
  
  .print-instructions ul {
    font-size: 0.65rem;
  }
}
</style>
