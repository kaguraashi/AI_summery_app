"use client";

import { useState, useEffect } from "react";
import { X, Settings } from "lucide-react";
import { 
  SummarySettings, 
  loadSummarySettings, 
  saveSummarySettings
} from "@/lib/summarySettings";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsDialog({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<SummarySettings>(loadSummarySettings());

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSummarySettings());
    }
  }, [isOpen]);

  function handleSave() {
    saveSummarySettings(settings);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in">
      <div className="glass rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20">
                <Settings className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Summary Settings</h2>
                <p className="text-sm text-slate-400 mt-0.5">Configure AI summary generation preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-slate-200" />
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="p-6 space-y-6">
          
          {/* Language Setting */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-indigo-400">🌐</span>
              Output Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value as any })}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none cursor-pointer font-medium"
            >
              <option value="auto">🤖 Auto-detect</option>
              <option value="english">🇬🇧 English</option>
              <option value="zh-tw">🇹🇼 中文(繁體)</option>
              <option value="zh-cn">🇨🇳 中文(简体)</option>
              <option value="japanese">🇯🇵 日本語</option>
              <option value="korean">🇰🇷 한국어</option>
            </select>
          </div>

          {/* Length Setting */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-purple-400">📏</span>
              Summary Length
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['short', 'medium', 'long'] as const).map((len) => (
                <button
                  key={len}
                  onClick={() => setSettings({ ...settings, length: len })}
                  className={`
                    px-4 py-3 rounded-xl font-semibold text-sm capitalize
                    transition-all btn-lift
                    ${settings.length === len
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50 hover:text-slate-300"
                    }
                  `}
                >
                  {len}
                </button>
              ))}
            </div>
          </div>

          {/* Style Setting */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-pink-400">✨</span>
              Summary Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'bullet', label: '• Bullet Points', icon: '📋' },
                { value: 'structured', label: 'Structured', icon: '🏗️' },
                { value: 'academic', label: 'Academic', icon: '🎓' },
                { value: 'executive', label: 'Executive', icon: '💼' },
              ].map((style) => (
                <button
                  key={style.value}
                  onClick={() => setSettings({ ...settings, style: style.value as any })}
                  className={`
                    px-4 py-3 rounded-xl font-semibold text-sm
                    transition-all btn-lift text-left
                    ${settings.style === style.value
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50 hover:text-slate-300"
                    }
                  `}
                >
                  <span className="mr-2">{style.icon}</span>
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
              <span className="text-emerald-400">💡</span>
              Custom Instructions
            </label>
            <textarea
              value={settings.customInstructions}
              onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })}
              placeholder="e.g., Focus on technical details, use formal tone, highlight key metrics..."
              className="w-full px-4 py-3 rounded-xl bg-slate-800/70 border border-slate-700 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none min-h-[120px] resize-y font-medium"
            />
            <p className="text-xs text-slate-500">Add specific requirements to customize the AI summary generation</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-slate-700/50 bg-slate-900/20">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold border border-slate-600 btn-lift"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg hover:shadow-neon btn-lift"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
