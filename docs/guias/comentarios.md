# Guia de comentários

**Estado:** vigente (v0.4, ET27) · **Atualizado em:** 2026-11-03

Comentários são **notas de revisão** guardadas no projeto, ligadas ao que se comenta e à revisão dos dados em que foram escritas. Decisões em [DT-0026](../decisoes-tecnicas/dt-0026-docx-comentarios-canais-e-webkit.md).

## Onde comentar

| Sobre | Onde | Como aparece |
|---|---|---|
| Uma **figura** ou uma **tabela** de resultados | No menu **Figura** ou ao lado dos botões de exportação da tabela, em «Comentários (n; m em aberto)» | Só os comentários daquele alvo |
| O **experimento** ou uma **análise** guardada | Painel «Comentários do experimento», depois dos resultados | Todos os comentários do experimento, cada um com o seu alvo |

Para comentar: abra a lista, escreva o texto (até 2000 caracteres), informe seu nome se quiser e use **Comentar**. Cada comentário pode ser **editado**, **respondido**, **resolvido** (e **reaberto**) ou **excluído** (com confirmação; as respostas vão junto).

## O que fica registrado

- O texto, o nome (opcional), a data e a **revisão dos dados** em que o comentário foi escrito («revisão v3»). Para uma análise ou figura de uma análise, é a revisão com que ela foi calculada; senão, a mais recente. As revisões nunca são apagadas, então a referência sempre pode ser consultada no histórico.
- As **respostas**, quando o comentário foi resolvido e o horário da última edição (`editedAt`, opcional). Editar conserva autor, data original, alvo, revisão, respostas e resolução. Use **Salvar edição**, **Cancelar edição** ou Escape; texto vazio não é aceito.
- Ao salvar o projeto, o arquivo `.desvtag` guarda os comentários no campo opcional `comments` do experimento.

O **nome é livre** (o aplicativo não tem contas); a preferência é lembrada neste dispositivo, e o nome informado acompanha o comentário no arquivo salvo. Não é uma identificação autenticada de autoria.

## Comentários nos relatórios

Marque **Incluir os comentários do experimento no fim dos relatórios** (painel de exportação; desligado por padrão) para que a seção «Comentários» apareça no relatório HTML, no PDF e no Word, com alvo, autor, data, revisão se foi editado e se foi resolvido.

## O que não existe

- **Sincronização entre pessoas** ou notificações: cada pessoa vê os comentários do arquivo que abriu. A edição simultânea tem apenas uma [especificação](../arquitetura/edicao-simultanea.md).
