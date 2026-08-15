# 🛒 Lista da Avó

> ✅ **Base de dados própria já instalada** — projeto Supabase dedicado **"Lista da Avó"** (`wppvcquqgrjbooftfvuy`, eu-central-1), totalmente separado da tua outra app. O `index.html` já vem com o URL e a chave anon deste projeto preenchidos. Só falta o GitHub Pages (Passo 3).


Lista de compras partilhada para as compras semanais dos avós. Toda a família adiciona produtos, marca o que já está no carrinho, e vê tudo a sincronizar em tempo real.

**Stack:** GitHub Pages (frontend) + Supabase (base de dados + realtime). Instala-se como app no telemóvel (PWA). **Custo: 0€.**

## O que tem
- **Lista por categorias** — frescos, talho & peixe, laticínios, padaria, mercearia, congelados, bebidas, limpeza, higiene, outros. Organizada por corredores para andares menos no supermercado. Ao adicionar, o **Auto ✨** adivinha a categoria pelo nome (ou escolhes tu no chip).
- **Quantidades com contador +/−** — cada produto tem − 1 + direto na linha.
- **Produtos habituais (1 toque)** — podem ser guardados manualmente e também entram automaticamente depois de serem comprados em **3 compras concluídas diferentes**. Não são permitidos duplicados.
- **Repetir a última compra** — um botão copia a lista da semana anterior para hoje sem duplicar produtos.
- **Proteção contra duplicados** — se tentares adicionar novamente o mesmo produto à lista, aparece **“Já existente na lista.”**. A proteção existe no frontend e também na base de dados.
- **Partilhado + tempo real** — código de família, sem login. Realtime do Supabase mantém todos os telemóveis sincronizados.
- **Histórico** — cada *Terminar compras* fecha a lista e guarda-a por data.
- **Pesquisa de produtos reais** — via Open Food Facts (grátis, sem chave), com marca e imagem.

---

## Passo 1 — Supabase
1. Cria um projeto grátis em **[supabase.com](https://supabase.com)**.
2. **SQL Editor** → cola o `supabase.sql` → **Run**.
3. **Project Settings → API** → copia o **Project URL** e a **anon / public key**.

> **Se já tinhas a versão anterior instalada:** podes correr novamente o `supabase.sql` completo. Esta versão adiciona os índices anti-duplicados e a função dos habituais automáticos.
>
> Para apagar o histórico criado apenas para testes, corre **uma única vez** o ficheiro `limpar_historico_teste.sql` no SQL Editor do Supabase.

## Passo 2 — Configurar
No topo do `<script>` do `index.html`:
```js
const SUPABASE_URL      = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGc...";
```

## Passo 3 — GitHub Pages
1. Cria um repositório e faz upload de **todos os ficheiros** desta pasta.
2. **Settings → Pages → Deploy from a branch** → `main` / `root` → **Save**.
3. Fica em `https://o-teu-user.github.io/nome-do-repo/`.

---

## Como usar
- **1ª pessoa:** *Criar família* → nome + **código** (ex: `AVOS24`).
- **Restantes:** mesmo link, nome + **código** → mesma lista. Nas **Definições** copias o link de convite já com o código.
- **Adicionar:** escreve o produto (categoria em Auto ou escolhe o chip) → **+**. Ajusta a quantidade com **− / +** na linha.
- **Habituais:** botão *Habituais* → toca num chip para adicionar; *editar* para guardar/remover.
- **Repetir última:** botão *Repetir última* (ou no ecrã vazio).
- **Marcar:** toca no produto para o pôr no carrinho.
- **Terminar compras:** fecha a lista de hoje → vai para o **Histórico**.

### Instalar no telemóvel
- **Android/Chrome:** menu → *Adicionar ao ecrã principal*.
- **iPhone/Safari:** partilhar → *Adicionar ao ecrã principal*.

---

## Custos
Tudo no *free tier*. Projetos Supabase grátis pausam após ~1 semana sem atividade — como usas todos os fins de semana, não deve pausar; se pausar, reativas com 1 clique.

## 🔒 Segurança
Modelo de **código/UUID não-adivinhável**: quem tem o código entra. A tabela de famílias está fechada (códigos não são enumeráveis); listas/itens/habituais são acessíveis a quem conhece o `familia_id`. Perfeito para uma lista de compras. Para dados mesmo privados, dá para migrar para **Supabase Auth** (magic link) + policies por `auth.uid()` — posso ajudar quando quiseres.


## APIs de produtos e preços

- A pesquisa de produtos continua a usar **Open Food Facts**, uma base aberta com API para nome, marca, imagem, código de barras e informação do produto.
- Para preços existe o projeto **Open Prices** da Open Food Facts, também com REST API. Há dados de Portugal e existem localizações Pingo Doce registadas, mas os preços são comunitários e a cobertura não é garantida para todos os produtos/lojas.
- Não foi encontrada uma API pública oficial do Pingo Doce para catálogo/preços em tempo real. Por isso, não convém depender de scraping privado como base principal desta app.
