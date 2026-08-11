/**
 * Log duy nhất của tầng đường biên. Tồn tại để lỗi `contract` in ra được
 * response thô — đó là tín hiệu backend đã đổi hình dạng.
 */
export function logBoundary(event: string, data: Record<string, unknown>): void {
  const line = JSON.stringify({ at: "agentforge", event, ...data });
  if (event.endsWith(":error") || event.endsWith(":contract")) {
    console.error(line);
  } else {
    console.info(line);
  }
}
