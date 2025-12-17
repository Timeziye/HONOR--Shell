
import React, { useState, useEffect, useRef } from 'react';
import { Template, AppView, CanvasItem, ScreenshotItem, BgSettings, BackgroundType } from '../types';
import { Plus, Trash2, Edit2, Smartphone, ImageIcon, Download, Loader2, Image as ImageIconLucide, ChevronDown, ChevronUp, Settings2, LayoutGrid, Layers, ImagePlus, X, RotateCcw, CheckCircle2, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SliderControl } from '../components/ui/SliderControl';

interface DashboardProps {
  templates: Template[];
  selectedTemplates: Template[];
  screenshotItems: ScreenshotItem[];
  setScreenshotItems: React.Dispatch<React.SetStateAction<ScreenshotItem[]>>;
  bgSettings: BgSettings;
  setBgSettings: React.Dispatch<React.SetStateAction<BgSettings>>;
  onUpdateBgType: (type: BackgroundType, targetGridKey?: string | null) => void;
  onToggleTemplate: (id: string) => void;
  onCreateNew: () => void;
  onDeleteTemplate: (id: string) => void;
  onEditTemplate: (t: Template) => void;
  onSetView: (view: AppView) => void;
  onEnterCanvasEditor: (item: CanvasItem) => void;
}

/**
 * 优化大图片，防止内存崩溃或 Canvas 渲染失败
 */
