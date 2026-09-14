export async function withDeadline(task: () => Promise<void>, timeoutMs: number, onTimeout: () => void): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  let expired = false;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(() => { expired = true; onTimeout(); resolve(); }, timeoutMs);
  });
  try { await Promise.race([task(), deadline]); } finally { if (!expired && timer) clearTimeout(timer); }
}
