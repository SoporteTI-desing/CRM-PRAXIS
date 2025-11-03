// seg_panel_adapter.js (safe, no top-level await, no optional chaining)
// Abre el panel lateral #panel-seguimiento y guarda historial en Firestore.

(function () {
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(init);

  function q(sel) {
    if (!sel) return null;
    var parts = sel.split(",");
    for (var i = 0; i < parts.length; i++) {
      var el = document.querySelector(parts[i].trim());
      if (el) return el;
    }
    return null;
  }
  function show(sel, v) {
    if (typeof v === "undefined") v = true;
    var el = typeof sel === "string" ? q(sel) : sel;
    if (!el) return;
    el.style.display = v ? "" : "none";
  }
  function setVal(sel, val) {
    var el = q(sel);
    if (!el) return;
    if ("value" in el) el.value = (val == null ? "" : String(val));
    else el.textContent = (val == null ? "" : String(val));
  }
  function getVal(sel) {
    var el = q(sel);
    if (!el) return "";
    var v = ("value" in el) ? el.value : el.textContent;
    return (v == null ? "" : String(v)).trim();
  }

  function init(){
    var PANEL = q("#panel-seguimiento");
    if (!PANEL) return;

    var SEL = {
      contPanel: "#panel-seguimiento",
      btnClose: "#seg-cerrar, [data-seg='cerrar'], .seg-cerrar",
      m_nombre: "#seg-nombre",
      m_telefono: "#seg-telefono",
      m_direccion: "#seg-direccion",
      m_hospital: "#seg-hospital",
      m_red: "#seg-red, #seg-redSocial",
      m_especialidad: "#seg-especialidad",
      m_base: "#seg-base",
      m_estado: "#seg-estado",
      m_region: "#seg-region",
      m_kam: "#seg-kam",
      m_estatus: "#seg-estatus, #modalEstado",
      f_fecha: "#seg-fecha, #modalProxima, input[type='date'][name='fecha']",
      f_comentarios: "#seg-comentarios, #seg-nota, #modalComentarios, textarea[name='comentarios'], textarea[name='nota']",
      f_usuario: "#seg-usuario, #modalKam, input[name='usuario'], input[name='kam']",
      f_estado: "#seg-estado-seg, select[name='estado-seg'], #seg-estado",
      btnGuardar: "#seg-guardar, #saveModal, button[data-seg='guardar'], .seg-guardar",
      lista: "#seg-hist-list, #historial-seg, #histContent, [data-seg='hist']"
    };

    // Cargar Firebase módulos de manera segura
    Promise.all([
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js")
    ]).then(function(mods){
      var appMod = mods[0];
      var fsMod  = mods[1];

      var initializeApp = appMod.initializeApp;
      var getApps = appMod.getApps;

      var getFirestore = fsMod.getFirestore;
      var collection   = fsMod.collection;
      var doc          = fsMod.doc;
      var getDoc       = fsMod.getDoc;
      var onSnapshot   = fsMod.onSnapshot;
      var query        = fsMod.query;
      var orderBy      = fsMod.orderBy;
      var addDoc       = fsMod.addDoc;
      var updateDoc    = fsMod.updateDoc;
      var serverTimestamp = fsMod.serverTimestamp;

      var app = (getApps().length ? getApps()[0] : null);
      if (!app && window.FIREBASE_CONFIG) {
        app = initializeApp(window.FIREBASE_CONFIG);
      }
      if (!app) { console.error("[seguimiento] Falta FIREBASE_CONFIG"); return; }

      var db = getFirestore(app);

      var unsubSeg = null;
      var medicoIdActual = null;

      function abrirPanel(medicoId){
        medicoIdActual = medicoId;
        // Leer médico
        getDoc(doc(db, "medicos", medicoId)).then(function(snap){
          if (snap.exists()) {
            var m = snap.data();
            setVal(SEL.m_nombre, m.nombre);
            setVal(SEL.m_telefono, m.telefono);
            setVal(SEL.m_direccion, m.direccion);
            setVal(SEL.m_hospital, m.hospital);
            setVal(SEL.m_red, m.redSocial || "No clasificado");
            setVal(SEL.m_especialidad, m.especialidad);
            setVal(SEL.m_base, m.base || "Sin seguro");
            setVal(SEL.m_estado, m.estado);
            setVal(SEL.m_region, m.region);
            setVal(SEL.m_kam, m.kam);
            setVal(SEL.m_estatus, m.estatus || "prospecto");
          }
        }).catch(function(e){ console.error("Leer médico:", e); });

        // Historial realtime
        if (unsubSeg) { try{unsubSeg();}catch(e){} }
        var sub = collection(doc(db, "medicos", medicoId), "seguimientos");
        var qy = query(sub, orderBy("createdAt", "desc"));
        unsubSeg = onSnapshot(qy, function(snap){
          var ul = q(SEL.lista);
          if (!ul) return;
          ul.innerHTML = "";
          snap.forEach(function(d){
            var x = d.data();
            var fecha = x.fecha || (x.createdAt && x.createdAt.toDate ? x.createdAt.toDate().toLocaleString() : "—");
            var li = document.createElement("li");
            var usuario = x.usuario ? " (" + x.usuario + ")" : "";
            li.innerHTML = "<div><strong>" + (x.estatus || "Contacto") + "</strong>" + usuario + " — <span class='tag'>" + fecha + "</span></div>" +
                           "<div>" + (x.nota || x.comentarios || "") + "</div>";
            ul.appendChild(li);
          });
        }, function(err){ console.error("Historial:", err); });

        show(SEL.contPanel, true);
        var fc = q(SEL.f_comentarios); if (fc) { try{ fc.focus(); }catch(e){} }
      }

      var btnClose = q(SEL.btnClose);
      if (btnClose) btnClose.addEventListener("click", function(){
        show(SEL.contPanel, false);
        if (unsubSeg){ try{unsubSeg();}catch(e){} }
        unsubSeg = null; medicoIdActual = null;
      });

      var btnGuardar = q(SEL.btnGuardar);
      if (btnGuardar) btnGuardar.addEventListener("click", function(ev){
        ev.preventDefault();
        if (!medicoIdActual) return;
        var payload = {
          estatus: getVal(SEL.f_estado) || getVal(SEL.m_estatus) || "prospecto",
          nota: getVal(SEL.f_comentarios) || "",
          usuario: getVal(SEL.f_usuario) || getVal(SEL.m_kam) || "",
          fecha: getVal(SEL.f_fecha) || "",
          createdAt: serverTimestamp()
        };
        addDoc(collection(doc(db, "medicos", medicoIdActual), "seguimientos"), payload).then(function(){
          var updates = {};
          var estU = getVal(SEL.m_estatus); if (estU) updates.estatus = estU;
          var kamU = getVal(SEL.m_kam); if (kamU) updates.kam = kamU;
          if (Object.keys(updates).length){
            return updateDoc(doc(db, "medicos", medicoIdActual), updates);
          }
        }).then(function(){
          setVal(SEL.f_comentarios, "");
        }).catch(function(e){
          alert("No pude guardar seguimiento: " + e.message);
        });
      });

      document.addEventListener("click", function(e){
        var b = e.target.closest && e.target.closest(".btnSeguimiento, .btn-seg");
        if (!b) return;
        var id = b.getAttribute("data-id");
        if (!id) return;
        abrirPanel(id);
      });
    }).catch(function(err){
      console.error("No pude cargar Firebase SDK:", err);
    });
  }
})();


