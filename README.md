# Opus 5.5, explicado

Landing page em português que explica, para quem não é da área, o que mudou no Claude Opus 5.5: as novidades, onde ele fica na família Claude, como se compara ao GPT, quanto custa e se é seguro.

Página independente de divulgação, sem vínculo com a Anthropic. Os números vêm de fontes públicas de setembro e outubro de 2026 (lista abaixo).

## Como abrir

É um site estático, sem etapa de build. Abra o `index.html` no navegador (precisa de internet para carregar as fontes e o GSAP) ou sirva a pasta localmente:

```bash
python -m http.server 5174
```

Depois acesse http://localhost:5174.

## O que tem na página

- **Preloader:** uma frase cheia de enrolação ("Ótima pergunta! Antes de tudo, vale lembrar que...") perde uma palavra a cada passo real do carregamento (fontes, imagens e cenas 3D) até sobrar "Opus 5.5". Depois, a tela escura encolhe e vira a faixa do título. Tem botão Pular (ou Esc), é mais curto quando a pessoa volta na mesma sessão e não aparece com movimento reduzido nem em links diretos para uma seção.
- **Abertura:** o nome com uma faixa que mostra tarefas reais do anúncio. Atrás dele, em 3D, flutuam pedaços de palavras (tokens), que reagem ao mouse e são puxados pela faixa quando ela se abre na tela inteira.
- **Menos papo, mais resposta:** a mesma resposta encolhe de 57 para 21 palavras (exemplo ilustrativo do estilo).
- **Família Claude:** Haiku, Sonnet, Opus e Fable, com preços e datas.
- **Novidades:** quatro mudanças, cada uma com uma foto de arquivo como metáfora.
- **Do tamanho de uma pilha (3D):** as 680 mil linhas migradas viram uma pilha de papel que cresce com a rolagem até 11.334 folhas e 1,13 m, ao lado de uma mesa de escritório de 75 cm. Depois, uma faixa laranja percorre a pilha, mostrando a migração. Conta usada: 60 linhas por folha e 0,1 mm por folha.
- **Seletor de esforço:** um botão giratório com os cinco níveis.
- **Números contra o Opus 5** e **comparativo com o GPT** prova por prova, incluindo onde o GPT vence.
- **Preço, dúvidas frequentes, fechamento e rodapé com as fontes.**

## Tecnologia

HTML, CSS e JavaScript puros. Animações com [GSAP 3.13](https://gsap.com) e os plugins ScrollTrigger, ScrollSmoother, SplitText, Flip, Draggable, DrawSVG e CustomEase. Cenas 3D com [Three.js r170](https://threejs.org) (módulo ES). Tudo carregado do jsDelivr. Sem WebGL, a seção da pilha mostra uma foto no lugar da cena. Tipografia Barlow Condensed e Barlow (Google Fonts). Respeita a preferência de movimento reduzido do sistema.

```
index.html      a página
css/style.css   estilos
js/main.js      interações e animações
js/three-scenes.js  as duas cenas 3D (tokens e pilha)
assets/         fotos e vídeo (créditos abaixo)
```

## Fontes dos dados

- [Anúncio oficial do Claude Opus 5.5](https://www.anthropic.com/news/claude-opus-5-5) (22/09/2026)
- [Anúncio do Claude Sonnet 5.5](https://www.anthropic.com/news/claude-sonnet-5-5) (28/09/2026)
- [Anúncio do Claude Haiku 5.5](https://www.anthropic.com/news/claude-haiku-5-5) (07/10/2026)
- [DeepLearning.AI, The Batch](https://www.deeplearning.ai/the-batch/claude-opus-5-5-leaps-forward)
- [Vals AI, Opus 5.5 e GPT-5.6 Sol](https://www.vals.ai/comparisons/anthropic_claude-opus-5-5-vs-openai_gpt-5.6-sol)
- [PCWorld](https://www.pcworld.com/article/3241475/claude-opus-5-5-promises-to-cut-the-chatter.html)

## Créditos das imagens

Todas exibidas em preto e branco na página.

| Arquivo | Autor | Licença | Origem |
| --- | --- | --- | --- |
| `real-gabinete-portugues-de-leitura-8735773218.jpg` | Mayumi Ishikawa | CC BY-SA 2.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:%E3%83%AA%E3%82%AA%E3%81%AE%E5%B9%BB%E6%83%B3%E5%9B%B3%E6%9B%B8%E9%A4%A8_Real_Gabinete_Portugues_de_Leitura_(8735773218).jpg) |
| `olivetti-dora-portable-typewriter.webm` (e o pôster) | Erik Pålsson | CC BY 3.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Olivetti_Dora_portable_typewriter.webm) |
| `olympia-simplex.jpg` | Sammlung der Medien und Wissenschaft | CC BY 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Olympia_Simplex.jpg) |
| `western-union-telegram-to-jane-judge-of.jpg` | Autor desconhecido | Domínio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Western_Union_telegram_to_Jane_Judge_of_Georgia_from_Annie_G._Wright_on_passage_of_Nineteenth_Amendment,_August_26,_1920.jpg) |
| `margaret-hamilton-restaured.jpg` | Draper Laboratory; restauração de Wilfredor e Yann | Domínio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Margaret_Hamilton_restaured.jpg) |
| `stoppuhr-hanhart.jpg` | StefanPohl | Domínio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Stoppuhr_hanhart.jpg) |
| `padlock.jpg` | The Metropolitan Museum of Art | CC0 | [The Met](https://www.metmuseum.org/art/collection/search/463365) |
| `telegrafo-de-ordes-001-mpm-san-cibrao.jpg` | Fernando Losada Rodríguez | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tel%C3%A9grafo_de_ordes.001_-_MPM_San_Cibrao.jpg) |
