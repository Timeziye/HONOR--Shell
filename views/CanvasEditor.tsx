
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Type, Move, Scaling, Check, Trash2, LayoutList, Columns } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SliderControl } from '../components/ui/SliderControl';
import { TextConfig, BgSettings } from '../types';

interface CanvasEditorProps {
  baseImage: string;
  templateName: string;
  itemSrc: string;
  bgSettings: BgSettings;
  initialTextConfig?: TextConfig & { bgType?: string }; // 兼容带有 bgType 的配置
  onSave: (config: TextConfig) => void;
  onBack: () => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  baseImage, 
  templateName, 
  itemSrc,
  bgSettings,
  initialTextConfig, 
  onSave, 
  onBack 
}) => {
  const [text, setText] = useState(initialTextConfig?.text || '输入标题文字');
  const [fontSize, setFontSize] = useState(initialTextConfig?.fontSize || 10);
  const [textX, setTextX] = useState(initialTextConfig?.x || 50);
  const [textY, setTextY] = useState(initialTextConfig?.y || 90);
  const [textColor, setTextColor] = useState(initialTextConfig?.color || '#ffffff');
  const [isVertical, setIsVertical] = useState(initialTextConfig?.isVertical || false);
  const [activeControl, setActiveControl] = useState<'text' | 'position' | 'size'>('text');
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight
        });
      }
    };
    updateSize();
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timer);
    };
  }, [aspectRatio]);

  const handleApply = () => {
    onSave({
      text,
      fontSize,
      x: textX,
      y: textY,
      color: textColor,
      isVertical
    });
  };

  // 优先使用项自身的背景模式
  const isBlurMode = (initialTextConfig as any)?.bgType ? (initialTextConfig as any).bgType === 'blur' : bgSettings.type === 'blur';

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <header className="h-11 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
        <button onClick={onBack} className="p-1 text-slate-400 active:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">Text Editor</h2>
        <div className="w-7" />
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-900">
        <div className="relative flex items-center justify-center p-4 bg-black/40 min-h-[360px]">
          <div 
            ref={containerRef} 
            className="relative shadow-2xl overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 ring-1 ring-white/10"
            style={{ 
              aspectRatio: aspectRatio,
              height: 'auto',
              maxHeight: '70vh',
              width: isBlurMode ? 'auto' : '100%',
              maxWidth: isBlurMode ? '600px' : '400px'
            }}
          >
            {/* 背景层 */}
            {isBlurMode && (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <img 
                  src={bgSettings.customSrc || itemSrc} 
                  className="w-full h-full object-cover" 
                  style={{ 
                    filter: `blur(${bgSettings.blur}px) brightness(0.9)`, 
                    transform: `scale(${bgSettings.scale / 100}) translate(${bgSettings.xOffset}%, ${bgSettings.yOffset}%)` 
                  }} 
                  alt=""
                />
              </div>
            )}

            {/* 机壳层 */}
            <div className={`relative z-10 w-full h-full flex items-center justify-center ${isBlurMode ? 'p-[16.67%]' : ''}`}>
              <img 
                src={baseImage} 
                className="max-w-full block opacity-100" 
                style={{ maxHeight: '70vh' }} 
                onLoad={(e) => setAspectRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
                alt="Preview" 
              />
            </div>
            
            {/* 实时文字预览 */}
            <div 
              className="absolute z-20 pointer-events-none select-none text-center flex items-center justify-center whitespace-nowrap"
              style={{
                left: `${textX}%`,
                top: `${textY}%`,
                transform: 'translate(-50%, -50%)',
                color: textColor,
                fontSize: `${(fontSize / 100) * (containerSize.w > 0 ? containerSize.w : 300)}px`,
                fontWeight: 'bold',
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb'
              }}
            >
              {text}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-t-[24px] p-5 pb-8 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex gap-1.5 mb-5 bg-slate-100/80 p-1 rounded-xl">
            {[
              { id: 'text', icon: Type, label: '文字' },
              { id: 'position', icon: Move, label: '位置' },
              { id: 'size', icon: Scaling, label: '大小' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveControl(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${activeControl === tab.id ? 'bg-white text-indigo-600 shadow-sm font-bold scale-[1.02]' : 'text-slate-400 font-medium hover:text-slate-500'}`}
              >
                <tab.icon size={15} />
                <span className="text-[11px]">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="min-h-[140px] mb-4 px-1">
            {activeControl === 'text' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1.5">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={text} 
                      onChange={(e) => setText(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none font-medium text-sm text-slate-700 transition-all"
                      placeholder="请输入内容..."
                    />
                    <button onClick={() => setText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Color Palette</span>
                    <div className="flex gap-2">
                      {['#ffffff', '#000000', '#6366f1', '#ef4444', '#22c55e', '#f59e0b'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setTextColor(c)}
                          className={`w-5 h-5 rounded-full border transition-all ${textColor === c ? 'scale-125 border-indigo-500 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">Orientation</span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => setIsVertical(false)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${!isVertical ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100'}`}
                      >
                        <Columns size={12} /> 横排
                      </button>
                      <button 
                        onClick={() => setIsVertical(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isVertical ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-100'}`}
                      >
                        <LayoutList size={12} /> 竖排
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeControl === 'position' && (
              <div className="flex flex-col gap-6 pt-1 animate-in slide-in-from-right-1 duration-200">
                <SliderControl label="水平" value={textX} min={0} max={100} onChange={setTextX} />
                <SliderControl label="垂直" value={textY} min={0} max={100} onChange={setTextY} />
                <div className="flex gap-2 justify-center">
                   <button onClick={() => setTextX(50)} className="px-3 py-1 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 hover:bg-slate-200">水平居中</button>
                   <button onClick={() => setTextY(50)} className="px-3 py-1 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 hover:bg-slate-200">垂直居中</button>
                </div>
              </div>
            )}

            {activeControl === 'size' && (
              <div className="flex flex-col gap-6 pt-1 animate-in slide-in-from-right-1 duration-200">
                <SliderControl label="缩放" value={fontSize} min={1} max={60} onChange={setFontSize} />
                <div className="text-center">
                  <span className="text-[9px] text-slate-300 font-bold tracking-tighter uppercase">Scale Relative to Canvas Width</span>
                </div>
              </div>
            )}
          </div>

          <div className="pb-safe">
            <Button fullWidth onClick={handleApply} className="rounded-xl h-11 shadow-md shadow-indigo-100 font-bold text-sm tracking-wide active:scale-95 transition-all">
              <Check size={16} className="mr-1.5" /> 保存编辑
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasEditor;
