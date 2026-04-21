<template>
  <div class="konva-page-editor">
    <AppToolbar />

    <div class="stage-wrapper" ref="stageWrapper">
      <div class="canvas-container resizable" ref="canvasContainer">
        <v-stage
          ref="stageRef"
          :config="stageConfig"
          @wheel="onWheel"
          @mousedown="onStageMouseDown"
          @touchstart="onStageMouseDown"
          @mousemove="onStageMouseMove"
          @touchmove="onStageMouseMove"
          @mouseup="onStageMouseUp"
          @touchend="onStageMouseUp"
          @click="onStageClick"
          @tap="onStageClick"
        >
          <v-layer ref="contentLayerRef">
            <!-- Background page -->
            <v-rect :config="pageBackgroundConfig" />
            
            <!-- Render shapes/images/text -->
            <template v-for="node in pageNodes" :key="node.id">
              <v-rect
                v-if="node.kind === 'shape' && node.shapeType === 'rectangle'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
              <v-circle
                v-else-if="node.kind === 'shape' && node.shapeType === 'circle'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
              <v-line
                v-else-if="node.kind === 'shape' && node.shapeType === 'line'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
              <v-regular-polygon
                v-else-if="node.kind === 'shape' && node.shapeType === 'triangle'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
              <v-text
                v-else-if="node.kind === 'text'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
              <v-image
                v-else-if="node.kind === 'image'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
              <v-line
                v-else-if="node.kind === 'drawing'"
                :config="node.config"
                @mousedown="onNodeMouseDown(node.id, $event)"
                @touchstart="onNodeMouseDown(node.id, $event)"
                @click="selectNode(node.id, $event)"
                @tap="selectNode(node.id, $event)"
                @dblclick="onNodeDblClick(node.id, $event)"
                @dbltap="onNodeDblClick(node.id, $event)"
                @dragmove="onNodeDragMove(node.id, $event)"
                @dragend="onDragEnd(node.id, $event)"
              />
            </template>

            <!-- Selection overlay to keep group/multi selection when clicking inside bounds -->
            <v-rect
              v-if="hasSelection && selectionBounds"
              :config="{ x: selectionBounds.x, y: selectionBounds.y, width: selectionBounds.width, height: selectionBounds.height, fill: 'rgba(0,0,0,0)', listening: true, id: 'selection-overlay' }"
              @mousedown="onOverlayMouseDown"
              @touchstart="onOverlayMouseDown"
              @mousemove="onOverlayMouseMove"
              @touchmove="onOverlayMouseMove"
              @mouseup="onOverlayMouseUp"
              @touchend="onOverlayMouseUp"
            />

            <!-- Selection marquee -->
            <v-rect v-if="isSelecting"
              :config="{ x: selectionRect.x, y: selectionRect.y, width: selectionRect.width, height: selectionRect.height, stroke: '#2563eb', dash: [4,4], listening: false }"
            />

            <!-- Konva Transformer -->
            <v-transformer
              v-if="hasSelection"
              ref="transformerRef"
              :config="transformerConfig"
            />
          </v-layer>
        </v-stage>
      </div>
      <div class="floating-zoom">
        <button class="fz-btn" @click="zoomOut" title="Zoom Out">–</button>
        <button class="fz-btn" @click="fit" title="Fit">Fit</button>
        <button class="fz-btn" @click="zoomIn" title="Zoom In">+</button>
      </div>
      

      <div class="resize-handle" @mousedown.prevent="startResize"></div>

      <!-- Text editor overlay -->
      <textarea
        v-if="editingText.visible"
        ref="textAreaRef"
        v-model="editingText.value"
        class="text-editor"
        :style="editingText.style"
        @blur="commitTextEdit"
        @keydown.enter.prevent="commitTextEdit"
        @keydown.esc.prevent="cancelTextEdit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, shallowRef } from 'vue';
import { useProjectStore } from '@/stores/project';
import { useToolsStore } from '@/stores/tools';
import { useAssetStore } from '@/stores/assetStore';
import type { TextProperties, ImageProperties, ShapeProperties } from '@/types';
import Konva from 'konva';
import AppToolbar from './AppToolbar.vue';
import { useUIStore } from '@/stores/ui';

const projectStore = useProjectStore();
const toolsStore = useToolsStore();
const assetStore = useAssetStore();
const uiStore = useUIStore();

const stageRef = ref<any>(null);
const contentLayerRef = ref<any>(null);
const transformerRef = ref<any>(null);
const stageWrapper = ref<HTMLDivElement | null>(null);
const canvasContainer = ref<HTMLDivElement | null>(null);

const scaleBy = 1.05;
const containerPad = 40;

const containerSize = ref<{ w: number; h: number }>({ w: 0, h: 0 });
let resizeObserver: ResizeObserver | null = null;

const stageConfig = computed(() => {
  // Always size stage from container to keep page centered; fall back to window size
  const fallbackW = typeof window !== 'undefined' ? window.innerWidth : (pageBackgroundConfig.value.width + containerPad * 2);
  const fallbackH = typeof window !== 'undefined' ? window.innerHeight - 64 : (pageBackgroundConfig.value.height + containerPad * 2);
  const width = Math.max(10, containerSize.value.w || fallbackW);
  const height = Math.max(10, containerSize.value.h || fallbackH);
  return { 
    width, 
    height, 
    draggable: isSpacePanning.value || toolsStore.activeTool === 'pan',
    // Critical for mobile: prevent default browser touch behaviors
    preventDefault: true
  };
});

