/**
 * Tests de non-régression pour la logique safePath (doit rester alignée avec server.js).
 * Exécution : node scripts/audit-path-safety.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relativePart = decoded === "/" ? "index.html" : decoded;
  const normalizedRequest = relativePart.replace(/^\/+/, "");
  const joined = path.resolve(PUBLIC_DIR, normalizedRequest);
  const rootResolved = path.resolve(PUBLIC_DIR);
  const rel = path.relative(rootResolved, joined);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return joined;
}

const cases = [
  { url: "/", expectSuffix: "index.html", mustNotBeNull: true },
  { url: "/styles.css", expectSuffix: "styles.css", mustNotBeNull: true },
  { url: "/..%2f..%2fetc%2fpasswd", mustBeNull: true },
  { url: "/%2e%2e%2f%2e%2e%2fetc%2fpasswd", mustBeNull: true },
  { url: "/../public_backup/x", mustBeNull: true },
  { url: "/../../etc/passwd", mustBeNull: true },
];

let failed = 0;
for (const c of cases) {
  const got = safePath(c.url);
  let ok = true;
  if (c.mustBeNull && got !== null) {
    console.error(`FAIL ${c.url}: attendu null, obtenu ${got}`);
    ok = false;
  }
  if (c.mustNotBeNull && got === null) {
    console.error(`FAIL ${c.url}: attendu chemin, obtenu null`);
    ok = false;
  }
  if (c.expectSuffix && got && !got.replace(/\\/g, "/").endsWith(c.expectSuffix)) {
    console.error(`FAIL ${c.url}: suffix attendu ${c.expectSuffix}, obtenu ${got}`);
    ok = false;
  }
  if (ok) console.log(`OK  ${c.url} -> ${got}`);
  else failed++;
}

if (failed) process.exit(1);
console.log("\nTous les tests safePath sont passés.");
