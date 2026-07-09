const BASE_URL = "https://google.serper.dev";

export interface BaseOptions {
  num?: number;
  page?: number;
  gl?: string;
  hl?: string;
  location?: string;
  tbs?: string;
  autocorrect?: boolean;
  site?: string;
}

async function request(
  path: string,
  body: Record<string, unknown>,
  apiKey: string
): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let detail: string;
    try {
      const j = JSON.parse(text);
      detail = j?.message || j?.error || text;
    } catch {
      detail = text;
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }

  return res.json();
}

function buildBody(query: string, opts: BaseOptions): Record<string, unknown> {
  let q = query;
  if (opts.site) q = `site:${opts.site} ${q}`;

  const body: Record<string, unknown> = { q };
  if (opts.num !== undefined) body.num = opts.num;
  if (opts.page !== undefined) body.page = opts.page;
  if (opts.gl) body.gl = opts.gl;
  if (opts.hl) body.hl = opts.hl;
  if (opts.location) body.location = opts.location;
  if (opts.tbs) body.tbs = opts.tbs;
  if (opts.autocorrect !== undefined) body.autocorrect = opts.autocorrect;
  return body;
}

function envelope(query: string, opts: BaseOptions, results: any[], extra: Record<string, unknown> = {}) {
  const page = opts.page || 1;
  return {
    query,
    page,
    next_page: results.length > 0 ? page + 1 : null,
    results,
    ...extra,
  };
}

export async function webSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/search", buildBody(query, opts), apiKey);

  const results = (data.organic || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    date: r.date,
    sitelinks: r.sitelinks,
    attributes: r.attributes,
  }));

  const extra: Record<string, unknown> = {};
  if (data.answerBox) extra.answerBox = data.answerBox;
  if (data.knowledgeGraph) extra.knowledgeGraph = data.knowledgeGraph;
  if (data.peopleAlsoAsk) extra.peopleAlsoAsk = data.peopleAlsoAsk;
  if (data.relatedSearches) extra.relatedSearches = data.relatedSearches;
  if (data.topStories) extra.topStories = data.topStories;

  return envelope(query, opts, results, extra);
}

export async function newsSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/news", buildBody(query, opts), apiKey);
  const results = (data.news || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    date: r.date,
    source: r.source,
    imageUrl: r.imageUrl,
  }));
  return envelope(query, opts, results);
}

export async function imageSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/images", buildBody(query, opts), apiKey);
  const results = (data.images || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    imageUrl: r.imageUrl,
    imageWidth: r.imageWidth,
    imageHeight: r.imageHeight,
    thumbnailUrl: r.thumbnailUrl,
    source: r.source,
    link: r.link,
  }));
  return envelope(query, opts, results);
}

export async function videoSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/videos", buildBody(query, opts), apiKey);
  const results = (data.videos || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    date: r.date,
    source: r.source,
    channel: r.channel,
    duration: r.duration,
    imageUrl: r.imageUrl,
  }));
  return envelope(query, opts, results);
}

export async function placesSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/places", buildBody(query, opts), apiKey);
  const results = (data.places || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    rating: r.rating,
    ratingCount: r.ratingCount,
    category: r.category,
    phoneNumber: r.phoneNumber,
    website: r.website,
    cid: r.cid,
  }));
  return envelope(query, opts, results);
}

export async function mapsSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/maps", buildBody(query, opts), apiKey);
  const results = (data.places || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    rating: r.rating,
    ratingCount: r.ratingCount,
    priceLevel: r.priceLevel,
    category: r.category,
    phoneNumber: r.phoneNumber,
    website: r.website,
    cid: r.cid,
    hours: r.hours,
    thumbnailUrl: r.thumbnailUrl,
  }));
  return envelope(query, opts, results);
}

export async function shoppingSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/shopping", buildBody(query, opts), apiKey);
  const results = (data.shopping || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    source: r.source,
    link: r.link,
    price: r.price,
    delivery: r.delivery,
    imageUrl: r.imageUrl,
    rating: r.rating,
    ratingCount: r.ratingCount,
    offers: r.offers,
    productId: r.productId,
  }));
  return envelope(query, opts, results);
}

export async function scholarSearch(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/scholar", buildBody(query, opts), apiKey);
  const results = (data.organic || []).map((r: any) => ({
    position: r.position,
    title: r.title,
    link: r.link,
    publicationInfo: r.publicationInfo,
    snippet: r.snippet,
    year: r.year,
    citedBy: r.citedBy,
    pdfUrl: r.pdfUrl,
    id: r.id,
  }));
  return envelope(query, opts, results);
}

export async function autocomplete(query: string, opts: BaseOptions, apiKey: string) {
  const data = await request("/autocomplete", buildBody(query, opts), apiKey);
  const suggestions = (data.suggestions || []).map((s: any) => s.value ?? s);
  return {
    query,
    suggestions,
  };
}
