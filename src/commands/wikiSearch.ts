import { fetchResource } from "../lib/http.js";
import { output } from "../lib/jsonld.js";
import N3 from "n3";

export interface WikiSearchOptions {
  pageSize?: string;
  startIndex?: string;
}

interface ResultRow {
  url: string;
  score: number;
  line: number;
  context: string;
}

const OSLC_SCORE = "http://open-services.net/ns/core#score";
const VAULT_LINE = "https://pod.vardeman.me/vault/ontology/wiki#matchedLine";
const VAULT_CONTEXT = "https://pod.vardeman.me/vault/ontology/wiki#matchedContext";
const OSLC_TOTAL = "http://open-services.net/ns/core#totalCount";
const OSLC_NEXT_PAGE = "http://open-services.net/ns/core#nextPage";

/**
 * Issue a wiki-search query against a Pod container.
 *
 *   solid-pod wiki-search <container-url> "phrase 1" "phrase 2" --page-size 25
 *
 * Wraps OSLC §7.3 quoting + URL encoding so the agent never writes the
 * raw URL. Parses the Turtle response, emits JSON with results sorted by
 * score descending plus paging metadata.
 */
export async function wikiSearch(
  containerUrl: string,
  terms: string[],
  opts: WikiSearchOptions = {},
): Promise<void> {
  if (terms.length === 0) {
    output({ error: "at least one search term required" });
    process.exitCode = 1;
    return;
  }
  const quoted = terms.map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",");
  const params = new URLSearchParams({
    ext: "search-grep",
    "oslc.searchTerms": quoted,
  });
  if (opts.pageSize) params.set("oslc.pageSize", opts.pageSize);
  if (opts.startIndex) params.set("oslc.startIndex", opts.startIndex);
  const url = `${containerUrl.replace(/\/?$/, "/")}${"?" + params.toString()}`;

  const res = await fetchResource(url, "text/turtle");
  if (res.status === 400 || res.status === 501) {
    output({ error: `pod returned ${res.status}`, body: tryJson(res.body) ?? res.body });
    process.exitCode = 1;
    return;
  }
  if (res.status !== 200) {
    output({ error: `unexpected status ${res.status}`, body: res.body });
    process.exitCode = 1;
    return;
  }

  const parser = new N3.Parser({ baseIRI: url });
  const quads = parser.parse(res.body);
  const byResource = new Map<string, Partial<ResultRow>>();
  let totalCount: number | null = null;
  let nextPage: string | null = null;

  for (const q of quads) {
    if (q.predicate.value === OSLC_TOTAL && q.subject.value === url) {
      totalCount = Number.parseInt(q.object.value, 10);
    } else if (q.predicate.value === OSLC_NEXT_PAGE && q.subject.value === url) {
      nextPage = q.object.value;
    } else if (q.predicate.value === OSLC_SCORE) {
      const row = byResource.get(q.subject.value) ?? { url: q.subject.value };
      row.score = Number.parseInt(q.object.value, 10);
      byResource.set(q.subject.value, row);
    } else if (q.predicate.value === VAULT_LINE) {
      const row = byResource.get(q.subject.value) ?? { url: q.subject.value };
      row.line = Number.parseInt(q.object.value, 10);
      byResource.set(q.subject.value, row);
    } else if (q.predicate.value === VAULT_CONTEXT) {
      const row = byResource.get(q.subject.value) ?? { url: q.subject.value };
      row.context = q.object.value;
      byResource.set(q.subject.value, row);
    }
  }

  const results: ResultRow[] = Array.from(byResource.values())
    .filter((r): r is ResultRow => r.score !== undefined && r.url !== undefined)
    .sort((a, b) => b.score - a.score);

  output({
    totalCount,
    nextPage,
    pageSize: results.length,
    results,
  });
}

function tryJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
