import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const allowedHosts = [
  "agentpay-frontend.onrender.com",
  ".onrender.com",
  "localhost",
  "127.0.0.1",
];

const port = Number(process.env.PORT) || 8080;

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port,
    allowedHosts,
  },
  preview: {
    host: "0.0.0.0",
    port,
    allowedHosts,
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port,
      allowedHosts,
    },
    preview: {
      host: "0.0.0.0",
      port,
      allowedHosts,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
