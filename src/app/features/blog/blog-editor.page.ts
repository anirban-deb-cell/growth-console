import { Component, inject, input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { apiMessage } from '../../core/auth/auth.service';
import { BlogPost, BlogSaveInput } from '../../core/data/models';
import { ClientStore, ToastService } from '../../core/data/stores';
import { BlogRepository } from './blog-repository';
import { ScoreRingComponent } from '../../shared/charts/score-ring.component';
import { checkCompliance } from '../../shared/compliance';
const CONVERSION_ID_PATTERN = /^AW-\d+\/[A-Za-z0-9_-]+$/;

interface AdminImage {
  file?: File;
  previewUrl?: string;
  /** Public URL of the image (filled in by the upload), or a path typed by hand. */
  path: string;
  uploading?: boolean;
  error?: string;
}

export interface SeoCheck {
  label: string;
  detail: string;
  ok: boolean;
  /** Share of the 100-point score this check is worth. */
  weight: number;
}

type StepKey = 'check' | 'draft' | 'schema' | 'meta' | 'publish';
type StepState = 'pending' | 'running' | 'done' | 'warn';

interface PipelineStep {
  key: StepKey;
  title: string;
  running: string;
  summary: string;
  state: StepState;
}

interface AdminSubtopic {
  heading: string;
  body: string;
  videoUrl: string;
  image: AdminImage;
}

/**
 * Add / edit a blog post for the current client — the same editor as the
 * MedGrowth preprod admin, now saving into the console's blog store.
 *
 * The publish pipeline's checks, JSON-LD, metadata and sitemap entry are
 * computed for real from the form; the save / publish steps are simulated
 * until the Laravel blog API exists (each step maps 1:1 to a server stage).
 */
@Component({
  selector: 'app-blog-editor-page',
  imports: [FormsModule, RouterLink, ScoreRingComponent],
  templateUrl: './blog-editor.page.html',
  styleUrl: './blog-editor.page.scss'
})
export class BlogEditorPage implements OnInit, OnDestroy {
  private repo = inject(BlogRepository);
  readonly isMock = this.repo.mode === 'mock';
  clients = inject(ClientStore);
  private toast = inject(ToastService);
  private router = inject(Router);

  /** Route param from /blog/:id/edit (component input binding). */
  id = input<string>();
  private editing?: BlogPost;
  author = '';

  loading = false;
  loadError = '';
  saving = false;
  saveError = '';

  title = '';
  slug = '';
  private slugManuallyEdited = false;

  category = '';
  excerpt = '';
  intro = '';

  postVideoUrl = '';
  postImages: AdminImage[] = [];

  subtopics: AdminSubtopic[] = [this.newSubtopic()];

  tags: string[] = [];
  tagInput = '';

  conversionId = '';
  publishedAt = '';
  readMins = 5;

  generatedJson = '';
  copied = false;

  pipelineOpen = false;
  pipelineDone = false;
  publishFailed = false;
  publishedStatus: BlogPost['status'] = 'published';
  steps: PipelineStep[] = [];
  expandedStep: StepKey | null = null;
  jsonLdPreview = '';
  private timers: ReturnType<typeof setTimeout>[] = [];

  get isEditing(): boolean {
    return !!this.editing;
  }

  get siteUrl(): string {
    return 'https://' + this.clients.current().website;
  }

  get siteHost(): string {
    return this.clients.current().website;
  }

  private get defaultImage(): string {
    return `${this.siteUrl}/assets/images/logo.png`;
  }

  ngOnInit(): void {
    this.publishedAt = new Date().toISOString().slice(0, 10);
    if (this.id()) this.loadPost(this.id()!);
  }

  /** Opens an existing post, filling every field the editor has. */
  private async loadPost(id: string): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const post = await this.repo.get(id);
      if (!post) throw new Error('This post no longer exists.');
      this.editing = post;
      this.title = post.title;
      this.slug = post.slug;
      this.slugManuallyEdited = true;
      this.category = post.category;
      this.excerpt = post.excerpt;
      this.intro = (post.intro ?? []).join('\n\n');
      this.tags = [...post.tags];
      this.conversionId = post.conversionId ?? '';
      this.publishedAt = post.date;
      this.author = post.author ?? '';
      this.readMins = post.readMins ?? Math.max(1, Math.round(post.wordCount / 200));
      this.postVideoUrl = post.youtubeId ? `https://youtu.be/${post.youtubeId}` : '';
      this.postImages = (post.images ?? []).map((url) => ({ path: url, previewUrl: url }));
      const sections = post.sections ?? [];
      this.subtopics = sections.length
        ? sections.map((sec) => ({
            heading: sec.heading,
            body: sec.paragraphs.join('\n\n'),
            videoUrl: sec.youtubeId ? `https://youtu.be/${sec.youtubeId}` : '',
            image: { path: sec.image ?? '', previewUrl: sec.image ?? undefined }
          }))
        : [this.newSubtopic()];
    } catch (err) {
      this.loadError = apiMessage(err, 'Couldn’t open this post.');
    } finally {
      this.loading = false;
    }
  }

  /** Everything the API's save.php expects, built from the form. */
  private buildSaveInput(status: BlogPost['status']): BlogSaveInput {
    // Sample posts carry no body text; keep their stored figures until a body is written here.
    const keepStored = !!this.editing && this.wordCount === 0;
    return {
      id: this.editing?.id,
      slug: this.effectiveSlug(),
      title: this.title.trim(),
      category: this.category.trim(),
      excerpt: this.excerpt.trim(),
      intro: this.splitParagraphs(this.intro),
      sections: this.subtopics
        .filter((st) => st.heading.trim())
        .map((st) => ({
          id: this.slugify(st.heading),
          heading: st.heading.trim(),
          paragraphs: this.splitParagraphs(st.body),
          image: this.savableImage(st.image.path),
          youtubeId: this.extractYoutubeId(st.videoUrl) || null
        })),
      tags: this.tags,
      images: this.postImages.map((img) => this.savableImage(img.path)).filter((u): u is string => !!u),
      youtubeId: this.extractYoutubeId(this.postVideoUrl) || undefined,
      conversionId: this.conversionId.trim() || undefined,
      author: this.author.trim() || undefined,
      status,
      publishedAt: this.publishedAt,
      readMins: this.readMins,
      wordCount: keepStored ? this.editing!.wordCount : this.wordCount,
      seoScore: keepStored ? this.editing!.seoScore : this.seoScore
    };
  }

  /** Browser-only preview links (blob:) can't be saved — only real URLs and paths. */
  private savableImage(path: string): string | null {
    const value = (path ?? '').trim();
    return value && !value.startsWith('blob:') ? value : null;
  }

  /** Saves the form with the given status; throws the API's message on failure. */
  private async persist(status: BlogPost['status']): Promise<BlogPost> {
    if (this.uploadsPending) throw new Error('Wait for the images to finish uploading.');
    const saved = await this.repo.save(this.buildSaveInput(status));
    this.editing = saved;
    this.slug = saved.slug;
    return saved;
  }

  get uploadsPending(): boolean {
    return this.postImages.some((i) => i.uploading) || this.subtopics.some((st) => st.image.uploading);
  }

  private async saveAndLeave(status: BlogPost['status'], message: string): Promise<void> {
    if (!this.isValid || this.saving) return;
    this.saving = true;
    this.saveError = '';
    try {
      await this.persist(status);
      this.toast.show(message);
      this.router.navigateByUrl('/blog');
    } catch (err) {
      this.saveError = apiMessage(err, 'Couldn’t save the post.');
    } finally {
      this.saving = false;
    }
  }

  saveDraft(): void {
    this.saveAndLeave('draft', `“${this.title.trim()}” saved as draft`);
  }

  sendForReview(): void {
    this.saveAndLeave('in_review', `“${this.title.trim()}” sent for compliance review`);
  }

  viewAllPosts(): void {
    this.closePipeline();
    this.router.navigateByUrl('/blog');
  }

  /** Healthcare-claims check across the whole post (shared with campaigns). */
  get complianceFindings() {
    return checkCompliance([this.title, this.excerpt, this.intro, ...this.subtopics.map((s) => s.heading + ' ' + s.body)].join(' '));
  }

  onTitleChange(): void {
    if (!this.slugManuallyEdited) {
      this.slug = this.slugify(this.title);
    }
  }

  onSlugEdited(): void {
    this.slugManuallyEdited = true;
  }

  onSlugBlur(): void {
    this.slug = this.slugify(this.slug);
  }

  effectiveSlug(): string {
    return this.slug || 'untitled-post';
  }

  addTag(): void {
    const value = this.tagInput.trim();
    if (value && !this.tags.includes(value)) this.tags.push(value);
    this.tagInput = '';
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  addPostImage(): void {
    this.postImages.push(this.newImage());
  }

  removePostImage(index: number): void {
    this.revokeImage(this.postImages[index]);
    this.postImages.splice(index, 1);
  }

  addSubtopic(): void {
    this.subtopics.push(this.newSubtopic());
  }

  removeSubtopic(index: number): void {
    this.revokeImage(this.subtopics[index].image);
    this.subtopics.splice(index, 1);
  }

  onImageSelected(event: Event, image: AdminImage): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.revokeImage(image);
    image.file = file;
    image.previewUrl = URL.createObjectURL(file);
    image.error = undefined;
    image.uploading = true;
    // Clear the file input so picking the same file again still triggers a change.
    input.value = '';
    this.repo
      .upload(file)
      .then((url) => (image.path = url))
      .catch((err) => {
        image.error = apiMessage(err, 'Upload failed.');
        image.path = '';
      })
      .finally(() => (image.uploading = false));
  }

  clearImage(image: AdminImage): void {
    this.revokeImage(image);
    image.file = undefined;
    image.previewUrl = undefined;
    image.path = '';
  }

  extractYoutubeId(input: string): string {
    const trimmed = (input ?? '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    return /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : '';
  }

  get suggestedReadMins(): number {
    return Math.max(1, Math.round(this.wordCount / 200));
  }

  useSuggestedReadMins(): void {
    this.readMins = this.suggestedReadMins;
  }

  get wordCount(): number {
    return [this.intro, ...this.subtopics.map((s) => s.body)].join(' ').trim().split(/\s+/).filter(Boolean).length;
  }

  get seoTitle(): string {
    return `${this.title.trim() || 'Untitled post'} | ${this.clients.current().name} Blog`;
  }

  get postUrl(): string {
    return `${this.siteUrl}/blog/${this.effectiveSlug()}`;
  }

  /**
   * The site's Search Console property. Google has no link that opens URL
   * Inspection for a given page (its inspect link's `id` is an ID Google makes
   * itself), so "Request indexing" opens the property and copies the post's
   * URL, ready to paste into the inspect bar at the top.
   */
  get searchConsoleUrl(): string {
    const client = this.clients.current();
    const property = client.searchConsoleProperty || `sc-domain:${client.website}`;
    return `https://search.google.com/search-console?resource_id=${encodeURIComponent(property)}`;
  }

  indexingLinkCopied = false;

  /** Runs as the Search Console tab opens: puts the post's URL on the clipboard. */
  copyPostUrlForIndexing(): void {
    navigator.clipboard?.writeText(this.postUrl).then(
      () => (this.indexingLinkCopied = true),
      () => (this.indexingLinkCopied = false)
    );
  }

  /** Google's Rich Results Test, already pointed at this post. */
  get richResultsUrl(): string {
    return `https://search.google.com/test/rich-results?url=${encodeURIComponent(this.postUrl)}`;
  }

  get coverPath(): string {
    return this.postImages.map((i) => i.path.trim()).find(Boolean) ?? '';
  }

  /** Absolute image URL for previews and schema: uploads are already absolute; typed paths are on the website. */
  private absoluteImage(path: string): string {
    return /^https?:\/\//.test(path) ? path : `${this.siteUrl}${path}`;
  }

  /** The same checks the server will run in step 1 — computed live as the form is filled. */
  get seoChecks(): SeoCheck[] {
    const titleLen = this.title.trim().length;
    const descLen = this.excerpt.trim().length;
    const sections = this.subtopics.filter((s) => s.heading.trim()).length;
    return [
      { label: 'Title length', detail: titleLen ? `${titleLen} chars · aim for 30–60` : 'Add a title', ok: titleLen >= 30 && titleLen <= 60, weight: 18 },
      { label: 'Meta description', detail: descLen ? `${descLen} chars · aim for 120–160` : 'Add a description', ok: descLen >= 120 && descLen <= 160, weight: 18 },
      { label: 'Clean URL slug', detail: this.slug ? `/blog/${this.effectiveSlug()}` : 'Generated from the title', ok: !!this.slug && this.slug.length <= 60, weight: 10 },
      { label: 'Cover image', detail: this.coverPath ? 'Used for Google & social previews' : 'Falls back to the site logo', ok: !!this.coverPath, weight: 14 },
      { label: 'Structured sub topics', detail: `${sections} heading${sections === 1 ? '' : 's'} · aim for 2+`, ok: sections >= 2, weight: 14 },
      { label: 'Content depth', detail: `${this.wordCount} words · aim for 600+`, ok: this.wordCount >= 600, weight: 16 },
      { label: 'Tags', detail: `${this.tags.length} tag${this.tags.length === 1 ? '' : 's'} · aim for 3+`, ok: this.tags.length >= 3, weight: 10 }
    ];
  }

  get seoScore(): number {
    return this.seoChecks.reduce((a, c) => a + (c.ok ? c.weight : 0), 0);
  }

  get passedChecks(): number {
    return this.seoChecks.filter((c) => c.ok).length;
  }

  /** Optional field — only flagged when something is typed that isn't AW-…/label. */
  get conversionValid(): boolean {
    return CONVERSION_ID_PATTERN.test(this.conversionId.trim());
  }

  get sitemapEntry(): string {
    return `<url>\n  <loc>${this.postUrl}</loc>\n  <lastmod>${this.publishedAt}</lastmod>\n  <changefreq>monthly</changefreq>\n  <priority>0.7</priority>\n</url>`;
  }

  get llmsEntry(): string {
    return `- [${this.title.trim()}](${this.postUrl}): ${this.excerpt.trim()}`;
  }

  get metaTags(): string {
    const image = this.coverPath ? this.absoluteImage(this.coverPath) : this.defaultImage;
    return [
      `<title>${this.seoTitle}</title>`,
      `<meta name="description" content="${this.excerpt.trim()}">`,
      `<link rel="canonical" href="${this.postUrl}">`,
      `<meta property="og:type" content="article">`,
      `<meta property="og:title" content="${this.seoTitle}">`,
      `<meta property="og:image" content="${image}">`,
      `<meta name="twitter:card" content="summary_large_image">`
    ].join('\n');
  }

  stepByKey(key: StepKey): PipelineStep | undefined {
    return this.steps.find((s) => s.key === key);
  }

  startPublish(): void {
    if (!this.isValid) return;
    this.clearTimers();
    this.jsonLdPreview = JSON.stringify(this.buildJsonLd(), null, 2);
    this.pipelineOpen = true;
    this.pipelineDone = false;
    this.publishFailed = false;
    this.expandedStep = null;
    this.steps = [
      { key: 'check', title: 'Content check', running: 'Running SEO checks…', summary: '', state: 'pending' },
      { key: 'draft', title: 'Save draft', running: 'Saving to the database…', summary: '', state: 'pending' },
      { key: 'schema', title: 'Build JSON-LD schema', running: 'Generating structured data…', summary: '', state: 'pending' },
      { key: 'meta', title: 'Update metadata', running: 'Writing title, description & social tags…', summary: '', state: 'pending' },
      { key: 'publish', title: 'Publish & notify Google', running: 'Updating sitemap.xml and llms.txt…', summary: '', state: 'pending' }
    ];
    this.runStep(0);
  }

  private runStep(index: number): void {
    const step = this.steps[index];
    if (!step) {
      this.pipelineDone = true;
      return;
    }
    step.state = 'running';
    if (step.key === 'publish') {
      // The one step that really talks to the server: save as published
      // (the API turns a future date into "scheduled").
      this.persist('published')
        .then((saved) => {
          step.summary = saved.status === 'scheduled' ? `Scheduled for ${saved.date} · goes live automatically` : 'Live · sitemap.xml and llms.txt updated';
          step.state = 'done';
          this.publishedStatus = saved.status;
          this.runStep(index + 1);
        })
        .catch((err) => {
          step.summary = apiMessage(err, 'Couldn’t publish the post.');
          step.state = 'warn';
          this.publishFailed = true;
        });
      return;
    }
    const delay = 900 + (index % 3) * 250;
    this.timers.push(
      setTimeout(() => {
        const { summary, warn } = this.stepResult(step.key);
        step.summary = summary;
        step.state = warn ? 'warn' : 'done';
        this.runStep(index + 1);
      }, delay)
    );
  }

  private stepResult(key: StepKey): { summary: string; warn: boolean } {
    const schemaTypes = ['BlogPosting', 'BreadcrumbList'];
    if (this.extractYoutubeId(this.postVideoUrl)) schemaTypes.push('VideoObject');
    switch (key) {
      case 'check':
        return { summary: `${this.passedChecks}/${this.seoChecks.length} checks passed · score ${this.seoScore}`, warn: this.seoScore < 70 };
      case 'draft':
        return { summary: `Saved as draft · /blog/${this.effectiveSlug()}`, warn: false };
      case 'schema':
        return { summary: schemaTypes.join(' · '), warn: false };
      case 'meta':
        return { summary: 'Title, description, canonical, Open Graph & Twitter card', warn: false };
      case 'publish':
        return { summary: 'Live · added to sitemap.xml and llms.txt', warn: false };
    }
  }

  toggleStep(key: StepKey): void {
    const step = this.stepByKey(key);
    if (!step || step.state === 'pending' || step.state === 'running') return;
    this.expandedStep = this.expandedStep === key ? null : key;
  }

  closePipeline(): void {
    this.clearTimers();
    this.pipelineOpen = false;
  }

  exportFromPipeline(): void {
    this.closePipeline();
    this.generate();
    setTimeout(() => document.getElementById('generated-output')?.scrollIntoView({ behavior: 'smooth' }));
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  /** Mirrors BlogPostComponent.applySeo() so the preview matches what the live page emits. */
  private buildJsonLd(): Record<string, unknown>[] {
    const url = this.postUrl;
    const image = this.coverPath ? this.absoluteImage(this.coverPath) : this.defaultImage;
    const ytId = this.extractYoutubeId(this.postVideoUrl);
    const article: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      headline: this.title.trim(),
      description: this.excerpt.trim(),
      image: [image],
      url,
      inLanguage: 'en-IN',
      articleSection: this.category.trim(),
      keywords: this.tags.join(', '),
      wordCount: this.wordCount,
      datePublished: this.publishedAt,
      dateModified: this.publishedAt,
      author: { '@id': `${this.siteUrl}/#organization` },
      publisher: { '@id': `${this.siteUrl}/#organization` }
    };
    if (ytId) {
      article['video'] = {
        '@type': 'VideoObject',
        name: this.title.trim(),
        description: this.excerpt.trim(),
        embedUrl: `https://www.youtube.com/embed/${ytId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        uploadDate: this.publishedAt
      };
    }
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${this.siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${this.siteUrl}/blog` },
        { '@type': 'ListItem', position: 3, name: this.title.trim(), item: url }
      ]
    };
    return [article, breadcrumb];
  }

  get isValid(): boolean {
    return !!(this.title.trim() && this.slug.trim() && this.category.trim() && this.excerpt.trim());
  }

  generate(): void {
    if (!this.isValid) return;
    this.generatedJson = JSON.stringify(this.buildPost(), null, 2);
    this.copied = false;
  }

  async copyJson(): Promise<void> {
    if (!this.generatedJson) return;
    try {
      await navigator.clipboard.writeText(this.generatedJson);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      // Clipboard API unavailable — the textarea's contents can still be selected and copied manually.
    }
  }

  downloadJson(): void {
    if (!this.generatedJson) return;
    const blob = new Blob([this.generatedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.effectiveSlug()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private buildPost(): Record<string, unknown> {
    const images = this.postImages.map((img) => img.path.trim()).filter(Boolean);
    const postYoutubeId = this.extractYoutubeId(this.postVideoUrl);

    const sections = this.subtopics
      .filter((s) => s.heading.trim())
      .map((s) => {
        const section: Record<string, unknown> = {
          id: this.slugify(s.heading),
          heading: s.heading.trim(),
          paragraphs: this.splitParagraphs(s.body)
        };
        if (s.image.path.trim()) section['photoCount'] = 1;
        const ytId = this.extractYoutubeId(s.videoUrl);
        if (ytId) section['youtubeId'] = ytId;
        return section;
      });

    const post: Record<string, unknown> = {
      slug: this.effectiveSlug(),
      title: this.title.trim(),
      category: this.category.trim(),
      excerpt: this.excerpt.trim(),
      intro: this.splitParagraphs(this.intro),
      sections,
      tags: this.tags,
      photoCount: images.length
    };
    if (images[0]) post['coverImage'] = images[0];
    if (postYoutubeId) post['youtubeId'] = postYoutubeId;
    if (this.conversionId.trim()) post['conversionId'] = this.conversionId.trim();
    post['publishedAt'] = this.publishedAt;
    post['readMins'] = this.readMins;
    return post;
  }

  private splitParagraphs(text: string): string[] {
    return (text ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  private slugify(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private newImage(): AdminImage {
    return { path: '' };
  }

  private newSubtopic(): AdminSubtopic {
    return { heading: '', body: '', videoUrl: '', image: this.newImage() };
  }

  private revokeImage(image: AdminImage): void {
    if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
  }

  ngOnDestroy(): void {
    this.clearTimers();
    for (const img of this.postImages) this.revokeImage(img);
    for (const s of this.subtopics) this.revokeImage(s.image);
  }
}
