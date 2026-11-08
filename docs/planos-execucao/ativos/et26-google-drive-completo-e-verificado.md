# ET26 — Google Drive completo e verificado

| Campo | Valor |
|---|---|
| Estado | T01–T07 concluídas localmente. T08 aguarda verificação com contas reais |
| Versão-alvo | v0.4.0 experimental |
| Fases do roteiro | F11 |
| Marco | Fechamento da v0.4 |
| Depende de | ET19, DT-0025, bloco 03 (coordenação de tarefas) e, para o aceite, contas reais do usuário |
| Módulos | U14 (Drive), adaptador Tauri, armazenamento local |
| Ativado em | 2026-11-05 |
| Concluído em | — |

## 1. Objetivo

Completar o que a ET19 deixou aberto (T03 Windows, T05 fila, T06 compartilhado, T08 contas reais): autorização no Windows, cofre, fila persistente, abrir/atualizar/compartilhar/copiar, conflitos e recuperação. O Drive continua opcional; nenhum fluxo local depende dele.

## 2. Escopo

Autorização por loopback e PKCE; cofre de credenciais; fila persistente que nunca sobrescreve; abrir arquivo compartilhado; compartilhar por leitura; criar cópia; conflito de versão e recuperação após falha; mensagens PT/EN, seis temas e acessibilidade. Fora do escopo: edição simultânea (decisão da ET28) e escopo além de `drive.file`.

## 3. Entradas e referências

