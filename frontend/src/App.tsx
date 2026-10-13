import React, { useEffect, useState } from 'react';
import { loadSettings, saveSettings, defaultSettings, listConversations, saveConversations, clearConversations, exportJson, importJson, type Settings } from './lib/storage';

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [windowsOpen, setWindowsOpen] = useState<string[]>([]);
  const [startOpen, setStartOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
    })();
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const openApp = (id: string) => {
    setWindowsOpen((w) => (w.includes(id) ? w : [...w, id]));
    setStartOpen(false);
  };

  return (
    <div className="app-shell">
      <div className="wallpaper-overlay" />

      <div className="desktop-icons">
        <button className="desktop-item" onClick={() => openApp('ai')}>
          <span className="icon">🤖</span>
          <span>NEXUS AI</span>
        </button>
        <button className="desktop-item" onClick={() => openApp('portals')}>
          <span className="icon">🛰️</span>
          <span>Portails</span>
        </button>
        <button className="desktop-item" onClick={() => openApp('settings')}>
          <span className="icon">⚙️</span>
          <span>Paramètres</span>
        </button>
      </div>

      <div className="taskbar bottom">
        <button className="start-button" onClick={() => setStartOpen((s) => !s)}>NEXUS</button>
        <div className="taskbar-apps">
          {windowsOpen.map((w) => (
            <button key={w} className="taskbar-app">{w}</button>
          ))}
        </div>
        <div className="system-right">
          <span className="clock">{new Date().toLocaleTimeString('fr-FR')}</span>
        </div>
      </div>

      {startOpen && (
        <div className="start-menu">
          <div className="search-box">
            <input placeholder="Rechercher une application" />
          </div>
          <div className="start-list">
            <button onClick={() => openApp('ai')}>🤖 NEXUS AI</button>
            <button onClick={() => openApp('portals')}>🛰️ Portails</button>
            <button onClick={() => openApp('settings')}>⚙️ Paramètres</button>
          </div>
        </div>
      )}

      {/* Minimal window rendering */}
      {windowsOpen.includes('settings') && (
        <div className="window" style={{ left: 80, top: 80, width: 560, height: 420 }}>
          <div className="window-header">
            <div className="window-title">⚙️ Paramètres</div>
            <div className="window-controls">
              <button onClick={() => setWindowsOpen((w) => w.filter((id) => id !== 'settings'))}>×</button>
            </div>
          </div>
          <div className="window-body">
            <h3>Apparence</h3>
            <label>
              Thème
              <select value={settings.theme} onChange={(e) => setSettings({ ...settings, theme: e.target.value as Settings['theme'] })}>
                <option value="violet">Violet</option>
                <option value="cyan">Cyan</option>
                <option value="rose">Rose</option>
                <option value="green">Vert</option>
                <option value="orange">Orange</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {windowsOpen.includes('ai') && (
        <div className="window" style={{ left: 160, top: 120, width: 720, height: 520 }}>
          <div className="window-header">
            <div className="window-title">🤖 NEXUS AI</div>
            <div className="window-controls">
              <button onClick={() => setWindowsOpen((w) => w.filter((id) => id !== 'ai'))}>×</button>
            </div>
          </div>
          <div className="window-body">
            <p>Interface IA minimal — nécessite backend configuré pour fonctionner.</p>
          </div>
        </div>
      )}

      {windowsOpen.includes('portals') && (
        <div className="window" style={{ left: 220, top: 160, width: 560, height: 420 }}>
          <div className="window-header">
            <div className="window-title">🛰️ Portails</div>
            <div className="window-controls">
              <button onClick={() => setWindowsOpen((w) => w.filter((id) => id !== 'portals'))}>×</button>
            </div>
          </div>
          <div className="window-body">
            <p>Raccourcis de jeux — ouverture dans un nouvel onglet.</p>
            <ul>
              <li><a href="https://bloxd.io" target="_blank" rel="noopener noreferrer">Bloxd.io</a></li>
              <li><a href="https://www.minecraft.net" target="_blank" rel="noopener noreferrer">Minecraft</a></li>
              <li><a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">ChatGPT</a></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
