# DT-0027 — Percurso unificado e composição das figuras (ET29)

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-02 |
| Origem | ET29-T03, T15–T22; auditoria UX08, FG01, FG03 e FG08 |

## Decisão

O percurso usa uma lista única de blocos por etapa, com disponibilidade, identificação estável e título próprio. Painéis mantêm suas entradas montadas e expõem blocos ao percurso compartilhado, sem renderizar pares de navegação próprios. O coordenador compõe os blocos declarados pelos painéis, guarda o bloco por experimento/etapa na sessão e trata a passagem entre etapas. Essa composição preserva o estado local dos painéis sem deslocar cálculos para a interface. A preferência de ver todos os blocos é do dispositivo; o bloco atual é estado da interface, não revisão dos dados.

Menus de arquivo, Extras e Sobre usam botões/disclosures e modais nativos com foco e retorno de foco. Em telas pequenas, seleção de etapa e experimento são compactas. Identidade da compilação é separada da versão do motor.

O relatório continua sendo montado numa raiz própria identificada por `data-report-root`; a navegação por seções nunca modifica seus descendentes. Ajuda de interação é excluída explicitamente e substituída pela descrição do método/modelo efetivamente calculado.

As figuras compartilham cálculo de espaço para textos e notas e um recorte explícito da área de dados. Reta de referência é também limitada geometricamente antes de desenhar. Personalização de fonte/texto recompõe o layout; não reduz o texto nem altera resultados científicos. Tela e exportação recebem a mesma composição, preservando a política de cores da DT-0021. Geometria de apresentação permanece TypeScript; inferência, planejamento e valores de predição permanecem no motor Rust.

## Alternativas e consequências

Manter navegações aninhadas foi rejeitado por reproduzir UX08. Desmontar blocos ao avançar perde entradas locais; por isso os blocos apenas ficam ocultos. Duplicar o relatório em texto manual pode fazê-lo divergir da análise; o documento reaproveita resultados com exclusões explícitas de controles/ajudas.

A assinatura do resultado delimita a memória de seção: um cálculo novo começa no resumo. O experimento ativo pode ser persistido como campo opcional do projeto sem mudar esquema ou cálculo.

## Verificação

Testes de geometria e de composição em fontes 0,85/1/1,2; percursos guiados e completos, retorno e bloqueios; reabertura e exportações; PT/EN, seis temas e larguras da ET29. Evidências finais e limites ficam no relatório de execução da etapa, não são presumidos por esta decisão.
