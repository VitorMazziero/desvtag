# DT-0015 — Migração do Node.js 22 para o 26 na v0.2

| Campo | Valor |
|---|---|
| Estado | Aceita (migração planejada; **não executada**) |
| Data | 2026-11-01 |
| Origem | Decisão do usuário em 2026-11-01: manter o Node 22 na v0.1 e ir para o Node 26 na v0.2 |
| Pendências relacionadas | — |
| Substitui / substituída por | Substitui parcialmente a [DT-0003](dt-0003-toolchain-ferramentas-web-wasm.md) (linha "Node.js") **a partir da v0.2** |

## Contexto

A [DT-0003](dt-0003-toolchain-ferramentas-web-wasm.md) fixou o Node.js 22 (testado com 22.23.4) em `.nvmrc`, em `engines` do `package.json` e nos quatro passos `setup-node` de `.github/workflows/ci.yml`. Toda a evidência da v0.1 (Rust, vitest, E2E em Chromium e Firefox, verificação nativa, instalador) foi obtida nessa versão.

Em 2026-11-01, ao preparar a máquina Windows 10 de desenvolvimento, o `winget` instalou como "LTS" o Node.js **26.13.0**, pois a linha 26 é hoje a LTS mais recente. A linha 22 está em manutenção (só correções de segurança e de defeitos); o calendário oficial de lançamentos do Node.js deve ser reconferido antes da migração para confirmar a data de fim de suporte. O Node.js é usado apenas em tempo de desenvolvimento e na CI (build da interface, testes, empacotamento); **não faz parte do aplicativo distribuído** (o instalador Windows e a build web estática não o contêm).

## Decisão

1. **v0.1.x permanece no Node 22.** Nenhum arquivo de configuração muda agora: `.nvmrc`, `engines`, `ci.yml` e `@types/node` continuam como estão, para que as evidências já registradas continuem válidas.
2. **v0.2 migra para o Node 26 (linha LTS), em uma tarefa própria no início da ET11,** antes de qualquer funcionalidade nova. Assim, uma regressão da migração não se mistura com regressões de funcionalidade. A versão exata (`26.x.y`) é escolhida no dia da migração, após consulta ao registro oficial, e registrada neste documento.
3. A migração só é concluída com **todas** as verificações abaixo repetidas no Node 26 e sem piora em relação à linha de base da v0.1. Se alguma ferramenta da cadeia (Vite, Vitest, Playwright, Biome, TypeScript, CLI do Tauri) não funcionar no Node 26, a migração é adiada para a versão seguinte e a falha é registrada, sem alterar o Node 22 da linha principal.
4. O Node 22 continua válido para a linha 0.1.x enquanto ela receber correções.

### Escopo da migração (lista de verificação para a ET11)

| Item | Alteração |
|---|---|
| `.nvmrc` | `22` → `26` |
| `app/web/package.json` | `engines.node` (`>=22` → `>=26`); `@types/node` para a linha 26 |
| `app/web/package-lock.json` | Regenerado com `npm ci`/`npm install` no Node 26; revisar o diff de versões e licenças |
| `.github/workflows/ci.yml` | `node-version: 22` → `26` nos quatro passos `setup-node` |
| Documentos | [Guia do ambiente](../guias/ambiente-desenvolvimento.md), `README.md`, `README.en.md`, [DT-0003](dt-0003-toolchain-ferramentas-web-wasm.md), [dependências](../arquitetura/dependencias.md) e os registros de ambiente dos planos |
| Gerenciamento local | Documentar o uso de um gerenciador de versões que leia o `.nvmrc` (por exemplo fnm ou nvm-windows); incluir comandos nos guias **somente depois de executados** |

### Verificações exigidas (linha de base da v0.1 entre parênteses)

- `npm ci`, `check:contracts`, `lint`, `build:wasm`, `typecheck`, `npm test` (vitest: 227 testes) e `npm run build`.
- E2E com o motor WASM real em Chromium e Firefox (126 testes: 63 por navegador).
- Verificação nativa do aplicativo Tauri (`native-cdp.mjs` no Windows; `native-smoke.mjs` no Linux) e geração do instalador NSIS.
- `scripts/check-docs-links.mjs`, `check-case-collisions.mjs` e `check-versions.mjs`.
- Build estática servida sob `/enzitag-optima/` sem erros no console.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Migrar para o Node 26 ainda na v0.1 | Nenhuma evidência da v0.1 foi obtida no 26; migrar agora invalidaria a linha de base e misturaria a mudança de ferramenta com o fechamento da versão |
| Permanecer no Node 22 na v0.2 | A linha 22 está em manutenção e chegará ao fim de suporte durante o ciclo 0.x; adiar só aumenta o custo |
| Migrar para uma LTS intermediária (24) | Exigiria duas migrações em sequência (22→24→26) para o mesmo benefício |
| Usar duas versões na mesma linha (22 na CI, 26 no desenvolvimento) | Perde a reprodutibilidade que a DT-0003 busca: resultados poderiam divergir entre a máquina local e a CI |

## Critérios e evidências

- Evidência de que o Node 26 está disponível como LTS: o `winget` (pacote `OpenJS.NodeJS.LTS`) ofereceu a 26.13.0 em 2026-11-01. Isto **não** é evidência de compatibilidade do projeto com essa versão.
- Compatibilidade do projeto com o Node 26: **não verificada** (sem teste, sem registro). Será verificada na ET11 conforme a lista acima.
- Na máquina de desenvolvimento Windows 10, o Node 26.13.0 está instalado no sistema e as verificações da v0.1 usam uma cópia portátil do Node 22.23.4 colocada à frente no `PATH` dos comandos executados.

## Consequências

- Até a ET11, qualquer registro de ambiente da v0.1 continua citando Node 22.23.4.
- A ET11 ganha uma tarefa inicial de migração com os critérios acima; ela não depende de nenhuma funcionalidade e pode ser revertida isoladamente.
- A DT-0003 aponta para esta DT. Nenhuma outra linha da DT-0003 (Rust, Vite, TypeScript, Vitest, Playwright, Biome, `wasm-bindgen`) é alterada por esta decisão.
