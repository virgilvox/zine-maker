// Zine-specific types for proper zine making functionality

import type { Component } from 'vue';

export type ZineFormat = 'quarter-fold' | 'half-fold' | 'tri-fold' | 'booklet' | 'flipbook' | 'accordion';
export type PageSize = 'letter' | 'a4' | 'legal' | 'tabloid';
export type PageOrientation = 'portrait' | 'landscape';

export interface ZineTemplate {
  id: string;
  name: string;
  format: ZineFormat;
  pageSize: PageSize;
  orientation: PageOrientation;
  pageCount: number;
  description: string;
  foldInstructions: string;
  printLayout: PrintLayout;
  pageCanvas?: { width: number; height: number };
}

export interface PrintLayout {
  sheetWidth: number;
  sheetHeight: number;
  pagePositions: PagePosition[];
}

export interface PagePosition {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isFlipped: boolean;
  side?: 'front' | 'back';
}

export interface ZinePage {
  id: string;
  pageNumber: number;
  title: string;
  content: ZineContent[];
  backgroundColor: string;
  backgroundImage?: string;
}

export interface ZineContent {
  id: string;
  type: 'text' | 'image' | 'shape' | 'drawing';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  properties: TextProperties | ImageProperties | ShapeProperties | DrawingProperties;
  visible?: boolean;
  locked?: boolean;
  groupId?: string;
  name?: string;
}

export interface TextProperties {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number;
  textDecoration: 'none' | 'underline' | 'line-through';
  backgroundColor?: string;
  padding: number;
}

export interface ImageProperties {
  src: string;
  alt: string;
  opacity: number;
  filters?: string;
  assetId?: number;
}

export interface ShapeProperties {
  shapeType: 'rectangle' | 'circle' | 'line' | 'triangle';
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  cornerRadius?: number;
}

export interface DrawingProperties {
  paths: DrawingPath[];
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  smoothing: boolean;
}

export interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface ZineProject {
  id: string;
  name: string;
  template: ZineTemplate;
  pages: ZinePage[];
  createdAt: Date;
  modifiedAt: Date;
  metadata: {
    author: string;
    description: string;
    tags: string[];
  };
  formatVersion?: number; // 2 = new cover layout, undefined/1 = legacy
}

export interface ExportOptions {
  format: 'png' | 'pdf';
  dpi: number;
  includeBleed: boolean;
  includeCropMarks: boolean;
}

export type ToolType = 'select' | 'text' | 'image' | 'shape' | 'draw' | 'pan' | 'zoom';

export interface Tool {
  id: ToolType;
  name: string;
  icon: Component;
  shortcut: string;
}