const selectedIds = computed(() => projectStore.selectedContentIds);
const hasSelection = computed(() => selectedIds.value.length > 0);
const isolatedGroupId = ref<string | null>(null);
const selectionBounds = ref<{ x: number; y: number; width: number; height: number } | null>(null);

// Page background config
const pageBackgroundConfig = computed(() => {
  const template = projectStore.currentProject?.template;
  if (!template) return { id: 'page-background', x: 50, y: 50, width: 400, height: 300, fill: 'white', stroke: '#e5e7eb', strokeWidth: 1 };
  
  const pagePos = template.pageCanvas || template.printLayout.pagePositions[0];
  return {
    id: 'page-background',
    x: containerPad,
    y: containerPad,
    width: pagePos.width,
    height: pagePos.height,
    fill: 'white',
    stroke: '#d1d5db',
    strokeWidth: 2,
    listening: true // use as deselect area only
  };
});


// Build Konva configs from current page content
const pageNodes = shallowRef<any[]>([]);

watch(() => projectStore.currentPage?.content, async (content) => {
  if (!content) {
    pageNodes.value = [];
    return;
  }

  const nodes = await Promise.all(content.map(async (c) => {
    const common = {
      id: c.id,
      x: c.x + pageBackgroundConfig.value.x,
      y: c.y + pageBackgroundConfig.value.y,
      width: c.width,
      height: c.height,
      rotation: c.rotation,
      draggable: toolsStore.activeTool === 'select' && selectedIds.value.includes(c.id)
    };

    if (c.type === 'shape') {
      const p = c.properties as ShapeProperties;
      const shapeCommon = {
        ...common,
        fill: p.fill,
        stroke: p.stroke,
        strokeWidth: p.strokeWidth,
        opacity: p.opacity,
      };
      const isVisible = (c as any).visible !== false;
      const isLocked = !!(c as any).locked;
      const isSelected = selectedIds.value.includes(c.id);
      if (p.shapeType === 'rectangle') {
        return { id: c.id, kind: 'shape', shapeType: 'rectangle', config: { ...shapeCommon, cornerRadius: p.cornerRadius || 0, visible: isVisible, draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked, listening: !isLocked } };
      } else if (p.shapeType === 'circle') {
        const r = Math.min(c.width, c.height) / 2;
        return { id: c.id, kind: 'shape', shapeType: 'circle', config: { ...shapeCommon, x: common.x + r, y: common.y + r, radius: r, visible: isVisible, draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked, listening: !isLocked } };
      } else if (p.shapeType === 'triangle') {
        return { id: c.id, kind: 'shape', shapeType: 'triangle', config: { ...shapeCommon, x: common.x + c.width / 2, y: common.y + c.height / 2, sides: 3, radius: Math.min(c.width, c.height) / 2, visible: isVisible, draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked, listening: !isLocked }};
      } else {
        return { id: c.id, kind: 'shape', shapeType: 'line', config: { ...shapeCommon, points: [0, c.height / 2, c.width, c.height / 2], stroke: p.stroke, strokeWidth: p.strokeWidth, lineCap: 'round', visible: isVisible, draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked, listening: !isLocked } };
      }
    }
    if (c.type === 'text') {
      const p = c.properties as TextProperties;
      const isVisible = (c as any).visible !== false;
      const isLocked = !!(c as any).locked;
      const isSelected = selectedIds.value.includes(c.id);
      return {
        id: c.id,
        kind: 'text',
        config: {
          ...common,
          text: p.text,
          fontSize: p.fontSize,
          fontFamily: p.fontFamily,
          fontStyle: `${p.fontStyle} ${p.fontWeight}`.trim(),
          fill: p.color,
          align: p.textAlign,
          lineHeight: p.lineHeight,
          textDecoration: p.textDecoration !== 'none' ? p.textDecoration : '',
          padding: p.padding,
          visible: isVisible,
          draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked,
          listening: !isLocked
        }
      };
    }
    if (c.type === 'image') {
      const p = c.properties as ImageProperties;
      const isVisible = (c as any).visible !== false;
      const isLocked = !!(c as any).locked;
      const isSelected = selectedIds.value.includes(c.id);
      const imageObj = new window.Image();
      
      if (p.assetId) {
        const file = await assetStore.getAsset(p.assetId);
        if (file) {
          imageObj.src = URL.createObjectURL(file);
        }
      } else {
        imageObj.src = p.src;
      }

      return {
        id: c.id,
        kind: 'image',
        config: {
          ...common,
          image: imageObj,
          opacity: p.opacity,
          visible: isVisible,
          draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked,
          listening: !isLocked
        }
      };
    }
    if (c.type === 'drawing') {
      const p = c.properties as any; // DrawingProperties
      // For now, render the first path as a simple line
      if (p.paths && p.paths.length > 0) {
        const path = p.paths[0];
        const points = path.points.flatMap((pt: any) => [
          pt.x + c.x + pageBackgroundConfig.value.x, 
          pt.y + c.y + pageBackgroundConfig.value.y
        ]);
        const isVisible = (c as any).visible !== false;
        const isLocked = !!(c as any).locked;
        const isSelected = selectedIds.value.includes(c.id);
        return {
          id: c.id,
          kind: 'drawing',
          config: {
            x: 0,
            y: 0,
            points,
            stroke: p.strokeColor,
            strokeWidth: p.strokeWidth,
            opacity: p.opacity,
            lineCap: p.lineCap || 'round',
            lineJoin: p.lineJoin || 'round',
            tension: p.smoothing ? 0.5 : 0,
            draggable: toolsStore.activeTool === 'select' && isSelected && !isLocked,
            listening: !isLocked,
            visible: isVisible,
            hitStrokeWidth: Math.max(p.strokeWidth, 10), // Make thin lines easier to select
            id: c.id
          }
        };
      }
    }
    return { id: c.id, kind: 'unknown', config: {} };
  }));
  
  pageNodes.value = nodes;
}, { deep: true, immediate: true });


