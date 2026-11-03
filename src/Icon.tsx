const paths: Record<string, string> = {
  calculator: 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM8 7h8M8 12h1m6 0h1m-8 5h1m6 0h1',
  graph: 'M3 3v18h18M5 16c4 0 3-10 7-10s3 12 8 5',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
  units: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  engineering: 'm3 3 6 9-6 9h12m0-18h6m-6 18h6M18 3v18',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  help: 'M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  check: 'm5 12 4 4L19 6',
}
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.calculator} /></svg>
}
