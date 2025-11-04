
// firebase_medicos.js — versión estable sin errores de sintaxis
(function(){
  let _unsub = null;

  async function ensureFirebase(){
    const [appMod, fsMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js")
    ]);
    const app = (window.firebaseApp) || appMod.initializeApp(window.FIREBASE_CONFIG);
    window.firebaseApp = app;
    const db = (window.firebaseDb) || fsMod.getFirestore(app);
    window.firebaseDb = db;
    return { fs: fsMod, db };
  }

  function mapDocToRow(d){
    const r = d.data() || {};
    return {
      _id: d.id,
      'Nombre': r.Nombre || r.nombre || "",
      'Teléfono': r['Teléfono'] || r.Telefono || r.telefono || r.tel || "",
      'Dirección': r.Direccion || r.Dirección || r.direccion || "",
      'Hospital': r.Hospital || r.hospital || "",
      'Red Social': r['Red Social'] || r.redSocial || r.red || "",
      'Especialidad': r.Especialidad || r.especialidad || "",
      'Base': r.Base || r.base || "",
      'Estado': r.Estado || r.estado || "",
      'Región': r.Region || r.Región || r.region || "",
      'GERENTE/KAM': r['GERENTE/KAM'] || r.KAM || r.kam || ""
    };
  }

  function renderIfAvailable(docs){
    const rows = (docs || []).map(mapDocToRow);
    window.MED_BASE = rows;
    try {
      if (typeof window.applyMedFilters === "function") window.applyMedFilters();
      else if (typeof window.renderMedicos === "function") window.renderMedicos();
    } catch(e){ console.warn("[medicos] render error:", e); }
    // contador
    try {
      const badge = document.getElementById("medCount");
      if (badge) badge.textContent = String(rows.length) + " médicos";
    } catch(_){}
  }

  async function startRealtime(){
    const { fs, db } = await ensureFirebase();
    try { _unsub && _unsub(); } catch(_){}
    const q = fs.query(fs.collection(db, "medicos")); // colección principal
    _unsub = fs.onSnapshot(q, (snap)=>{
      const docs = [];
      snap.forEach((d)=> docs.push(d));
      renderIfAvailable(docs);
      console.log("[medicos] onSnapshot:", docs.length);
    }, (err)=>{
      console.error("[medicos] snapshot error", err);
    });
  }

  // Público: forzar desde botón "Refrescar"
  window.forceMedicosFromServer = async function(){
    const { fs, db } = await ensureFirebase();
    const snap = await fs.getDocs(fs.collection(db, "medicos"));
    const docs = [];
    snap.forEach((d)=> docs.push(d));
    renderIfAvailable(docs);
    console.log("[medicos] force from server:", docs.length);
  };

  // Hook al botón Refrescar si existe
  document.addEventListener("click", function(ev){
    const btn = ev.target.closest && ev.target.closest("#refreshMedicos");
    if (btn){
      ev.preventDefault();
      window.forceMedicosFromServer();
    }
  });

  // Arrancar
  startRealtime();
})();
