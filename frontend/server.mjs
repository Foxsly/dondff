import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const port = process.env.PORT || 3000;
const baseDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "build"
);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const requestUrl = url.parse(req.url || "/");
  let pathname = requestUrl.pathname || "/";

  // 👉 SPECIAL CASE: runtime config
  if (pathname === "/runtime-env.js") {
    const apiBaseUrl =
      process.env.API_BASE_URL || "http://localhost:3001";

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.end(
      `window.RUNTIME_CONFIG = { API_BASE_URL: "${apiBaseUrl}" };`
    );
    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.join(baseDir, pathname);
  const ext = path.extname(filePath);

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback to index.html
      const indexPath = path.join(baseDir, "index.html");
      fs.createReadStream(indexPath)
        .on("error", () => {
          res.statusCode = 500;
          res.end("Internal Server Error");
        })
        .pipe(res);
      return;
    }

    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");

    fs.createReadStream(filePath)
      .on("error", () => {
        res.statusCode = 500;
        res.end("Internal Server Error");
      })
      .pipe(res);
  });
});

server.listen(port, () => {
  // console.log will go to container logs (docker compose logs frontend)
  console.log(`Frontend listening on port ${port}`);
});