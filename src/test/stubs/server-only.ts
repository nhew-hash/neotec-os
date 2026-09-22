// Stub pro `import "server-only"` durante os testes (vitest).
//
// O pacote "server-only" nem está instalado como dependência direta —
// o Next.js resolve ele via alias interno do próprio bundler (webpack/
// turbopack) em tempo de build, sem exigir instalação. O vitest não
// tem esse alias embutido, então sem este stub qualquer teste que
// importe (direta ou indiretamente) um arquivo com `import "server-only"`
// quebraria com "Cannot find module 'server-only'". Ver vitest.config.ts.
export {};