function attachTransformer() {
  nextTick(() => {
    const stage = stageRef.value?.getNode?.();
    const tr = transformerRef.value?.getNode?.();
    if (!stage || !tr) return;

    // First, detach all nodes
    tr.nodes([]);

    // If no selection, ensure transformer is hidden and exit
    if (selectedIds.value.length === 0) {
      tr.hide();
      const layer = contentLayerRef.value?.getNode?.();
      layer?.batchDraw();
      selectionBounds.value = null;
      return;
    }

    const nodesToAttach: Konva.Node[] = [];
    selectedIds.value.forEach((id) => {
      const node = stage.findOne(`#${id}`);
      if (node) {
        nodesToAttach.push(node as Konva.Node);
      }
    });

    if (nodesToAttach.length > 0) {
      tr.nodes(nodesToAttach);
      tr.show();
      // Update selection bounds based on attached nodes
      try {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesToAttach.forEach((n) => {
          const r = (n as any).getClientRect({ skipShadow: true });
          minX = Math.min(minX, r.x);
          minY = Math.min(minY, r.y);
          maxX = Math.max(maxX, r.x + r.width);
          maxY = Math.max(maxY, r.y + r.height);
        });
        selectionBounds.value = { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
      } catch {}
    } else {
      tr.hide();
      selectionBounds.value = null;
    }
    
    const layer = contentLayerRef.value?.getNode?.();
    layer?.batchDraw();
  });
}

watch(selectedIds, () => attachTransformer(), { immediate: true });
watch(pageNodes, () => attachTransformer());

function selectNode(id: string, e?: any) {
  if (toolsStore.activeTool !== 'select') return;
  const isShiftKey = !!e?.evt?.shiftKey;
  const content = projectStore.getContentById(id);
  const groupId = (content as any)?.groupId as string | undefined;
  if (!isShiftKey && groupId && isolatedGroupId.value !== groupId) {
    // Select entire group
    const page = projectStore.currentPage;
    if (page) {
      const ids = page.content.filter(c => (c as any).groupId === groupId).map(c => c.id);
      projectStore.clearSelection();
      ids.forEach((cid, idx) => projectStore.selectContent(cid, idx > 0));
    }
  } else {
    projectStore.selectContent(id, isShiftKey);
  }

  if (e?.evt) e.evt.stopPropagation();
}

function onNodeDblClick(id: string, e: any) {
  const content = projectStore.getContentById(id);
  const groupId = (content as any)?.groupId as string | undefined;
  if (groupId) {
    if (isolatedGroupId.value !== groupId) {
      // Enter isolation mode for this group so clicks affect individuals
      isolatedGroupId.value = groupId;
      projectStore.clearSelection();
      projectStore.selectContent(id, false);
      if (e?.evt) e.evt.stopPropagation();
      return;
    } else {
      // Already isolated, forward to text edit if text
      if ((content as any).type === 'text') startTextEdit(id, e);
    }
  } else {
    if ((content as any).type === 'text') startTextEdit(id, e);
  }
}

// Prevent immediate drag on simple click: mark click start and cancel drag if mouseup occurs without movement
let pointerDownPos: { x: number; y: number } | null = null;
const DRAG_THRESHOLD = 4; // px
function onNodeMouseDown(id: string, e: any) {
  if (toolsStore.activeTool !== 'select') return;
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  const pointer = stage.getPointerPosition();
  if (pointer) pointerDownPos = { x: pointer.x, y: pointer.y };

  // Disable dragging at mousedown to avoid follow-cursor-on-click
  const node = e.target as Konva.Node;
  if (node && typeof (node as any).draggable === 'function') {
    (node as any)._wasDraggable = node.draggable();
    node.draggable(false);
  }

  // Select the node (respect shift for multi-select)
  const isShiftKey = !!e?.evt?.shiftKey;
  projectStore.selectContent(id, isShiftKey);
  if (e?.evt) e.evt.stopPropagation();
}

function onNodeDragMove(_id: string, e: any) {
  // When a selected node moves, move other selected nodes by same delta (multi-drag)
  const node = e.target as Konva.Node;
  const pos = node.position();
  const prev = (node as any)._prevPos || { x: pos.x, y: pos.y };
  const deltaX = pos.x - prev.x;
  const deltaY = pos.y - prev.y;
  (node as any)._prevPos = { x: pos.x, y: pos.y };

  // Apply same motion to other selected nodes except current
  const stage = stageRef.value?.getNode?.();
  const tr = transformerRef.value?.getNode?.();
  if (!stage || !tr) return;
  const selected = tr.nodes().filter((n: Konva.Node) => n.id() !== node.id());
  selected.forEach((n: Konva.Node) => {
    const p = n.position();
    n.position({ x: p.x + deltaX, y: p.y + deltaY });
  });
  const layer = contentLayerRef.value?.getNode?.();
  layer?.batchDraw();
}

function onDragEnd(id: string, e: any) {
  const node = e.target as Konva.Node;
  // Clear per-node temp state
  (node as any)._prevPos = undefined;
  (node as any)._lastDx = undefined;
  
  if (node.className === 'Line') {
    // Special handling for Line objects (drawings)
    // Lines don't have x/y position like other shapes, they use points
    // We need to update the content's position based on the line's movement
    const content = projectStore.getContentById(id);
    if (content && content.type === 'drawing') {
      const points = (node as any).points();
      if (points && points.length >= 4) {
        const xCoords = points.filter((_: any, i: number) => i % 2 === 0);
        const yCoords = points.filter((_: any, i: number) => i % 2 === 1);
        const minX = Math.min(...xCoords);
        const minY = Math.min(...yCoords);
        
        // Update the content position
        projectStore.updateContent(id, { 
          x: minX - pageBackgroundConfig.value.x, 
          y: minY - pageBackgroundConfig.value.y 
        });
      }
    }
  } else {
    // Standard handling for other shapes
    const { x, y } = node.position();
    projectStore.updateContent(id, { x: x - pageBackgroundConfig.value.x, y: y - pageBackgroundConfig.value.y });
  }
  // Re-enable draggable if it was disabled at mousedown
  if ((node as any)._wasDraggable !== undefined) {
    node.draggable((node as any)._wasDraggable);
    (node as any)._wasDraggable = undefined;
  }
}

// Overlay drag to move selection when clicking inside selection bounds (not on a node)
let overlayDragStart: { x: number; y: number } | null = null;
let groupInitialPos: Record<string, { x: number; y: number }> = {};
let overlayRaf: number | null = null;
function onOverlayMouseDown(e: any) {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  const p = stage.getPointerPosition();
  if (!p) return;
  overlayDragStart = { x: p.x, y: p.y };
  // Snapshot initial positions for stable drag deltas
  const tr = transformerRef.value?.getNode?.();
  const nodes = tr ? (tr.nodes() as Konva.Node[]) : [];
  groupInitialPos = {};
  nodes.forEach((n) => { const pos = n.position(); groupInitialPos[n.id()] = { x: pos.x, y: pos.y }; });
  if (e?.evt) e.evt.stopPropagation();
}
function onOverlayMouseMove(e: any) {
  if (!overlayDragStart || !hasSelection.value) return;
  const stage = stageRef.value?.getNode?.();
  const layer = contentLayerRef.value?.getNode?.();
  if (!stage || !layer) return;
  const p = stage.getPointerPosition();
  if (!p) return;
  const dx = p.x - overlayDragStart.x;
  const dy = p.y - overlayDragStart.y;
  const tr = transformerRef.value?.getNode?.();
  const nodes = tr ? (tr.nodes() as Konva.Node[]) : [];
  if (overlayRaf !== null) { if (e?.evt) e.evt.stopPropagation(); return; }
  overlayRaf = requestAnimationFrame(() => {
    nodes.forEach((n) => {
      const base = groupInitialPos[n.id()];
      if (base) n.position({ x: base.x + dx, y: base.y + dy });
    });
    layer.batchDraw();
    overlayRaf = null;
  });
  if (e?.evt) e.evt.stopPropagation();
}
function onOverlayMouseUp(e: any) {
  if (!hasSelection.value) { overlayDragStart = null; return; }
  const stage = stageRef.value?.getNode?.();
  if (!stage) { overlayDragStart = null; return; }
  const tr = transformerRef.value?.getNode?.();
  const nodes = tr ? (tr.nodes() as Konva.Node[]) : [];
  nodes.forEach((n) => {
    const id = n.id();
    if (n.className === 'Line') {
      // For drawings (Line or grouped lines), compute new min point from points
      try {
        const points = (n as any).points?.() as number[] | undefined;
        if (points && points.length >= 4) {
          const xs = points.filter((_, i) => i % 2 === 0);
          const ys = points.filter((_, i) => i % 2 === 1);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          projectStore.updateContent(id, { x: minX - pageBackgroundConfig.value.x, y: minY - pageBackgroundConfig.value.y });
          return;
        }
      } catch {}
    }
    const pos = n.position();
    projectStore.updateContent(id, { x: pos.x - pageBackgroundConfig.value.x, y: pos.y - pageBackgroundConfig.value.y });
  });
  overlayDragStart = null;
  groupInitialPos = {};
  if (overlayRaf) { cancelAnimationFrame(overlayRaf); overlayRaf = null; }
  if (e?.evt) e.evt.stopPropagation();
}

function onWheel(e: any) {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  
  const evt = e.evt;
  if (evt && evt.preventDefault) {
    evt.preventDefault();
  }
  
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const direction = evt.deltaY > 0 ? 1 : -1;
  const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  stage.scale({ x: newScale, y: newScale });

  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);
  stage.batchDraw();
}

