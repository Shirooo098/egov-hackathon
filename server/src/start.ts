import { createApp } from './app.js';
import { closePool, getPool } from './db/pool.js';
import { isMainModule, loadRuntimeConfig, redactedErrorMessage } from './runtime/config.js';
import { withDeadline } from './runtime/shutdown.js';

export async function startServer(options: { installSignalHandlers?: boolean } = {}) {
  const config = loadRuntimeConfig();
  const app = createApp({ config });
  const server = app.listen(config.port, () => console.log(`eBuhay API listening on port ${config.port} (${config.mode})`));
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; draining HTTP requests`);
    await withDeadline(async () => {
      await new Promise<void>((resolve) => server.close((_error?: Error) => resolve()));
      await closePool().catch(() => undefined);
    }, config.shutdownTimeoutMs, () => server.closeAllConnections?.());
  };
  if (options.installSignalHandlers) {
    process.once('SIGTERM', () => void shutdown('SIGTERM').finally(() => process.exit(0)));
    process.once('SIGINT', () => void shutdown('SIGINT').finally(() => process.exit(0)));
  }
  return { server, shutdown, pool: getPool() };
}

if (process.argv[1] && isMainModule(import.meta.url, process.argv[1])) {
  void startServer({ installSignalHandlers: true }).catch((error: unknown) => {
    console.error(redactedErrorMessage(error));
    process.exit(1);
  });
}
