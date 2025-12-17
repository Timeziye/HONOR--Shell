
import React, { useState, useRef, useEffect } from 'react';
import { Template, TemplateConfig } from '../types';
import { ChevronLeft, Save, Image as ImageIcon, RotateCw, Plus, Edit3, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SliderControl } from '../components/ui/SliderControl';

interface EditorProps {
  initialTemplate: Template | null;
  lastUsedConfig: TemplateConfig | null;
  onSave: (template: Template) => void;
  onBack: () => void;
}

type Tab = 'position' | 'size' | 'radius';

/**
 * 优化模板图片
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
      resolve(canvas.toDataURL('image/png')); // 模板建议用 PNG 保留透明度
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

const Editor: React.FC<EditorProps> = ({ initialTemplate, lastUsedConfig, onSave, onBack }) => {
  const [name, setName] = useState(initialTemplate?.name || 'HONOR-Shell');
  const [tempName, setTempName] = useState(name);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(initialTemplate?.frameImageSrc || null);
  const [rotation, setRotation] = useState(initialTemplate?.rotation || 0); 
  const [originalSize, setOriginalSize] = useState({ 
    width: initialTemplate?.originalWidth || 0, 
    height: initialTemplate?.originalHeight || 0 
  });
  
  const [config, setConfig] = useState<TemplateConfig>(initialTemplate?.config || {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    borderRadius: 0
  });

  const [activeTab, setActiveTab] = useState<Tab>('position');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (imageSrc && !initialTemplate) {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        setOriginalSize({ width: w, height: h });
        
        if (lastUsedConfig) {
          setConfig({ ...lastUsedConfig });
        } else {
          setConfig({
            x: Math.round(w * 0.1),
            y: Math.round(h * 0.1),
            width: Math.round(w * 0.8),
            height: Math.round(h * 0.8),
            borderRadius: Math.round(Math.min(w, h) * 0.05)
          });
        }
      };
      img.src = imageSrc;
    }
  }, [imageSrc, initialTemplate, lastUsedConfig]);

  useEffect(() => {
    if (showRenameModal) {
      setTimeout(() => renameInputRef.current?.focus(), 100);
    }
  }, [showRenameModal]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (evt.target?.result) {
          const optimized = await optimizeImage(evt.target.result as string);
          setImageSrc(optimized);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!imageSrc || originalSize.width === 0) return;
    
    const newTemplate: Template = {
      id: initialTemplate?.id || Date.now().toString(),
      name,
      frameImageSrc: imageSrc,
      config,
      originalWidth: originalSize.width,
      originalHeight: originalSize.height,
      rotation: rotation
    };
    onSave(newTemplate);
  };

  const handleRotate = () => {
    setRotation((prev) => prev + 90);
  };

  const handleRenameConfirm = () => {
    if (tempName.trim()) {
      setName(tempName.trim());
      setShowRenameModal(false);
    }
  };

  const updateConfig = (key: keyof TemplateConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const isCurrentlyHorizontal = (rotation / 90) % 2 !== 0;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      <div className="h-14 px-4 flex items-center justify-between border-b shrink-0 bg-white z-30">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 -ml-2 text-slate-900 active:bg-slate-100 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <span className="ml-1 text-sm font-bold text-slate-400 truncate max-w-[80px] md:max-w-[120px]">
            {name}
          </span>
        </div>
        
        <div className="flex items-center gap-5">
          <button 
            onClick={() => {
              setTempName(name);
              setShowRenameModal(true);
            }}
            className="flex flex-col items-center gap-0.5 text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <Edit3 size={22} />
            <span className="text-[10px] font-bold">命名</span>
          </button>

          <button 
            onClick={handleRotate}
            className="flex flex-col items-center gap-0.5 text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <RotateCw size={22} />
            <span className="text-[10px] font-bold">旋转</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-0.5 text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <ImageIcon size={22} />
            <span className="text-[10px] font-bold">图片</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </button>
          
          <button 
            onClick={handleSave} 
            disabled={!imageSrc} 
            className="flex flex-col items-center gap-0.5 text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors disabled:opacity-30"
          >
            <Save size={22} />
            <span className="text-[10px] font-bold">保存</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative flex items-center justify-center p-8 bg-slate-50/30 overflow-hidden">
        {!imageSrc ? (
          <div className="text-center w-full max-w-xs">
             <label className="cursor-pointer flex flex-col items-center gap-3 p-12 border-2 border-dashed border-indigo-200 rounded-3xl bg-white hover:bg-indigo-50 transition-all shadow-sm">
              <Plus className="w-10 h-10 text-indigo-400" />
              <span className="text-indigo-600 font-bold text-sm">点击上传机壳</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center transition-all duration-500 ease-in-out"
            style={{ 
              transform: `rotate(${rotation}deg) ${isCurrentlyHorizontal ? 'scale(0.8)' : 'scale(1)'}` 
            }}
          >
            <div 
              ref={containerRef} 
              className="relative shadow-2xl transition-all duration-300" 
              style={{ 
                aspectRatio: `${originalSize.width} / ${originalSize.height}`,
                maxWidth: '100%',
                maxHeight: '100%',
                backgroundImage: 'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: 'white'
              }}
            >
              <img 
                src={imageSrc} 
                alt="Frame" 
                className="w-full h-full block pointer-events-none select-none relative z-10" 
              />
              
              <div 
                className="absolute bg-green-500/80 z-20"
                style={{
                  left: `${(config.x / originalSize.width) * 100}%`,
                  top: `${(config.y / originalSize.height) * 100}%`,
                  width: `${(config.width / originalSize.width) * 100}%`,
                  height: `${(config.height / originalSize.height) * 100}%`,
                  borderRadius: `${(config.borderRadius / config.width) * 100}% / ${(config.borderRadius / config.height) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {imageSrc && (
        <div className="bg-[#f2f4ff] shrink-0 pb-safe">
          <div className="px-4 py-4">
            <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1">
              {[
                { id: 'position', label: '偏移' },
                { id: 'size', label: '大小' },
                { id: 'radius', label: '圆角' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 pb-12 overflow-y-auto no-scrollbar min-h-[180px]">
            <div className="flex flex-col gap-6">
              {activeTab === 'position' && (
                <div className="animate-in fade-in duration-300 flex flex-col gap-6">
                  <SliderControl 
                    label="X轴偏移" 
                    value={config.x} 
                    min={-originalSize.width} 
                    max={originalSize.width} 
                    onChange={(v) => updateConfig('x', v)} 
                  />
                  <SliderControl 
                    label="Y轴偏移" 
                    value={config.y} 
                    min={-originalSize.height} 
                    max={originalSize.height} 
                    onChange={(v) => updateConfig('y', v)} 
                  />
                </div>
              )}
              {activeTab === 'size' && (
                <div className="animate-in fade-in duration-300 flex flex-col gap-6">
                  <SliderControl 
                    label="宽度调整" 
                    value={config.width} 
                    min={1} 
                    max={originalSize.width * 2} 
                    onChange={(v) => updateConfig('width', v)} 
                  />
                  <SliderControl 
                    label="高度调整" 
                    value={config.height} 
                    min={1} 
                    max={originalSize.height * 2} 
                    onChange={(v) => updateConfig('height', v)} 
                  />
                </div>
              )}
              {activeTab === 'radius' && (
                <div className="animate-in fade-in duration-300">
                  <SliderControl 
                    label="圆角半径" 
                    value={config.borderRadius} 
                    min={0} 
                    max={Math.max(config.width, config.height) / 2} 
                    onChange={(v) => updateConfig('borderRadius', v)} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">重命名模板</h3>
              <button 
                onClick={() => setShowRenameModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">模板名称</label>
              <input 
                ref={renameInputRef}
                type="text" 
                value={tempName} 
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                placeholder="请输入模板名称..."
                className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:outline-none transition-all font-medium text-slate-700"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => setShowRenameModal(false)}
                className="rounded-2xl h-12"
              >
                取消
              </Button>
              <Button 
                variant="primary" 
                fullWidth 
                onClick={handleRenameConfirm}
                disabled={!tempName.trim()}
                className="rounded-2xl h-12"
              >
                确定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
