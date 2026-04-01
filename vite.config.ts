import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const writableMethods = new Set(["OPTIONS", "POST", "PATCH", "DELETE"]);
type NextFunction = (err?: unknown) => void;
type LocalApiResponse = ServerResponse & {
  status: (code: number) => LocalApiResponse;
  json: (payload: unknown) => void;
};

function createApiResponseAdapter(res: ServerResponse): LocalApiResponse {
  const adapted = res as LocalApiResponse;

  adapted.status = (code: number) => {
    adapted.statusCode = code;
    return adapted;
  };

  adapted.json = (payload: unknown) => {
    if (!adapted.headersSent) {
      adapted.setHeader("Content-Type", "application/json");
    }

    adapted.end(JSON.stringify(payload));
  };

  return adapted;
}

function localContentApiPlugin() {
  const handleRequest = async (
    req: IncomingMessage & { body?: string },
    res: ServerResponse,
    next: NextFunction,
  ) => {
    if (!req.method || !writableMethods.has(req.method)) {
      return next();
    }

    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }

      if (chunks.length > 0) {
        req.body = Buffer.concat(chunks).toString("utf8");
      }

      const { default: contentHandler } = await import("./api/content.js");
      const apiRes = createApiResponseAdapter(res);
      return contentHandler(req, apiRes);
    } catch (error) {
      const details =
        error instanceof Error ? error.message : "Failed to handle request.";
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          ok: false,
          error: "Local API handler failed.",
          details,
        }),
      );
    }
  };

  return {
    name: "local-content-api",
    configureServer(server) {
      server.middlewares.use("/api/content", handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/content", handleRequest);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Make server-side local API code able to read .env values in Vite dev.
  Object.assign(process.env, env);

  return {
    preview: { port: 3000 },
    server: { port: 3000 },
    plugins: [
      react(),
      localContentApiPlugin(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        injectRegister: "auto",
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon-180x180.png",
          "pwa-64x64.png",
        ],
        manifest: {
          name: "ليا انا",
          short_name: "ليا انا",
          description: "ليا انا",
          theme_color: "#fafafa",
          background_color: "#fafafa",
          start_url: "/",
          scope: "/",
          display_override: ["standalone", "minimal-ui", "browser"],
          display: "standalone",
          orientation: "portrait",
          id: "/",
          launch_handler: {
            client_mode: "auto",
          },
          lang: "ar",
          prefer_related_applications: false,
          categories: ["utilities", "lifestyle"],
          screenshots: [],
          dir: "rtl",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },

        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
        },
        devOptions: {
          enabled: true,
          type: "module",
        },
      }),
    ],
  };
});