function getAvailableSize(): { w: number; h: number } {
  const container = canvasContainer.value || stageWrapper.value;
  const w = (container?.clientWidth || stageRef.value?.getNode?.()?.width() || 0) - containerPad * 2;
  const h = (container?.clientHeight || stageRef.value?.getNode?.()?.height() || 0) - containerPad * 2;
  return { w: Math.max(0, w), h: Math.max(0, h) };
}

function centerOnPage(stage: Konva.Stage, scale: number): void {
  const bg = pageBackgroundConfig.value;
  const { w, h } = getAvailableSize();
  const pageCenterX = (bg.x + bg.width / 2) * scale;
  const pageCenterY = (bg.y + bg.height / 2) * scale;
  const posX = containerPad + w / 2 - pageCenterX;
  const posY = containerPad + h / 2 - pageCenterY;
  stage.position({ x: posX, y: posY });
  stage.batchDraw();
}

function fitToContainer() {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  const bg = pageBackgroundConfig.value;
  const { w, h } = getAvailableSize();
  const scale = Math.min(w / bg.width, h / bg.height);
  stage.scale({ x: scale, y: scale });
  centerOnPage(stage, scale);
}

// Watch for fit requests from UI store
watch(() => uiStore.shouldFit, (flag) => { if (flag) { fitToContainer(); uiStore.shouldFit = false as any; } });

