/* ---------------- HABITUAIS ---------------- */
async function promoverHabituaisFrequentes(){
  if(!db || !state.familiaId) return;
  const { error } = await db.rpc("avo_promover_habituais",{
    p_familia_id:state.familiaId,
    p_min_compras:HABITUAL_MIN_COMPRAS
  });
  if(error) console.warn("Não foi possível atualizar habituais automáticos:",error);
}
async function loadHabituais(){
  const fid=state.familiaId;
  await promoverHabituaisFrequentes();
  const {data:h,error} = await db.from("avo_habituais").select("*").eq("familia_id",fid).order("created_at");
  if(error){ console.error(error); return; }
  state.habituais={saved:h||[],freq:[]};
  renderHabituais();
}
function renderHabituais(){
  const box=el("habChips"); if(!box) return;
  const noHoje=new Set(state.itens.map(i=>normalizarNome(i.nome)));
  const saved=state.habituais.saved.filter(x=>!noHoje.has(normalizarNome(x.nome)));
  const edit=state.habEdit;
  box.innerHTML = saved.map(x=>`<button class="hab-chip" data-nome="${esc(x.nome)}" data-cat="${x.categoria}" data-id="${x.id}">
    <span>${CAT_MAP[x.categoria]?CAT_MAP[x.categoria].emoji:''} ${esc(x.nome)}</span>${edit?`<span class="x" data-act="del">✕</span>`:''}</button>`).join("")
    || `<div class="hab-empty">Sem habituais ainda. Podes guardar um produto manualmente em baixo. Produtos que aparecem em ${HABITUAL_MIN_COMPRAS} compras concluídas diferentes passam automaticamente para aqui.</div>`;
}
async function addHabitual(nome, categoria){
  nome=(nome||"").trim().replace(/\s+/g," "); if(!nome) return false;
  const chave=normalizarNome(nome);
  if(state.habituais.saved.some(x=>normalizarNome(x.nome)===chave)){
    toast("Já está nos habituais.");
    return false;
  }
  const cat=categoria || (state.catSel==="auto"?guessCat(nome):state.catSel);
  const { error } = await db.from("avo_habituais").insert({familia_id:state.familiaId, nome, categoria:cat});
  if(error){
    if(error.code==="23505" || /duplicate|unique/i.test(error.message||"")) toast("Já está nos habituais.");
    else { console.error(error); toast("Erro."); }
    return false;
  }
  toast("Guardado nos habituais ★"); await loadHabituais();
  return true;
}
async function delHabitual(id){
  const { error } = await db.from("avo_habituais").delete().eq("id",id);
  if(error){ console.error(error); return toast("Erro."); }
  loadHabituais();
}

