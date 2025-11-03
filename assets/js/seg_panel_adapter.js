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
      m_estatus: "#seg-estatus",
      f_fecha: "#seg-fecha, input[type='date'][name='fecha']",
      f_comentarios: "#seg-comentarios, #seg-nota, textarea[name='comentarios'], textarea[name='nota']",
      f_usuario: "#seg-usuario, input[name='usuario'], input[name='kam']",
      f_estado: "#seg-estado-seg, select[name='estado-seg'], #seg-estado",
      btnGuardar: "#seg-guardar, button[data-seg='guardar'], .seg-guardar",
      lista: "#seg-hist-list, #historial-seg, [data-seg='hist']"
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