function zoomIn() {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  const z = stage.scaleX() || 1;
  const newScale = z * 1.1;
  stage.scale({ x: newScale, y: newScale });
  centerStage(stage, newScale);
}

function zoomOut() {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  const z = stage.scaleX() || 1;
  const newScale = z / 1.1;
  stage.scale({ x: newScale, y: newScale });
  centerStage(stage, newScale);
}

function fit() { uiStore.requestFit(); }

function centerStage(stage: Konva.Stage, newScale: number) {
  centerOnPage(stage, newScale);
}

onMounted(() => {
  // Standard Konva configuration
  try { 
    (Konva as any).dragDistance(4);
  } catch {}
  const tr = transformerRef.value?.getNode?.();
  const layer = contentLayerRef.value?.getNode?.();
  if (!tr || !layer) return;

  tr.on('transformend', () => {
    const nodes = tr.nodes() as Konva.Node[];
    nodes.forEach((node) => {
      const id = node.id();
      const rotation = node.rotation();
      // Normalize scale into width/height for rect-like nodes; for lines/drawings keep as is
      let width = node.width() as number;
      let height = node.height() as number;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      if (node.className !== 'Line' && node.className !== 'Group') {
        width = width * scaleX;
        height = height * scaleY;
        node.scale({ x: 1, y: 1 });
      }
      const pos = node.position();
      projectStore.updateContent(id, { x: pos.x - pageBackgroundConfig.value.x, y: pos.y - pageBackgroundConfig.value.y, width, height, rotation });
    });
    layer.batchDraw();
  });
  try { layer.perfectDrawEnabled(false); } catch {}
});

// Ensure transformer handlers are attached even when the transformer is created after mount
watch(
  () => transformerRef.value?.getNode?.(),
  (tr) => {
    const layer = contentLayerRef.value?.getNode?.();
    if (!tr || !layer) return;
    try { tr.off('transformend'); } catch {}
    tr.on('transformend', () => {
      const nodes = tr.nodes() as Konva.Node[];
      nodes.forEach((node) => {
        const id = node.id();
        const rotation = node.rotation();
        let width = node.width() as number;
        let height = node.height() as number;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        if (node.className !== 'Line' && node.className !== 'Group') {
          width = width * scaleX;
          height = height * scaleY;
          node.scale({ x: 1, y: 1 });
        }
        const pos = node.position();
        projectStore.updateContent(id, { x: pos.x - pageBackgroundConfig.value.x, y: pos.y - pageBackgroundConfig.value.y, width, height, rotation });
      });
      layer.batchDraw();
    });
    try { layer.perfectDrawEnabled(false); } catch {}
  },
  { immediate: true }
);

const transformerConfig = { 
  rotateAnchorOffset: 20, 
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'] 
};

const isSelecting = ref(false);
const selectionStart = ref({ x: 0, y: 0 });
const selectionRect = ref({ x: 0, y: 0, width: 0, height: 0 });

function toStagePoint(stage: Konva.Stage, p: {x:number; y:number}) {
  const scale = stage.scaleX();
  const pos = stage.position();
  return { x: (p.x - pos.x) / scale, y: (p.y - pos.y) / scale };
}

function onStageMouseDown(e: any) {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;

  // Handle drawing tool
  if (toolsStore.activeTool === 'draw') {
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const sp = toStagePoint(stage, pos);

    // Create a new line for drawing
    const layer = contentLayerRef.value?.getNode?.();
    if (!layer) return;

    const settings = toolsStore.drawingSettings;
    lastLine = new Konva.Line({
      stroke: settings.strokeColor,
      strokeWidth: settings.strokeWidth,
      opacity: settings.opacity,
      globalCompositeOperation: 'source-over',
      lineCap: settings.lineCap,
      lineJoin: settings.lineJoin,
      points: [sp.x, sp.y],
      tension: settings.smoothing ? 0.5 : 0, // Add smoothing
    });
    
    layer.add(lastLine);
    isDrawing.value = true;
    return;
  }

  // Handle selection tool
  if (toolsStore.activeTool !== 'select') return;

  // Check if we clicked on the stage (empty area) or page background
  const clickedOnEmpty = e.target === stage || e.target.id?.() === 'page-background';
  
  if (clickedOnEmpty || e.evt?.shiftKey) {
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const sp = toStagePoint(stage, pos);
    selectionStart.value = sp;
    selectionRect.value = { x: sp.x, y: sp.y, width: 0, height: 0 };
    isSelecting.value = true;
    
    // Only clear selection if not holding shift and not starting over a node
    if (!e.evt?.shiftKey && clickedOnEmpty) {
      projectStore.clearSelection();
    }
  }
}

