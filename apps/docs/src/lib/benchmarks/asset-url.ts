/** Static bench SVG path plus content hash. A regen must change this URL. */
export function benchmarkChartSrc(path: string, sha256: string): string {
  return `${path}?v=${sha256}`;
}
