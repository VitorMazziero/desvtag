# Persistência das famílias — ET22

Arquivos gerados explicitamente pelos testes Rust `optima-project/tests/family_storage.rs`. Cada documento JSON acompanha seu contêiner `.enzitag`. Os números foram calculados pelo próprio núcleo para criar estruturas válidas; estes arquivos verificam **persistência e contrato**, não são referências independentes dos métodos científicos.

Cobrem: quatro famílias opcionais; duas análises imutáveis da mesma família; pareado e misto; configuração editada diferente da usada; metadados de motor anterior; variável excluída apenas da revisão atual; comentário que continua ligado à análise histórica; documento anterior sem campos novos. O rótulo antigo de motor no caso não linear é um marcador de teste de preservação, não uma afirmação de que o arquivo foi calculado pela versão 0.3.

Geração: definir `OPTIMA_FAMILY_FIXTURES` com o caminho desta pasta e executar `cargo test -p optima-project --test family_storage` em `app/`. Sem essa variável, os testes não gravam no repositório. `SHA256SUMS.txt` identifica os documentos e contêineres.

A interface deve carregar e gravar exatamente os registros e seleções. A comparação WASM×nativo e a navegação/relatórios serão acrescentados ao longo da ET22; a existência destes arquivos ainda não declara concluída essa integração.
