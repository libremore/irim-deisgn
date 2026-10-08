import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pages = new Set(["index.html", "brand-story.html", "portfolio.html", "portfolio-residential.html", "portfolio-commercial.html", "contact.html", "location.html"]);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };
const server = createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405).end();
    return;
  }
  try {
    const path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname).replace(/^\/+/, "") || "index.html";
    const filename = resolve(root, path);
    const asset = path.startsWith("assets/") && filename.startsWith(root + sep + "assets" + sep) && Object.hasOwn(types, extname(filename));
    const segments = path.split("/");
    const portfolioFile = segments[0] === "portfolio"
      && ["주거공간", "상업공간"].includes(segments[1])
      && segments.length === 4
      && segments.every((segment) => segment && segment !== "." && segment !== ".." && !segment.includes("\\"))
      && filename.startsWith(root + sep + "portfolio" + sep)
      && (segments[3] === "index.html" || [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(extname(filename).toLowerCase()));
    if (!pages.has(path) && !asset && !portfolioFile) {
      response.writeHead(404).end("Not found");
      return;
    }
    const content = await readFile(filename);
    response.writeHead(200, { "Content-Type": types[extname(filename).toLowerCase()], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
let port = Number(process.env.IRIM_PREVIEW_PORT || 4173);
server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && port < 4183) server.listen(++port, "127.0.0.1");
  else { console.error(error.message); process.exit(1); }
});
server.on("listening", () => console.log(`Static preview: http://127.0.0.1:${port}`));
server.listen(port, "127.0.0.1");
