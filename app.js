(function(){
  const LS_KEY = "pixelup_crm_leads_v1";

  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  const form = $("#leadForm");
  const tbody = $("#leadsTable tbody");
  const search = $("#search");
  const filterStage = $("#filterStage");
  const exportCsvBtn = $("#exportCsvBtn");
  const importJsonInput = $("#importJsonInput");

  let leads = load();
  let sortKey = "updatedAt";
  let sortDir = "desc";

  render();

  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const lead = {
      id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: $("#name").value.trim(),
      email: $("#email").value.trim(),
      phone: $("#phone").value.trim(),
      stage: $("#stage").value,
      source: $("#source").value.trim(),
      notes: $("#notes").value.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if(!lead.name){ alert("Informe ao menos o nome."); return; }
    leads.push(lead);
    save();
    form.reset();
    render();
  });

  search.addEventListener("input", render);
  filterStage.addEventListener("change", render);

  $$("#leadsTable th[data-sort]").forEach(th=>{
    th.style.cursor = "pointer";
    th.addEventListener("click", ()=>{
      const key = th.getAttribute("data-sort");
      if(sortKey === key){
        sortDir = sortDir === "asc" ? "desc" : "asc";
      }else{
        sortKey = key; sortDir = "asc";
      }
      render();
    });
  });

  exportCsvBtn.addEventListener("click", ()=>{
    const csv = toCSV(leads);
    download("leads.csv", csv, "text/csv;charset=utf-8;");
  });

  importJsonInput.addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const data = JSON.parse(reader.result);
        if(Array.isArray(data)){
          leads = data;
          save();
          render();
          alert("Importado com sucesso!");
        }else{
          alert("JSON inválido.");
        }
      }catch(err){ alert("Falha ao ler JSON."); }
    };
    reader.readAsText(file);
  });

  function render(){
    const q = search.value.toLowerCase();
    const stage = filterStage.value;
    const filtered = leads
      .filter(l => (!stage || l.stage===stage))
      .filter(l => (
        (l.name||'').toLowerCase().includes(q) ||
        (l.email||'').toLowerCase().includes(q) ||
        (l.phone||'').toLowerCase().includes(q) ||
        (l.source||"").toLowerCase().includes(q) ||
        (l.notes||"").toLowerCase().includes(q)
      ))
      .sort((a,b)=>{
        const A = a[sortKey] ?? "";
        const B = b[sortKey] ?? "";
        if(A < B) return sortDir==="asc" ? -1 : 1;
        if(A > B) return sortDir==="asc" ? 1 : -1;
        return 0;
      });

    tbody.innerHTML = "";
    for(const l of filtered){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escape(l.name||"")}</td>
        <td>${escape(l.email||"")}</td>
        <td>${escape(l.phone||"")}</td>
        <td><span class="tag tag-${escape(l.stage||"novo")}">${escape(l.stage||"novo")}</span></td>
        <td>${escape(l.source||"")}</td>
        <td>${new Date(l.updatedAt).toLocaleString()}</td>
        <td class="actions-cell">
          <button data-edit="${l.id}">Editar</button>
          <button class="danger" data-del="${l.id}">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    }

    // bind actions
    tbody.querySelectorAll("button[data-edit]").forEach(btn=>{
      btn.addEventListener("click", ()=> editLead(btn.getAttribute("data-edit")));
    });
    tbody.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.addEventListener("click", ()=> deleteLead(btn.getAttribute("data-del")));
    });
  }

  function editLead(id){
    const l = leads.find(x=>x.id===id);
    if(!l) return;
    const name = prompt("Nome:", l.name); if(name===null) return;
    const email = prompt("E-mail:", l.email||""); if(email===null) return;
    const phone = prompt("WhatsApp:", l.phone||""); if(phone===null) return;
    const stage = prompt("Estágio (novo, qualificado, proposta, ganho, perdido):", l.stage)||l.stage;
    const source = prompt("Origem:", l.source||""); if(source===null) return;
    const notes = prompt("Notas:", l.notes||""); if(notes===null) return;
    Object.assign(l, {name,email,phone,stage,source,notes, updatedAt: Date.now()});
    save(); render();
  }

  function deleteLead(id){
    if(!confirm("Excluir este lead?")) return;
    leads = leads.filter(l=>l.id!==id);
    save(); render();
  }

  function save(){ localStorage.setItem(LS_KEY, JSON.stringify(leads)); }
  function load(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch{ return []; }
  }

  function toCSV(arr){
    const headers = ["id","name","email","phone","stage","source","notes","createdAt","updatedAt"];
    const lines = [headers.join(",")];
    for(const l of arr){
      const row = headers.map(h=>csvEscape(l[h]));
      lines.push(row.join(","));
    }
    return lines.join("\n");
  }
  function csvEscape(val){
    if(val===undefined || val===null) return "";
    const s = String(val).replace(/"/g,'""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }
  function download(filename, content, mime){
    const blob = new Blob([content], {type: mime||"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  function escape(str=""){
    return str.replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#39;"
    })[m]);
  }
})();