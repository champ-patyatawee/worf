import { invoke } from "@tauri-apps/api/core";

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let templates: PromptTemplate[] = [];
let isLoading = false;
let error: string | null = null;

function emit() { listeners.forEach((l) => l()); }
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
function getSnapshot() { return {}; }

export const promptTemplateStore = {
  subscribe, getSnapshot,
  get templates() { return templates; },
  get isLoading() { return isLoading; },
  get error() { return error; },

  async fetchTemplates() {
    isLoading = true; emit();
    try { templates = await invoke<PromptTemplate[]>("list_prompt_templates"); }
    catch (e: any) { error = e.message; }
    isLoading = false; emit();
  },

  async createTemplate(data: { name: string; content: string; description?: string; is_default?: boolean }) {
    const t = await invoke<PromptTemplate>("create_prompt_template", {
      name: data.name, content: data.content, description: data.description || null, is_default: data.is_default || false,
    });
    templates = [t, ...templates];
    emit();
  },

  async updateTemplate(id: string, data: { name?: string; content?: string; description?: string; is_default?: boolean }) {
    const updated = await invoke<PromptTemplate>("update_prompt_template", {
      id, name: data.name || null, content: data.content || null, description: data.description || null, is_default: data.is_default,
    });
    templates = templates.map((t) => (t.id === id ? updated : t));
    emit();
  },

  async deleteTemplate(id: string) {
    await invoke("delete_prompt_template", { id });
    templates = templates.filter((t) => t.id !== id);
    emit();
  },
};
