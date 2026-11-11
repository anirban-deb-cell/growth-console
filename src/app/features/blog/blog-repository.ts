import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BlogPost, BlogSaveInput } from '../../core/data/models';
import { BlogStore, ClientStore } from '../../core/data/stores';

/**
 * Where blog posts come from. The pages only talk to this, so switching
 * between the PHP API and sample data is the `dataSource` setting in
 * src/environments — nothing else changes.
 */
export abstract class BlogRepository {
  abstract readonly mode: 'api' | 'mock';
  abstract list(): Promise<BlogPost[]>;
  abstract get(id: string): Promise<BlogPost | undefined>;
  abstract save(input: BlogSaveInput): Promise<BlogPost>;
  abstract remove(id: string): Promise<void>;
  /** Uploads an image and returns its public URL. */
  abstract upload(file: File): Promise<string>;
}

/** Shape of a post in api/blog/*.php responses. */
interface ApiPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  tags: string[];
  status: BlogPost['status'];
  date: string;
  author: string;
  seoScore: number;
  wordCount: number;
  hasConversion: boolean;
  hasVideo: boolean;
  conversionId: string | null;
  url: string;
  intro?: string[];
  images?: string[];
  youtubeId?: string | null;
  readMins?: number;
  sections?: BlogPost['sections'];
  visitCount?: number;
  leadCount?: number;
  newLeadCount?: number;
}

@Injectable()
export class HttpBlogRepository extends BlogRepository {
  readonly mode = 'api' as const;
  private http = inject(HttpClient);
  private clients = inject(ClientStore);
  private base = `${environment.apiBase}/blog`;

  private toPost(p: ApiPost): BlogPost {
    return {
      id: p.id,
      clientId: this.clients.current().id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      tags: p.tags,
      status: p.status,
      date: p.date,
      author: p.author,
      seoScore: p.seoScore,
      wordCount: p.wordCount,
      // Search clicks and leads per post arrive with the Search Console / GA4 connection.
      clicks30d: 0,
      leads30d: 0,
      hasSchema: true,
      hasConversion: p.hasConversion,
      hasVideo: p.hasVideo,
      conversionId: p.conversionId ?? undefined,
      youtubeId: p.youtubeId ?? undefined,
      intro: p.intro,
      sections: p.sections,
      images: p.images,
      readMins: p.readMins,
      url: p.url,
      visitCount: p.visitCount,
      leadCount: p.leadCount,
      newLeadCount: p.newLeadCount
    };
  }

  async list(): Promise<BlogPost[]> {
    const res = await firstValueFrom(this.http.get<{ posts: ApiPost[] }>(`${this.base}/list.php`));
    return res.posts.map((p) => this.toPost(p));
  }

  async get(id: string): Promise<BlogPost | undefined> {
    const res = await firstValueFrom(this.http.get<{ post: ApiPost }>(`${this.base}/get.php`, { params: { id } }));
    return this.toPost(res.post);
  }

  async save(input: BlogSaveInput): Promise<BlogPost> {
    const res = await firstValueFrom(this.http.post<{ post: ApiPost }>(`${this.base}/save.php`, input));
    return this.toPost(res.post);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/delete.php`, { id }));
  }

  async upload(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const res = await firstValueFrom(this.http.post<{ url: string }>(`${this.base}/upload.php`, body));
    return res.url;
  }
}

/** Sample-data mode: posts live in the browser (localStorage). */
@Injectable()
export class MockBlogRepository extends BlogRepository {
  readonly mode = 'mock' as const;
  private store = inject(BlogStore);
  private clients = inject(ClientStore);

  async list(): Promise<BlogPost[]> {
    return this.store.forClient(this.clients.current().id);
  }

  async get(id: string): Promise<BlogPost | undefined> {
    return this.store.get(id);
  }

  async save(input: BlogSaveInput): Promise<BlogPost> {
    const existing = input.id ? this.store.get(input.id) : undefined;
    const today = new Date().toISOString().slice(0, 10);
    const status = input.status === 'published' && input.publishedAt > today ? 'scheduled' : input.status;
    return this.store.upsert({
      id: input.id,
      clientId: existing?.clientId ?? this.clients.current().id,
      slug: input.slug,
      title: input.title,
      category: input.category,
      excerpt: input.excerpt,
      tags: input.tags,
      status,
      date: input.publishedAt,
      author: input.author || 'Editorial team',
      seoScore: input.seoScore,
      wordCount: input.wordCount,
      clicks30d: existing?.clicks30d ?? 0,
      leads30d: existing?.leads30d ?? 0,
      hasSchema: true,
      hasConversion: !!input.conversionId,
      hasVideo: !!input.youtubeId || input.sections.some((s) => !!s.youtubeId),
      conversionId: input.conversionId,
      youtubeId: input.youtubeId,
      intro: input.intro,
      sections: input.sections,
      images: input.images,
      readMins: input.readMins
    });
  }

  async remove(id: string): Promise<void> {
    this.store.remove(id);
  }

  /** No server in sample mode — the image only exists in this browser tab. */
  async upload(file: File): Promise<string> {
    return URL.createObjectURL(file);
  }
}

export function provideBlogRepository() {
  return { provide: BlogRepository, useClass: environment.dataSource === 'api' ? HttpBlogRepository : MockBlogRepository };
}