const optimizeImage = async (dataUrl: string, maxDim: number = 2000): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      } else {
        resolve(dataUrl);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/**
 * 适配 APK 保存策略：直接存储到本地磁盘
 */
const saveToDevice = async (dataUrl: string, fileName: string) => {
  const win = window as any;
  
  // 1. 如果是在定制的 APK WebView 环境中，尝试调用原生注入的 Bridge
  if (win.Android && win.Android.saveImage) {
    // 假设原生方法接受 base64 字符串（不含前缀）和文件名
    const base64Data = dataUrl.split(',')[1];
    win.Android.saveImage(base64Data, fileName);
    return true;
  }
  
  // 2. 如果是 iOS WebView 或其他支持 MessageHandlers 的环境
  if (win.webkit && win.webkit.messageHandlers && win.webkit.messageHandlers.saveImage) {
    win.webkit.messageHandlers.saveImage.postMessage({
      data: dataUrl.split(',')[1],
      name: fileName
    });
    return true;
  }

  // 3. 浏览器兜底方案：传统的 <a> 标签下载
  const link = document.createElement('a');
  link.download = fileName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
};

// 子组件：用于处理每个网格项的比例加载和文字渲染
const GridItem: React.FC<{
  entry: any;
  isSelected: boolean;
  bgSettings: BgSettings;
  onSelect: () => void;
  onRemove: () => void;
  onEdit: () => void;
}> = ({ entry, isSelected, bgSettings, onSelect, onRemove, onEdit }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  
  const currentBgType = entry.result?.bgType || bgSettings.type;
  const isBlurMode = currentBgType === 'blur';

  return (
    <div 
      onClick={onSelect} 
      className={`relative group aspect-[3/4] rounded-2xl overflow-hidden bg-white shadow-md border-2 transition-all cursor-pointer ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-100 hover:border-slate-300'}`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div 
          className="relative transition-all duration-300"
          style={{ 
            aspectRatio: aspectRatio || 'auto',
            height: '100%',
            maxWidth: '100%',
            containerType: 'inline-size' 
          }}
        >
          {/* 背景层 */}
          {isBlurMode && (entry.itemSrc || bgSettings.customSrc) && (
            <div className="absolute inset-0 z-0 overflow-hidden rounded-lg">
              <img 
                src={bgSettings.customSrc || entry.itemSrc} 
                className="w-full h-full object-cover" 
                style={{ 
                  filter: `blur(${bgSettings.blur}px) brightness(0.9)`, 
                  transform: `scale(${bgSettings.scale / 100}) translate(${bgSettings.xOffset}%, ${bgSettings.yOffset}%)` 
                }} 
                alt=""
              />
            </div>
          )}

          {/* 机壳内容层 */}
          <div className={`relative z-10 w-full h-full flex items-center justify-center ${isBlurMode ? 'p-[16.67%]' : ''}`}>
            {entry.result ? (
              <img 
                src={entry.result.base64} 
                className="max-w-full max-h-full object-contain drop-shadow-lg" 
                onLoad={(e) => setAspectRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                alt=""
              />
            ) : (
              <Loader2 className="animate-spin text-indigo-600 w-6 h-6" />
            )}
          </div>

          {/* 文字图层 */}
          {entry.result?.textConfig && (
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
              <div 
                style={{ 
                  position: 'absolute',
                  left: `${entry.result.textConfig.x}%`, 
                  top: `${entry.result.textConfig.y}%`, 
                  color: entry.result.textConfig.color, 
                  fontSize: `${entry.result.textConfig.fontSize}cqw`, 
                  transform: 'translate(-50%, -50%)', 
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  writingMode: entry.result.textConfig.isVertical ? 'vertical-rl' : 'horizontal-tb',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}
              >
                {entry.result.textConfig.text}
              </div>
            </div>
          )}
        </div>
      </div>

      {isSelected && <div className="absolute top-2 left-2 z-30"><CheckCircle2 size={18} className="text-indigo-600 fill-white" /></div>}
      {isSelected && entry.result && (
        <div className="absolute bottom-2 left-2 right-2 z-40 animate-in slide-in-from-bottom-2 duration-300">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-full h-8 bg-slate-800/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
             <span className="text-[10px] font-black text-white uppercase tracking-widest">HONOR-Shell</span>
          </button>
        </div>
      )}
      
      <div className="absolute top-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:scale-110 transition-transform"><X size={14} /></button>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  templates, 
  selectedTemplates,
  screenshotItems,
  setScreenshotItems,
  bgSettings,
  setBgSettings,
  onUpdateBgType,
  onToggleTemplate,
  onCreateNew, 
  onDeleteTemplate,
  onEditTemplate,
  onSetView,
  onEnterCanvasEditor
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  
  const [selectedGridKey, setSelectedGridKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  const updateBgSetting = (key: keyof BgSettings, value: any) => {
    setBgSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          if (evt.target?.result) {
            const optimized = await optimizeImage(evt.target.result as string, 1600);
            setScreenshotItems(prev => [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              src: optimized,
              results: {}
            }]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (evt.target?.result) {
          const optimized = await optimizeImage(evt.target.result as string, 2000);
          updateBgSetting('customSrc', optimized);
          setIsControlsExpanded(true);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const clearCustomBg = () => updateBgSetting('customSrc', null);

  const removeScreenshot = (id: string) => {
    setScreenshotItems(prev => prev.filter(item => item.id !== id));
    if (selectedGridKey?.startsWith(id)) setSelectedGridKey(null);
  };

  const clearAllScreenshots = () => {
    setScreenshotItems([]);
    setSelectedGridKey(null);
  };

  useEffect(() => {
    if (selectedTemplates.length === 0 || screenshotItems.length === 0) return;
    
    const findNextTask = () => {
      for (const item of screenshotItems) {
        for (const template of selectedTemplates) {
          if (!item.results[template.id]) return { item, template };
        }
      }
      return null;
    };

    const nextTask = findNextTask();
    if (nextTask && !isProcessing) processTask(nextTask.item, nextTask.template);
  }, [screenshotItems, selectedTemplates, isProcessing]);

  const processTask = async (item: ScreenshotItem, template: Template) => {
    setIsProcessing(true);
    try {
      const result = await generateShellImage(item.src, template);
      setScreenshotItems(prev => prev.map(si => {
        if (si.id === item.id) {
          return {
            ...si,
            results: { ...si.results, [template.id]: { base64: result } }
          };
        }
        return si;
      }));
    } catch (err) {
      console.error("Task failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateShellImage = async (screenshotSrc: string, template: Template): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return "";
    const [frameImg, screenImg] = await Promise.all([
      new Promise<HTMLImageElement>(r => { const img = new Image(); img.onload = () => r(img); img.src = template.frameImageSrc; }),
      new Promise<HTMLImageElement>(r => { const img = new Image(); img.onload = () => r(img); img.src = screenshotSrc; })
    ]);
    const rotation = template.rotation || 0;
    const normalizedRotation = rotation % 360;
    const isHorizontal = (normalizedRotation / 90) % 2 !== 0;
    canvas.width = isHorizontal ? frameImg.naturalHeight : frameImg.naturalWidth;
    canvas.height = isHorizontal ? frameImg.naturalWidth : frameImg.naturalHeight;
    const config = template.config;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((normalizedRotation * Math.PI) / 180);
    ctx.translate(-frameImg.naturalWidth / 2, -frameImg.naturalHeight / 2);
    ctx.save();
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(config.x, config.y, config.width, config.height, config.borderRadius);
    else ctx.rect(config.x, config.y, config.width, config.height);
    ctx.clip();
    const targetIsPortrait = config.height > config.width;
    const screenIsPortrait = screenImg.naturalHeight > screenImg.naturalWidth;
    if (targetIsPortrait !== screenIsPortrait) {
      ctx.translate(config.x + config.width / 2, config.y + config.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(screenImg, -config.height / 2, -config.width / 2, config.height, config.width);
    } else ctx.drawImage(screenImg, config.x, config.y, config.width, config.height);
    ctx.restore();
    ctx.drawImage(frameImg, 0, 0);
    ctx.restore();
    return canvas.toDataURL('image/png');
  };

  const handleDownloadAll = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      for (const item of screenshotItems) {
        for (const template of selectedTemplates) {
          const res = item.results[template.id];
          if (res) {
            const finalData = await getFinalCompositeImage(res.base64, bgSettings.customSrc || item.src, res.textConfig, res.bgType);
            const fileName = `HONOR-Shell_${template.name.replace(/\s+/g, '_')}_${item.id}.png`;
            await saveToDevice(finalData, fileName);
            // 稍作停顿，避免 Bridge 负载过重或浏览器阻止连续下载
            await new Promise(r => setTimeout(r, 400));
          }
        }
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const getFinalCompositeImage = async (shellResult: string, bgSrc: string, textConfig?: any, itemBgType?: BackgroundType): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";
    const [shellImg, screenImg] = await Promise.all([
      new Promise<HTMLImageElement>(r => { const img = new Image(); img.onload = () => r(img); img.src = shellResult; }),
      new Promise<HTMLImageElement>(r => { const img = new Image(); img.onload = () => r(img); img.src = bgSrc; })
    ]);
    
    const currentBgType = itemBgType || bgSettings.type;
    const isBlurMode = currentBgType === 'blur';
    const paddingRatio = isBlurMode ? 0.5 : 0;

    canvas.width = Math.round(shellImg.width * (1 + paddingRatio));
    canvas.height = Math.round(shellImg.height * (1 + paddingRatio));
    
    const MAX_CANVAS = 8192;
    if (canvas.width > MAX_CANVAS || canvas.height > MAX_CANVAS) {
      const scale = MAX_CANVAS / Math.max(canvas.width, canvas.height);
      canvas.width *= scale;
      canvas.height *= scale;
      ctx.scale(scale, scale);
    }

    if (isBlurMode) {
      ctx.save();
      ctx.filter = `blur(${bgSettings.blur}px) brightness(0.9)`;
      const screenAspect = screenImg.width / screenImg.height;
      const canvasAspect = canvas.width / canvas.height;
      let dW, dH;
      if (screenAspect > canvasAspect) { dH = canvas.height; dW = dH * screenAspect; } 
      else { dW = canvas.width; dH = dW / screenAspect; }
      const scaleFactor = bgSettings.scale / 100; dW *= scaleFactor; dH *= scaleFactor;
      const dX = (canvas.width - dW) / 2 + (bgSettings.xOffset / 100) * canvas.width;
      const dY = (canvas.height - dH) / 2 + (bgSettings.yOffset / 100) * canvas.height;
      ctx.drawImage(screenImg, dX, dY, dW, dH);
      ctx.restore();
    }
    ctx.drawImage(shellImg, (canvas.width - shellImg.width) / 2, (canvas.height - shellImg.height) / 2);
    if (textConfig) {
      ctx.save();
      ctx.fillStyle = textConfig.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fSize = Math.round((textConfig.fontSize / 100) * (isBlurMode ? canvas.width / 1.5 : canvas.width));
      ctx.font = `bold ${fSize}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      
      const xPos = (textConfig.x / 100) * canvas.width;
      const yPos = (textConfig.y / 100) * canvas.height;

      if (textConfig.isVertical) {
        const chars = textConfig.text.split('');
        const totalHeight = chars.length * fSize * 1.1;
        const startY = yPos - totalHeight / 2 + fSize / 2;
        chars.forEach((char, i) => {
          ctx.fillText(char, xPos, startY + i * fSize * 1.1);
        });
      } else {
        ctx.fillText(textConfig.text, xPos, yPos);
      }
      ctx.restore();
    }
    return canvas.toDataURL('image/png', 1.0);
  };

  const handleEditItem = (gridKey: string) => {
    const [itemId, templateId] = gridKey.split('-');
    const item = screenshotItems.find(si => si.id === itemId);
    const template = templates.find(t => t.id === templateId);
    if (item && template && item.results[templateId]) {
      onEnterCanvasEditor({
        itemId,
        templateId,
        image: item.results[templateId]!.base64,
        templateName: template.name,
        itemSrc: item.src,
        initialTextConfig: item.results[templateId]?.textConfig
      });
    }
  };

  const displayGrid = screenshotItems.flatMap(item => 
    selectedTemplates.map(template => ({
      itemId: item.id,
      itemSrc: item.src,
      templateId: template.id,
      templateName: template.name,
      result: item.results[template.id]
    }))
  );

  const getActiveBgTypeDisplay = (): BackgroundType => {
    if (selectedGridKey) {
      const [itemId, templateId] = selectedGridKey.split('-');
      const item = screenshotItems.find(si => si.id === itemId);
      return item?.results[templateId]?.bgType || bgSettings.type;
    }
    return bgSettings.type;
  };

  const activeBgType = getActiveBgTypeDisplay();

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-y-auto no-scrollbar touch-pan-y">
      <header className="h-14 border-b flex items-center justify-between px-4 bg-white z-30 shrink-0">
        <div className="flex items-center gap-2 font-bold text-indigo-600 cursor-pointer" onClick={() => onSetView('dashboard')}>
          <Layers className="w-6 h-6" />
          <span className="tracking-tight">HONOR-Shell</span>
        </div>
      </header>

      <section className="bg-white border-b shrink-0 z-20 shadow-sm transition-all duration-300">
        <div className="px-4 py-2 flex justify-between items-center min-h-[48px]">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)}>
            <div className={`p-1 rounded-lg transition-colors ${isLibraryExpanded ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
              <LayoutGrid size={14} strokeWidth={2.5} />
            </div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-500 transition-colors">模板库</h2>
            {isLibraryExpanded ? <ChevronUp size={14} className="text-slate-300" /> : <ChevronDown size={14} className="text-slate-300" />}
          </div>
          <button onClick={onCreateNew} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md transition-colors">
            <Plus size={12} strokeWidth={3} /> 添加模板
          </button>
        </div>

        {isLibraryExpanded && (
          <div className="flex overflow-x-auto no-scrollbar gap-3 p-4 pt-0 pb-5 animate-in slide-in-from-top-1 duration-200">
            {templates.length === 0 ? (
              <div className="flex-1 text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                 <p className="text-xs text-slate-400 font-medium italic">点击上方添加您的第一个机壳模板</p>
              </div>
            ) : (
              templates.map((t) => {
                const isSelected = selectedTemplates.some(st => st.id === t.id);
                return (
                  <div key={t.id} onClick={() => onToggleTemplate(t.id)} className={`group relative shrink-0 w-24 aspect-[4/5] rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                    <div className="absolute top-1 right-1 flex flex-col gap-1 z-30 pointer-events-auto">
                       <button onClick={(e) => { e.stopPropagation(); onEditTemplate(t); }} className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-indigo-600 shadow-sm border border-slate-100 hover:scale-110 transition-transform"><Edit2 size={12} strokeWidth={2.5} /></button>
                       <button onClick={(e) => { e.stopPropagation(); onDeleteTemplate(t.id); }} className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg text-red-600 shadow-sm border border-slate-100 hover:scale-110 transition-transform"><Trash2 size={12} strokeWidth={2.5} /></button>
                    </div>
                    {isSelected && <div className="absolute bottom-1 right-1 z-30 pointer-events-none"><CheckCircle2 size={14} className="text-indigo-600 fill-white" /></div>}
                    <div className="w-full h-full p-2 flex flex-col items-center">
                       <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                          <div style={{ transform: `rotate(${t.rotation || 0}deg)` }} className="w-full h-full flex items-center justify-center transition-transform">
                            <img src={t.frameImageSrc} alt={t.name} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                          </div>
                       </div>
                       <div className="w-full text-[10px] font-bold text-slate-600 truncate text-center mt-1">{t.name}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <section className="p-6 pb-24 flex-1 flex flex-col">
        {selectedTemplates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Smartphone className="w-8 h-8 text-slate-300" /></div>
            <h3 className="text-slate-800 font-bold mb-1">请选择模版</h3>
            <p className="text-sm text-slate-400">在上方模版库中点击选中一个或多个模版</p>
          </div>
        ) : screenshotItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <label className="w-full max-w-[280px] aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 rounded-[32px] bg-white hover:bg-indigo-50/50 cursor-pointer transition-all shadow-sm group">
               <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ImageIconLucide className="w-6 h-6 text-indigo-500" /></div>
               <h3 className="text-base font-bold text-slate-800 mb-1">批量上传截图</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center px-4">支持多选 PNG, JPG</p>
               <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-6 py-4">
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-fr">
                {displayGrid.map((entry, index) => {
                  const gridKey = `${entry.itemId}-${entry.templateId}`;
                  const isSelected = selectedGridKey === gridKey;

                  return (
                    <GridItem 
                      key={`${gridKey}-${index}`}
                      entry={entry}
                      isSelected={isSelected}
                      bgSettings={bgSettings}
                      onSelect={() => setSelectedGridKey(isSelected ? null : gridKey)}
                      onRemove={() => removeScreenshot(entry.itemId)}
                      onEdit={() => handleEditItem(gridKey)}
                    />
                  );
                })}
                <button onClick={() => fileInputRef.current?.click()} className="aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-white transition-all text-slate-400 group">
                  <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold">继续添加</span>
                </button>
             </div>
             <div className="w-full max-w-[400px] mx-auto flex flex-col gap-4">
                  <div className="bg-slate-200/50 p-1 rounded-2xl flex gap-1">
                    <button onClick={() => onUpdateBgType('transparent', selectedGridKey)} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeBgType === 'transparent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>透明背景</button>
                    <button onClick={() => onUpdateBgType('blur', selectedGridKey)} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeBgType === 'blur' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>模糊背景</button>
                  </div>
                  {bgSettings.type === 'blur' && (
                    <div className="flex flex-col bg-white/50 rounded-3xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 duration-300 shadow-sm">
                      <div className="flex items-center bg-white/80 backdrop-blur-sm z-10 border-b border-slate-100">
                        {bgSettings.customSrc ? (
                          <button onClick={clearCustomBg} className="flex-1 px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors border-r border-slate-100"><RotateCcw size={14} /><span>恢复默认</span></button>
                        ) : (
                          <button onClick={() => bgFileInputRef.current?.click()} className="flex-1 px-4 py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:bg-slate-100/50 transition-colors border-r border-slate-100 group"><ImagePlus size={14} className="text-indigo-500 group-hover:scale-110 transition-transform" /><span>统一背景</span><input type="file" ref={bgFileInputRef} accept="image/*" className="hidden" onChange={handleBgUpload} /></button>
                        )}
                        <button onClick={() => setIsControlsExpanded(!isControlsExpanded)} className="flex-1 px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-500 hover:bg-slate-100/50 transition-colors"><div className="flex items-center gap-2"><Settings2 size={14} className="text-indigo-500" /><span>背景调整</span></div>{isControlsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                      </div>
                      {isControlsExpanded && (
                        <div className="px-4 pb-4 flex flex-col gap-6 max-h-[152px] overflow-y-auto no-scrollbar scroll-smooth animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="pt-2 flex flex-col gap-6">
                            <SliderControl label="模糊强度" value={bgSettings.blur} min={0} max={100} onChange={(v) => updateBgSetting('blur', v)} />
                            <SliderControl label="背景缩放" value={bgSettings.scale} min={50} max={200} onChange={(v) => updateBgSetting('scale', v)} />
                            <SliderControl label="水平偏移" value={bgSettings.xOffset} min={-50} max={50} onChange={(v) => updateBgSetting('xOffset', v)} />
                            <SliderControl label="垂直偏移" value={bgSettings.yOffset} min={-50} max={50} onChange={(v) => updateBgSetting('yOffset', v)} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-2 mt-2">
                    <Button 
                      fullWidth 
                      variant="primary" 
                      onClick={handleDownloadAll} 
                      disabled={screenshotItems.length === 0 || isProcessing || isSaving} 
                      className="rounded-full h-12 shadow-lg shadow-indigo-200 relative overflow-hidden"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={18} className="mr-2 animate-spin" />
                          正在保存本地...
                        </>
                      ) : (
                        <>
                          <Download size={18} className="mr-2" /> 
                          一键保存至设备 ({displayGrid.filter(d => d.result).length})
                        </>
                      )}
                    </Button>
                    <div className="flex gap-2">
                      <Button fullWidth variant="secondary" onClick={() => fileInputRef.current?.click()} className="rounded-full h-10 bg-white border border-slate-200 flex-1"><Plus size={16} className="mr-2" /> 添加截图<input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleScreenshotUpload} /></Button>
                      <Button variant="danger" onClick={clearAllScreenshots} className="rounded-full h-10 px-4" title="清空列表"><Trash2 size={16} /></Button>
                    </div>
                  </div>
             </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
