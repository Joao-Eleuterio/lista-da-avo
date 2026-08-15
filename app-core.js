/* ============================================================
   CONFIGURAÇÃO — dados do teu projeto Supabase
   (Project Settings → API → Project URL e anon/public key)
   ============================================================ */
const SUPABASE_URL      = "https://wppvcquqgrjbooftfvuy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcHZjcXVxZ3JqYm9vZnRmdnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTgyMTgsImV4cCI6MjEwMjM5NDIxOH0.IH7243KPI6e0tvMuULb8zdUSyAhAhqOWEJrHwsQ6LdU";
/* ============================================================ */

const LS = { fid:"lc_familia_id", fnom:"lc_familia_nome", cod:"lc_codigo", nome:"lc_meu_nome", cat:"lc_cat" };
const HABITUAL_MIN_COMPRAS = 3; // após aparecer em 3 compras concluídas diferentes, o produto passa automaticamente a habitual

const CATS = [
  {id:"frescos",    nome:"Frescos",       emoji:"🥬"},
  {id:"talho",      nome:"Talho & Peixe", emoji:"🥩"},
  {id:"laticinios", nome:"Laticínios",    emoji:"🥛"},
  {id:"padaria",    nome:"Padaria",       emoji:"🍞"},
  {id:"mercearia",  nome:"Mercearia",     emoji:"🥫"},
  {id:"congelados", nome:"Congelados",    emoji:"🧊"},
  {id:"bebidas",    nome:"Bebidas",       emoji:"🥤"},
  {id:"limpeza",    nome:"Limpeza",       emoji:"🧼"},
  {id:"higiene",    nome:"Higiene",       emoji:"🧴"},
  {id:"outros",     nome:"Outros",        emoji:"📦"},
];
const CAT_MAP = Object.fromEntries(CATS.map(c=>[c.id,c]));

const CAT_KW = {
  frescos:["fruta","maça","maçã","banana","laranja","tomate","alface","cebola","batata","cenoura","legume","salada","pera","pêra","uva","limão","limao","alho","courgette","broco","brócol","pimento","morango","pepino","abobora","abóbora","couve","espinafre","clementina","tangerina","melão","melao","melancia","kiwi","ananas","ananás","cogumelo"],
  talho:["carne","frango","peru","porco","vaca","bife","salsicha","peixe","bacalhau","pescada","salmão","salmao","dourada","robalo","lombo","costeleta","almôndega","almondega","perna","coxa","hamburg","polvo","choco","camarão","camarao","linguiça","linguica"],
  laticinios:["leite","iogurte","queijo","manteiga","natas","ovo","requeijão","requeijao","fiambre","flan","pudim"],
  padaria:["pão","pao","broa","bolo","croissant","tosta","baguete","donut","panado"],
  mercearia:["arroz","massa","esparguete","feijão","feijao","grão","grao","farinha","açúcar","acucar","sal","azeite","óleo","oleo","café","cafe","cereais","bolacha","atum","conserva","molho","chá ","mel","compota","ketchup","maionese","mostarda","sopa","noodles","lentilha"],
  congelados:["gelado","congelad","ervilha","douradinho","pizza"],
  bebidas:["água","agua","sumo","vinho","cerveja","refrigerante","coca","sprite","fanta","ice tea","nectar","néctar"],
  limpeza:["detergente","lixívia","lixivia","sabão","sabao","esfregão","esfregao","amaciador","saco lixo","sacos lixo","papel cozinha","limpa vidros","tira gordura","lava tudo"],
  higiene:["champô","champo","gel banho","pasta dentes","dentífrico","dentifrico","papel higi","sabonete","desodoriz","fralda","toalhita","penso","cotonete","escova dentes"],
};
function guessCat(nome){
  const n = (nome||"").toLowerCase();
  for(const [cat,kws] of Object.entries(CAT_KW)) if(kws.some(k=>n.includes(k))) return cat;
  return "outros";
}

let db = null;
const configured = SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;
if (configured) db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = { familiaId:null, familiaNome:null, codigo:null, meuNome:null,
  lista:null, itens:[], canal:null, catSel:"auto", habituais:{saved:[],freq:[]}, habEdit:false };

