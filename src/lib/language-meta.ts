// GitHub linguist colors for the languages codeR supports
export const LANG_COLORS: Record<string, string> = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python: '#3572A5',
  java: '#b07219',
  cpp: '#f34b7d',
  c: '#555555',
  csharp: '#178600',
  go: '#00ADD8',
  rust: '#dea584',
  ruby: '#701516',
  php: '#4F5D95',
  swift: '#F05138',
  kotlin: '#A97BFF',
  scala: '#c22d40',
  r: '#198CE7',
  sql: '#e38c00',
  bash: '#89e051',
  lua: '#000080',
  perl: '#0298c3',
  haskell: '#5e5086',
  elixir: '#6e4a7e',
  clojure: '#db5855',
  dart: '#00B4AB',
  julia: '#a270ba',
  matlab: '#e16737',
  vbnet: '#945db7',
  cobol: '#005ca5',
  fortran: '#4d41b1',
  assembly: '#6E4C13',
  html: '#e34c26',
  css: '#563d7c',
  json: '#8a8a8a',
  markdown: '#083fa1',
  yaml: '#cb171e',
  plaintext: '#6e7681',
}

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  cpp: 'C++',
  csharp: 'C#',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  sql: 'SQL',
  php: 'PHP',
  yaml: 'YAML',
  vbnet: 'VB.NET',
  plaintext: 'Text',
}

export function languageLabel(language: string): string {
  return (
    LANG_LABELS[language] ??
    language.charAt(0).toUpperCase() + language.slice(1)
  )
}

export interface RoomLanguageStat {
  language: string
  percent: number
}