function onStageMouseMove() {
  if (isDrawing.value && lastLine) {
    const stage = stageRef.value?.getNode?.();
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const sp = toStagePoint(stage, pos);

    // Add point smoothing for better drawing experience
    const currentPoints = lastLine.points();
    const lastX = currentPoints[currentPoints.length - 2];
    const lastY = currentPoints[currentPoints.length - 1];
    
    // Only add point if it's far enough from the last point (reduces jitter)
    const distance = Math.sqrt(Math.pow(sp.x - lastX, 2) + Math.pow(sp.y - lastY, 2));
    if (distance > 2) {
      const newPoints = currentPoints.concat([sp.x, sp.y]);
      lastLine.points(newPoints);
    }
    return;
  }

  // If we started on a node and have moved past threshold, enable dragging for selected nodes
  const stage = stageRef.value?.getNode?.();
  if (pointerDownPos && stage) {
    const p = stage.getPointerPosition();
    if (p) {
      const dx = p.x - pointerDownPos.x;
      const dy = p.y - pointerDownPos.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        const tr = transformerRef.value?.getNode?.();
        if (tr && tr.nodes().length > 0) {
          // enable dragging for selected nodes and begin dragging the primary target
          tr.nodes().forEach((n: any) => n.draggable(true));
          const stageTarget = (stage as any)._pointerdownTarget as Konva.Node | undefined;
          const primary = stageTarget && tr.nodes().some((n: Konva.Node) => n.id() === stageTarget.id())
            ? stageTarget
            : tr.nodes()[0];
          try { (primary as any).startDrag(); } catch {}
        }
        pointerDownPos = null;
      }
    }
  }

  if (!isSelecting.value) return;
  if (!stage) return;
  const pos = stage.getPointerPosition();
  if (!pos) return;
  const sp = toStagePoint(stage, pos);
  const x = Math.min(sp.x, selectionStart.value.x);
  const y = Math.min(sp.y, selectionStart.value.y);
  const width = Math.abs(sp.x - selectionStart.value.x);
  const height = Math.abs(sp.y - selectionStart.value.y);
  selectionRect.value = { x, y, width, height };
}

function onStageMouseUp() {
  pointerDownPos = null;
  if (isDrawing.value && lastLine) {
    // Convert the drawn line to a drawing content item
    const points = lastLine.points();
    if (points.length >= 4) { // At least 2 points (x,y pairs)
      // Calculate bounding box
      const xCoords = points.filter((_, i) => i % 2 === 0);
      const yCoords = points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xCoords);
      const minY = Math.min(...yCoords);
      const maxX = Math.max(...xCoords);
      const maxY = Math.max(...yCoords);
      
      const settings = toolsStore.drawingSettings;
      const drawingContent = {
        type: 'drawing' as const,
        x: minX - pageBackgroundConfig.value.x,
        y: minY - pageBackgroundConfig.value.y,
        width: (maxX - minX),
        height: (maxY - minY),
        rotation: 0,
        zIndex: Date.now(),
        properties: {
          paths: [{
            points: points.reduce((acc, val, i) => {
              if (i % 2 === 0) {
                acc.push({ 
                  x: val - minX,
                  y: points[i + 1] - minY
                });
              }
              return acc;
            }, [] as { x: number; y: number }[]),
            color: settings.strokeColor,
            width: settings.strokeWidth
          }],
          strokeColor: settings.strokeColor,
          strokeWidth: settings.strokeWidth,
          opacity: settings.opacity,
          lineCap: settings.lineCap,
          lineJoin: settings.lineJoin,
          smoothing: settings.smoothing
        }
      };
      projectStore.addContentToCurrentPage(drawingContent);
    }

    // Remove the temporary line
    lastLine.destroy();
    lastLine = null;
    isDrawing.value = false;
    return;
  }

  if (!isSelecting.value) return;
  const stage = stageRef.value?.getNode?.();
  const layer = contentLayerRef.value?.getNode?.();
  if (!stage || !layer) { isSelecting.value = false; return; }
  
  const box = selectionRect.value;
  const selected: string[] = [];
  
  // Get all nodes in the layer including drawings (Line) and others
  const allNodes = layer.getChildren();
  
  allNodes.forEach((node: any) => {
    // Skip transformer and background
    if (node.className === 'Transformer' || !node.id || typeof node.id !== 'function') return;
    
    const id = node.id();
    if (!id || id === 'page-background' || id.startsWith('page-bg')) return; // Skip page background
    
    // Get bounding box for intersection test
    let nodeRect;
    try {
      if (node.className === 'Line') {
        // Special handling for Line objects (drawings)
        const points = node.points();
        if (points && points.length >= 4) {
          const xCoords = points.filter((_: any, i: number) => i % 2 === 0);
          const yCoords = points.filter((_: any, i: number) => i % 2 === 1);
          const minX = Math.min(...xCoords);
          const minY = Math.min(...yCoords);
          const maxX = Math.max(...xCoords);
          const maxY = Math.max(...yCoords);
          
          nodeRect = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          };
        }
      } else {
        // Standard bounding box for other shapes
        nodeRect = node.getClientRect({ skipShadow: true, skipStroke: true });
      }
      
      if (nodeRect) {
        const hit = Konva.Util.haveIntersection(nodeRect, box as any);
        if (hit) {
          selected.push(id);
        }
      }
    } catch (error) {
      console.warn('Error getting bounds for node:', id, error);
    }
  });
  
  // Apply selection
  if (selected.length > 0) {
    projectStore.clearSelection();
    selected.forEach((id, index) => {
      projectStore.selectContent(id, index > 0);
    });
  }
  
  isSelecting.value = false;
}

