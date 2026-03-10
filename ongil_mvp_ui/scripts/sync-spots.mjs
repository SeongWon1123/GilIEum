import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.resolve(projectRoot, "..", "ongil_mvp", "geocoded_spots.json");
const targetPath = path.resolve(projectRoot, "spots_generated.json");
const popularitySource = path.resolve(projectRoot, "..", "ongil_mvp", "popularity_scores.json");
const popularityTarget = path.resolve(projectRoot, "popularity_generated.json");

const EXCLUDED_CATEGORY_KEYWORDS = [
  "교통시설",
  "호텔",
  "모텔",
  "호스텔",
  "펜션",
  "콘도",
  "백화점",
  "쇼핑몰",
];

const aliases = {
  "순천오픈세트장": "순천드라마촬영장",
  "낙안읍성민속마을": "낙안읍성",
};

function normalizeName(name) {
  const base = (name || "").trim();
  const aliasApplied = aliases[base] || base;
  return aliasApplied.toLowerCase().replace(/\s+/g, "");
}

function isExcludedCategory(category) {
  return EXCLUDED_CATEGORY_KEYWORDS.some((word) => (category || "").includes(word));
}

if (!fs.existsSync(sourcePath)) {
  console.error(`[sync-spots] source not found: ${sourcePath}`);
  process.exit(1);
}

const geoRaw = fs.readFileSync(sourcePath, "utf-8");
const geocoded = JSON.parse(geoRaw);

let popularity = [];
if (fs.existsSync(popularitySource)) {
  popularity = JSON.parse(fs.readFileSync(popularitySource, "utf-8"));
}

const popularityMap = new Map(
  popularity.map((row) => [normalizeName(row.name), row])
);

const merged = geocoded
  .map((spot) => {
    const key = normalizeName(spot.name);
    const pop = popularityMap.get(key);

    if (pop && isExcludedCategory(pop.category)) {
      return null;
    }

    return {
      ...spot,
      popularity_score: Number(pop?.weighted_score ?? 0.2),
      popularity_category: pop?.category ?? null,
      rank_overall: pop?.rank_overall ?? null,
      rank_external: pop?.rank_external ?? null,
      rank_local: pop?.rank_local ?? null,
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.popularity_score ?? 0) - (a.popularity_score ?? 0));

fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), "utf-8");

if (fs.existsSync(popularitySource)) {
  const popularityRaw = fs.readFileSync(popularitySource, "utf-8");
  JSON.parse(popularityRaw);
  fs.writeFileSync(popularityTarget, popularityRaw, "utf-8");
}

console.log(`[sync-spots] updated: ${targetPath}`);
console.log(`[sync-spots] tourism spots: ${merged.length}`);
if (fs.existsSync(popularitySource)) {
  console.log(`[sync-spots] updated: ${popularityTarget}`);
}