/* === SAVE MODAL HANDLER (Firestore) === */
let __seg_docId = null;
let __seg_medName = "";

function openSegPanel(btn) {
  __seg_docId = btn.dataset.id;
  __seg_medName = (btn.closest("tr")?.querySelector("td")?.textContent || "").trim();
  // Clean inputs
  const f = document.getElementById("segFecha"); if (f) f.value = "";
  const n = document.getElementById("segNotas"); if (n) n.value = "";
  const k = document.getElementById("segKAM");   if (k) k.value = "";
  const s = document.getElementById("segStatus"); if (s) s.value = "Contactado";
  const md = document.getElementById("modalBackdrop"); if (md) md.style.display = "flex";
  renderSeguimientos(__seg_docId);
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest(".btn-seg, .btnSeguimiento");
  if (!b) return;
  if (!b.dataset.id || b.dataset.id.length < 6) return; // resolver pondrá el id y re-click
  openSegPanel(b);
});

document.getElementById("cancelModal")?.addEventListener("click", () => {
  const md = document.getElementById("modalBackdrop"); if (md) md.style.display = "none";
});


document.getElementById("saveModal")?.addEventListener("click", async (ev) => {
  try{ ev && ev.preventDefault(); ev.stopPropagation(); }catch(_){}
  window.__savingSeguimiento = true;
  try {
    // Módulos Firebase
    const [appMod, fsMod, authMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js"),
    ]);

    const app = (window.firebaseApp) || appMod.initializeApp(window.FIREBASE_CONFIG);
    window.firebaseApp = app;
    const db  = (window.firebaseDb) || fsMod.getFirestore(app);
    window.firebaseDb = db;
    const auth = authMod.getAuth(app);
    if (!auth.currentUser) {
      await authMod.setPersistence(auth, authMod.inMemoryPersistence);
      await authMod.signInAnonymously(auth);
    }

    // Resolver docId (si hace falta)
    let _docId = window.__seg_docId || null;
    if (!_docId) {
      const nombre = (document.querySelector("#modalMedico, #seg-nombre, #segNombre, input[name='nombre']")?.value || "").trim();
      const direccion = (document.querySelector("#seg-direccion, #segDireccion, input[name='direccion']")?.value || "").trim();
      if (nombre) {
        let q1 = fsMod.query(fsMod.collection(db, "medicos"), fsMod.where("nombre","==", nombre));
        if (direccion) q1 = fsMod.query(fsMod.collection(db, "medicos"),
                                        fsMod.where("nombre","==", nombre),
                                        fsMod.where("direccion","==", direccion));
        const snap = await fsMod.getDocs(q1);
        _docId = snap.docs[0]?.id || null;
      }
    }
    if (!_docId) {
      try{ if (window.__lastSegButton && window.resolveDocIdFromRow) { _docId = await window.resolveDocIdFromRow(window.__lastSegButton); } }catch(_){}
      if (!_docId) { alert("No pude localizar el médico (docId)."); return; }
    }

    // Datos desde la UI
    const estado = (document.querySelector("#modalEstado, #seg-estatus, #seg-estado")?.value || "Contactado").trim();
    const fechaStr = (document.querySelector("#modalProxima, #seg-fecha, input[type='date'][name='fecha']")?.value || "").trim();
    const comentarios = (document.querySelector("#modalComentarios, #seg-comentarios, #seg-nota, textarea[name='comentarios'], textarea[name='nota']")?.value || "").trim();
    const kam = (document.querySelector("#modalKam, #seg-usuario, input[name='usuario'], input[name='kam']")?.value || "").trim();

    const payload = {
      estado,
      proximaAccion: fechaStr ? new Date(fechaStr) : null,
      comentarios,
      kam,
      createdAt: fsMod.serverTimestamp(),
      createdBy: (auth.currentUser && auth.currentUser.uid) || null,
    };

    await fsMod.addDoc(fsMod.collection(db, "medicos", _docId, "seguimientos"), payload);
    console.log('[seg guardar] addDoc ok');
    
    // Actualiza metadatos rápidos en el médico (no obligatorio)
    try {
      const medRef = fsMod.doc(db, "medicos", _docId);
      await fsMod.updateDoc(medRef, { ultimoEstado: estado, ultimoSeguimiento: fsMod.serverTimestamp() });
    } catch(_){}

    // Limpiar y cerrar modal
    const md = document.getElementById("modalBackdrop"); if (md) md.style.display = "none";
    (document.querySelector("#modalProxima")||{}).value = "";
    (document.querySelector("#modalComentarios")||{}).value = "";
    (document.querySelector("#modalKam")||{}).value = "";

    // Render historial actualizado
    try { renderSeguimientos(_docId); } catch(_){}
  } catch (e) {
    console.error("[seg guardar] ", e);
    alert("No pude guardar el seguimiento. Revisa la consola.");
    window.__savingSeguimiento = false;
  }
});


async function renderSeguimientos(docId){
  try{
    const fs = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
    const db = fs.getFirestore();
    const q = fs.query(fs.collection(db, "medicos", docId, "seguimientos"), fs.orderBy("createdAt", "desc"));
    fs.onSnapshot(q, (snap)=>{
      const cont = document.getElementById("historyList");
      if (!cont) return;
      cont.innerHTML = "";
      snap.forEach(d=>{
        const s = d.data()||{};
        const fecha = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "";
        const item = document.createElement("div");
        item.className = "history-item";
        item.innerHTML = `<div><strong>${fecha}</strong> — ${s.estatus||""} (${s.usuario||""})</div>
                          <div style="opacity:.85">${s.comentarios||""}</div>`;
        cont.appendChild(item);
      });
    });
  }catch(e){ console.error("[seguimiento] error leyendo historial:", e); }
}