const isSpacePanning = ref(false);
const isDrawing = ref(false);
let lastLine: Konva.Line | null = null;



let onKeyDown: (e: KeyboardEvent) => void;
let onKeyUp: (e: KeyboardEvent) => void;

onMounted(() => {
  onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') { isSpacePanning.value = true; }
  };
  onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') { isSpacePanning.value = false; }
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // Auto-fit on mount for larger canvas
  nextTick(() => {
    if (canvasContainer.value) {
      const rect = canvasContainer.value.getBoundingClientRect();
      containerSize.value = { w: rect.width, h: rect.height };
      // Observe container size to keep stage sized with container
      try {
        resizeObserver = new ResizeObserver((entries) => {
          const r = entries[0]?.contentRect;
          if (!r) return;
          containerSize.value = { w: r.width, h: r.height };
          fitToContainer();
        });
        resizeObserver.observe(canvasContainer.value);
      } catch {}
    }
    fitToContainer();
    // Run a second time on the next frame to ensure centering after stage/layout settles
    try { requestAnimationFrame(() => fitToContainer()); } catch { setTimeout(() => fitToContainer(), 0); }
    

  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
  try { if (resizeObserver && canvasContainer.value) resizeObserver.unobserve(canvasContainer.value); } catch {}
  resizeObserver = null;
});

let isResizing = false;
let startPos = { x: 0, y: 0 };
let startSize = { w: 0, h: 0 };
function startResize(e: MouseEvent) {
  if (!canvasContainer.value) return;
  isResizing = true;
  startPos = { x: e.clientX, y: e.clientY };
  const rect = canvasContainer.value.getBoundingClientRect();
  startSize = { w: rect.width, h: rect.height };
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', endResize, { once: true });
}
function onResizeMove(e: MouseEvent) {
  if (!isResizing || !canvasContainer.value) return;
  const dx = e.clientX - startPos.x;
  const dy = e.clientY - startPos.y;
  const bg = pageBackgroundConfig.value;
  const ratio = bg.height / bg.width;
  const startInnerW = startSize.w - containerPad * 2;
  const startInnerH = startSize.h - containerPad * 2;
  let newInnerW = startInnerW + dx;
  let newInnerH = startInnerH + dy;
  // constrain to page aspect
  if (Math.abs(dx) >= Math.abs(dy)) newInnerH = newInnerW * ratio; else newInnerW = newInnerH / ratio;
  const newW = Math.max(240, newInnerW + containerPad * 2);
  const newH = Math.max(240, newInnerH + containerPad * 2);
  canvasContainer.value.style.width = `${newW}px`;
  canvasContainer.value.style.height = `${newH}px`;
  // Keep containerSize reactive so stage resizes to fill container
  containerSize.value = { w: newW, h: newH };
  // compute scale to fit page into inner box and apply scale (zoom-like behavior)
  const stage = stageRef.value?.getNode?.();
  if (stage) {
    const innerW = newW - containerPad * 2;
    const innerH = newH - containerPad * 2;
    const scale = Math.min(innerW / bg.width, innerH / bg.height);
    stage.scale({ x: scale, y: scale });
    centerStage(stage, scale);
  }
}
function endResize() {
  isResizing = false;
  window.removeEventListener('mousemove', onResizeMove);
  const stage = stageRef.value?.getNode?.();
  if (stage) centerStage(stage, stage.scaleX() || 1);
}

const textAreaRef = ref<HTMLTextAreaElement | null>(null);
const editingText = ref<{ visible: boolean; id: string | null; value: string; style: any }>({ visible: false, id: null, value: '', style: {} });
const editingKonvaNode = ref<Konva.Text | null>(null);
const editingWasDraggable = ref<boolean>(false);

function startTextEdit(id: string, e?: any) {
  // Prevent dblclick from bubbling into click/mousedown handlers
  if (e && e.evt) {
    e.evt.cancelBubble = true;
  }
  const stage = stageRef.value?.getNode?.() as Konva.Stage;
  if (!stage) return;
  const node = stage.findOne(`#${id}`) as Konva.Text;
  if (!node) return;

  // Freeze node during editing to avoid accidental drags
  editingKonvaNode.value = node;
  editingWasDraggable.value = !!node.draggable();
  node.draggable(false);
  node.listening(false);
  const tr = transformerRef.value?.getNode?.();
  tr?.hide();
  const layer = contentLayerRef.value?.getNode?.();
  layer?.batchDraw();

  // Use getAbsolutePosition for accurate positioning
  const absPos = node.getAbsolutePosition();
  const stageContainer = stage.container();
  const containerRect = stageContainer.getBoundingClientRect();
  
  const scale = stage.scaleX();
  const fontSize = node.fontSize() * scale;
  const width = Math.max(100, node.width() * scale);
  const height = Math.max(fontSize + 8, node.height() * scale);

  editingText.value = {
    visible: true,
    id,
    value: node.text(),
    style: {
      position: 'fixed',
      left: `${containerRect.left + absPos.x}px`,
      top: `${containerRect.top + absPos.y}px`,
      width: `${width}px`,
      height: `${height}px`,
      fontSize: `${fontSize}px`,
      fontFamily: node.fontFamily(),
      fontWeight: node.fontStyle()?.includes('bold') ? 'bold' : 'normal',
      fontStyle: node.fontStyle()?.includes('italic') ? 'italic' : 'normal',
      color: node.fill(),
      lineHeight: node.lineHeight(),
      padding: '2px 4px',
      border: '2px solid #2563eb',
      background: 'rgba(255,255,255,0.96)',
      outline: 'none',
      resize: 'none',
      zIndex: 1000,
      margin: 0,
      boxSizing: 'border-box'
    }
  };

  nextTick(() => {
    textAreaRef.value?.focus();
    textAreaRef.value?.select();
  });
}

function commitTextEdit() {
  const id = editingText.value.id;
  if (!id) { cancelTextEdit(); return; }
  const content = projectStore.getContentById(id);
  if (content && content.type === 'text') {
    const p = content.properties as TextProperties;
    projectStore.updateContent(id, { properties: { ...p, text: editingText.value.value } });
  }
  cancelTextEdit();
}

function cancelTextEdit() {
  editingText.value.visible = false;
  editingText.value.id = null;
  // Restore node interactivity
  if (editingKonvaNode.value) {
    editingKonvaNode.value.listening(true);
    editingKonvaNode.value.draggable(editingWasDraggable.value);
    editingKonvaNode.value = null;
    const tr = transformerRef.value?.getNode?.();
    tr?.show();
    const layer = contentLayerRef.value?.getNode?.();
    layer?.batchDraw();
  }
}

function onStageClick(e: any) {
  const stage = stageRef.value?.getNode?.();
  if (!stage) return;
  // Allow clicks on stage OR page background to place new items
  const clickedStage = e.target === stage;
  const clickedPageBg = typeof e.target?.id === 'function' && e.target.id() === 'page-background';
  if (toolsStore.activeTool !== 'zoom' && !clickedStage && !clickedPageBg) return;

  if (toolsStore.activeTool === 'draw') return;

  // Click-to-zoom tool
  if (toolsStore.activeTool === 'zoom') {
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stage.scaleX();
    const sp = toStagePoint(stage, pointer);
    const factor = e.evt && (e.evt.altKey || e.evt.metaKey) ? 1/scaleBy : scaleBy;
    const newScale = oldScale * factor;
    stage.scale({ x: newScale, y: newScale });
    const newPos = {
      x: pointer.x - sp.x * newScale,
      y: pointer.y - sp.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
    return;
  }
  
  const pos = toStagePoint(stage, stage.getPointerPosition()!);
  const relativePos = {
    x: pos.x - pageBackgroundConfig.value.x,
    y: pos.y - pageBackgroundConfig.value.y
  };

  if (toolsStore.activeTool === 'text') {
    addText(relativePos.x, relativePos.y);
  } else if (toolsStore.activeTool === 'shape') {
    addShape(relativePos.x, relativePos.y);
  }
}

function addText(x: number, y: number) {
  const textContent = {
    type: 'text' as const,
    x, y,
    width: 200, height: 40, rotation: 0, zIndex: Date.now(),
    properties: {
      text: 'Sample Text', fontSize: 24, fontFamily: 'Arial',
      fontWeight: 'normal' as const, fontStyle: 'normal' as const,
      color: '#000000', textAlign: 'left' as const, lineHeight: 1.2,
      textDecoration: 'none' as const, padding: 0
    }
  };
  projectStore.addContentToCurrentPage(textContent);
  toolsStore.setActiveTool('select');
}

function addShape(x: number, y: number) {
  const shapeContent = {
    type: 'shape' as const,
    x, y,
    width: 100, height: 100, rotation: 0, zIndex: Date.now(),
    properties: {
      shapeType: toolsStore.activeShapeType,
      fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 2, opacity: 1
    }
  };
  projectStore.addContentToCurrentPage(shapeContent);
  toolsStore.setActiveTool('select');
}
</script>

<style scoped>
.konva-page-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.stage-wrapper { 
  flex: 1; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: var(--surface); 
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
}
.canvas-container {
  background: var(--panel);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 0 0 0 1.5px var(--border);
  border: 2px dashed var(--border-soft);
  position: relative;
  /* Ensure proper touch handling */
  touch-action: none;
}
.canvas-container.resizable { width: min(90%, 900px); height: min(70vh, 600px); }
.resize-handle {
  position: absolute; right: 2px; bottom: 2px; width: 14px; height: 14px;
  border-right: 2px solid var(--border); border-bottom: 2px solid var(--border);
  cursor: nwse-resize; opacity: .6;
}
.text-editor {
  font-family: inherit;
  border-radius: 4px;
}
.floating-zoom {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  gap: 6px;
  background: var(--panel);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
}
.fz-btn {
  appearance: none;
  border: 1px solid var(--border-soft);
  background: var(--surface);
  color: var(--ui-ink);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.fz-btn:hover { background: var(--panel); }

/* Mobile responsive canvas - keep it simple */
@media (max-width: 900px) {
  .canvas-container.resizable {
    width: 95%;
    height: 70vh;
    min-height: 500px;
    /* Ensure touch events work properly */
    touch-action: none;
  }
  
  .resize-handle {
    display: none;
  }
  
  .floating-zoom {
    right: 12px;
    bottom: 12px;
    /* Better mobile visibility */
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(4px);
  }
  
  .fz-btn {
    padding: 10px 14px;
    min-width: 48px;
    min-height: 48px;
    font-weight: 600;
  }
  
  .text-editor {
    font-size: 16px !important; /* Prevent zoom on iOS */
  }
}
</style>
