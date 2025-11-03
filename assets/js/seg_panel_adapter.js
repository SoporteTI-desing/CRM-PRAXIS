// seg_panel_adapter.js — Firestore adapter (UI previa, panel lateral con historial)
// Mantén tu HTML/CSS intacto. Este archivo:
// 1) Abre el panel lateral de seguimiento al hacer clic en .btn-seg / .btnSeguimiento
// 2) Pinta historial desde Firestore (medicos/{id}/seguimientos, orden DESC)
// 3) Guarda nuevos seguimientos ({estatus, nota, usuario, fecha, createdAt})
// 4) Permite actualizar datos del médico si tu panel tiene inputs (nombre, kam, etc.)
// 5) No muestra NINGÚN botón de Borrar aquí

(() => {
  // Espera DOM listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init(){
    // Panel lateral (tu UI previa)
    const PANEL_SEL = "#panel-seguimiento";
    const panel = document.querySelector(PANEL_SEL);
    if(!panel){ return; } // Si no existe, no estorbamos

    // Selectores flexibles (usa tus mismos ids/clases; hay fallback por name/data-*)
    const SEL = {
      contPanel: PANEL_SEL,
      btnClose: "#seg-cerrar, [data-seg='cerrar'], .seg-cerrar",
      // Campos médico (lectura/edición)
      m_nombre: "#seg-nombre",
      m_telefono: "#seg-telefono",
      m_direccion: "#seg-direccion",
      m_hospital: "#seg-hospital",
      m_red: "#seg-red",
      m_especialidad: "#seg-especialidad",
      m_base: "#seg-base",
      m_estado: "#seg-estado",
      m_region: "#seg-region",
      m_kam: "#seg-kam",
      m_estatus: "#seg-estatus",
      // Form de nuevo seguimiento
      f_fecha: "#seg-fecha, input[type='date'][name='fecha']",
      f_comentarios: "#seg-comentarios, #seg-nota, textarea[name='comentarios'], textarea[name='nota']",
      f_usuario: "#seg-usuario, input[name='usuario'], input[name='kam']",
      f_estado: "#seg-estado-seg, select[name='estado-seg'], #seg-estado", // estado del seguimiento
      btnGuardar: "#seg-guardar, button[data-seg='guardar'], .seg-guardar",
      // Historial (lista a la derecha)
      lista: "#seg-hist-list, #historial-seg, [data-seg='hist']"
    };

    // Helpers de selección
    const q = (sel) => {
      if(!sel) return null;
      const parts = sel.split(",");
      for(const p of parts){
        const el = document.querySelector(p.trim());
        if(el) return el;
      }
      return null;
    };
    const show = (sel, v=true) => {
      const el = typeof sel === "string" ? q(sel) : sel;
      if(!el) return;
      el.style.display = v ? "" : "none";
    };

    // Carga Firebase (reutiliza app si ya existe)
    const appMod = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js");
    const fsMod  = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");

    const { initializeApp, getApps } = appMod;
    const {
      getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc
    } = fsMod;

    // Config: usa la que ya tengas en otro módulo; si no, intenta leer window.FIREBASE_CONFIG
    let app;
    if (getApps().length) {
      app = getApps()[0];
    } else if (window.FIREBASE_CONFIG) {
      app = initializeApp(window.FIREBASE_CONFIG);
    } else {
      console.error("[seg_panel_adapter] No hay app Firebase inicializada ni FIREBASE_CONFIG.");
      return;
    }
    const db = getFirestore(app);

    let unsubSeg = null; // suscripción historial
    let medicoIdActual = null; // id del médico abierto

    async function abrirPanel(medicoId){
      medicoIdActual = medicoId;
      // Carga datos del médico
      try{
        const dref = doc(db, "medicos", medicoId);
        const snap = await getDoc(dref);
        if(snap.exists()){
          const m = snap.data();
          // Rellena campos info médico si existen
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
      }catch(err){ console.error("No pude leer médico:", err); }

      // Suscribe historial
      if (unsubSeg) unsubSeg();
      const sub = collection(doc(db, "medicos", medicoId), "seguimientos");
      const qy = query(sub, orderBy("createdAt","desc"));
      unsubSeg = onSnapshot(qy, (snap) => {
        const ul = q(SEL.lista);
        if (!ul) return;
        ul.innerHTML = "";
        snap.forEach(d => {
          const s = d.data();
          const li = document.createElement("li");
          const fecha = s.fecha || (s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString() : "—");
          const usuario = s.usuario ? ` (${esc(s.usuario)})` : "";
          li.innerHTML = `<div><strong>${esc(s.estatus || "Contacto")}</strong>${usuario} — <span class="tag">${esc(fecha)}</span></div>
                          <div>${esc(s.nota || s.comentarios || "")}</div>`;
          ul.appendChild(li);
        });
      }, (err)=>console.error("Historial error:", err));

      show(SEL.contPanel, true);
      // Lleva foco a comentarios si existe
      const fc = q(SEL.f_comentarios);
      if (fc) try{ fc.focus(); }catch{}
    }

    // Guardar nuevo seguimiento
    const btnGuardar = q(SEL.btnGuardar);
    if(btnGuardar){
      btnGuardar.addEventListener("click", async (ev) => {
        ev.preventDefault();
        if(!medicoIdActual) return;
        const est = getVal(SEL.f_estado) || getVal(SEL.m_estatus) || "prospecto";
        const nota = getVal(SEL.f_comentarios) || "";
        const usuario = getVal(SEL.f_usuario) || getVal(SEL.m_kam) || "";
        const fecha = getVal(SEL.f_fecha) || ""; // dd/mm/aaaa opcional

        const payload = {
          estatus: est,
          nota,
          usuario,
          fecha,
          createdAt: serverTimestamp(),
        };

        try{
          await addDoc(collection(doc(db, "medicos", medicoIdActual), "seguimientos"), payload);
          // opcional: actualizar estatus/kam del médico si hay cambios
          const updates = {};
          if (getVal(SEL.m_estatus)) updates.estatus = getVal(SEL.m_estatus);
          if (getVal(SEL.m_kam)) updates.kam = getVal(SEL.m_kam);
          if (Object.keys(updates).length){
            await updateDoc(doc(db, "medicos", medicoIdActual), updates);
          }
          // limpiar campos seguimiento
          setVal(SEL.f_comentarios, "");
          // mantener panel abierto
        }catch(err){
          alert("No pude guardar seguimiento: " + err.message);
        }
      });
    }

    // Cerrar panel
    const btnClose = q(SEL.btnClose);
    if(btnClose){
      btnClose.addEventListener("click", () => {
        show(SEL.contPanel, false);
        if (unsubSeg) unsubSeg();
        unsubSeg = null;
        medicoIdActual = null;
      });
    }

    // Delegación: abrir con click en las filas
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".btnSeguimiento, .btn-seg");
      if(!b) return;
      const id = b.dataset.id || b.getAttribute("data-id");
      if(!id){ console.warn("Seguimiento sin data-id"); return; }
      abrirPanel(id);
    });

    // Utilidades
    function setVal(sel, val){
      const el = q(sel);
      if(!el) return;
      if("value" in el) el.value = (val ?? "");
      else el.textContent = (val ?? "");
    }
    function getVal(sel){
      const el = q(sel);
      if(!el) return "";
      return (el.value ?? el.textContent ?? "").toString().trim();
    }
    function esc(s=""){
      return s.toString().replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',\"'\":'&#39;','\"':'&quot;'}[c]));
    }
  }
})();