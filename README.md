# Moedas da Sabedoria

Jogo web de plataforma (2D) para ensinar educação financeira — Projeto de Extensão Curricular de **Kauan Gouveia Cipullo** (Análise e Desenvolvimento de Sistemas, UniSanta).
É um site **estático**: HTML + JavaScript + imagens, sem servidor, sem banco de dados e sem instalação.

## Como abrir para testar

O jeito mais simples é abrir um servidor local dentro desta pasta:

```
python -m http.server 8000
```

Depois acesse http://localhost:8000 no navegador (Chrome, Edge ou Firefox).
(Abrir o `index.html` com duplo clique também costuma funcionar, mas alguns navegadores bloqueiam a fonte/áudio via `file://`.)

## Como publicar (para apresentar na rua)

Basta subir **esta pasta inteira** (`index.html`, `js/`, `assets/`) em qualquer hospedagem estática:

- **Netlify Drop**: arraste a pasta em https://app.netlify.com/drop e receba um link na hora.
- **GitHub Pages**: coloque os arquivos em um repositório → Settings → Pages.
- **Vercel / Cloudflare Pages / hospedagem da faculdade**: envie os arquivos como estão.

Depois da primeira abertura o jogo não depende de internet (a fonte e os sons já estão no pacote).

## Dicas para a apresentação

- Tecla **F** (ou ícone ⛶ no topo) coloca em tela cheia; tecla **M** (ou ícone 🔊 no topo) liga/desliga o som; **P** pausa.
- Em telas de toque aparecem botões virtuais automaticamente (`?touch=1` força a exibição): setas para andar e um único botão **A**, que pula e também interage/confirma.
- Se ninguém mexer por 2,5 minutos, o jogo volta sozinho para a tela inicial (bom para quem chega depois).
- Uma partida completa leva de 8 a 12 minutos. Para mostrar uma fase específica: `?fase=3` (1 a 5).
  Também aceita `&dinheiro=200&poupanca=100&divida=150` para simular situações.

## Controles

| Ação | Teclas |
|------|--------|
| Andar | Setas ← → ou A / D |
| Pular (2x no ar) | Espaço, seta ↑ ou W |
| Interagir (cofrinho, dicas, decisões) | E ou Enter |
| Menus e escolhas | Setas + Enter (ou mouse / toque) |

## Estrutura das fases e conteúdo educativo

| Fase | Mecânica | Conteúdo |
|------|----------|----------|
| 1 – Ganhar & Guardar | Moedas, estrelas de lazer (R$15), cofrinhos que rendem 8% por fase | Gastar × poupar, juros compostos |
| 2 – Necessidades vs Desejos | Caixas de contas bloqueiam o caminho; gemas brilhantes são desejos | Priorização de gastos |
| 3 – Armadilhas do Crédito | Ofertas parceláveis (+30%), Parcela/Juros/Cartão/Cheque especial como inimigos, dívida cresce 20% por fase | Riscos do crédito e juros |
| 4 – Investimentos | Caminho de cima (seguro, +R$30) ou de baixo (arriscado: 60% de +R$110, 40% de −R$55) | Risco × retorno |
| 5 – Realizar o Sonho | Sr. Dívida cresce conforme a dívida; no fim as dívidas são pagas e o sonho é comprado | Planejamento de longo prazo |

Entre as fases há um **quiz** (Dona Poupança) e uma **escolha de história** (festa/curso/guardar, reserva de emergência, quitar dívida, escolha do sonho).
Existem 5 finais: Sonho realizado (dourado), Sonho realizado (com ressalvas), Quase lá, Sonho adiado e O Sr. Dívida venceu.

## Onde mexer para ajustar o jogo

- `js/levels.js`: mapas das fases (posição de moedas, inimigos, preços), textos do quiz, custos dos sonhos (`DREAMS`).
- `js/world.js`: regras de dinheiro (`COIN_VALUE`, `STAR_COST`), dano, juros de investimento (`chestResult`).
- `js/scenes.js`: juros (8% poupança / 20% dívida em `finishPhase`), resumos e finais.
- `js/config.js`: nome do autor, faculdade e curso (aparecem na tela inicial, em "Sobre o projeto" e no final).
- `js/audio.js` + `js/sfx-data.js`: efeitos sonoros (amostras embutidas em base64, com sons sintetizados de reserva). Para trocar um som, mude o mapeamento em `sfx-data.js`.
- `assets/`: sprites (copiados da pasta `sprites` do projeto), a fonte pixel e `ebook.pdf` (e-book baixável ao final do jogo — para trocar o material, substitua esse arquivo mantendo o nome).

## Créditos

- Sprites: pacote gratuito da CraftPix (licença em https://craftpix.net/file-licenses/).
- Fonte "Press Start 2P" (licença OFL) — `assets/fonts/LICENSE-PressStart2P.txt`.
- Efeitos sonoros: Wario Land III (Game Boy Color) © Nintendo — material de terceiros, usado só de forma educacional/sem fins lucrativos; troque por sons livres (ex.: freesound.org, OpenGameArt) se for divulgar publicamente.
- Música e sons de digitação: sintetizados em código (WebAudio).
