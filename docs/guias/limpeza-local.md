# Protocolo de limpeza local

**Estado:** vigente · **Atualizado em:** 2026-11-01

Evita acumular arquivos gerados na máquina de desenvolvimento, sobretudo quando o repositório está em uma pasta sincronizada (OneDrive). Tudo o que o protocolo apaga é **regenerável** pelos comandos do [guia do ambiente](ambiente-desenvolvimento.md); nada que seja código, histórico, documentação, exemplo ou caso de validação é tocado.

## O que ocupa espaço

Medido em 2026-11-01 (pasta do repositório: 13,2 GB; o código, o `.git` e a documentação somam poucos MB):

| Pasta | Tamanho | O que é |
|---|---:|---|
| `app/desktop/src-tauri/target/` | 7,5 GB | Compilação do aplicativo Windows (Tauri), depuração e *release*, instaladores |
| `app/target/` | 5,4 GB | Compilação do motor Rust (testes, Clippy, WebAssembly) |
| `app/web/node_modules/` | 0,25 GB | Dependências npm |
| `app/web/dist/`, `src/services/engine/wasm/`, `test-results/` | ~0,01 GB | Build da interface, WebAssembly gerado, resíduos dos testes |
| `referencias/` | 0,04 GB | Acervo local de consulta (**não** é limpo; fica fora do Git) |

Fora do repositório: o cache de pacotes e a toolchain do Rust (1,5 GB, hoje em `D:\Arquivos_de_Programas\Rust`, ver abaixo), `ms-playwright` (1,1 GB, navegadores de teste) e `~/tools` (0,1 GB, Node portátil). São ferramentas, não lixo; só remova para recuperar espaço e reinstale pelo guia.

## Quando limpar

Limpe **depois de uma etapa validada**, isto é, quando todas estas condições valem:

1. as verificações da etapa foram executadas e o resultado está **registrado** no plano, no relatório ou no CHANGELOG (a evidência fica na documentação, não nos arquivos gerados);
2. o trabalho foi commitado e enviado (`git status` sem alterações pendentes que você ainda queira testar);
3. o CI do commit está verde, quando a limpeza ocorre antes de uma publicação.

Rotina sugerida: nível 1 ao final de cada sessão de trabalho, nível 2 ao fechar uma etapa, nível 3 ao encerrar uma versão ou quando o disco apertar.

## Como limpar

Em qualquer pasta do repositório, com o Node instalado. O padrão é uma **simulação**: mostra o que seria apagado e quanto liberaria.

```bash
node scripts/limpar-local.mjs --nivel 3
```

Depois de conferir a lista, apague de fato com `--executar`:

```bash
node scripts/limpar-local.mjs --nivel 3 --executar
```

| Nível | Apaga | Custo para refazer |
|---|---|---|
| 1 | Relatórios e capturas do Playwright, caches do Vite | Nenhum (voltam ao rodar os testes) |
| 2 | Nível 1 + `web/dist`, WebAssembly gerado, instalador e executável do Tauri, `target` do WebAssembly | Minutos (`npm run build:wasm`, `npm run build`) |
| 3 | Nível 2 + `app/target`, `src-tauri/target` e `node_modules` | 15 a 25 minutos (`npm ci`, compilação completa do Rust e do Tauri) |

O script só remove caminhos de uma lista fechada, dentro da raiz do repositório, e nunca apaga `.git`, o código, `docs/`, `examples/`, `validation/`, `referencias/` nem a pasta das chaves do atualizador (`%USERPROFILE%\.tauri\`).

## Evitar que o OneDrive sincronize as pastas pesadas

A causa do volume é a compilação do Rust dentro de uma pasta sincronizada. Na máquina de desenvolvimento do mantenedor isso foi resolvido em 2026-11-01 movendo o Rust inteiro para fora do OneDrive:

| Item | Local | Como |
|---|---|---|
| Cache de pacotes (`CARGO_HOME`) | `D:\Arquivos_de_Programas\Rust\cargo` | variável de ambiente do usuário |
| Toolchain (`RUSTUP_HOME`) | `D:\Arquivos_de_Programas\Rust\rustup` | variável de ambiente do usuário |
| Pasta de compilação | `D:\Arquivos_de_Programas\Rust\target` | `target-dir` em `%CARGO_HOME%\config.toml` |

Com isso `app/target/` e `src-tauri/target/` deixam de existir dentro do repositório, e o OneDrive só sincroniza código e documentação. Para repetir em outra máquina (PowerShell, depois de instalar o Rust):

```powershell
[Environment]::SetEnvironmentVariable('CARGO_HOME','D:\Arquivos_de_Programas\Rust\cargo','User')
[Environment]::SetEnvironmentVariable('RUSTUP_HOME','D:\Arquivos_de_Programas\Rust\rustup','User')
```

```toml
# D:\Arquivos_de_Programas\Rust\cargo\config.toml
[build]
target-dir = "D:/Arquivos_de_Programas/Rust/target"
```

A configuração é do usuário e não altera o repositório nem o CI. O script de limpeza não enxerga a pasta `target` externa: para liberar espaço, apague `D:\Arquivos_de_Programas\Rust\target` manualmente (ela é recriada na próxima compilação).

Alternativa sem mexer no Cargo: manter o repositório fora do OneDrive (por exemplo `C:\dev\enzitag-optima`) e usar o GitHub como cópia de segurança, já que tudo importante está versionado.

As chaves do atualizador continuam em `%USERPROFILE%\.tauri\` e **precisam de cópia de segurança própria** (não estão no repositório).
