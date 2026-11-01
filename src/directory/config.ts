/** Public, fixed project backend; optional override is server-only deployment configuration. */
export function directoryOrigin(
  environment: Record<string, string | undefined> = process.env
): string {
  return environment.DIRECTORY_SERVICE_ORIGIN || 'https://api.nostr.directory';
}
