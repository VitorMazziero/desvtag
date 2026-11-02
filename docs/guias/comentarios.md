# Guia de comentários

**Estado:** vigente (v0.3, ET20) · **Atualizado em:** 2026-11-02

Comentários são **notas de revisão** guardadas no projeto, ligadas ao que se comenta e à revisão dos dados em que foram escritas. Decisões em [DT-0026](../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md).

## Onde comentar

| Sobre | Onde | Como aparece |
|---|---|---|
| Uma **figura** | Abaixo da figura, em «Comentários (n; m em aberto)» | Só os comentários daquela figura |
| O **experimento** ou uma **análise** guardada | Painel «Comentários do experimento», depois dos resultados | Todos os comentários do experimento, cada um com o seu alvo |

Para comentar: abra a lista, escreva o texto (até 2000 caracteres), informe seu nome se quiser e use **Comentar**. Cada comentário pode ser **respondido**, **resolvido** (e **reaberto**) ou **excluído** (com confirmação; as respostas vão junto).

## O que fica registrado

- O texto, o nome (opcional), a data e a **revisão dos dados** em que o comentário foi escrito («revisão v3»). Para uma análise ou figura de uma análise, é a revisão com que ela foi calculada; senão, a mais recente. As revisões nunca são apagadas, então a referência sempre pode ser consultada no histórico.
- As **respostas** e quando o comentário foi resolvido.
- Tudo vai para o arquivo `.enzitag` ao salvar (campo opcional `comments` do experimento). Arquivos sem comentários não mudam.

O **nome é livre e fica só neste dispositivo** (o aplicativo não tem contas); não é uma identificação confiável de autoria.

## Comentários nos relatórios

Marque **Incluir os comentários do experimento no fim dos relatórios** (painel de exportação; desligado por padrão) para que a seção «Comentários» apareça no relatório HTML, no PDF e no Word, com alvo, autor, data, revisão e se foi resolvido.

## O que não existe

- Comentário **por tabela**: o formato do arquivo já aceita, mas a interface ainda não oferece.
- **Editar** um comentário já enviado (responda ou exclua e escreva de novo).
- **Sincronização entre pessoas** ou notificações: cada pessoa vê os comentários do arquivo que abriu. A edição simultânea tem apenas uma [especificação](../arquitetura/edicao-simultanea.md).
