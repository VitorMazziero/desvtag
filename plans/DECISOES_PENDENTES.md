# Detalhes pendentes — EnziTAG Optima

Atualizado em 1º de novembro de 2026, após aprovação explícita dos 14 pontos de produto.

Nome, identidade, idiomas, catálogo, fluxo, orientação, formatos, projetos, salvamento, Drive, compartilhamento inicial, otimização, licença MIT e distribuição estão registrados em [DECISOES_APROVADAS.md](DECISOES_APROVADAS.md). A organização modular com arquivos definidos é requisito confirmado. Não precisam ser novamente escolhidos.

O [plano detalhado](PLANO_IMPLEMENTACAO.md) define a sequência e os critérios de entrega; o [mapa de módulos](../docs/MAPA_MODULOS.md) define os arquivos responsáveis. Restam detalhes de implementação:

| Detalhe | Quando resolver | Diretriz já aprovada |
|---|---|---|
| Versões e dependências auxiliares | F00 e por módulo | Rust + React/TypeScript + Tauri + WASM; papel das dependências documentado |
| Contêiner interno, esquema e migrações | F02 | Arquivo aberto `.enzitag`, vários experimentos, revisões e resultados preservados |
| Retenção/compactação do histórico e limites de recuperação | F02 | Recuperação após dois segundos e checkpoints; sem perda silenciosa |
| Variantes, estimadores, algoritmos e tolerâncias | F03–F09 | Catálogo completo e validação por método |
| Inventário Protimiza não visível nas capturas e rótulo CCD | F05–F06 | Cobertura integral requerida; não copiar nomenclatura sem conferir a matriz |
| Biblioteca de tabelas/gráficos e renderização 3D | F01/F04/F06/F10 | Arquitetura de cálculo separada da apresentação; formatos aprovados |
| Estratégia de busca e critérios de parada | F07 | Desejabilidade, restrições e vários candidatos |
| Escala dos casos reais e dados autorizados para distribuição | Durante cada fase | Exemplos sintéticos identificados e referências independentes |
| Credenciais públicas de cliente OAuth, origens e fluxo nativo | F11 | Drive opcional, pasta visível e escopo `drive.file`; nunca exigir login local |
| Detecção de conflitos e proteção contra gravações concorrentes | F11 | Preservar versões e permitir escolha/cópia |
| Fonte de assinatura de código do instalador, se adotada | F13 | Assinatura dos pacotes do atualizador já prevista; são mecanismos diferentes |
| Versões exatas dos navegadores e matriz de compatibilidade | F12/F13 | Windows 11 de 64 bits, Chrome, Edge e Firefox prioritários |
| Domínio próprio, Windows 10 e Safari | F14 | Adições posteriores conforme necessidade e testes |
| Protocolo de comentários e colaboração simultânea | F14 | Comentários posteriores; edição simultânea exige especificação própria |

Soft Light padrão, preferência por dispositivo, idioma independente de exportação, formatos SVG/PDF/PNG/CSV/XLSX/HTML/PDF, extensão `.enzitag`, Drive opcional e MIT já estão aprovados. DOCX e comentários são entregas posteriores previstas, não requisitos esquecidos. Nenhum item desta tabela significa que os módulos locais devem aguardar a configuração de um serviço externo.
