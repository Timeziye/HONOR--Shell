
import React, { useState, useEffect } from 'react';
import { Template, AppView, TemplateConfig, CanvasItem, ScreenshotItem, TextConfig, BgSettings, BackgroundType } from './types';
import Dashboard from './views/Dashboard';
import Editor from './views/Editor';
import CanvasEditor from './views/CanvasEditor';

const STORAGE_KEY = 'frameflow_templates_v1';
const ACTIVE_TEMPLATES_KEY = 'frameflow_active_template_ids_v1';
const CONFIG_MEMORY_KEY = 'frameflow_last_config';
const BG_SETTINGS_KEY = 'frameflow_bg_settings';

const DEFAULT_BG_SETTINGS: BgSettings = {
  type: 'transparent',
  blur: 20,
  scale: 100,
  xOffset: 0,
  yOffset: 0,
  customSrc: null
};

export default function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateIds, setActiveTemplateIds] = useState<string[]>([]);
  const [screenshotItems, setScreenshotItems] = useState<ScreenshotItem[]>([]);
  const [bgSettings, setBgSettings] = useState<BgSettings>(DEFAULT_BG_SETTINGS);
  const [currentEditTemplate, setCurrentEditTemplate] = useState<Template | null>(null);
  const [lastUsedConfig, setLastUsedConfig] = useState<TemplateConfig | null>(null);
  
  const [editingCanvasItem, setEditingCanvasItem] = useState<CanvasItem | null>(null);

  // 初始化加载
  useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem(STORAGE_KEY);
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        setTemplates(parsed);
      }

      const savedActiveIds = localStorage.getItem(ACTIVE_TEMPLATES_KEY);
      if (savedActiveIds) {
        setActiveTemplateIds(JSON.parse(savedActiveIds));
      }

      const savedConfig = localStorage.getItem(CONFIG_MEMORY_KEY);
      if (savedConfig) {
        setLastUsedConfig(JSON.parse(savedConfig));
      }

      const savedBg = localStorage.getItem(BG_SETTINGS_KEY);
      if (savedBg) {
        setBgSettings(JSON.parse(savedBg));
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  // 持久化 templates
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  // 持久化 activeTemplateIds
  useEffect(() => {
    localStorage.setItem(ACTIVE_TEMPLATES_KEY, JSON.stringify(activeTemplateIds));
  }, [activeTemplateIds]);

  // 持久化 bgSettings
  useEffect(() => {
    localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(bgSettings));
  }, [bgSettings]);

  const handleCreateNew = () => {
    setCurrentEditTemplate(null);
    setView('editor');
  };

  const handleEditTemplate = (template: Template) => {
    setCurrentEditTemplate(template);
    setView('editor');
  };

  const handleSaveTemplate = (template: Template) => {
    setTemplates(prev => {
      const existing = prev.findIndex(t => t.id === template.id);
      if (existing >= 0) {
        const newTemplates = [...prev];
        newTemplates[existing] = template;
        return newTemplates;
      }
      return [...prev, template];
    });
    
    setLastUsedConfig(template.config);
    localStorage.setItem(CONFIG_MEMORY_KEY, JSON.stringify(template.config));
    
    setActiveTemplateIds(prev => {
      if (!prev.includes(template.id)) {
        return [...prev, template.id];
      }
      return prev;
    });
    
    setCurrentEditTemplate(null);
    setView('dashboard');
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("确定要从模板库中彻底删除此模板吗？")) {
      // 从模板列表中移除
      setTemplates(prev => prev.filter(t => t.id !== id));
      // 同步从活跃选择中移除，防止状态不一致
      setActiveTemplateIds(prev => prev.filter(tid => tid !== id));
    }
  };

  const toggleTemplateSelection = (id: string) => {
    setActiveTemplateIds(prev => {
      if (prev.includes(id)) {
        // 允许取消选择最后一个模板，如果取消了，仪表盘会提示“请选择模板”
        return prev.filter(tid => tid !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleEnterCanvasEditor = (item: CanvasItem) => {
    setEditingCanvasItem(item);
    setView('canvas-editor');
  };

  const handleSaveTextConfig = (itemId: string, templateId: string, textConfig: TextConfig) => {
    setScreenshotItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const results = { ...item.results };
        if (results[templateId]) {
          results[templateId] = { ...results[templateId], textConfig };
        }
        return { ...item, results };
      }
      return item;
    }));
    setView('dashboard');
  };

  const handleUpdateBgType = (type: BackgroundType, targetGridKey?: string | null) => {
    if (targetGridKey) {
      const [itemId, templateId] = targetGridKey.split('-');
      setScreenshotItems(prev => prev.map(item => {
        if (item.id === itemId) {
          const results = { ...item.results };
          if (results[templateId]) {
            results[templateId] = { ...results[templateId], bgType: type };
          }
          return { ...item, results };
        }
        return item;
      }));
    } else {
      setBgSettings(prev => ({ ...prev, type }));
      setScreenshotItems(prev => prev.map(item => {
        const results = { ...item.results };
        Object.keys(results).forEach(tid => {
          delete results[tid].bgType;
        });
        return { ...item, results };
      }));
    }
  };

  // 这里的 selectedTemplates 逻辑依赖于 activeTemplateIds 是否存在于 templates 中
  const selectedTemplates = templates.filter(t => activeTemplateIds.includes(t.id));

  return (
    <div className="h-full w-full max-w-md mx-auto bg-slate-50 shadow-2xl overflow-hidden flex flex-col relative border-x border-slate-200">
      <main className="flex-1 overflow-hidden relative">
        {view === 'dashboard' && (
          <Dashboard 
            templates={templates} 
            selectedTemplates={selectedTemplates}
            screenshotItems={screenshotItems}
            setScreenshotItems={setScreenshotItems}
            bgSettings={bgSettings}
            setBgSettings={setBgSettings}
            onUpdateBgType={handleUpdateBgType}
            onToggleTemplate={toggleTemplateSelection}
            onCreateNew={handleCreateNew} 
            onDeleteTemplate={handleDeleteTemplate}
            onEditTemplate={handleEditTemplate}
            onSetView={setView}
            onEnterCanvasEditor={handleEnterCanvasEditor}
          />
        )}
        {view === 'editor' && (
          <Editor 
            initialTemplate={currentEditTemplate} 
            lastUsedConfig={lastUsedConfig}
            onSave={handleSaveTemplate}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'canvas-editor' && editingCanvasItem && (
          <CanvasEditor 
            baseImage={editingCanvasItem.image}
            templateName={editingCanvasItem.templateName}
            itemSrc={editingCanvasItem.itemSrc}
            bgSettings={bgSettings}
            initialTextConfig={editingCanvasItem.initialTextConfig}
            onSave={(config) => handleSaveTextConfig(editingCanvasItem.itemId, editingCanvasItem.templateId, config)}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
