import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
// Keep the original multi-page public website and the admin app in one build.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (key && !key.startsWith("sb_publishable_"))
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_…). Secret and service-role keys are forbidden.",
    );
  if (Boolean(key) !== Boolean(env.VITE_SUPABASE_URL))
    throw new Error(
      "Set both Supabase environment variables, or leave both blank for an unconfigured build.",
    );
  return {
    plugins: [
      {
        name: "application-routes",
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            if (/^\/admin(?:\/|\?|$)/.test(req.url || ""))
              req.url =
                "/admin.html" +
                (req.url.includes("?")
                  ? req.url.slice(req.url.indexOf("?"))
                  : "");
            if (/^\/catalog\//.test(req.url || "")) req.url = "/product.html";
            next();
          });
        },
      },
    ],
    build: {
      outDir: "build",
      rollupOptions: {
        input: {
          index: resolve("index.html"),
          contact: resolve("contact.html"),
          admin: resolve("admin.html"),
          product: resolve("product.html"),
        },
      },
    },
  };
});
