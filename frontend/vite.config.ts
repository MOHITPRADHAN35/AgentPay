import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const allowedHosts = [
  "agentpay-frontend.onrender.com",
  ".onrender.com",
  "localhost",
  "127.0.0.1",
];

export default defineConfig({
  preview: {
    allowedHosts,
  },
  server: {
    allowedHosts,
  },
  vite: {
    preview: {
      allowedHosts,
    },
    server: {
      allowedHosts,
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
