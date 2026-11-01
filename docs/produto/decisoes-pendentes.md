# Decisões pendentes

**Estado:** vigente · **Atualizado em:** 2026-11-01

Detalhes de implementação ainda não resolvidos, após aprovação explícita dos 14 pontos de produto.

Nome, identidade, idiomas, catálogo, fluxo, orientação, formatos, projetos, salvamento, Drive, compartilhamento inicial, otimização, licença MIT e distribuição estão registrados nas [decisões aprovadas](decisoes-aprovadas.md). A organização modular com arquivos definidos é requisito confirmado. Não precisam ser novamente escolhidos.

O [roteiro do produto](../planos-execucao/roteiro-produto.md) define a sequência das fases; o [plano da v0.1](../planos-execucao/plano-v0.1.md) indica a etapa que resolve cada pendência da primeira versão; o [mapa de módulos](../arquitetura/mapa-modulos.md) define os arquivos responsáveis. Cada pendência técnica é encerrada por uma [decisão técnica](../decisoes-tecnicas/README.md) (DT) que cita o identificador PD.

| ID | Detalhe | Fase | Etapa | Diretriz já aprovada |
|---|---|---|---|---|
| PD-01 | Versões e dependências auxiliares | F00 e por módulo | ET01 (base técnica resolvida: DT-0003 a DT-0006) e etapas consumidoras | Rust + React/TypeScript + Tauri + WASM; papel das dependências documentado |
| PD-02 | Contêiner interno, esquema e migrações | F02 | ET03 | Arquivo aberto `.enzitag`, vários experimentos, revisões e resultados preservados |
| PD-03 | Retenção/compactação do histórico e limites de recuperação | F02 | ET03 | Recuperação após dois segundos e checkpoints; sem perda silenciosa |
| PD-04 | Variantes, estimadores, algoritmos e tolerâncias | F03–F09 | ET04–ET08 (v0.1); demais posteriores | Catálogo completo e validação por método |
| PD-05 | Inventário Protimiza não visível nas capturas e rótulo CCD | F05–F06 | ET06–ET07 | Cobertura integral requerida; não copiar nomenclatura sem conferir a matriz |
| PD-06 | Biblioteca de tabelas/gráficos e renderização 3D | F01/F04/F06/F10 | ET02, ET05, ET07, ET09 | Arquitetura de cálculo separada da apresentação; formatos aprovados |
| PD-07 | Estratégia de busca e critérios de parada | F07 | ET08 | Desejabilidade, restrições e vários candidatos |
| PD-08 | Escala dos casos reais e dados autorizados para distribuição | Durante cada fase | Todas | Exemplos sintéticos identificados e referências independentes |
| PD-09 | Credenciais públicas de cliente OAuth, origens e fluxo nativo | F11 | Posterior à v0.1 | Drive opcional, pasta visível e escopo `drive.file`; nunca exigir login local |
| PD-10 | Detecção de conflitos e proteção contra gravações concorrentes | F11 | Posterior à v0.1 | Preservar versões e permitir escolha/cópia |
| PD-11 | Fonte de assinatura de código do instalador, se adotada | F13 | ET10 | Assinatura dos pacotes do atualizador já prevista; são mecanismos diferentes |
| PD-12 | Versões exatas dos navegadores e matriz de compatibilidade | F12/F13 | ET10 | Windows 11 de 64 bits, Chrome, Edge e Firefox prioritários |
| PD-13 | Domínio próprio, Windows 10 e Safari | F14 | Posterior à v0.1 | Adições posteriores conforme necessidade e testes |
| PD-14 | Protocolo de comentários e colaboração simultânea | F14 | Posterior à v0.1 | Comentários posteriores; edição simultânea exige especificação própria |
| PD-15 | Hospedagem web e visibilidade do repositório na publicação | F13 | ET10 (decisão do usuário) | GitHub Pages aprovado; repositório privado por enquanto; tornar público depende de nova decisão |

**Sobre PD-15:** a documentação de concepção registra que o Pages é gratuito para repositórios públicos no GitHub Free. Com o repositório privado, publicar a versão web exige tornar o repositório público, adotar um plano do GitHub que permita Pages em repositórios privados ou escolher outra hospedagem estática. Nos planos que permitem Pages em repositório privado, o site publicado em geral continua acessível publicamente. Verificar as condições vigentes do GitHub no início da ET10 e levar a escolha ao usuário.

Soft Light padrão, preferência por dispositivo, idioma independente de exportação, formatos SVG/PDF/PNG/CSV/XLSX/HTML/PDF, extensão `.enzitag`, Drive opcional e MIT já estão aprovados. DOCX e comentários são entregas posteriores previstas, não requisitos esquecidos. Nenhum item desta tabela significa que os módulos locais devem aguardar a configuração de um serviço externo.
