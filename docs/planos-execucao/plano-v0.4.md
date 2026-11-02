# Plano da v0.4

**Estado:** planejado · **Criado em:** 2026-11-02 · **Versão-alvo:** v0.4.0 (canal experimental)

Plano de versão pedido pelo usuário em 2026-11-02, ao fechar a v0.3: «todas as outras pendências ficam para v0.4». Reúne **tudo o que as etapas ET13–ET21 da v0.3 deixaram sem entregar**, mais as verificações que dependem do usuário ou de equipamento externo, em etapas novas (ET22–ET28). A decisão e o que ficou na v0.3 estão em [decisões aprovadas §18](../produto/decisoes-aprovadas.md#18-fechamento-da-v03-e-escopo-da-v04-2026-11-02); o que foi e o que não foi verificado na v0.3, no [relatório da v0.3.0](../../validation/reports/v0.3.0/README.md).

A v0.4 continua no **canal experimental**; a v1.0.0 (canal estável e cobertura completa do catálogo) mantém os critérios do [roteiro](roteiro-produto.md).

## 1. Objetivo

Ao final da v0.4:

1. os resultados de **misturas, modelos mistos, curvas de saturação e potência** ficam **guardados no projeto** (reabrir não recalcula) e entram nos relatórios (HTML, PDF e Word);
2. as famílias F09 têm as variantes avançadas que a v0.3 deixou de fora (covariâncias de medidas repetidas, perfil de verossimilhança, limites superiores em misturas, otimização no simplex, simulação de potência);
3. o Google Drive funciona também no aplicativo Windows, com fila persistente, e foi **verificado com contas reais**;
4. a interface foi revista tela a tela (espaçamento, capturas «depois», WebView2);
5. as verificações externas (Safari real, canal de atualização ponta a ponta, domínio próprio) estão feitas ou têm decisão registrada.

## 2. Itens pendentes e etapa responsável

| Item pendente | Origem (v0.3) | Etapa |
|---|---|---|
| Guardar no projeto os resultados de misturas, modelos mistos, saturação e potência (campos opcionais, esquema 1), mostrá-los em seções e levá-los aos relatórios | ET15-T09, ET17-T07, ET18-T07 | [ET22](#et22--resultados-das-famílias-novas-guardados-no-projeto) |
| Modelo misto: testes F de vários graus de liberdade, médias marginais e comparações; AR(1) e covariância não estruturada; papéis de coluna «unidade» e «tempo»; figuras de perfis | ET17-T04, T05, T07 | [ET23](#et23--modelos-mistos-e-medidas-repetidas-avançados) |
| Ajuste não linear: intervalos por perfil de verossimilhança; NIST StRD não linear; limites e valores iniciais editáveis; potência por simulação e para regressão, contrastes e efeitos de dois níveis | ET18-T02, T03, T05, T07 | [ET24](#et24--ajuste-não-linear-e-potência-avançados) |
| Misturas: limites superiores, traço de Cox, otimização restrita ao simplex; ótimos: blocos na ampliação, gráfico de variância de predição; estimabilidade em fracionários de níveis mistos | ET15-T04, ET16-T06, descobertas da ET15 | [ET25](#et25--misturas-e-planejamentos-ótimos-avançados) |
| Drive no Windows (loopback + PKCE + cofre), fila persistente, arquivo compartilhado real; **verificação com contas reais (usuário)** | ET19-T03, T05, T06, T08 | [ET26](#et26--google-drive-completo-e-verificado) |
| Revisão tela a tela dos componentes fora das classes comuns, capturas «depois», conferência no WebView2, documentação da ET21; capturas em inglês e temas no WebView2; família de fonte e hachura no PDF; editar um comentário enviado | ET21-T01, T04, T06, T07; ET12-T10; DT-0020; ET20 | [ET27](#et27--acabamento-da-interface-e-da-exportação) |
| Seleção de modelos de dois níveis: casos independentes para fracionários e Plackett–Burman | ET14-T03 (limite) | [ET28](#et28--verificações-adicionais-e-itens-que-dependem-do-usuário) |
| Safari real; canal de atualização ponta a ponta; domínio próprio; caminho da edição simultânea; inventário das funções internas do Protimiza (PD-05) | ET20-T04, T05, T06; ET14-T02 (resto) | ET28 |

## 3. Etapas

Os planos detalhados de cada etapa (`planejados/`) são escritos quando a etapa é ativada; abaixo ficam o escopo, a verificação esperada e as dependências.

### ET22 — Resultados das famílias novas guardados no projeto

- **Escopo:** campos opcionais do experimento para o resultado de cada análise nova (`mixtureResult`, `mixedModelResult`, `nonlinearResult`, `powerResult`), com assinatura de entrada como nas análises atuais; reabrir mostra o resultado guardado **sem recalcular** e avisa quando dados ou opções mudaram; resultados em seções com barra lateral; entrada nos relatórios HTML, PDF e Word; exportação CSV/XLSX das tabelas.
- **Verificação:** Rust (ida e volta do documento, validação das referências), WebAssembly × nativo (SHA-256 idêntico), E2E (salvar → reabrir sem recálculo), exemplos 07, 08, 11 e 12 reabrindo com o resultado.
- **Decisão técnica:** esquema 1 com campos opcionais (como `comments`); migração só se um campo exigir mudança incompatível.
- **Depende de:** nada (primeira da v0.4).

### ET23 — Modelos mistos e medidas repetidas avançados

- **Escopo:** testes F de vários graus de liberdade (Kenward–Roger ou Satterthwaite multivariado, a avaliar), médias marginais estimadas e comparações a partir do modelo misto; covariâncias AR(1) e não estruturada; papéis de coluna «unidade» e «tempo» como tipos próprios; figuras de perfis individuais e médios.
- **Verificação:** `statsmodels` (`MixedLM`), implementação independente de AR(1) e, se instalado, R (`nlme`/`lme4`); estados de não convergência explícitos.
- **Depende de:** ET22 (guardar o resultado).

### ET24 — Ajuste não linear e potência avançados

- **Escopo:** intervalos por perfil de verossimilhança (com a verificação de que o perfil é unimodal); NIST StRD não linear (arquivos a obter); limites e valores iniciais editáveis na interface; potência por **simulação** e para regressão, contrastes e efeitos de dois níveis.
- **Verificação:** NIST StRD (valores certificados), SciPy, simulação com semente registrada e erro de Monte Carlo informado.
- **Depende de:** ET22.

### ET25 — Misturas e planejamentos ótimos avançados

- **Escopo:** misturas com **limites superiores** (poliedro) e traço de Cox; **otimização restrita ao simplex**; planejamentos ótimos com **blocos** na ampliação e **gráfico de variância de predição**; estimabilidade em fracionários de níveis mistos.
- **Verificação:** referências independentes em Python (busca exaustiva em problemas pequenos, `scipy.optimize`), exemplos novos.
- **Depende de:** ET22 (misturas guardadas).

### ET26 — Google Drive completo e verificado

- **Escopo:** autorização no aplicativo Windows (loopback + PKCE, credenciais no cofre do sistema; o segredo do cliente desktop só no segredo do GitHub); **fila persistente** de gravações pendentes; teste com arquivo compartilhado de verdade; compartilhar por leitura e criar cópia.
- **Verificação:** simulado (unidade e E2E) e **contas reais do usuário** (primeira conexão, expiração, revogação, leitura, escrita, falta de permissão, duas cópias concorrentes), registradas como evidência manual.
- **Depende de:** usuário (contas de teste) e [DT-0025](../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md).

### ET27 — Acabamento da interface e da exportação

- **Escopo:** ET21-T01/T04/T06/T07 (inventário completo, componentes fora das classes comuns, capturas «depois» nos seis temas, PT/EN, 800 e 375 px, WebView2, DT e ficha U18); capturas em inglês e inspeção dos temas no WebView2 (ET12-T10); família de fonte e hachura no PDF ([DT-0020](../decisoes-tecnicas/dt-0020-figuras-completas-e-exportacao-em-pdf.md)); **editar** um comentário já enviado; aviso sobre Option+Tab para usuários de Safari.
- **Verificação:** medição automática (E2E de layout) estendida, axe nos seis temas, inspeção visual registrada.
- **Depende de:** nada.

### ET28 — Verificações adicionais e itens que dependem do usuário

- **Escopo:** casos independentes (statsmodels) para a seleção de modelos de dois níveis em **fracionários e Plackett–Burman**; **Safari real** (Mac) e registro; **canal de atualização ponta a ponta** (publicar, rodar `channels.yml`, atualizar por canal); **domínio próprio** (se o usuário registrar; [DT-0026 §5](../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md)); **decisão do caminho da edição simultânea** ([especificação §9](../arquitetura/edicao-simultanea.md#9-perguntas-para-o-usuário-decisões-que-esta-especificação-não-toma)) e, se decidida, a etapa de implementação do caminho A; inventário das demais funções do Protimiza (PD-05).
- **Verificação:** evidências manuais registradas no relatório da v0.4.0.
- **Depende de:** usuário (Mac, domínio, decisões).

## 4. Dependências do usuário

| Pendência | Etapa | O que o usuário precisa fazer |
|---|---|---|
| Contas do Google para teste | ET26 | Disponibilizar uma ou duas contas de teste e executar o roteiro de verificação |
| Mac com Safari | ET28 | Disponibilizar um Mac ou aceitar que o Safari siga «não verificado» |
| Domínio próprio (PD-13) | ET28 | Decidir se haverá domínio e registrá-lo |
| Caminho da edição simultânea (PD-14) | ET28 | Responder às perguntas da §9 da especificação |
| Arquivos NIST StRD não lineares | ET24 | Autorizar o download ou fornecê-los |
| Funções internas do Protimiza (PD-05) | ET28 | Enviar capturas das telas ainda não vistas, se quiser cobertura integral |

## 5. Princípios que continuam valendo

Os da [v0.3](plano-v0.3.md#5-princípios-que-continuam-valendo): cálculo só no núcleo Rust, referência independente para todo método novo, esquema do projeto aditivo, PT/EN, seis temas, teclado, axe e 375 px em cada tela nova, Windows 10 Pro e `windows-latest` como plataformas verificadas. **Windows 11 não será validado** (decisão do usuário).

## 6. Critérios de lançamento da v0.4.0

1. ET22–ET28 concluídas, ou itens não entregues registrados com destino e aprovados pelo usuário.
2. Todo método novo com caso de validação independente e paridade WebAssembly × nativo; resultados novos guardados no projeto sem recálculo ao reabrir.
3. Projetos da v0.1 a v0.3 abrem sem perda.
4. CI verde (Rust, web, E2E em cinco navegadores, Tauri Linux e Windows); verificação nativa no Windows 10, **incluindo os fluxos novos**.
5. Instalador assinado para o atualizador, instalado, executado e desinstalado; atualização a partir da v0.3 verificada **pelos dois canais**.
6. Relatório de validação da v0.4.0 com o que foi e o que não foi verificado.
7. Publicação (etiqueta, release e Pages) **somente por decisão expressa do usuário**.

## 7. Riscos

| Risco | Mitigação |
|---|---|
| Guardar resultados novos exigir mudança incompatível do esquema | Campos opcionais; decisão técnica e migração testada antes de qualquer mudança incompatível |
| Covariâncias AR(1) e não estruturada com convergência frágil | Estados de não convergência explícitos; limites e inicialização documentados |
| Perfil de verossimilhança e simulação lentos no navegador | Execução em *worker* com cancelamento e medição prévia dos limites |
| Drive no Windows depender de credenciais e do cofre do sistema | Segredos só no GitHub; cofre abstraído atrás de uma interface testável |
| Verificações externas (Safari, contas, domínio) sem data | Registradas como pendentes no relatório; não bloqueiam as etapas locais |
