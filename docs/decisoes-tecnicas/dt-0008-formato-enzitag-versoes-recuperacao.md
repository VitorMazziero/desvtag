# DT-0008 — Formato `.enzitag`, política de versões, recuperação e importação

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-01 |
| Origem | ET03-T01 |
| Pendências relacionadas | PD-02 (contêiner, esquema e migrações), PD-03 (retenção e recuperação), PD-04 (leitura de planilhas) |
| Substitui / substituída por | — |

## Decisões

### 1. Contêiner

ZIP com `manifest.json` e `project.json`, conforme a [especificação](../arquitetura/formato-enzitag.md). Codificação e leitura em **Rust** (`zip` 9, `sha2` 0.11), idênticas no Windows (nativo) e no navegador (WASM). Saída determinística. Leitura com limites de tamanho, entradas e caminhos.

### 2. Identificadores

Texto `[A-Za-z0-9_.:-]` de até 64 caracteres, geridos por contadores legíveis (`e1`, `v3`, `a2`, `o17`), com geração que **evita colisão** com identificadores já existentes (importados ou lidos de arquivo). O projeto recebe `p-<UUID v4>`. Motivo: legibilidade nos arquivos e nos diagnósticos; unicidade global só é necessária para o projeto.

### 3. Política de revisões (PD-03)

- Uma revisão é criada **nas operações**, nunca a cada tecla: criação, importação, análise, salvamento manual com alterações e restauração. As alterações feitas à mão entre operações são registradas como revisão `edit` no início da operação seguinte, de modo que nada se perde.
- **Nenhuma revisão é apagada automaticamente.** Revisões idênticas à anterior não são duplicadas. Restaurar cria uma nova revisão (`restore`) cujo pai é a restaurada.
- Compactação do histórico (por exemplo, referências em vez de cópias completas) **não foi implementada**: cada revisão guarda uma cópia completa da tabela. É adequada ao uso inicial (dezenas a centenas de linhas) e o arquivo é comprimido; o impacto será medido na ET10 e, se necessário, uma DT própria definirá a compactação sem perda de resultados vinculados.

### 4. Recuperação automática

- Após **2 s de pausa** na edição (`AUTOSAVE_DELAY_MS`), o espaço de trabalho é gravado no **IndexedDB** do navegador (no Windows, o do WebView). Cada nova alteração reinicia a contagem; não há cópia por tecla.
- A recuperação **só existe enquanto há alterações não salvas em arquivo**: é apagada ao salvar, abrir ou iniciar novo projeto.
- Na abertura, o aplicativo **oferece** restaurar ou descartar; não restaura sozinho.
- Os três estados são exibidos separadamente — alterações pendentes, recuperação local e arquivo — e a recuperação é descrita como local ao navegador, **não** como cópia de segurança externa. Falha do armazenamento é exibida (`recoveryError`) e a sessão segue editável.
- Alternativa descartada: Origin Private File System (suporte e depuração mais difíceis); IndexedDB é suficiente e funciona em Chrome, Edge e Firefox.

### 5. Salvar e abrir

- **Windows (Tauri):** diálogos nativos abertos pelo Rust; **o caminho nunca passa pelo JavaScript**. Gravação segura: arquivo temporário na mesma pasta → `sync` → releitura e conferência → cópia do arquivo anterior para `<nome>.bak` → renomeação. Falha em qualquer etapa antes da renomeação deixa o destino intocado. Lista de recentes em `recent.json` (pasta de dados do aplicativo), aberta por posição. Dependência: `tauri-plugin-dialog`.
- **Navegador:** abrir por seleção de arquivo; **salvar baixa** o arquivo. Não se promete atualizar o arquivo original (não há permissão para isso sem a File System Access API, de suporte desigual). A interface informa isso ao lado do botão.

### 6. Importação

- **CSV/TSV/TXT:** leitor próprio em TypeScript (RFC 4180, aspas, separador detectado e editável, UTF-8 com detecção de falha e retorno a Windows-1252 com aviso). O resultado é uma **grade de texto**: o texto é interpretado depois, pelas regras de entrada da grade.
- **XLSX:** leitura em **Rust** com `calamine` 0.37, compilado para WASM. Só **valores armazenados** são lidos; **fórmulas nunca são executadas**; fórmula sem valor armazenado vira vazia e é contada em aviso; datas viram número de série (avisadas); erros viram vazios (avisados). Limite de 2 milhões de células.
- **Papéis das colunas:** identificador da observação, unidade experimental, fator (quantitativo ou categórico), resposta ou ignorar. Blocos, tempos e réplicas como papéis próprios entram com os métodos que os usam (v0.2). **Réplicas × repetições de medição:** linhas com a mesma unidade experimental são medidas repetidas daquela unidade, não réplicas independentes; cada linha mantém identificador próprio, e o aplicativo não presume independência.
- **Matriz externa:** o mesmo assistente; colunas de fatores com colunas de resposta vazias. Nunca se deduz o planejamento pelo nome do arquivo.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| JSON único | Sem verificação de integridade nem anexos; o ZIP permite ambos |
| SQLite | Opaco para inspeção manual; dependência pesada no WASM |
| XLSX por biblioteca JS | Duplicaria a lógica fora do Rust e acrescentaria dependência; `calamine` já é testado e compila para WASM |
| Caminho do arquivo no JavaScript | Permitiria a um script injetado ler e gravar arquivos arbitrários |
| Hash de revisão calculado em TypeScript | Reimplementaria a serialização canônica; o Rust é a única fonte |

## Consequências

- `optima-project` depende de `zip`, `sha2`, `base64` e `calamine` ([dependências](../arquitetura/dependencias.md)).
- O tamanho do `.wasm` aumentou; será medido na ET10.
- A primeira migração real de esquema exigirá uma nova DT.
