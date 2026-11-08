import { Injectable, computed, signal } from '@angular/core';
import { BlogPost, Campaign, Client } from './models';
import { CAMPAIGNS, CLIENTS, POSTS } from './mock-data';
import { FEATURES } from '../config/features';

/**
 * In-memory stores over the sample data. Items added in the UI are kept in
 * localStorage so a demo survives a page reload. When the Laravel API
 * exists, these become thin wrappers over HTTP calls with the same methods.
 */

const STORAGE_PREFIX = 'gc:v2:';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage blocked or full — the change still applies for this session.
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

@Injectable({ providedIn: 'root' })
export class ClientStore {
  readonly clients = signal<Client[]>(CLIENTS);
  readonly currentId = signal<string>(FEATURES.clientSwitcher ? load('client', 'sunrise') : FEATURES.defaultClientId);
  readonly current = computed(() => this.clients().find((c) => c.id === this.currentId()) ?? this.clients()[0]);

  select(id: string): void {
    this.currentId.set(id);
    save('client', id);
  }

  hasModule(key: Client['modules'][number]): boolean {
    return this.current().modules.includes(key);
  }
}

@Injectable({ providedIn: 'root' })
export class CampaignStore {
  private readonly all = signal<Campaign[]>(load('campaigns', CAMPAIGNS));

  forClient(clientId: string): Campaign[] {
    return this.all().filter((c) => c.clientId === clientId);
  }

  readonly list = this.all.asReadonly();

  get(id: string): Campaign | undefined {
    return this.all().find((c) => c.id === id);
  }

  add(campaign: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
    const created: Campaign = { ...campaign, id: newId('cmp'), createdAt: new Date().toISOString().slice(0, 10) };
    this.all.update((list) => [created, ...list]);
    save('campaigns', this.all());
    return created;
  }

  update(id: string, patch: Partial<Campaign>): void {
    this.all.update((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    save('campaigns', this.all());
  }

  remove(id: string): void {
    this.all.update((list) => list.filter((c) => c.id !== id));
    save('campaigns', this.all());
  }
}

@Injectable({ providedIn: 'root' })
export class BlogStore {
  private readonly all = signal<BlogPost[]>(load('posts', POSTS));
  readonly list = this.all.asReadonly();

  forClient(clientId: string): BlogPost[] {
    return this.all().filter((p) => p.clientId === clientId);
  }

  get(id: string): BlogPost | undefined {
    return this.all().find((p) => p.id === id);
  }

  /** Creates the post, or replaces it when `id` matches an existing one. */
  upsert(post: Omit<BlogPost, 'id'> & { id?: string }): BlogPost {
    const saved: BlogPost = { ...post, id: post.id ?? newId('post') } as BlogPost;
    this.all.update((list) => (list.some((p) => p.id === saved.id) ? list.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...list]));
    save('posts', this.all());
    return saved;
  }

  remove(id: string): void {
    this.all.update((list) => list.filter((p) => p.id !== id));
    save('posts', this.all());
  }
}

/** Short-lived confirmation messages ("Campaign saved as draft"). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string): void {
    this.message.set(text);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 3500);
  }
}
