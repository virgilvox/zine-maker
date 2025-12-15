import Konva from 'konva';
import jsPDF from 'jspdf';
import type { ZineProject, ZineContent, ZineTemplate, ShapeProperties, TextProperties, ImageProperties } from '@/types';

export interface ExportOptions {
  showPageNumbers?: boolean;
  showFoldMarks?: boolean;
  showCutMarks?: boolean;
  pixelRatio?: number;
  bleed?: number; // optional sheet bleed in points (72dpi). default 0
}

export type GetAssetFn = (id: number) => Promise<File | undefined>;

export async function exportZineForTemplate(
  project: ZineProject,
  getAsset: GetAssetFn,
  options: ExportOptions = {}
): Promise<{ images: string[]; pdfData: string; width: number; height: number }> {
  // Get the current template from the store to ensure we have the latest page positions
  // Projects save a copy of the template, which might have outdated positions
  const { useTemplatesStore } = await import('@/stores/templates');
  const templatesStore = useTemplatesStore();
  const currentTemplate = templatesStore.getTemplate(project.template.id);
  const template = currentTemplate || project.template as ZineTemplate;

  const width = template.printLayout.sheetWidth;
  const height = template.printLayout.sheetHeight;
  const pixelRatio = options.pixelRatio ?? 2;

  // Use the current template's page positions (which have the corrected layout)
  let pagePositions = template.printLayout.pagePositions;

  // Debug: log what positions we're using
  if (template.format === 'quarter-fold') {
    console.log('Quarter-fold export positions:', pagePositions.map(p => p.pageNumber));
    console.log('Project formatVersion:', project.formatVersion);
    console.log('Using template from:', currentTemplate ? 'store' : 'project');
  }

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = `${width}px`;
  tempContainer.style.height = `${height}px`;
  document.body.appendChild(tempContainer);

  try {
    async function renderSide(_side: 'front' | 'back', positions: any[]): Promise<string> {
      const stage = new Konva.Stage({ container: tempContainer, width, height });
      const layer = new Konva.Layer();
      stage.add(layer);
      layer.add(new Konva.Rect({ x: 0, y: 0, width, height, fill: 'white' }));

      const nodePromises: Promise<void>[] = [];
      for (const pagePos of positions) {
        const page = pagePos.pageNumber === 0 ? { pageNumber: 0, backgroundColor: '#ffffff', content: [] as any[] } as any : project.pages.find(p => p.pageNumber === pagePos.pageNumber);
        if (!page) continue;
        const group = new Konva.Group({ x: pagePos.x, y: pagePos.y, clip: { x: 0, y: 0, width: pagePos.width, height: pagePos.height } });
        group.add(new Konva.Rect({ x: 0, y: 0, width: pagePos.width, height: pagePos.height, fill: page.backgroundColor || 'white' }));

        if (options.showPageNumbers && page.pageNumber) {
          group.add(new Konva.Text({ text: String(page.pageNumber), x: pagePos.width - 20, y: pagePos.height - 18, fontSize: 12, fill: '#111827', align: 'right' }));
        }

        const sorted = [...page.content].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        for (const content of sorted) {
          const promise = createKonvaNode(content, getAsset).then(node => { if (node) group.add(node as Konva.Shape); });
          nodePromises.push(promise);
        }

        if (pagePos.rotation !== 0) {
          group.rotation(pagePos.rotation);
          group.offsetX(pagePos.width / 2);
          group.offsetY(pagePos.height / 2);
          group.x(pagePos.x + pagePos.width / 2);
          group.y(pagePos.y + pagePos.height / 2);
        }
        if (pagePos.isFlipped) {
          group.scaleX(-1);
          group.offsetX(pagePos.width);
        }
        layer.add(group);
      }

      await Promise.all(nodePromises);
      if (options.showFoldMarks) {
        if (project.template.format === 'quarter-fold') {
          // Vertical quarters and horizontal center, used as guides
          layer.add(new Konva.Line({ points: [width / 4, 0, width / 4, height], stroke: '#9ca3af', dash: [6, 4], listening: false }));
          layer.add(new Konva.Line({ points: [width / 2, 0, width / 2, height], stroke: '#9ca3af', dash: [6, 4], listening: false }));
          layer.add(new Konva.Line({ points: [width * 3 / 4, 0, width * 3 / 4, height], stroke: '#9ca3af', dash: [6, 4], listening: false }));
          layer.add(new Konva.Line({ points: [0, height / 2, width, height / 2], stroke: '#9ca3af', dash: [6, 4], listening: false }));
        } else if (project.template.format === 'half-fold' || project.template.format === 'booklet') {
          // Center fold line
          layer.add(new Konva.Line({ points: [width / 2, 0, width / 2, height], stroke: '#9ca3af', dash: [6, 4], listening: false }));
        } else if (project.template.format === 'accordion') {
          // Vertical folds at quarter widths to create the meander columns (4 columns)
          const xs = [width / 4, width / 2, (width * 3) / 4];
          xs.forEach(x => layer.add(new Konva.Line({ points: [x, 0, x, height], stroke: '#9ca3af', dash: [6, 4], listening: false })));
        }
      }
      if (options.showCutMarks) {
        if (project.template.format === 'quarter-fold') {
          // Slit cut only across the middle two panels: from width/4 to 3*width/4 on center line
          const y = height / 2;
          const x1 = width / 4;
          const x2 = (width * 3) / 4;
          layer.add(new Konva.Line({ points: [x1, y, x2, y], stroke: '#111827', dash: [10, 8], listening: false }));
        } else if (project.template.format === 'accordion') {
          // Meander cuts: three alternating slits that do NOT span full width.
          // Top (y = H/4): cut from left edge to 3/4 width
          // Middle (y = H/2): cut from right edge to 1/4 width
          // Bottom (y = 3H/4): cut from left edge to 3/4 width
          const yTop = height / 4;
          const yMid = height / 2;
          const yBot = (height * 3) / 4;
          const xQ1 = width / 4;
          const xQ3 = (width * 3) / 4;
          const heavy = 4;
          const notch = 12;

          // Top slit: 0 -> 3/4W
          layer.add(new Konva.Line({ points: [0, yTop, xQ3, yTop], stroke: '#111827', strokeWidth: heavy, listening: false }));
          layer.add(new Konva.Line({ points: [0, yTop - notch, 0, yTop + notch], stroke: '#111827', strokeWidth: 3, listening: false }));
          layer.add(new Konva.Line({ points: [xQ3, yTop - notch, xQ3, yTop + notch], stroke: '#111827', strokeWidth: 3, listening: false }));

          // Middle slit: W -> 1/4W (draw from right to left)
          layer.add(new Konva.Line({ points: [width, yMid, xQ1, yMid], stroke: '#111827', strokeWidth: heavy, listening: false }));
          layer.add(new Konva.Line({ points: [width, yMid - notch, width, yMid + notch], stroke: '#111827', strokeWidth: 3, listening: false }));
          layer.add(new Konva.Line({ points: [xQ1, yMid - notch, xQ1, yMid + notch], stroke: '#111827', strokeWidth: 3, listening: false }));

          // Bottom slit: 0 -> 3/4W
          layer.add(new Konva.Line({ points: [0, yBot, xQ3, yBot], stroke: '#111827', strokeWidth: heavy, listening: false }));
          layer.add(new Konva.Line({ points: [0, yBot - notch, 0, yBot + notch], stroke: '#111827', strokeWidth: 3, listening: false }));
          layer.add(new Konva.Line({ points: [xQ3, yBot - notch, xQ3, yBot + notch], stroke: '#111827', strokeWidth: 3, listening: false }));
        } else {
          // Corner crop marks
          const m = 18, len = 24;
          layer.add(new Konva.Line({ points: [m, m + len, m, m, m + len, m], stroke: '#111827', listening: false }));
          layer.add(new Konva.Line({ points: [width - m, m + len, width - m, m, width - m - len, m], stroke: '#111827', listening: false }));
          layer.add(new Konva.Line({ points: [m, height - m - len, m, height - m, m + len, height - m], stroke: '#111827', listening: false }));
          layer.add(new Konva.Line({ points: [width - m, height - m - len, width - m, height - m, width - m - len, height - m], stroke: '#111827', listening: false }));
        }
      }

      await new Promise<void>(resolve => { layer.draw(); requestAnimationFrame(() => setTimeout(resolve, 40)); });
      const data = stage.toDataURL({ x: 0, y: 0, width, height, pixelRatio });
      stage.destroy();
      return data;
    }

    const images: string[] = [];
    if (template.format === 'booklet') {
      // Booklet: build sheets from page count, pairing outer to inner.
      // Each sheet has two pages per side: [left|right]. Use the exact
      // template page count; do not pad with blanks.
      const pageCount = project.pages.length;
      const totalPages = pageCount;
      const sheets = Math.ceil(pageCount / 4);

      for (let i = 0; i < sheets; i++) {
        const leftFront = totalPages - (2 * i);
        const rightFront = 1 + (2 * i);
        const leftBack = 2 + (2 * i);
        const rightBack = totalPages - 1 - (2 * i);

        const frontPositions = [
          { pageNumber: leftFront, x: 0, y: 0, width: width / 2, height: height, rotation: 0, isFlipped: false },
          { pageNumber: rightFront, x: width / 2, y: 0, width: width / 2, height: height, rotation: 0, isFlipped: false }
        ];

        const backPositions = [
          { pageNumber: leftBack, x: 0, y: 0, width: width / 2, height: height, rotation: 0, isFlipped: false },
          { pageNumber: rightBack, x: width / 2, y: 0, width: width / 2, height: height, rotation: 0, isFlipped: false }
        ];

        const sheetFront = await renderSide('front', frontPositions as any);
        const sheetBack = await renderSide('back', backPositions as any);
        images.push(sheetFront, sheetBack);
      }
    } else if (template.format === 'half-fold') {
      const front = await renderSide('front', template.printLayout.pagePositions.filter(p => p.side === 'front'));
      const back = await renderSide('back', template.printLayout.pagePositions.filter(p => p.side === 'back'));
      images.push(front, back);
    } else if (template.format === 'quarter-fold') {
      // Single sheet, single side (slit zine is one-sided)
      const front = await renderSide('front', pagePositions);
      images.push(front);
    } else if (template.format === 'accordion') {
      // Single-sided 16-page accordion (slit-and-fold): render one image
      const front = await renderSide('front', template.printLayout.pagePositions);
      images.push(front);
    } else if (template.format === 'flipbook') {
      // Flipbook: generate sheets of two pages per side. We iterate over pages in pairs
      // and map them to left/right per side according to template.printLayout positions.
      const pageCount = project.pages.length;
      const positionsFront = template.printLayout.pagePositions.filter(p => p.side === 'front');
      const positionsBack = template.printLayout.pagePositions.filter(p => p.side === 'back');
      // For N pages, we need ceil(N/2) sheets. For sheet i (0-based):
      // front: [2i+2, 2i+1], back: [2i+3, 2i+4]
      const sheets = Math.ceil(pageCount / 2);
      for (let i = 0; i < sheets; i++) {
        const f1 = 2 * i + 2;
        const f2 = 2 * i + 1;
        const b1 = 2 * i + 3;
        const b2 = 2 * i + 4;
        const fp = [
          { ...positionsFront[0], pageNumber: f1 },
          { ...positionsFront[1], pageNumber: f2 }
        ].filter(p => p.pageNumber <= pageCount);
        const bp = [
          { ...positionsBack[0], pageNumber: b1 },
          { ...positionsBack[1], pageNumber: b2 }
        ].filter(p => p.pageNumber <= pageCount);
        images.push(await renderSide('front', fp as any));
        if (bp.length) images.push(await renderSide('back', bp as any));
      }
    } else {
      // Fallback: single side
      const only = await renderSide('front', template.printLayout.pagePositions);
      images.push(only);
    }

    const pdfData = await generatePDF(images, width, height);
    return { images, pdfData, width: width * pixelRatio, height: height * pixelRatio };
  } finally {
    document.body.removeChild(tempContainer);
  }
}

