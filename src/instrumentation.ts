export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.VERCEL === "1" || process.env.REALTIME_MODE === "poll") {
      return;
    }
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
