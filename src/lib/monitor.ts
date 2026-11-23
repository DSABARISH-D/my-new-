import "server-only";
export function incident(operation: string, code?: string) {
  const reference = crypto.randomUUID();
  // Allow-listed fields only. Financial entries, emails, tokens and exception bodies may contain private information.
  console.error(JSON.stringify({level: "error", operation, code: code?.slice(0,40), reference, time: new Date().toISOString()}));
  return reference;
}
