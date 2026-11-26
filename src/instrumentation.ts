export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ realtimeBroker }, { ensureTelegramBackgroundWorker }] = await Promise.all([
      import("./lib/realtime"),
      import("./lib/telegram"),
    ]);
    void realtimeBroker.ensureStarted().catch((err) => {
      console.error("[Instrumentation] Failed to start realtime broker:", err);
    });
    ensureTelegramBackgroundWorker();
  }
}
