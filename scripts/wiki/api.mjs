// MediaWiki API client with an on-disk JSON cache.
//
// Contract (VC-1):
// - only one request at a time, at least 300 ms between requests
// - 429 / 5xx (and network errors) are retried 3 times, waiting 2 s, 5 s, 15 s
// - every JSON response is cached at data/raw/<sha1 of query>.json; an existing
//   cache entry means the network is not touched; `--refresh` ignores the cache

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const USER_AGENT = 'valheim-companion/1.0 (private fan project; github.com/pawlig)';
const MIN_INTERVAL_MS = 300;
const RETRY_WAITS_MS = [2_000, 5_000, 15_000];
const BATCH_SIZE = 50;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEFAULT_BASE_URL = 'https://valheim.weirdgloop.org/api.php';
const DEFAULT_CACHE_DIR = path.join(REPO_ROOT, 'data', 'raw');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Process-wide rate limiter: strict single flight plus a minimum interval
// between request starts. Covers API calls and binary downloads alike, so the
// fallback client (fandom) is throttled together with the primary one.
let queueTail = Promise.resolve();
let lastRequestStart = 0;

function limited(task) {
  const run = async () => {
    const wait = lastRequestStart + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestStart = Date.now();
    return task();
  };
  const result = queueTail.then(run, run);
  queueTail = result.then(
    () => {},
    () => {},
  );
  return result;
}

class HttpError extends Error {
  constructor(status, message, retryable) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

// Follows `query.normalized` (requested -> canonical spelling) and then
// `query.redirects` (canonical -> final target) to map a requested title to the
// title its page is listed under in `query.pages`.
function resolveTitle(title, normalized, redirects) {
  const norm = normalized.find((n) => n.from === title);
  if (norm) title = norm.to;
  const redirect = redirects.find((r) => r.from === title);
  if (redirect) title = redirect.to;
  return title;
}

function toFileTitle(file) {
  return /^(file|image):/i.test(file) ? file : `File:${file}`;
}

export class MwApi {
  constructor({
    baseUrl = DEFAULT_BASE_URL,
    cacheDir = DEFAULT_CACHE_DIR,
    userAgent = USER_AGENT,
    refresh = process.argv.includes('--refresh'),
  } = {}) {
    this.baseUrl = baseUrl;
    this.cacheDir = cacheDir;
    this.userAgent = userAgent;
    this.refresh = refresh;
  }

  async #withRetries(fn) {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt += 1) {
      if (attempt > 0) {
        console.warn(`  api: attempt ${attempt} failed (${lastError.message}), retrying in ${RETRY_WAITS_MS[attempt - 1] / 1000} s`);
        await sleep(RETRY_WAITS_MS[attempt - 1]);
      }
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (!error.retryable) throw error;
      }
    }
    throw lastError;
  }

  async #fetchJson(url) {
    const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
    if (res.status === 429 || res.status >= 500) {
      throw new HttpError(res.status, `HTTP ${res.status} for ${url}`, true);
    }
    if (!res.ok) {
      throw new HttpError(res.status, `HTTP ${res.status} for ${url}`, false);
    }
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new HttpError(res.status, `non-JSON response for ${url}`, true);
    }
  }

  async #fetchBinary(url) {
    const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
    if (res.status === 429 || res.status >= 500) {
      throw new HttpError(res.status, `HTTP ${res.status} for ${url}`, true);
    }
    if (!res.ok) {
      throw new HttpError(res.status, `HTTP ${res.status} for ${url}`, false);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  // Core request method: canonical query string -> cache lookup -> network.
  async request(params) {
    const entries = Object.entries(params).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const query = new URLSearchParams(entries).toString();
    const url = `${this.baseUrl}?${query}`;
    const cachePath = path.join(this.cacheDir, `${createHash('sha1').update(url).digest('hex')}.json`);

    if (!this.refresh && existsSync(cachePath)) {
      return JSON.parse(readFileSync(cachePath, 'utf8'));
    }

    const body = await limited(() => this.#withRetries(() => this.#fetchJson(url)));
    mkdirSync(this.cacheDir, { recursive: true });
    writeFileSync(cachePath, JSON.stringify(body));
    return body;
  }

  // Wikipages by title. Returns map: requested title -> { title, wikitext }.
  // `title` is the final page title after normalization/redirects; `wikitext`
  // is null for missing pages.
  async getWikitext(titles) {
    const out = {};
    for (let i = 0; i < titles.length; i += BATCH_SIZE) {
      const batch = titles.slice(i, i + BATCH_SIZE);
      const body = await this.request({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        rvslots: 'main',
        redirects: 1,
        format: 'json',
        formatversion: 2,
        titles: batch.join('|'),
      });
      const query = body.query ?? {};
      const normalized = query.normalized ?? [];
      const redirects = query.redirects ?? [];
      const pagesByTitle = new Map((query.pages ?? []).map((page) => [page.title, page]));
      for (const requested of batch) {
        const resolved = resolveTitle(requested, normalized, redirects);
        const page = pagesByTitle.get(resolved);
        if (!page) {
          out[requested] = { title: resolved, wikitext: null };
          continue;
        }
        out[requested] = {
          title: page.title,
          wikitext: page.revisions?.[0]?.slots?.main?.content ?? null,
        };
      }
    }
    return out;
  }

  // All member page titles of a category, following cmcontinue.
  async getCategory(name) {
    const titles = [];
    let cmcontinue;
    do {
      const params = {
        action: 'query',
        list: 'categorymembers',
        cmtitle: `Category:${name}`,
        cmlimit: 500,
        cmtype: 'page',
        format: 'json',
        formatversion: 2,
      };
      if (cmcontinue) params.cmcontinue = cmcontinue;
      const body = await this.request(params);
      for (const member of body.query?.categorymembers ?? []) titles.push(member.title);
      cmcontinue = body.continue?.cmcontinue;
    } while (cmcontinue);
    return titles;
  }

  // Thumbnail URLs for files at the requested width. Returns map: requested
  // file name -> thumburl (or full `url` when no thumb is available), null for
  // missing files.
  async getImageUrls(files, width) {
    const out = {};
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const fileTitles = batch.map(toFileTitle);
      const body = await this.request({
        action: 'query',
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: width,
        titles: fileTitles.join('|'),
        format: 'json',
        formatversion: 2,
      });
      const pagesByTitle = new Map((body.query?.pages ?? []).map((page) => [page.title, page]));
      batch.forEach((file, index) => {
        const info = pagesByTitle.get(fileTitles[index])?.imageinfo?.[0];
        out[file] = info?.thumburl ?? info?.url ?? null;
      });
    }
    return out;
  }

  // Binary download. Existing file -> no network call, returns false.
  async download(url, destPath) {
    if (existsSync(destPath)) return false;
    const buffer = await limited(() => this.#withRetries(() => this.#fetchBinary(url)));
    mkdirSync(path.dirname(destPath), { recursive: true });
    writeFileSync(destPath, buffer);
    return true;
  }

  // Rendered HTML of a page by title. Returns string or null (or map if array).
  async getRenderedText(title) {
    if (Array.isArray(title)) {
      const out = {};
      for (const t of title) {
        out[t] = await this.getRenderedText(t);
      }
      return out;
    }
    const body = await this.request({
      action: 'parse',
      prop: 'text',
      page: title,
      redirects: 1,
      format: 'json',
      formatversion: 2,
    });
    return body.parse?.text ?? null;
  }
}

// Default client for the primary wiki (valheim.weirdgloop.org).
export const api = new MwApi();
