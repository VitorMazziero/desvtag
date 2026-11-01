# DT-0006 — Idiomas, temas, fontes e preferências

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET01-T15, ET01-T16 |
| Pendências relacionadas | PD-01 |
| Substitui / substituída por | — |

## Decisão

1. **Idiomas:** `i18next` 26.6.0 com `react-i18next` 17.1.10; idiomas `pt-BR` e `en`; chaves em inglês estável, namespaces em `src/i18n/locales/<idioma>/<namespace>.json`; pluralização do próprio i18next. Teste de paridade acusa chave presente em um idioma e ausente no outro.
2. **Primeiro acesso:** o idioma do sistema decide (`pt*` → `pt-BR`, `en*` → `en`, demais → `en`); a escolha é salva por dispositivo.
3. **Temas:** tokens semânticos (`--color-ground`, `--color-ink`, `--color-action`, …) em `themes/tokens.css`; um arquivo por tema selecionado por `data-theme` no `<html>`. Padrão: Soft Light, aplicado antes da primeira pintura para não piscar outro tema.
4. **Soft Light:** base do prompt Software com o azul `#005A99` do logo como cor de ação e de texto de destaque, e o verde `#008300` para estados positivos. O laranja `#D57400` (contraste ≈ 3,3:1 sobre branco) fica reservado a elementos gráficos e texto grande; ainda não é usado.
5. **Professional:** o prompt não define cor de sucesso; foi escolhido `#2D6A2D` (verificado nos testes de contraste).
6. **Fontes:** pacotes `@fontsource/*` (licença OFL-1.1) empacotados localmente, apenas subconjunto `latin`, para funcionar offline no Windows: Host Grotesk e Instrument Sans (Soft Light), Geist Sans e Geist Mono (Modern Dark), EB Garamond e Instrument Sans (Professional). O nome da família do pacote Geist é "Geist Sans".
7. **Acessibilidade:** contraste mínimo de 4,5:1 para os pares de texto, verificado por teste em cada tema; foco visível por `:focus-visible`; `prefers-reduced-motion` remove transições; link "Ir para o conteúdo".
8. **Preferências:** `localStorage` com leitura e escrita protegidas; sem armazenamento o aplicativo funciona e a preferência vale só na sessão. Idioma e tema nunca alteram dados nem cálculos.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Biblioteca ICU/FormatJS | Mais completa, porém mais pesada; plural e interpolação do i18next bastam por ora (revisar se surgirem regras ICU complexas) |
| Fontes do Google Fonts por CDN | Dependência de rede; o aplicativo deve funcionar offline |
| Um único CSS com variáveis por classe | Dificulta acrescentar temas e verificar contraste por arquivo |

## Consequências

- A formatação numérica por idioma, mensagens de erro de entrada e demais strings entram na ET02.
- Licenças OFL das fontes devem constar nas notas de terceiros do instalador (ET10).
