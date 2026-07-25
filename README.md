# Hibero Extintores — site novo

Site institucional da **Hibero Extintores** (segurança contra incêndio desde 1995, São Paulo),
refeito do zero a partir do conteúdo real de `hiberoextintores.com.br`.

**Preview:** https://viniciusextremxd.github.io/hibero-extintores/

## Stack

HTML + CSS + JavaScript puro. Sem build, sem framework, sem dependência externa além
das fontes do Google. É só servir a pasta.

```
index.html
css/style.css
js/main.js
img/
```

## Conteúdo

Todo o texto vem do site real da empresa (missão, visão, valores, os 9 serviços com as
descrições oficiais, catálogo de produtos, classes de incêndio, certificações e os
contadores publicados: +1.500 clientes atendidos e +8.000 produtos vendidos). Os logos
de clientes (Exército Brasileiro, Marinha do Brasil, CPTM, Gerdau, Ministério da Fazenda,
Osasco Plaza Shopping) também estavam no site original.

A logo é o arquivo original do cliente, apenas redimensionado — não foi redesenhada.
As fotos de produto tiveram o fundo branco recortado por *flood fill* a partir das bordas
e foram exportadas em WebP com alfa para assentarem sobre o preto.

## Pendências antes de ir para o ar no domínio real

- E-mail e CNPJ da empresa (não constam no site atual).
- URLs reais de Instagram e Facebook (os ícones do rodapé antigo não têm link).
- Confirmar o nome do produto "Acionadores manuais" — no site antigo o card estava
  rotulado como "Placas de Sinalizações", mas a descrição é de botoeira.
- Trocar `og:image` para o domínio final (hoje aponta para o GitHub Pages).

O `canonical` já aponta para `https://hiberoextintores.com.br/`, então esta cópia de
preview não compete com o site do cliente na busca.
