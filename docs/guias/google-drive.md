# Google Drive (opcional)

**Estado:** vigente na **versão web** · **Atualizado em:** 2026-11-02

O Google Drive é **opcional**: o aplicativo funciona por inteiro sem ele, e salvar ou abrir arquivos no computador continua igual. Detalhes de privacidade em [política de privacidade](../privacidade.md); decisões em [DT-0025](../decisoes-tecnicas/dt-0025-google-drive-opcional-na-versao-web.md).

## Como usar (versão web)

1. Na barra do projeto, abra «Google Drive (opcional)» e clique em **Conectar ao Google Drive**. O Google pede a permissão `drive.file`: o aplicativo só enxerga a pasta «EnziTAG Optima» e os arquivos que ele criou ou que você escolher abrir.
2. **Salvar no Drive:** cria o arquivo `.enzitag` na pasta «EnziTAG Optima» do seu Drive na primeira vez e o atualiza nas seguintes.
3. **Abrir do Drive…:** abre o seletor do Google (Picker) para escolher um `.enzitag`.
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