[DT-0025](../../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md), [DT-0036](../../decisoes-tecnicas/dt-0036-drive-no-windows-loopback-pkce-e-cofre.md), [ET19](../concluidos/et19-google-drive-e-compartilhamento.md), [plano da versão](../plano-v0.4.md#96-ordem-de-execução-e-regra-de-conclusão), política de privacidade e identificadores públicos em `app/web/src/services/drive/config.ts`.

## 4. Decisões técnicas

DT-0036 (proposta): loopback com PKCE, cofre do Windows, `ureq` e `keyring`, fila em IndexedDB e Picker sob demanda. A DT passa a aceita quando a T02 estiver verificada.

## 5. Tarefas

- [x] **T01 — Decisão e contratos.** DT-0036, contratos dos comandos, CSP, fila e erros tipados novos. Registrar o que a versão antiga do aplicativo e os arquivos existentes não perdem.
- [x] **T02 — Autorização no Windows.** Receptor em loopback, PKCE/`state`, troca e renovação, cofre, desconectar com revogação e apagamento. Testes com Google simulado e cofre simulado.
- [x] **T03 — Interface e CSP no Windows.** `DriveAuth` nativo, painel sem a nota «ainda não há Drive», estados de conexão, falha e cancelamento, foco e acessibilidade.
- [x] **T04 — Fila persistente.** Gravações pendentes sobrevivem a fechar o aplicativo, com limite, retomada, visibilidade e sem sobrescrever remoto alterado.
- [x] **T05 — Compartilhado, compartilhar e copiar.** Abrir arquivo de terceiro, `permission` explicado, compartilhar por leitura, criar cópia, conflito e recuperação de arquivo apagado.
- [x] **T06 — Testes simulados.** Unidade e E2E (web e Windows) para todos os caminhos, inclusive token expirado, revogação, rede, cota, limite e cofre indisponível.
- [x] **T07 — Roteiro de verificação real.** Passos, resultado esperado e registro de evidência para o usuário executar com uma ou duas contas.
- [ ] **T08 — Aceite.** Evidência real do usuário nos casos exigidos; seis temas, PT/EN, teclado e Windows. Sem ela a ET26 não recebe aceite completo.

## 6. Entregas e critérios de conclusão

Todos os fluxos acima operam em web e Windows com simulação; os casos reais constam em evidência do usuário. Falha de rede, permissão ou conflito nunca perde trabalho local.

## 7. Verificação e documentação

Google simulado em unidade e E2E; verificação nativa no Windows; roteiro manual com contas reais. Atualizar ficha U14, matriz de cobertura, privacidade e mapa de módulos.

## 8. Riscos

Segredo do cliente desktop ausente na compilação; WebView2 e o Picker; limites de cota e de taxa; revogação externa; tokens expirados durante gravação em fila.

## 9. Registro de progresso

2026-11-05. ET26 ativada. Plano e DT-0036 (proposta) escritos; nenhum código alterado ainda.

2026-11-05. T01 e T02 aceitas incrementalmente com Google e cofre simulados. `drive_auth.rs` (lógica pura: PKCE conferido com o exemplo da RFC 7636, URL com escopo `drive.file`, retorno em loopback com `state`, troca com `code_verifier`, renovação, revogação e limpeza do cofre, tempo limite e cancelamento) e `drive_commands.rs` (`ureq`, Gerenciador de Credenciais via `keyring`, navegador via `opener`; comandos `drive_status`, `drive_connect`, `drive_cancel`, `drive_access_token`, `drive_disconnect`). Oito testes novos, 21 no crate desktop, Clippy sem avisos; licenças das dependências MIT/Apache. **Não verificado:** conexão real com o Google, cofre real do Windows e a interface (T03). O segredo do cliente desktop só entra pela variável de compilação `GOOGLE_DESKTOP_CLIENT_SECRET`; sem ela `drive_status` informa `available: false` e a conexão devolve `unavailable`. Próximo: T03 (interface e CSP).

2026-11-05. T03 implementada, ainda sem aceite: falta exercitá-la no executável Windows. `NativeDriveAuth` (`services/drive/nativeAuth.ts`) liga os cinco comandos ao `DriveClient` compartilhado; o `DrivePanel` passa a existir no Windows, reconhece a conexão guardada no cofre ao abrir, desabilita «Conectar» e explica quando a compilação não tem a credencial, mostra a espera do navegador com «Cancelar conexão» e oculta «Abrir do Drive» até a T05 (o Picker). Erros novos `cancelled`, `timeout` e `unavailable` em PT/EN; a nota «ainda não há Drive» foi removida e a CSP do Windows ganhou só `https://www.googleapis.com` em `connect-src`. Web: 528 unitários (seis novos), tipos, lint e E2E do Drive em Chromium/Firefox/WebKit sem regressão. Não verificado: painel e CSP no executável, temas e PT/EN do painel nativo, teclado.
2026-11-05. T03 aceita localmente. O executável Windows em perfil WebView2 isolado confirmou a CSP, ausência de requisições externas na abertura, estado indisponível sem credencial de compilação, navegação com Espaço e Escape e foco devolvido ao menu. As 12 combinações de tema e idioma passaram no axe do painel. A autenticação real e o cofre com credenciais válidas seguem no aceite da ET26. Próxima implementação: T04, fila persistente.

T04 em verificação. O painel mostra as gravações pendentes, permite retomada sob demanda e tenta retomar ao conectar no Windows. A fila guarda os bytes e a versão de origem depois de identificar a conta pelo identificador do Drive. Uma falha anterior à identificação da conta deixa o projeto disponível para salvamento local. A retomada envia o arquivo guardado e preserva edições posteriores na sessão. Falta verificar a retomada no Windows e tratar a confirmação perdida depois de o servidor aceitar o envio.
T04, confirmação de envio. O cliente reserva o identificador da criação e o guarda junto da operação pendente. Uma nova tentativa de criação usa o mesmo identificador. Se o Drive já o ocupou, o cliente confirma os bytes e a versão antes de remover o item da fila. Quando a atualização do arquivo original perdeu a confirmação, a retomada verifica se o nome e os bytes correspondem à gravação pendente e se a versão permaneceu estável durante a leitura. O teste de navegador simula o servidor aceitando a criação antes de a resposta cair. A verificação nativa da retomada segue pendente.
T04, verificação nativa. Duas execuções do aplicativo Windows com o mesmo perfil isolado de WebView2 confirmaram que uma falha de upload deixa o arquivo na fila. Após encerrar e reabrir o executável, conectar retomou o envio automaticamente. O Drive simulado recebeu um único arquivo e a fila ficou vazia. Evidências em `docs/imagens/evidencias-v0.4-et26/t04-native`. O cenário usa comandos de autenticação simulados exclusivos do build de automação. Antes de fechar a T04, falta persistir a operação antes da primeira tentativa para cobrir encerramento durante o envio.
T04, persistência antes do envio. O painel agora grava a operação e o identificador de criação em IndexedDB antes de iniciar o upload. A gravação inicial e a retomada compartilham o mesmo bloqueio entre abas. Os nove testes do Drive passaram em Chromium, Firefox e WebKit, inclusive a retomada após perda da confirmação. O teste nativo de encerramento durante o primeiro upload está em verificação.
T04 aceita localmente. O teste Windows encerrou o executável com o primeiro upload retido pelo servidor simulado. Após reabrir o mesmo perfil, conectar retomou automaticamente o arquivo persistido. O teste confirmou um único projeto recebido e fila vazia. Evidências em `docs/imagens/evidencias-v0.4-et26/t04-native-interrupted`. A conta real segue para T08. Próxima tarefa: T05, arquivos compartilhados, cópias e conflitos.
T05, abertura pelo Picker. O vínculo remoto agora usa o identificador do projeto decodificado. A troca ocorre após validar os bytes e desassociar o arquivo local anterior. O cenário automatizado abre uma cópia do Drive a partir de outro projeto e verifica que a ligação fica registrada no projeto carregado. A abertura no Windows e as ações de compartilhamento seguem na T05.
T05, cópia explícita. A ação «Salvar uma cópia no Drive» envia os bytes do projeto atual a um novo arquivo na pasta do aplicativo. A operação mantém o vínculo original e as alterações pendentes da sessão. A fila conserva a intenção de criar uma cópia em caso de retomada. O cenário de navegador verifica o novo arquivo, a versão do original e o vínculo local.
T05, compartilhamento de leitura. O painel identifica o arquivo do Drive e pede o e-mail do destinatário. A confirmação concede acesso de leitura somente à conta informada, sem notificação automática. O teste do Drive simulado confere o arquivo, o destinatário e o papel enviado. A abertura de arquivos de terceiros no Windows segue pendente.
T05, preparação do seletor no Windows. O Picker web foi separado do fluxo GIS e recebe um token de acesso de forma explícita. O seletor informa a origem da página ao Google. Para o Windows, seguir a alternativa da DT-0036 com o navegador do sistema e retorno por loopback. A origem do WebView2 está fora das origens cadastradas para a chave, e carregar scripts do Google na janela principal os colocaria no mesmo contexto dos comandos nativos. A ponte de seleção isolada e o aceite com contas reais permanecem pendentes.
T05, receptor do seletor externo. A seleção reutiliza o receptor da autorização e aceita um identificador de arquivo somente com o estado aleatório da sessão. O teste usa conexões TCP reais de loopback e verifica também a rejeição de um estado alheio. A página isolada do Picker, o acionamento pelo painel e a configuração da origem autorizada continuam em aberto.
T05, integração do seletor externo. No Windows, «Abrir do Drive» chama o comando nativo que abre a página `drive-picker.html` na origem Pages já cadastrada. O fragmento carrega o token de acesso e os parâmetros da sessão. A página limpa o fragmento antes de carregar o Picker e devolve pelo loopback apenas o identificador e o estado. A interface nativa continua com a CSP anterior. O fluxo integrado com executável, navegador do sistema e Google real segue pendente. A página precisa acompanhar a candidata web na origem autorizada.
T05 aceita localmente. O executável Windows abriu o seletor em um processo Edge separado com a página local da candidata e o Google simulado. O build de automação repassou a URL ao roteiro, que confirmou a origem prevista, a navegação TCP de retorno, o download e a abertura do projeto no WebView2. Evidências em `docs/imagens/evidencias-v0.4-et26/t05-native-picker`. A abertura do navegador padrão pelo lançador de produção e a origem Pages com contas reais ficam para a T08.
T06 aceita localmente. Quinze execuções em Chromium, Firefox e WebKit passaram, incluindo falhas de cota e permissão durante o upload e retomada após limite de requisições. O cenário equivalente passou no Windows com WebView2 e a API simulada. Os onze testes Rust de autorização cobrem renovação, revogação, falhas de rede e cofre indisponível. O teste do cofre usa uma implementação simulada e verifica que a renovação é interrompida antes do contato com o Google. Evidências nativas em `docs/imagens/evidencias-v0.4-et26/t06-native-faults`. Próxima tarefa: roteiro de verificação real da T07.

## 10. Roteiro de aceite com contas reais (T07 → T08)

Em 2026-11-07, o usuário informou que testou o Drive e que funcionou após receber a rota local da candidata `7097c6e` na porta 4173. O retorno confirma o teste web informado pelo usuário. Os resultados individuais D01–D07 e o percurso no instalador Windows continuam em aberto.

Use um projeto sintético com nome exclusivo, por exemplo `ET26-verificacao-AAAA-MM-DD`, e anote a versão e o commit da candidata. Execute na web e no Windows 10 com WebView2. O instalador precisa incluir a credencial de compilação e a origem Pages autorizada precisa servir o `drive-picker.html` da mesma candidata para o percurso nativo. Para os testes web locais, use `http://127.0.0.1:4173/`. A conexão e a criação na versão web publicadas em 2026-11-02 já têm confirmação para aquela versão.

Use a conta A como proprietária. A conta B, em perfil de navegador separado, é necessária para verificar a abertura como leitora e a tentativa de sobrescrita sem permissão. Os demais percursos podem usar uma única conta. Para as capturas, oculte e-mails, identificadores e URLs de autorização.

| ID | Ação | Resultado e evidência |
|---|---|---|
| D01 | Abra o projeto local, conecte a conta A e salve no Drive. No Windows, autorize pelo navegador padrão e feche e reabra o aplicativo. | A pasta do aplicativo contém um único arquivo. No Windows, a conexão reaparece sem consentimento adicional. Registre estado do painel antes e depois. |
| D02 | Abra o arquivo pelo Picker, edite um valor e salve novamente. Repita no Windows com o navegador padrão. | O projeto correto abre no aplicativo, o valor editado aparece ao reabrir e o mesmo arquivo é atualizado. No Windows, o retorno fecha o percurso pelo loopback. |
| D03 | Compartilhe o arquivo de A para leitura com B. Em B, abra-o pelo Picker, altere um valor e tente salvar. Depois use «Salvar uma cópia no Drive». | A leitura funciona, a atualização do original é recusada com orientação, e a cópia de B contém o valor editado. Confira que o original de A preserva seu valor. |
| D04 | Abra o mesmo projeto em dois perfis com A. Faça edições distintas. Salve primeiro em um perfil e depois no outro. | O segundo envio cria uma cópia de conflito. Reabra ambos e confira os dois valores. Em um projeto de teste separado, mova o original para a lixeira e confirme a criação de um novo arquivo ao salvar. |
| D05 | Na web, bloqueie somente a URL de upload no navegador após conectar, mantendo a API de metadados acessível. Salve, confira a pendência, reabra a página, retire o bloqueio, conecte e retome. No Windows, repita com uma interrupção controlada após o upload começar. | A fila sobrevive ao fechamento. A retomada web ocorre sob demanda e no Windows ao conectar. Confira um único arquivo com o valor pendente e fila vazia. Se a falha ocorrer antes de identificar a conta, registre esse caso separadamente. |
| D06 | Após o token expirar, tente abrir ou salvar. Depois revogue o acesso na conta Google e repita. No Windows, use também «Desconectar» e reabra o aplicativo. | A autorização válida é renovada conforme a plataforma. Após revogação, o app orienta a reconectar e mantém o trabalho local. No Windows, desconectar e reabrir deixa a conta desconectada. |
| D07 | Com o menu do Drive aberto, percorra as ações por teclado, alterne PT/EN e os seis temas e confira os estados de conexão, pendência e erro. | Foco visível, rótulos legíveis, ações acessíveis e estados reconhecíveis. Registre a plataforma e os estados conferidos. |

Por cenário, registre data, versão/commit, plataforma, navegador, conta A/B, resultado esperado e observado, e anexe uma captura ou descrição verificável. Marque cada linha como **passou**, **falhou** ou **pendente**, com motivo. A T08 permanece aberta até registrar os percursos reais. Enquanto isso, o plano da versão permite avançar as verificações locais da ET28.
