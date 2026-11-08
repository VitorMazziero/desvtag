# Google Drive (opcional)

**Estado:** vigente na **versão web** · **Atualizado em:** 2026-11-02

O Google Drive é **opcional**: o aplicativo funciona por inteiro sem ele, e salvar ou abrir arquivos no computador continua igual. Detalhes de privacidade em [política de privacidade](../privacidade.md); decisões em [DT-0025](../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md).

## Como usar (versão web)

1. Na barra do projeto, abra **Arquivo → Google Drive** e clique em **Conectar ao Google Drive**. O Google pede a permissão `drive.file`: o aplicativo só enxerga a pasta «EnziTAG Optima» e os arquivos que ele criou ou que você escolher abrir.
2. **Salvar no Drive:** cria o arquivo `.desvtag` na pasta «EnziTAG Optima» do seu Drive na primeira vez e o atualiza nas seguintes.
3. **Abrir do Drive…:** abre o seletor do Google (Picker) para escolher um arquivo `.desvtag` ou `.enzitag`.
4. **Desconectar:** revoga a autorização.

A autorização dura cerca de uma hora; depois, o aplicativo pede uma nova (o navegador pode mostrar uma janela do Google). Nada é enviado antes de você clicar em Conectar.

## E se alguém alterar o arquivo?

Antes de gravar, o aplicativo confere se o arquivo no Drive ainda é o que você leu. **Se mudou, ele não é sobrescrito**: seu trabalho vai para uma cópia «Projeto (cópia local …)» na mesma pasta, e você abre as duas e compara antes de apagar uma delas. O Drive não oferece bloqueio, então o aplicativo **não promete** edição simultânea.

## Quando algo falha

Sem rede, autorização vencida, falta de permissão ou Drive cheio: o aplicativo explica, **mantém o seu trabalho** (e a recuperação automática local) e não marca o projeto como salvo. Salve no computador enquanto isso.

## Limitações

- **Versão para Windows:** a integração com o Drive **ainda não existe** (veja a DT-0025); use a versão web ou salve no computador.
- Abrir arquivos compartilhados por outras pessoas exige que elas os compartilhem com você e que você os escolha no seletor; sem permissão de edição, salve uma cópia no seu Drive.
- Esta versão foi testada com um Google **simulado**; a autorização real com contas do Google deve ser conferida pelo usuário.

## Destino e estado do arquivo (ET29)

**Arquivo** separa **Computador** de **Google Drive**. No navegador, o botão principal diz **Salvar (baixar .desvtag)**; o painel de estado informa o horário e quando há edições posteriores ao arquivo. Salvar no Drive mostra o destino e horário correspondentes. A recuperação automática local continua explicada nos detalhes: não é uma cópia externa.

O seletor **Experimento ativo** substitui a faixa de abas e oferece busca com mais de cinco itens; confirmações trazem ligação com o experimento de origem. O arquivo guarda a seleção ativa opcionalmente e volta a ela ao reabrir. Arquivos anteriores continuam compatíveis.

Os testes desta etapa exercitam o Drive simulado. A configuração da origem local 4173 e as verificações com conta real já registradas não significam que todos os cenários de autorização, conflito e expiração tenham sido verificados novamente com Google real.
