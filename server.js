const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const BASE_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8", extra = {}) {
  const headers = { "Content-Type": contentType, ...BASE_HEADERS, ...extra };
  if (contentType.includes("text/html")) {
    headers["X-Frame-Options"] = "SAMEORIGIN";
  }
  res.writeHead(status, headers);
  res.end(body);
}

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

const server = http.createServer((req, res) => {
  const filePath = safePath(req.url === "/" ? "/index.html" : req.url);

  if (!filePath) {
    send(res, 403, "Accès refusé");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        send(res, 404, "Page introuvable");
        return;
      }
      send(res, 500, "Erreur serveur");
      return;
    }
    const ext = path.extname(filePath);
    const type = MIME[ext] || "application/octet-stream";
    send(res, 200, data, type);
  });
});

server.listen(PORT, () => {
  console.log(`Serveur : http://localhost:${PORT}`);
});
