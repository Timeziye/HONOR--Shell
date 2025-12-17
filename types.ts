
export interface TemplateConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

export interface Template {
  id: string;
  name: string;
  frameImageSrc: string; // Base64 data URL
  config: TemplateConfig;
  originalWidth: number;
  originalHeight: number;
  rotation?: number; // 旋转角度 (0, 90, 180, 270...)
}

export interface TextConfig {
  text: string;
  fontSize: number;
  x: number;
  y: number;
  color: string;
  isVertical?: boolean;
}

export type BackgroundType = 'transparent' | 'blur';

export interface BgSettings {
  type: BackgroundType;
  blur: number;
  scale: number;
  xOffset: number;
  yOffset: number;
  customSrc: string | null;
}

export interface ScreenshotResult {
  base64: string;
  textConfig?: TextConfig;
  bgType?: BackgroundType; // 允许单独覆盖全局背景模式
}

export interface ScreenshotItem {
  id: string;
  src: string;
  results: Record<string, ScreenshotResult>; // templateId -> Result
}

export interface CanvasItem {
  itemId: string;
  templateId: string;
  image: string; // The raw shell image
  templateName: string;
  itemSrc: string; // Original screenshot for blur background
  initialTextConfig?: TextConfig;
}

export type AppView = 'dashboard' | 'editor' | 'canvas-editor';
