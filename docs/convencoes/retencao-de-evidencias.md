# Retenção de evidências e arquivos locais

**Estado:** vigente · **Atualizado em:** 2026-11-09

O projeto fica em uma pasta sincronizada pelo OneDrive. Esta convenção define o que permanece no disco depois de uma rodada de testes e o que é regenerável. A validação dos cálculos já está nos casos e relatórios versionados (`validation/`); o acervo local guarda só o que comprova a entrega.

## 1. O que fica

| Local | Conteúdo mantido |
|---|---|
| Git (`docs/`, `validation/`) | Índices das evidências, manifestos de integridade, casos de validação e relatórios. Imagens brutas das rodadas **não** são versionadas (ver `.gitignore`). |
| `DesvTAG-acervo-<versão>/evidencias-rastreadas-*` | Somente os arquivos **citados** por documentos versionados, no mesmo caminho relativo que o documento indica. |
| `DesvTAG-acervo-<versão>/` (candidata final e QA) | Registros da candidata publicada e das verificações nativas: logs, JSON, hashes, capturas do Windows, notas de assinatura e de pré-lançamento. |
| `DesvTAG-acervo-<versão>/resultados-comprimidos/` | Um `.zip` por rodada com os **resultados em texto** (JSON, logs, relatórios HTML, CSV) e o inventário do que foi removido. |
| Fora do OneDrive | Cópia do histórico Git em pacote (`git bundle`) com todas as ramificações. |

## 2. O que se apaga ao fechar uma rodada

- Traces e vídeos do Playwright, capturas e imagens que nenhum documento versionado cita, e DOCX, PDF e SVG gerados pelos testes (são reproduzíveis).
- Saídas de compilação (`.js`, `.map`, `.wasm`, fontes) e instaladores que já estão no release. Antes de apagar, registrar o SHA-256 no inventário.
- Cópias duplicadas do mesmo arquivo.
- Regeneráveis: `app/web/node_modules` (`npm ci`), `app/web/dist` (`npm run build`), `app/web/test-results*` e logs soltos ignorados pelo Git.

Imagens e arquivos já comprimidos (PNG, JPEG, zip) não ganham espaço ao serem compactados: o ganho vem de apagar. Só texto é compactado.

## 3. Procedimento

1. Gerar o inventário (caminho, tamanho e SHA-256 de instaladores e pacotes) **antes** de apagar.
2. Compactar o texto de cada rodada e conferir o zip (`testzip` e contagem de arquivos).
3. Apagar o restante e remover pastas vazias. No OneDrive, pastas podem ter o atributo somente leitura; limpar o atributo antes de remover.
4. Para o histórico Git: criar o pacote (`git bundle create ... --all`), conferir com `git bundle verify`, guardar fora do OneDrive, só então apagar ramificações locais antigas e executar `git reflog expire --expire=now --all` e `git gc --prune=now`.
5. Remover os `worktrees` temporários (`git worktree remove`) e as pastas `desvtag-*` do diretório temporário.

## 4. Registro da limpeza de 2026-11-09

| Item | Antes | Depois |
|---|---:|---:|
| Pasta do projeto e acervo (OneDrive) | 8.838 MB, 55.293 arquivos | 295 MB, 5.029 arquivos |
| `DesvTAG-acervo-v0.4` | 7.937 MB | 166 MB |
| `.git` | 390 MB | 39 MB |
| `node_modules`, `dist`, `test-results`, logs soltos | 420 MB | 0 |
| Pastas temporárias de trabalho (fora do OneDrive) | cerca de 18,8 GB | 0 |

O pacote do histórico completo está em `D:\Arquivos_de_Programas\git-backup\desvtag-all-2026-11-09.bundle` (SHA-256 `6a4ffcb2b2c62b51625ca4157654cb3443ed594b4c172ebd1ce02abf1a516009`, 51 referências). Ele contém as ramificações locais removidas nesse dia, incluindo `feat/v0.4`, cujos commits nunca foram enviados ao remoto. O inventário dos arquivos removidos está em `DesvTAG-acervo-v0.4/resultados-comprimidos/inventario-limpeza-2026-11-09.csv.zip`.

Os livros de `referencias/` e os dados reais do exemplo 05 (`examples/05-kLa/`) não fazem parte desta limpeza e continuam fora do Git.
