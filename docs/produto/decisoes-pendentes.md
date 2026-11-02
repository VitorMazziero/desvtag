# Decisões pendentes

**Estado:** vigente · **Atualizado em:** 2026-11-02

Detalhes de implementação ainda não resolvidos, após aprovação explícita dos 14 pontos de produto.

Nome, identidade, idiomas, catálogo, fluxo, orientação, formatos, projetos, salvamento, Drive, compartilhamento inicial, otimização, licença MIT e distribuição estão registrados nas [decisões aprovadas](decisoes-aprovadas.md). A organização modular com arquivos definidos é requisito confirmado. Não precisam ser novamente escolhidos.

O [roteiro do produto](../planos-execucao/roteiro-produto.md) define a sequência das fases; o [plano da v0.1](../planos-execucao/plano-v0.1.md) indica a etapa que resolve cada pendência da primeira versão; o [mapa de módulos](../arquitetura/mapa-modulos.md) define os arquivos responsáveis. Cada pendência técnica é encerrada por uma [decisão técnica](../decisoes-tecnicas/README.md) (DT) que cita o identificador PD.

| ID | Detalhe | Fase | Etapa | Diretriz já aprovada |
|---|---|---|---|---|
| PD-01 | Versões e dependências auxiliares | F00 e por módulo | ET01 (base técnica resolvida: DT-0003 a DT-0006) e etapas consumidoras | Rust + React/TypeScript + Tauri + WASM; papel das dependências documentado |
| PD-02 | Contêiner interno, esquema e migrações | F02 | ET03 | Arquivo aberto `.enzitag`, vários experimentos, revisões e resultados preservados |
| PD-03 | Retenção/compactação do histórico e limites de recuperação | F02 | ET03 | Recuperação após dois segundos e checkpoints; sem perda silenciosa |
| PD-04 | Variantes, estimadores, algoritmos e tolerâncias | F03–F09 | ET04–ET08 (v0.1); demais posteriores | Catálogo completo e validação por método |
| PD-05 | Inventário Protimiza não visível nas capturas e rótulo CCD | F05–F06 | ET06–ET07; conferência do CCD na ET14-T02 | **Rótulo CCD conferido em 2026-11-02 com as capturas:** é o fatorial completo com pontos centrais (sem axiais); funções internas não visíveis nas capturas continuam sem inventário. Cobertura integral requerida; não copiar nomenclatura sem conferir a matriz |
| PD-06 | Biblioteca de tabelas/gráficos e renderização 3D | F01/F04/F06/F10 | ET02, ET05, ET07, ET09 | Arquitetura de cálculo separada da apresentação; formatos aprovados |
| PD-07 | Estratégia de busca e critérios de parada | F07 | ET08 | Desejabilidade, restrições e vários candidatos |
| PD-08 | Escala dos casos reais e dados autorizados para distribuição | Durante cada fase | Todas | Exemplos sintéticos identificados e referências independentes |
| PD-09 | Credenciais públicas de cliente OAuth, origens e fluxo nativo | F11 | ET19 (v0.3; o usuário cria o projeto OAuth) | Drive opcional, pasta visível e escopo `drive.file`; nunca exigir login local **Parcial em 2026-11-02:** projeto, clientes web e desktop, chave do Picker e política de privacidade criados pelo usuário e registrados na [DT-0025](../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md); falta o fluxo nativo (Windows) |
| PD-10 | Detecção de conflitos e proteção contra gravações concorrentes | F11 | ET19 (v0.3) | Preservar versões e permitir escolha/cópia **Tratada na versão web em 2026-11-02** (comparação de versão antes de gravar; cópia em conflito; DT-0025) |
| PD-11 | Fonte de assinatura de código do instalador, se adotada | F13 | ET10 | **Resolvida em 2026-11-01:** instalador sem assinatura de código na v0.1 (aviso do Windows explicado nas notas); atualizador com chave própria ([DT-0017](../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)) |
| PD-12 | Versões exatas dos navegadores e matriz de compatibilidade | F12/F13 | ET10 | Chrome, Edge e Firefox prioritários; Windows 10 Pro como plataforma Windows verificada (Windows 11 não será validado, [decisões aprovadas §17](decisoes-aprovadas.md#17-escopo-da-v03-2026-11-02)) |
| PD-13 | Domínio próprio, Windows 10 e Safari | F14 | ET20 (v0.3) | **Resolvida em 2026-11-02:** Windows 10 é a plataforma verificada (2026-11-01); **sem domínio próprio** (GitHub Pages) e **sem Mac** (Safari real não verificado; WebKit do Playwright no CI) — [decisões aprovadas §18](decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02), itens 9 e 10 |
| PD-14 | Protocolo de comentários e colaboração simultânea | F14 | ET20 (v0.3: comentários e especificação) | **Comentários implementados na v0.3** (ET20); a edição simultânea tem [especificação](../arquitetura/edicao-simultanea.md) **aguardando a decisão do usuário** (§9 da especificação) |
| PD-15 | Hospedagem web e visibilidade do repositório na publicação | F13 | ET10 (decisão do usuário) | **Resolvida em 2026-11-01:** repositório público; GitHub Pages por disparo manual ([DT-0017](../decisoes-tecnicas/dt-0017-atualizador-assinado-e-publicacao.md)) |
| PD-16 | Autorização para distribuir os dados reais do exemplo `kLa` (repositório público) | F12 | ET11 (T13) | **Tratada em 2026-11-01:** sem confirmação de distribuição, o repositório traz o exemplo [06 — kLa sintético](../../examples/06-kla-sintetico/README.md) (dados sintéticos equivalentes); os dados reais ficam só na máquina do usuário e podem ser versionados se ele autorizar |
| PD-17 | Logo do grupo de pesquisa: arquivo, autorização de uso e locais de exibição | F01 | ET12 (T01) | **Resolvida em 2026-11-01:** logo = `docs/imagens/logo.png` (marca EnziTAG, 558 × 155 px, já versionado); exibido no cabeçalho, na tela inicial e como crédito no relatório HTML (desligável); fora das figuras exportadas; ícone do aplicativo inalterado. Padrões mantidos sem pedido em contrário: texto alternativo sem nome por extenso e logo fora da licença MIT |

**Sobre PD-15:** decidida em 2026-11-01 — o repositório é público, o que permite o GitHub Pages gratuito. A publicação efetiva da versão web continua sendo um ato do mantenedor (fluxo `pages.yml`).

Soft Light padrão, preferência por dispositivo, idioma independente de exportação, formatos SVG/PDF/PNG/CSV/XLSX/HTML/PDF, extensão `.enzitag`, Drive opcional e MIT já estão aprovados. DOCX e comentários são entregas posteriores previstas, não requisitos esquecidos. Nenhum item desta tabela significa que os módulos locais devem aguardar a configuração de um serviço externo.
