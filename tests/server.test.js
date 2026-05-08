const { test, before, after, describe } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { server, safePath, PUBLIC_DIR } = require("../server.js");

let baseUrl;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("safePath()", () => {
  test("résout '/' vers index.html dans public/", () => {
    const result = safePath("/");
    assert.ok(result, "doit retourner un chemin");
    assert.equal(result, path.join(PUBLIC_DIR, "index.html"));
  });

  test("résout un fichier statique légitime", () => {
    const result = safePath("/styles.css");
    assert.equal(result, path.join(PUBLIC_DIR, "styles.css"));
  });

  test("ignore les query strings", () => {
    const result = safePath("/styles.css?v=123");
    assert.equal(result, path.join(PUBLIC_DIR, "styles.css"));
  });

  test("rejette une traversée de répertoire (../)", () => {
    assert.equal(safePath("/../../etc/passwd"), null);
  });

  test("rejette une traversée encodée en URL", () => {
    assert.equal(safePath("/..%2f..%2fetc%2fpasswd"), null);
    assert.equal(safePath("/%2e%2e%2f%2e%2e%2fetc%2fpasswd"), null);
  });

  test("rejette un répertoire frère via ..", () => {
    assert.equal(safePath("/../public_backup/x"), null);
  });
});

describe("Serveur HTTP", () => {
  test("GET / renvoie 200 et le contenu HTML", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/html/);
    const body = await res.text();
    assert.ok(body.length > 0, "le corps ne doit pas être vide");
  });

  test("GET / inclut les en-têtes de sécurité", async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      res.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin"
    );
    assert.equal(res.headers.get("x-frame-options"), "SAMEORIGIN");
  });

  test("GET /styles.css renvoie 200 et le bon Content-Type", async () => {
    const res = await fetch(`${baseUrl}/styles.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") || "", /text\/css/);
  });

  test("GET d'un fichier inexistant renvoie 404", async () => {
    const res = await fetch(`${baseUrl}/nexiste-pas.html`);
    assert.equal(res.status, 404);
    const body = await res.text();
    assert.match(body, /introuvable/i);
  });

  test("GET avec traversée de répertoire renvoie 403", async () => {
    const res = await fetch(`${baseUrl}/../../etc/passwd`, { redirect: "manual" });
    assert.ok(
      res.status === 403 || res.status === 404,
      `attendu 403/404, reçu ${res.status}`
    );
  });

  test("GET avec traversée encodée renvoie 403", async () => {
    const res = await fetch(`${baseUrl}/..%2f..%2fetc%2fpasswd`);
    assert.equal(res.status, 403);
  });

  test("Content-Type par défaut est appliqué pour les extensions inconnues", async () => {
    const res = await fetch(`${baseUrl}/inconnu.xyz`);
    assert.equal(res.status, 404);
  });
});