const el = id => document.getElementById(id);
function toast(m){ const t=el("toast"); t.textContent=m; t.classList.add("show"); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove("show"),2200); }
function esc(s){ return (s||"").replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
const capd = s => s ? s.charAt(0).toUpperCase()+s.slice(1) : s;
function normalizarNome(s){
  return (s||"").trim().replace(/\s+/g," ").toLocaleLowerCase("pt-PT");
}

/* ---------------- ONBOARDING ---------------- */
function initOnboarding(){
  if(!configured) el("configWarn").classList.remove("hidden");
  const p = new URLSearchParams(location.search);
  if(p.get("familia")) el("obCodigo").value = p.get("familia").toUpperCase();
  el("goCriar").onclick  = ()=>{ el("formEntrar").classList.add("hidden"); el("formCriar").classList.remove("hidden"); };
  el("goEntrar").onclick = ()=>{ el("formCriar").classList.add("hidden"); el("formEntrar").classList.remove("hidden"); };

  el("btnEntrar").onclick = async ()=>{
    const nome=el("obNome1").value.trim(), cod=el("obCodigo").value.trim().toUpperCase();
    el("errEntrar").textContent="";
    if(!configured) return el("errEntrar").textContent="Configura o Supabase primeiro.";
    if(!nome) return el("errEntrar").textContent="Escreve o teu nome.";
    if(!cod)  return el("errEntrar").textContent="Escreve o código da família.";
    el("btnEntrar").textContent="A entrar…";
    const { data, error } = await db.rpc("avo_entrar_familia",{p_codigo:cod});
    el("btnEntrar").textContent="Entrar na lista";
    if(error){ el("errEntrar").textContent="Erro de ligação. Vê a consola."; console.error(error); return; }
    if(!data){ el("errEntrar").textContent="Código não encontrado."; return; }
    saveFamilia(data,null,cod,nome);
  };
  el("btnCriar").onclick = async ()=>{
    const nome=el("obNome2").value.trim(), fam=el("obFamNome").value.trim(), cod=el("obNovoCodigo").value.trim().toUpperCase();
    el("errCriar").textContent="";
    if(!configured) return el("errCriar").textContent="Configura o Supabase primeiro.";
    if(!nome||!fam||!cod) return el("errCriar").textContent="Preenche tudo.";
    if(cod.length<4) return el("errCriar").textContent="Código demasiado curto (mín. 4).";
    el("btnCriar").textContent="A criar…";
    const { data, error } = await db.rpc("avo_criar_familia",{p_nome:fam,p_codigo:cod});
    el("btnCriar").textContent="Criar e começar";
    if(error){ el("errCriar").textContent=/duplicate|unique/i.test(error.message)?"Esse código já existe. Escolhe outro.":"Erro. Vê a consola."; console.error(error); return; }
    saveFamilia(data,fam,cod,nome);
  };
}
function saveFamilia(id,fam,cod,nome){
  localStorage.setItem(LS.fid,id);
  if(fam) localStorage.setItem(LS.fnom,fam);
  localStorage.setItem(LS.cod,cod); localStorage.setItem(LS.nome,nome);
  boot();
}

/* ---------------- ARRANQUE ---------------- */
async function boot(){
  state.familiaId  = localStorage.getItem(LS.fid);
  state.familiaNome= localStorage.getItem(LS.fnom) || "A tua família";
  state.codigo     = localStorage.getItem(LS.cod);
  state.meuNome    = localStorage.getItem(LS.nome);
  state.catSel     = localStorage.getItem(LS.cat) || "auto";

  if(!state.familiaId){
    el("onboarding").classList.remove("hidden"); el("app").hidden=true; initOnboarding(); return;
  }
  el("onboarding").classList.add("hidden"); el("app").hidden=false;
  el("famName").textContent = state.familiaNome;
  renderCatSel();
  bindApp();
  await carregarListaAtual();
  loadHabituais();
  subscribeRealtime();
}

/* ---------------- CATEGORIA SELECTOR ---------------- */
function renderCatSel(){
  const all=[{id:"auto",nome:"Auto",emoji:"✨"},...CATS];
  el("catSel").innerHTML = all.map(c=>`<button class="chip ${state.catSel===c.id?'on':''}" data-id="${c.id}">${c.emoji} ${c.nome}</button>`).join("");
}

/* ---------------- LISTA ---------------- */
async function carregarListaAtual(){
  let { data:listas, error } = await db.from("avo_listas").select("*")
    .eq("familia_id",state.familiaId).eq("estado","aberta").order("created_at",{ascending:false}).limit(1);
  if(error){ console.error(error); toast("Erro a carregar."); return; }
  if(!listas || !listas.length){
    const ins = await db.from("avo_listas").insert({familia_id:state.familiaId}).select().single();
    if(ins.error){ console.error(ins.error); return; }
    state.lista = ins.data;
  } else state.lista = listas[0];
  await carregarItens();
}
async function carregarItens(){
  const { data, error } = await db.from("avo_itens").select("*")
    .eq("lista_id",state.lista.id).order("created_at",{ascending:true});
  if(error){ console.error(error); return; }
  state.itens = data || [];
  renderHoje();
  renderHabituais();
}

function renderHoje(){
  const wrap = el("listaHoje");
  const total = state.itens.length;
  const feitos = state.itens.filter(i=>i.comprado).length;

  el("progDate").textContent = capd(new Date().toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long"}));
  const fill = el("progFill");
  if(total===0){ el("progLabel").textContent="Nada na lista ainda"; fill.style.width="0%"; fill.classList.remove("done"); }
  else if(feitos===total){ el("progLabel").innerHTML="Tudo no carrinho! 🎉"; fill.style.width="100%"; fill.classList.add("done"); }
  else { el("progLabel").innerHTML=`Faltam <b>${total-feitos}</b> de ${total}`; fill.style.width=Math.round(feitos/total*100)+"%"; fill.classList.remove("done"); }
  el("btnFinish").disabled = total===0;

  if(total===0){
    wrap.innerHTML = `<div class="empty"><div class="big">📝</div><p><b>Lista vazia.</b></p>
      <p>Adiciona produtos, usa os habituais, ou:</p>
      <button class="btn-inline" id="btnRepeatEmpty">↻ Repetir a última compra</button></div>`;
    return;
  }

  let html="";
  for(const c of CATS){
    const items = state.itens.filter(i=>(i.categoria||"outros")===c.id);
    if(!items.length) continue;
    items.sort((a,b)=>(a.comprado?1:0)-(b.comprado?1:0) || new Date(a.created_at)-new Date(b.created_at));
    const done = items.filter(i=>i.comprado).length;
    html += `<div class="cat"><div class="cat-h"><span class="ce">${c.emoji}</span>${c.nome}<span class="cc">${done}/${items.length}</span></div>`;
    html += `<div class="items">${items.map(itemRow).join("")}</div></div>`;
  }
  wrap.innerHTML = html;
}
function itemRow(i){
  const meta=[i.marca?esc(i.marca):"", i.adicionado_por?("por "+esc(i.adicionado_por)):""].filter(Boolean).join(" · ");
  const thumb=i.imagem_url?`<img class="thumb" src="${esc(i.imagem_url)}" alt="" onerror="this.remove()">`:"";
  return `<div class="item ${i.comprado?'done':''}" data-id="${i.id}">
    <button class="check" aria-label="Marcar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M20 6 9 17l-5-5"/></svg></button>
    ${thumb}
    <div class="body"><div class="nm">${esc(i.nome)}</div>${meta?`<div class="meta">${meta}</div>`:""}</div>
    <div class="stepper">
      <button class="st-btn" data-act="dec" aria-label="Menos">−</button>
      <span class="st-n">${i.quantidade||1}</span>
      <button class="st-btn" data-act="inc" aria-label="Mais">+</button>
    </div>
    <button class="del" aria-label="Remover"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
  </div>`;
}

async function addItem(nome, categoria, extra={}){
  nome=(nome||"").trim().replace(/\s+/g," ");
  if(!nome || !state.lista) return false;

  const chave=normalizarNome(nome);
  if(state.itens.some(i=>normalizarNome(i.nome)===chave)){
    toast("Já existente na lista.");
    return false;
  }

  const cat = categoria || (state.catSel==="auto"?guessCat(nome):state.catSel);
  const row={ lista_id:state.lista.id, familia_id:state.familiaId, nome, quantidade:1, categoria:cat,
    adicionado_por:state.meuNome||null, imagem_url:extra.imagem_url||null, marca:extra.marca||null };
  const temp={...row, id:"tmp-"+Date.now(), comprado:false, created_at:new Date().toISOString()};
  state.itens.push(temp); renderHoje(); renderHabituais();

  const { data, error } = await db.from("avo_itens").insert(row).select().single();
  if(error){
    console.error(error);
    state.itens=state.itens.filter(i=>i.id!==temp.id);
    renderHoje(); renderHabituais();
    if(error.code==="23505" || /duplicate|unique/i.test(error.message||"")) toast("Já existente na lista.");
    else toast("Não deu para adicionar.");
    return false;
  }
  const idx=state.itens.findIndex(i=>i.id===temp.id); if(idx>-1) state.itens[idx]=data;
  renderHoje(); renderHabituais();
  return true;
}
async function toggleItem(id){
  const it=state.itens.find(i=>i.id===id); if(!it||String(id).startsWith("tmp")) return;
  const novo=!it.comprado; it.comprado=novo; it.comprado_at=novo?new Date().toISOString():null; renderHoje();
  const { error } = await db.from("avo_itens").update({comprado:novo, comprado_at:it.comprado_at}).eq("id",id);
  if(error){ console.error(error); it.comprado=!novo; renderHoje(); }
}
async function changeQty(id, delta){
  const it=state.itens.find(i=>i.id===id); if(!it||String(id).startsWith("tmp")) return;
  const nova=Math.max(1,(it.quantidade||1)+delta); if(nova===it.quantidade) return;
  it.quantidade=nova; renderHoje();
  const { error } = await db.from("avo_itens").update({quantidade:nova}).eq("id",id);
  if(error) console.error(error);
}
async function removeItem(id){
  state.itens=state.itens.filter(i=>i.id!==id); renderHoje(); renderHabituais();
  if(String(id).startsWith("tmp")) return;
  const { error } = await db.from("avo_itens").delete().eq("id",id);
  if(error){ console.error(error); toast("Erro a remover."); carregarItens(); }
}
async function terminarCompras(){
  if(!state.itens.length) return;
  if(!confirm("Terminar as compras de hoje? A lista vai para o histórico e começa uma nova.")) return;
  const { error } = await db.from("avo_listas").update({estado:"fechada", fechada_at:new Date().toISOString()}).eq("id",state.lista.id);
  if(error){ console.error(error); toast("Erro."); return; }
  await promoverHabituaisFrequentes();
  toast("Compras guardadas no histórico 🎉");
  state.lista=null; state.itens=[];
  await carregarListaAtual(); loadHabituais();
}

async function repetirUltima(){
  const { data:listas } = await db.from("avo_listas").select("id")
    .eq("familia_id",state.familiaId).eq("estado","fechada").order("fechada_at",{ascending:false}).limit(1);
  if(!listas || !listas.length) return toast("Ainda não há compras anteriores.");
  const { data:ant } = await db.from("avo_itens").select("nome,categoria,quantidade").eq("lista_id",listas[0].id);
  if(!ant || !ant.length) return toast("A última compra estava vazia.");
  const tenho=new Set(state.itens.map(i=>normalizarNome(i.nome)));
  const unicos=new Map();
  ant.forEach(i=>{
    const k=normalizarNome(i.nome);
    if(!k || tenho.has(k) || unicos.has(k)) return;
    unicos.set(k,i);
  });
  const novos=[...unicos.values()].map(i=>({
    lista_id:state.lista.id, familia_id:state.familiaId, nome:i.nome.trim(), categoria:i.categoria,
    quantidade:i.quantidade||1, adicionado_por:state.meuNome||null }));
  if(!novos.length) return toast("Já tens tudo o que estava na última.");
  if(state.itens.length && !confirm(`Adicionar ${novos.length} produtos da última compra?`)) return;
  const { error } = await db.from("avo_itens").insert(novos);
  if(error){ console.error(error); return toast("Erro."); }
  toast(`+${novos.length} da última compra`);
  carregarItens();
}