export async function createKonvaNode(content: ZineContent, getAsset: GetAssetFn): Promise<Konva.Node | null> {
  const common = { x: content.x, y: content.y, width: content.width, height: content.height, rotation: content.rotation } as const;

  if (content.type === 'shape') {
    const p = content.properties as ShapeProperties;
    const cfg = { ...common, fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth, opacity: p.opacity };
    if (p.shapeType === 'rectangle') return new Konva.Rect({ ...cfg, cornerRadius: p.cornerRadius || 0 });
    if (p.shapeType === 'circle') {
      const r = Math.min(content.width, content.height) / 2;
      return new Konva.Circle({ ...cfg, x: common.x + r, y: common.y + r, radius: r });
    }
    if (p.shapeType === 'triangle') return new Konva.RegularPolygon({ ...cfg, x: common.x + content.width / 2, y: common.y + content.height / 2, sides: 3, radius: Math.min(content.width, content.height) / 2 });
    return new Konva.Line({ ...cfg, points: [0, content.height / 2, content.width, content.height / 2], lineCap: 'round' });
  }

  if (content.type === 'text') {
    const p = content.properties as TextProperties;
    return new Konva.Text({ ...common, text: p.text, fontSize: p.fontSize, fontFamily: p.fontFamily, fontStyle: `${p.fontStyle} ${p.fontWeight}`.trim(), fill: p.color, align: p.textAlign });
  }

  if (content.type === 'image') {
    const p = content.properties as ImageProperties;
    return new Promise((resolve, reject) => {
      const imageObj = new window.Image();
      imageObj.crossOrigin = 'anonymous';
      imageObj.onload = () => resolve(new Konva.Image({ ...common, image: imageObj, opacity: p.opacity }));
      imageObj.onerror = () => reject(new Error(`Failed to load image from src: ${p.src}`));
      if (p.assetId) {
        getAsset(p.assetId).then(file => { if (file) imageObj.src = URL.createObjectURL(file); else reject(new Error(`Asset not found: ${p.assetId}`)); });
      } else {
        imageObj.src = p.src;
      }
    });
  }

  if (content.type === 'drawing') {
    const p: any = content.properties;
    const group = new Konva.Group({ ...common });
    if (p.paths && p.paths.length > 0) {
      p.paths.forEach((path: any) => {
        const points = path.points.flatMap((pt: any) => [pt.x, pt.y]);
        group.add(new Konva.Line({ points, stroke: p.strokeColor, strokeWidth: p.strokeWidth, opacity: p.opacity, lineCap: p.lineCap || 'round', lineJoin: p.lineJoin || 'round', tension: p.smoothing ? 0.5 : 0 }));
      });
    }
    return group;
  }

  return null;
}

export async function generatePDF(images: string[], width: number, height: number): Promise<string> {
  // width/height are in points (72 dpi). Ensure we pass sheet size (not pixelRatio scaled) to jsPDF.
  const widthInches = width / 72;
  const heightInches = height / 72;
  const orientation = widthInches > heightInches ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation: orientation as any, unit: 'in', format: [widthInches, heightInches] });
  images.forEach((dataURL, idx) => {
    if (idx > 0) pdf.addPage([widthInches, heightInches], orientation as any);
    pdf.addImage(dataURL, 'PNG', 0, 0, widthInches, heightInches);
  });
  return pdf.output('datauristring');
}


