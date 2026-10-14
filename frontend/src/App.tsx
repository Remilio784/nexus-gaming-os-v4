import React, { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import {
  loadSettings,
  saveSettings,
  defaultSettings,
  listConversations,
  saveConversations,
  clearConversations,
  exportJson,
  importJson,
  type Settings,
  type Conversation,
  type Message,
} from './lib/storage';
import './styles.css';

type AppWindow = {
  id: string;
  appId: 'ai' | 'portals' | 'settings';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
};

function createWin(appId: AppWindow['appId'], zBase: number): AppWindow {
  const map: Record<AppWindow['appId'], string> = {
    ai: 'NEXUS AI',
    portals: 'Portails',
    settings: 'Paramètres',
  };
  return {
    id: `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    appId,
    title: map[appId],
    x: 80 + Math.random() * 120,
    y: 80 + Math.random() * 80,
    w: appId === 'ai' ? 760 : 560,
    h: appId === 'ai' ? 520 : 420,
    z: zBase,
    minimized: false,
    maximized: false,
  };
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [windows, setWindows] = useState<AppWindow[]>([]);
  const [startOpen, setStartOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  // AI conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  // drag/resize
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const resizeRef = useRef<{ id: string; startW: number; startH: number; startX: number; startY: number } | null>(null);
  const zCounter = useRef(100);
  const controllerRef = useRef<AbortController | null>(null);

  // apply settings to DOM
  function applySettingsToDOM(s: Settings) {
    try {
      document.body.dataset.theme = s.theme;
      document.documentElement.style.setProperty('--panel-blur', `${s.blur}px`);
      document.documentElement.style.setProperty('--radius', `${s.radius}px`);
      document.documentElement.style.setProperty('--neon-intensity', String(s.neon));
      document.documentElement.style.setProperty('--interface-scale', String(s.interfaceScale));
      document.body.classList.toggle('compact', !!s.compactMode);
    } catch (e) {
      // no-op in non-browser environments
    }
  }

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      applySettingsToDOM(s);
      const conv = await listConversations();
      if (conv.length) {
        setConversations(conv);
        setActiveConversationId(conv[0].id);
      } else {
        const c: Conversation = { id: `conv-${Date.now()}`, title: 'Nouvelle conversation', createdAt: Date.now(), messages: [] };
        setConversations([c]);
        setActiveConversationId(c.id);
      }
    })();
  }, []);

  useEffect(() => {
    saveSettings(settings);
    applySettingsToDOM(settings);
  }, [settings]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // drag
      if (dragRef.current) {
        setWindows((cur) =>
          cur.map((w) => (w.id === dragRef.current!.id ? { ...w, x: Math.max(8, e.clientX - dragRef.current!.offsetX), y: Math.max(8, e.clientY - dragRef.current!.offsetY) } : w)),
        );
      }
      // resize
      if (resizeRef.current) {
        setWindows((cur) =>
          cur.map((w) =>
            w.id === resizeRef.current!.id
              ? { ...w, w: Math.max(280, resizeRef.current!.startW + (e.clientX - resizeRef.current!.startX)), h: Math.max(200, resizeRef.current!.startH + (e.clientY - resizeRef.current!.startY)) }
              : w,
          ),
        );
      }
    };
    const onMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const openWindow = (appId: AppWindow['appId']) => {
    // focus existing
    const found = windows.find((w) => w.appId === appId && !w.minimized);
    if (found) {
      setWindows((cur) => cur.map((w) => (w.id === found.id ? { ...w, z: ++zCounter.current } : w)));
      setStartOpen(false);
      return;
    }
    const newWin = createWin(appId, ++zCounter.current);
    setWindows((w) => [...w, newWin]);
    setStartOpen(false);
  };

  const closeWindow = (id: string) => setWindows((w) => w.filter((x) => x.id !== id));
  const minimizeWindow = (id: string) => setWindows((w) => w.map((x) => (x.id === id ? { ...x, minimized: true } : x)));
  const toggleMaximize = (id: string) => setWindows((w) => w.map((x) => (x.id === id ? { ...x, maximized: !x.maximized } : x)));
  const focusWindow = (id: string) => setWindows((w) => w.map((x) => (x.id === id ? { ...x, z: ++zCounter.current, minimized: false } : x)));

  const onHeaderMouseDown = (e: React.MouseEvent, win: AppWindow) => {
    focusWindow(win.id);
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    dragRef.current = { id: win.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
  };

  const onResizeMouseDown = (e: React.MouseEvent, win: AppWindow) => {
    resizeRef.current = { id: win.id, startW: win.w, startH: win.h, startX: e.clientX, startY: e.clientY };
  };

  // AI helpers
  const activeConversation = useMemo(() => conversations.find((c) => c.id === activeConversationId) ?? conversations[0] ?? null, [conversations, activeConversationId]);

  const appendMessage = (convId: string, msg: Message) => setConversations((cur) => cur.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, msg] } : c)));

  const sendMessage = async () => {
    if (!activeConversation) return;
    const content = draft.trim();
    if (!content) return;
    const userMsg: Message = { id: `${Date.now()}-u`, role: 'user', content, createdAt: Date.now() };
    appendMessage(activeConversation.id, userMsg);
    setDraft('');
    setLoading(true);
    setAiStatus('Envoi...');

    // abort previous
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    try {
      const resp = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: content }), signal: ctrl.signal });
      const data = await resp.json();
      if (!resp.ok) {
        const err = data?.error || data?.message || 'Erreur fournisseur';
        appendMessage(activeConversation.id, { id: `${Date.now()}-err`, role: 'assistant', content: `Erreur: ${err}` , createdAt: Date.now()});
        setAiStatus('Erreur');
        setLoading(false);
        return;
      }
      const assistantText = data.message ?? 'Aucune réponse reçue.';
      appendMessage(activeConversation.id, { id: `${Date.now()}-a`, role: 'assistant', content: assistantText, createdAt: Date.now() });
      setAiStatus('Réponse reçue');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        appendMessage(activeConversation.id, { id: `${Date.now()}-a-abort`, role: 'assistant', content: `Génération interrompue par l'utilisateur.`, createdAt: Date.now() });
        setAiStatus('Interrompu');
      } else {
        appendMessage(activeConversation.id, { id: `${Date.now()}-err`, role: 'assistant', content: `Erreur réseau: ${(e as Error).message}`, createdAt: Date.now() });
        setAiStatus('Erreur réseau');
      }
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    controllerRef.current?.abort();
  };

  const createConversation = () => {
    const c: Conversation = { id: `conv-${Date.now()}`, title: `Conversation ${conversations.length + 1}`, createdAt: Date.now(), messages: [] };
    setConversations((cur) => [c, ...cur]);
    setActiveConversationId(c.id);
  };

  const renameConversation = (id: string) => {
    const t = window.prompt('Nouveau nom', 'Conversation');
    if (!t) return;
    setConversations((cur) =>
      cur.map((c) => (c.id === id ? { ...c, title: t } : c)),
    );
  };

  const deleteConversation = (id: string) => {
    setConversations((cur) => cur.filter((c) => c.id !== id));
    if (activeConversationId === id) setActiveConversationId(null);
  };

  const importHistory = async () => {
    const imp = await importJson();
    if (imp) {
      setConversations(imp);
      setActiveConversationId(imp[0]?.id ?? null);
    } else alert('Fichier invalide');
  };

  const exportHistory = () => exportJson(conversations);

  const resetAll = async () => {
    if (!confirm('Effacer toutes les données locales ?')) return;
    await clearConversations();
    localStorage.clear();
    setConversations([]);
    setActiveConversationId(null);
    setSettings(defaultSettings);
  };

  const renderHtmlSafe = (md: string) => {
    try {
      const raw = marked.parse(md);
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    } catch {
      return DOMPurify.sanitize(md);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // small visual feedback could be added
    } catch {
      alert('Impossible de copier');
    }
  };

  return (
    <div className="app-shell" onContextMenu={(e) => e.preventDefault()}>
      <div className="wallpaper-overlay" />

      {/* Desktop icons */}
      {settings.showDesktopIcons && (
        <div className="desktop-icons">
          <button className="desktop-item" onDoubleClick={() => openWindow('ai')} onClick={() => focusWindow(windows.find((w) => w.appId === 'ai')?.id ?? '')}>
            <span className="icon">🤖</span>
            <span>NEXUS AI</span>
          </button>
          <button className="desktop-item" onDoubleClick={() => openWindow('portals')}>
            <span className="icon">🛰️</span>
            <span>Portails</span>
          </button>
          <button className="desktop-item" onDoubleClick={() => openWindow('settings')}>
            <span className="icon">⚙️</span>
            <span>Paramètres</span>
          </button>
        </div>
      )}

      {/* Windows */}
      {windows
        .filter((w) => !w.minimized)
        .sort((a, b) => a.z - b.z)
        .map((w) => {
          const style: React.CSSProperties = w.maximized
            ? { left: 20, top: 20, width: 'calc(100% - 40px)', height: 'calc(100% - 120px)', zIndex: w.z }
            : { left: w.x, top: w.y, width: w.w, height: w.h, zIndex: w.z };

          return (
            <div className={`window ${w.maximized ? 'maximized' : ''}`} style={style} key={w.id}>
              <div className="window-header" onMouseDown={(e) => onHeaderMouseDown(e, w)}>
                <div className="window-title">{w.title}</div>
                <div className="window-controls">
                  <button onClick={() => minimizeWindow(w.id)}>—</button>
                  <button onClick={() => toggleMaximize(w.id)}>▢</button>
                  <button onClick={() => closeWindow(w.id)}>×</button>
                </div>
              </div>

              <div className="window-body">
                {w.appId === 'ai' && (
                  <div className="ai-app">
                    <div className="ai-sidebar">
                      <div className="ai-actions">
                        <button className="primary" onClick={createConversation}>+ Nouvelle</button>
                        <button onClick={importHistory}>Importer</button>
                        <button onClick={exportHistory}>Exporter</button>
                        <button onClick={resetAll} className="danger">Effacer</button>
                      </div>

                      <div className="conv-list">
                        {conversations.map((conversation) => (
                          <div key={conversation.id} className={`conv-item ${conversation.id === activeConversationId ? 'active' : ''}`} onClick={() => setActiveConversationId(conversation.id)}>
                            <div className="conv-title">{conversation.title}</div>
                            <div className="conv-meta">{new Date(conversation.createdAt).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="ai-panel">
                      <div className="ai-header">
                        <div className="ai-status">{aiStatus ?? 'Prêt'}</div>
                      </div>

We already pushed files to feature branch via push_files call earlier—commentary indicates awaiting user confirmation earlier but final push_files returned commit? The functions.push_files call returned an api-response? It showed awaiting tool not run. But then we saw create_branch succeeded. Then a push_files call with branch 