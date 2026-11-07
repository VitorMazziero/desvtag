# Evidências da ET22

Aplicativo real em `http://127.0.0.1:4173/`, motor Rust/WASM, e aplicativo Windows 10/WebView2 com motor nativo. Dados sintéticos dos exemplos 07/08/11/12. Não houve publicação.

- `browser/`: seis temas × PT/EN × quatro famílias; captura após aguardar fontes e pintura. Os testes medem 375/800/1200/1920 px e texto até 200%, incluindo axe. Tabelas e figuras largas possuem rolagem própria.
- `reports-final/`: HTML/PDF/Word e renderização dos PDFs depois das correções visuais. Inclui consulta ao pareado anterior ao modelo misto. Os relatórios foram pedidos com apenas Exportar visível e mantêm todas as seções.
- `acceptance/`: arquivos e capturas do aceite final (18/18 nos três motores), incluindo CSV/XLSX de precisão completa e comentários do registro histórico.
- `native/`: Monod e potência calculados do zero no WebView2, recuperados juntos após recarregar, curva original idêntica e HTML/PDF/Word. PDFs renderizados para inspeção. O diálogo de exportação é substituído pelo destino de automação compilado somente no executável de teste; a escrita e o motor são nativos.
- `diagnostic/`: inspeção de pintura/coluna fixa e recuperação; capturas auxiliares, não equivalem ao aceite final.
- `reports/`: renderização intermediária que revelou o resumo repetido e o título de variâncias sem tabela; foi superada por `reports-final/`, preservada como diagnóstico.

`SHA256SUMS.txt` identifica os arquivos. O [relatório](../../../validation/reports/et22/README.md) registra verificações, falhas iniciais, correções e limites. As evidências da auditoria, ET29 e ET27 foram preservadas.
