import { get, set, del } from 'idb-keyval';

export type ThemeName = 'violet' | 'cyan' | 'rose' | 'green' | 'orange';

export type Settings = {
  theme: ThemeName;
  neon: number;
  blur: number;
  radius: number;
  wallpaper: string;
  iconSize: number;
  compactMode: boolean;
  taskbarPosition: 'bottom' | 'top';
  showDesktopIcons: boolean;
  interfaceScale: number;
};

export const defaultSettings: Settings = {
  theme: 'violet',
  neon: 80,
  blur: 16,
  radius: 18,
  wallpaper: 'aurora',
  iconSize: 72,
  compactMode: false,
  taskbarPosition: 'bottom',
  showDesktopIcons: true,
  interfaceScale: 1,
};

const SETTINGS_KEY = 'nexus-settings-v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return defaultSettings;
    const parsed = JSON.parse(stored) as Partial<Settings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

const AI_DB_KEY = 'nexus-ai-conversations';

export async function listConversations(): Promise<Conversation[]> {
  try {
    const conversations = (await get<Conversation[]>(AI_DB_KEY)) ?? [];
    return conversations;
  } catch {
    return [];
  }
}

export async function saveConversations(conversations: Conversation[]) {
  await set(AI_DB_KEY, conversations);
}

export async function clearConversations() {
  await del(AI_DB_KEY);
}

export function exportJson(data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nexus-history.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJson(): Promise<Conversation[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Conversation[];
        resolve(Array.isArray(parsed) ? parsed : null);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