/* ---------------- PESQUISA (Open Food Facts) ---------------- */
let searchTimer=null;
async function buscarProdutos(termo){
  const url=`https://pt.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(termo)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,image_small_url,code`;
  const r=await fetch(url); const j=await r.json(); const seen=new Set();
  return (j.products||[]).filter(p=>{ if(!p.product_name) return false; const k=p.product_name.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,12);
}
function renderResultados(prods){
  const box=el("searchResults");
  if(!prods.length){ box.innerHTML=""; el("searchHint").textContent="Sem resultados. Adiciona à mão em cima."; return; }
  el("searchHint").textContent=`${prods.length} resultados · toca para adicionar`;
  box.innerHTML = prods.map((p,idx)=>{
    const img=p.image_small_url?`<img src="${esc(p.image_small_url)}" alt="" onerror="this.outerHTML='<div class=&quot;ph&quot;>🛒</div>'">`:`<div class="ph">🛒</div>`;
    return `<button class="result" data-i="${idx}">${img}<div class="info"><div class="n">${esc(p.product_name)}</div>${p.brands?`<div class="b">${esc(p.brands)}</div>`:""}</div><span class="plus">+</span></button>`;
  }).join("");
  box.querySelectorAll(".result").forEach(node=>{
    node.onclick=async ()=>{ const p=prods[+node.dataset.i];
      const ok=await addItem(p.product_name, undefined, {imagem_url:p.image_small_url||null, marca:(p.brands||"").split(",")[0].trim()||null});
      if(ok) toast("Adicionado ✓"); };
  });
}

/* ---------------- HISTÓRICO ---------------- */
async function carregarHistorico(){
  const box=el("histList"); box.innerHTML=`<div class="hint">A carregar…</div>`;
  const { data:listas, error } = await db.from("avo_listas").select("*")
    .eq("familia_id",state.familiaId).eq("estado","fechada").order("fechada_at",{ascending:false}).limit(40);
  if(error){ console.error(error); box.innerHTML=`<div class="hint">Erro a carregar.</div>`; return; }
  if(!listas.length){ box.innerHTML=`<div class="empty"><div class="big">🗂️</div><p>Ainda não há compras terminadas.</p><p>Quando terminares uma lista, aparece aqui.</p></div>`; return; }
  box.innerHTML = listas.map(l=>{
    const d=new Date(l.fechada_at||l.created_at);
    const label=capd(d.toLocaleDateString("pt-PT",{weekday:"long",day:"numeric",month:"long",year:"numeric"}));
    return `<div class="hist-card" data-id="${l.id}"><button class="hist-head">
      <span style="font-size:20px">🧾</span>
      <div class="d"><div class="t">${label}</div><div class="s" data-sub>toca para ver</div></div>
      <span class="chev"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg></span>
      </button><div class="hist-body" data-body><div class="hint">A carregar…</div></div></div>`;
  }).join("");
  box.querySelectorAll(".hist-card").forEach(card=>{
    card.querySelector(".hist-head").onclick=async ()=>{
      const open=card.classList.toggle("open");
      if(open && !card.dataset.loaded){
        card.dataset.loaded="1";
        const { data:itens } = await db.from("avo_itens").select("*").eq("lista_id",card.dataset.id).order("categoria");
        const comp=itens.filter(i=>i.comprado).length;
        card.querySelector("[data-sub]").textContent=`${itens.length} produtos · ${comp} comprados`;
        card.querySelector("[data-body]").innerHTML = itens.length ? itens.map(i=>`
          <div class="li ${i.comprado?'':'miss'}"><span class="mk">${i.comprado?'✓':'○'}</span>
          <span>${CAT_MAP[i.categoria]?CAT_MAP[i.categoria].emoji:''} ${esc(i.nome)}</span>
          <span class="qq">×${i.quantidade||1}</span></div>`).join("") : `<div class="hint">Lista sem produtos.</div>`;
      }
    };
  });
}

/* ---------------- REALTIME ---------------- */
function subscribeRealtime(){
  if(state.canal) db.removeChannel(state.canal);
  state.canal = db.channel("familia-"+state.familiaId)
    .on("postgres_changes",{event:"*",schema:"public",table:"avo_itens",filter:`familia_id=eq.${state.familiaId}`}, ()=>{ if(state.lista) carregarItens(); })
    .on("postgres_changes",{event:"*",schema:"public",table:"avo_listas",filter:`familia_id=eq.${state.familiaId}`}, ()=>{ carregarListaAtual(); })
    .subscribe();
}

/* ---------------- BINDINGS ---------------- */
function bindApp(){
  el("btnAdd").onclick=async ()=>{ const input=el("inpNome"); const ok=await addItem(input.value); if(ok) input.value=""; input.focus(); };
  el("inpNome").onkeydown=e=>{ if(e.key==="Enter") el("btnAdd").click(); };
  el("btnFinish").onclick=terminarCompras;

  el("catSel").addEventListener("click",e=>{ const c=e.target.closest(".chip"); if(!c) return;
    state.catSel=c.dataset.id; localStorage.setItem(LS.cat,state.catSel); renderCatSel(); });

  el("listaHoje").addEventListener("click",e=>{
    if(e.target.closest("#btnRepeatEmpty")) return repetirUltima();
    const item=e.target.closest(".item"); if(!item) return;
    const id=item.dataset.id;
    if(e.target.closest(".del")) return removeItem(id);
    const st=e.target.closest(".st-btn"); if(st) return changeQty(id, st.dataset.act==="inc"?1:-1);
    toggleItem(id);
  });

  // habituais
  el("btnHabToggle").onclick=()=>{ const p=el("habPanel"); const show=p.classList.toggle("hidden")===false; if(show){ el("searchPanel").classList.add("hidden"); loadHabituais(); } };
  el("btnHabEdit").onclick=()=>{ state.habEdit=!state.habEdit; el("btnHabEdit").textContent=state.habEdit?"pronto":"editar"; renderHabituais(); };
  el("btnHabAdd").onclick=async ()=>{ const input=el("inpHab"); const v=input.value.trim(); if(!v) return; const ok=await addHabitual(v); if(ok) input.value=""; };
  el("inpHab").onkeydown=e=>{ if(e.key==="Enter") el("btnHabAdd").click(); };
  el("habChips").addEventListener("click",async e=>{
    const chip=e.target.closest(".hab-chip"); if(!chip) return;
    const act=e.target.closest("[data-act]")?e.target.closest("[data-act]").dataset.act:null;
    if(act==="del") return delHabitual(chip.dataset.id);
    const ok=await addItem(chip.dataset.nome, chip.dataset.cat);
    if(ok) toast("Adicionado ✓");
  });

  el("btnRepeat").onclick=repetirUltima;

  // pesquisa
  el("btnSearchToggle").onclick=()=>{ const p=el("searchPanel"); const show=p.classList.toggle("hidden")===false; if(show){ el("habPanel").classList.add("hidden"); el("inpSearch").focus(); } };
  el("inpSearch").oninput=e=>{
    const t=e.target.value.trim(); clearTimeout(searchTimer);
    if(t.length<2){ el("searchResults").innerHTML=""; el("searchHint").textContent="Escreve para procurar no Open Food Facts."; return; }
    el("searchHint").textContent="A procurar…";
    searchTimer=setTimeout(async ()=>{ try{ renderResultados(await buscarProdutos(t)); } catch(err){ console.error(err); el("searchHint").textContent="Sem ligação à pesquisa. Adiciona à mão."; } }, 380);
  };

  // tabs
  el("tabHoje").onclick=()=>setTab("hoje");
  el("tabHist").onclick=()=>{ setTab("hist"); carregarHistorico(); };

  // settings
  el("btnSettings").onclick=openSettings;
  el("btnFecharSettings").onclick=()=>el("settings").classList.add("hidden");
  el("copyCode").onclick=()=>{ const link=location.origin+location.pathname+"?familia="+encodeURIComponent(state.codigo);
    navigator.clipboard?navigator.clipboard.writeText(link).then(()=>toast("Link copiado ✓")).catch(()=>toast(state.codigo)):toast(state.codigo); };
  el("btnSaveNome").onclick=()=>{ const n=el("setNomeInput").value.trim(); if(!n) return; state.meuNome=n; localStorage.setItem(LS.nome,n); el("setNome").textContent=n; toast("Nome guardado ✓"); };
  el("btnSair").onclick=()=>{ if(!confirm("Sair desta família neste telemóvel? Podes voltar a entrar com o código.")) return; [LS.fid,LS.fnom,LS.cod].forEach(k=>localStorage.removeItem(k)); location.reload(); };
}
function setTab(which){
  const hoje=which==="hoje";
  el("tabHoje").classList.toggle("on",hoje); el("tabHist").classList.toggle("on",!hoje);
  el("viewHoje").classList.toggle("hidden",!hoje); el("viewHist").classList.toggle("hidden",hoje);
  el("footer").style.display=hoje?"":"none";
}
function openSettings(){
  el("setCode").textContent=state.codigo||"—"; el("setFam").textContent=state.familiaNome||"—";
  el("setNome").textContent=state.meuNome||"—"; el("setNomeInput").value=state.meuNome||"";
  el("settings").classList.remove("hidden");
}

if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }
boot();
