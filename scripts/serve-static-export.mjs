import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import nextConfig from "../next.config.mjs";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const basePath = nextConfig.basePath ?? "";
const outputDirectory = path.resolve("out");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(
    new URL(requestUrl, "http://localhost").pathname,
  );

  if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    return null;
  }

  let exportPath = pathname.slice(basePath.length) || "/";
  if (exportPath.endsWith("/")) {
    exportPath += "index.html";
  }

  const filePath = path.resolve(outputDirectory, `.${exportPath}`);
  if (
    filePath !== outputDirectory &&
    !filePath.startsWith(`${outputDirectory}${path.sep}`)
  ) {
    return null;
  }

  return filePath;
}

const server = createServer(async (request, response) => {
  const filePath = resolveRequestPath(request.url ?? "/");

  if (!filePath) {
    response.writeHead(404).end("Not found");
    return;
  }

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }

    const body = await readFile(filePath);
    const contentType =
      contentTypes.get(path.extname(filePath)) ?? "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType }).end(body);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      response.writeHead(404).end("Not found");
      return;
    }

    throw error;
  }
});

server.listen(port, host, () => {
  console.log(`Static export available at http://${host}:${port}${basePath}/`);
});

process.on("SIGTERM", () => server.close());
