/**
 * Entity extraction for music-rights / agreement voice turns.
 * Distinguishes ownership %, royalty points, and currency — never collapses ambiguous numbers.
 */
import type { ExtractedEntity } from "@shared/voice-orchestration";
import { MVP_TEMPLATE_SPECS } from "@shared/agreement-mvp";

const ROLE_WORDS = [
  "producer",
  "songwriter",
  "co-writer",
  "artist",
  "featured",
  "vocalist",
  "publisher",
  "label",
  "licensee",
  "licensor",
  "manager",
];

const RIGHT_TYPES = [
  "master",
  "composition",
  "publishing",
  "mechanical",
  "performance",
  "synchronization",
  "sync",
  "neighboring",
  "ownership",
];

export function extractEntities(transcript: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const q = transcript;

  // Agreement type hints from MVP catalog names/slugs
  for (const spec of MVP_TEMPLATE_SPECS) {
    const name = spec.name.toLowerCase();
    if (q.toLowerCase().includes(name) || q.toLowerCase().includes(spec.type.replace(/-/g, " "))) {
      entities.push({
        type: "agreement_type",
        value: spec.type,
        raw: spec.name,
        confidence: 0.9,
      });
    }
  }
  if (/\bsplit sheet\b/i.test(q) && !entities.some((e) => e.value === "split-sheet")) {
    entities.push({ type: "agreement_type", value: "split-sheet", raw: "split sheet", confidence: 0.92 });
  }
  if (/\bproducer agreement\b/i.test(q) && !entities.some((e) => e.value === "producer")) {
    entities.push({ type: "agreement_type", value: "producer", raw: "producer agreement", confidence: 0.92 });
  }

  // Explicit ownership percentages: "50/50", "50%", "fifty percent ownership"
  const slash = q.match(/\b(\d{1,3})\s*\/\s*(\d{1,3})\b/);
  if (slash) {
    entities.push({
      type: "ownership",
      value: `${slash[1]}/${slash[2]}`,
      raw: slash[0],
      confidence: 0.88,
      notes: "composition_split_pair",
    });
  }

  const ownershipPct = [...q.matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*%\s*(?:of\s+)?(composition|song|publishing|ownership)?/gi)];
  for (const m of ownershipPct) {
    const right = (m[2] || "ownership").toLowerCase();
    entities.push({
      type: right.includes("composition") || right.includes("song") || right.includes("publishing") || right === "ownership"
        ? "ownership"
        : "percentage",
      value: Number(m[1]),
      raw: m[0],
      confidence: m[2] ? 0.9 : 0.7,
      notes: m[2] ? `right:${m[2]}` : "bare_percent",
    });
  }

  // Producer / royalty points: "three points", "3 points on the master"
  const points = [...q.matchAll(/\b(\d{1,3}(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|fifteen)\s+points?\b(?:\s+on\s+the\s+(master|composition))?/gi)];
  const wordNum: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15,
  };
  for (const m of points) {
    const n = wordNum[m[1].toLowerCase()] ?? Number(m[1]);
    entities.push({
      type: "points",
      value: n,
      raw: m[0],
      confidence: m[2] ? 0.93 : 0.85,
      notes: m[2] ? `on:${m[2].toLowerCase()}` : "points_unscoped",
    });
  }

  // Currency
  const money = [...q.matchAll(/\$\s?(\d+(?:\.\d+)?)|\b(\d+(?:\.\d+)?)\s*(cad|usd|dollars?)\b/gi)];
  for (const m of money) {
    entities.push({
      type: "currency",
      value: Number(m[1] || m[2]),
      raw: m[0],
      confidence: 0.9,
    });
  }

  // Ambiguous bare numbers near economic verbs without unit (digits or word nums)
  const wordNumAmbiguous: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, twentyfive: 25, thirty: 30, forty: 40, fifty: 50,
  };
  const ambiguous = [
    ...q.matchAll(
      /\b(gets?|give|giving|at|for)\s+(\d{1,3}(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)\b(?!\s*(%|percent|points?|dollars?|cad|usd))/gi,
    ),
  ];
  for (const m of ambiguous) {
    const rawNum = m[2];
    const numeric = wordNumAmbiguous[rawNum.toLowerCase().replace(/[\s-]/g, "")] ?? Number(rawNum);
    if (Number.isNaN(numeric)) continue;
    // Skip if already captured as points/ownership nearby
    const already = entities.some(
      (e) =>
        (e.type === "points" || e.type === "ownership" || e.type === "currency" || e.type === "percentage") &&
        (String(e.raw).toLowerCase().includes(rawNum.toLowerCase()) || e.value === numeric),
    );
    if (already) continue;
    entities.push({
      type: "ambiguous_number",
      value: numeric,
      raw: m[0],
      confidence: 0.4,
      notes: "Could mean ownership %, royalty points, revenue share, or currency — clarification required",
    });
  }

  for (const role of ROLE_WORDS) {
    if (new RegExp(`\\b${role}\\b`, "i").test(q)) {
      entities.push({ type: "role", value: role, raw: role, confidence: 0.8 });
    }
  }

  for (const rt of RIGHT_TYPES) {
    if (new RegExp(`\\b${rt}\\b`, "i").test(q)) {
      entities.push({
        type: "right_type",
        value: rt === "sync" ? "synchronization" : rt,
        raw: rt,
        confidence: 0.85,
      });
    }
  }

  if (/\b(exclusive|non-exclusive|nonexclusive)\b/i.test(q)) {
    const exclusivity = /\bnon[- ]?exclusive\b/i.test(q) ? "Non-Exclusive" : "Exclusive";
    entities.push({ type: "exclusivity", value: exclusivity, raw: exclusivity, confidence: 0.85 });
  }

  // Track / song title heuristics: "for the track X" / "song called X"
  const titled = q.match(/\b(?:track|song|project)\s+(?:called|named)?\s*[\"']?([A-Za-z0-9][\w\s-]{1,40})[\"']?/i);
  if (titled?.[1] && !/^(the|a|an|new|this)$/i.test(titled[1].trim())) {
    entities.push({
      type: "song",
      value: titled[1].trim(),
      raw: titled[0],
      confidence: 0.65,
    });
  }

  return dedupeEntities(entities);
}

function dedupeEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const seen = new Set<string>();
  const out: ExtractedEntity[] = [];
  for (const e of entities) {
    const key = `${e.type}:${e.value}:${e.raw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}
