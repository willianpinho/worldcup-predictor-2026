# Prompt de predição (saída JSON para importar)

Cole o prompt abaixo no **Claude** e no **Gemini** (de preferência com busca na web
ativada). Troque o valor de `"model"` para `"claude"` ou `"gemini"` conforme a IA.
A resposta é **só o JSON** — cole inteiro na tela `/admin` → "Importar palpites".

O JSON precisa bater com este formato (validado por Zod na importação):

```json
{
  "model": "claude",
  "predictions": [
    {
      "group": "A",
      "teamA": "Mexico",
      "teamB": "South Africa",
      "scoreA": 2,
      "scoreB": 0,
      "probWinA": 60,
      "probDraw": 25,
      "probWinB": 15,
      "confidence": "media",
      "reasoning": "Mando + altitude."
    }
  ]
}
```

- Os nomes das seleções podem vir em PT ou EN e em qualquer ordem — o app normaliza
  e casa pelo par de times (a tabela de aliases cobre PT-BR; nomes não reconhecidos
  são reportados como "não casados" no resultado da importação).
- `probWinA + probDraw + probWinB` idealmente somam 100 (são normalizados de qualquer forma).
- `scoreA`/`scoreB` são inteiros ≥ 0. `confidence` ∈ {alta, media, baixa} (opcional).

---

## Prompt

```text
Você é um analista quantitativo de futebol. Preveja TODOS os 72 jogos da fase de
grupos da Copa do Mundo FIFA 2026 (EUA/Canadá/México, 48 seleções, 12 grupos A–L,
disputados entre 11 e 27 de junho de 2026). Use a tabela e o sorteio OFICIAIS da FIFA;
se tiver acesso à internet, confirme grupos, confrontos e datas reais.

Pondere, para cada jogo: força do elenco e qualidade individual; ranking FIFA e
desempenho recente (eliminatórias + amistosos dos últimos 12 meses); forma dos
jogadores-chave na temporada 2025/26; lesões/suspensões/cortes na convocação final;
esquema tático e histórico do treinador; confrontos diretos; contexto da sede
(viagem, fuso, ALTITUDE na Cidade do México, CALOR e UMIDADE do verão, gramado);
vantagem de mando para os anfitriões; e sinais de mercado (odds).

Para cada jogo, derive a probabilidade de Vitória do mandante / Empate / Vitória do
visitante (somando 100%) e o placar mais provável. Seja calibrado: prefira acurácia
honesta a falsa confiança.

RESPONDA APENAS COM JSON VÁLIDO, sem texto antes ou depois, exatamente neste formato:

{
  "model": "claude",
  "predictions": [
    {
      "group": "A",
      "teamA": "<mandante>",
      "teamB": "<visitante>",
      "scoreA": <int>,
      "scoreB": <int>,
      "probWinA": <0-100>,
      "probDraw": <0-100>,
      "probWinB": <0-100>,
      "confidence": "alta|media|baixa",
      "reasoning": "<1 frase com o sinal principal>"
    }
  ]
}

Inclua os 72 jogos da fase de grupos. Não invente seleções, jogos ou estatísticas.
```

> Para o Gemini, troque `"model": "claude"` por `"model": "gemini"` na instrução.
