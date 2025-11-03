// seg_panel_adapter.js
(()=>{
  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",init);}else{init();}
  function $(s){return document.querySelector(s);}
  function init(){
    const panel = $("#panel-seguimiento"); if(!panel) return;
    import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js").then(m=>{
      const { getFirestore, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, getDocs } = m;
      const db = getFirestore();
      const SEL = {
        cont:"#panel-seguimiento", titulo:"#seg-titulo-medico", lista:"#seg-historial",
        nombre:"#seg-medico", estado:"#seg-estado", fecha:"#seg-fecha", notas:"#seg-notas", kam:"#seg-kam",
        btnG:"#seg-guardar", btnC:"#seg-cancelar"
      };
      const show = (on)=>{ const el=$(SEL.cont); if(el) el.classList.toggle("hidden",!on); };
      let currentId=null, currentNombre=null;

      async function cargarHistorial(id){
        const ul=$(SEL.lista); if(!ul) return;
        ul.innerHTML="<li>Cargando…</li>";
        try{
          const q=query(collection(db,"medicos",id,"seguimientos"), orderBy("fecha","desc"));
          const s=await getDocs(q);
          ul.innerHTML="";
          s.forEach(d=>{
            const x=d.data();
            let f=x.fecha; if(f?.toDate) f=f.toDate();
            const dd=f?new Date(f):null;
            const fechaTxt=dd?dd.toLocaleDateString("es-MX"):"(sin fecha)";
            const li=document.createElement("li");
            li.innerHTML=`<b>${fechaTxt}</b> — ${x.estado||""} <small>(${x.kam||""})</small><br>${(x.notas||"").replace(/\n/g,"<br>")}`;
            ul.appendChild(li);
          });
          if(!ul.children.length) ul.innerHTML="<li>Sin seguimientos aún.</li>";
        }catch(e){console.error(e); ul.innerHTML="<li>Error cargando historial.</li>";}
      }

      async function abrir(id){
        currentId=id;
        try{
          const s=await getDoc(doc(db,"medicos",id));
          if(!s.exists()){ alert("No encontré el médico."); return; }
          const med=s.data();
          currentNombre=med.nombre||"";
          $(SEL.titulo).textContent=`Historial de Seguimiento — ${currentNombre}`;
          $(SEL.nombre).value=currentNombre;
          $(SEL.estado).value=med.estatus||"Contactado";
          $(SEL.fecha).value="";
          $(SEL.notas).value="";
          $(SEL.kam).value=med.kam||"";
          await cargarHistorial(id);
          show(true);
          $(SEL.notas)?.focus();
        }catch(e){console.error(e); alert("Error abriendo seguimiento.");}
      }

      async function guardar(){
        if(!currentId) return;
        const estado=$(SEL.estado).value;
        const fecha=$(SEL.fecha).value;
        const notas=$(SEL.notas).value;
        const kam=$(SEL.kam).value;
        await addDoc(collection(db,"medicos",currentId,"seguimientos"),{
          estado, fecha: fecha?new Date(fecha):serverTimestamp(), notas, kam, creadoEn:serverTimestamp()
        });
        await updateDoc(doc(db,"medicos",currentId),{ estatus:estado, kam, updatedAt:serverTimestamp() });
        await cargarHistorial(currentId);
        $(SEL.fecha).value=""; $(SEL.notas).value="";
        alert("Seguimiento guardado");
      }

      $(SEL.btnG)?.addEventListener("click",(e)=>{ e.preventDefault(); guardar().catch(err=>{console.error(err); alert("Error al guardar.");}); });
      $(SEL.btnC)?.addEventListener("click",(e)=>{ e.preventDefault(); show(false); });

      document.addEventListener("click",(e)=>{
        const b=e.target.closest(".btnSeguimiento, .btn-seg");
        if(!b) return;
        const id=b.dataset.id || b.getAttribute("data-id");
        if(!id){ console.warn("Seguimiento sin data-id"); return; }
        abrir(id);
      });
    });
  }
})();
