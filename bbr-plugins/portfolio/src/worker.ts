import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup() {
    // Portfolio is currently a read-only UI plugin; data is loaded by the page.
  },
  async onHealth() {
    return {
      status: "ok",
      message: "Portfolio plugin worker is running",
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
