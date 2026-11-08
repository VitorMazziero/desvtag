# DT-0035 — Caudas não centrais com orçamento numérico

| Campo | Valor |
|---|---|
| Estado | Aceita |
| Data | 2026-11-03 |
| Origem | Achado na ET24-T05/T06 antes da ampliação da potência |
| Pendências relacionadas | — |
| Substitui / substituída por | Complementa DT-0034 |

## Contexto

A F não central soma desde j=0 até aproximadamente λ/2, sem orçamento. Efeito finito extremo pode provocar um laço praticamente ilimitado. A t de Lenth começa com exp(−δ²/2): não centralidades grandes podem zerar os pesos, retornando CDF zero sem justificar a cauda. A simulação independente não pode confirmar essas falhas por acaso usando apenas os casos pequenos anteriores.

## Decisão

F não central: somar a mistura Poisson–beta a partir da moda de Poisson, com recorrências em ambos os sentidos e soma compensada. Peso da moda por logaritmo estável/Stirling quando necessário; janela 14√μ+60 em cada lado, μ=λ/2. Limite numérico explícito μ≤2.000.000 para essa quadratura discreta, evitando conversão inteira ou iteração ilimitada.

Antes de recusar uma não centralidade maior, pode-se certificar SF≈1 com erro absoluto ≤1e−12 pelo limite `P(F≤x) ≤ Φ(−√λ/2) + P(χ²_df2 ≥ λ df2/(4 df1 x))`. O limite exige df1≥1 (para 0<df1<1, fora do orçamento, a rotina falha explicitamente). Ele decorre da primeira coordenada normal do numerador não central e da independência do denominador. Só retornar 1 se esse limite de erro for satisfeito; caso contrário retornar falha numérica explícita, nunca um número substituto. Argumentos não finitos são tratados antes das conversões/laços.

t não central: conservar a série no domínio pequeno, usar quadratura condicional quando |δ|>8. Para t>0, `CDF=Φ(−δ)+∫_{−δ}^∞ φ(z) SF_χ²(df·[(z+δ)/t]²;df) dz`. Truncar a normal a [−12,12] (erro absoluto da massa omitida <4e−33), particionar também no centro da transição t−δ e refinar Gauss–Legendre adaptativamente por comparação de ordens. Exigir convergência; limite de refinamento explícito com falha se a tolerância não for atendida. Para t<0 usar simetria exata; t=0 tem CDF Φ(−δ). Não aproximar toda a t não central por normal.

As rotinas conservam assinatura pública, mas sua versão numérica e alcance precisam ser registrados na especificação; variantes novas da potência usam v2 conforme DT-0034. Erro no cálculo de distribuição não deve aparecer como n inválido se n era válido. Diagnóstico próprio em PT/EN e resultado antigo preservado.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
|---|---|
| Limitar o efeito digitado sem diagnóstico | Esconde o orçamento e restringe o usuário sem relação física. |
| Retornar potência 1 para qualquer efeito grande | Pode ser falso com gl pequeno/corte extremo. |
| Aumentar o número de iterações da série t | Não recupera pesos já zerados por underflow. |

## Critérios e evidências

[Definição t não central do SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.nct.html), [F não central](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ncf.html), consultadas em 2026-11-03. Implementação independente SciPy para λ moderado/grande, gl pequenos/grandes e cortes com CDF não trivial; verificar série antiga e limite certificado. Registrar tolerâncias absolutas e tempo, testar NaN/Inf antes do laço e falha fora do orçamento quando o limite não certificar. Nada disso é declarado implementado pela decisão.

## Consequências

A ET24 recebe este achado na referência de distribuições; testes prévios não cobriam efeito extremo. Paridade WASM/nativo e simulação devem incluir os novos casos. Sem ampliar o catálogo de testes estatísticos.
