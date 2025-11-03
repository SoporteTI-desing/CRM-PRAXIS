// seg_panel_adapter.js (fixed) — abre panel lateral y guarda historial en Firestore
(() => {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    const PANEL = document.querySelector("#panel-seguimiento");
    if (!PANEL) return;

    const SEL = {
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

    const q = (sel) => {
      if (!sel) return null;
      const parts = sel.split(",");
      for (const p of parts) {
        const el = document.querySelector(p.trim());
        if (el) return el;
      }
      return null;
    };
    const show = (sel, v = true) => {
      const el = typeof sel === "string" ? q(sel) : sel;
      if (!el) return;
      el.style.display = v ? "" : "none";
    };
    const setVal = (sel, val) => {
      const el = q(sel);
      if (!el) return;
      if ("value" in el) el.value = val ?? "";
      else el.textContent = val ?? "";
    };
    const getVal = (sel) => {
      const el = q(sel);
      if (!el) return "";
      return (el.value ?? el.textContent ?? "").toString().trim();
    };

    // Firebase
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js");
    const fs = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
    const { getFirestore, collection, doc, getDoc, onSnapshot, query, orderBy, addDoc, updateDoc, serverTimestamp } = fs;

    let app = getApps()[0];
    if (!app && window.FIREBASE_CONFIG) app = initializeApp(window.FIREBASE_CONFIG);
    if (!app) { console.error("[seguimiento] Falta FIREBASE_CONFIG"); return; }
    const db = getFirestore(app);

    let unsubSeg = null;
    let medicoIdActual = null;

    async function abrirPanel(medicoId) {
      medicoIdActual = medicoId;
      // Datos médico
      try {
        const dref = doc(db, "medicos", medicoId);
        const snap = await getDoc(dref);
        if (snap.exists()) {
          const m = snap.data();
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
      } catch (e) { console.error("Leer médico:", e); }

      // Historial
      if (unsubSeg) unsubSeg();
      const sub = collection(doc(db, "medicos", medicoId), "seguimientos");
      const qy = query(sub, orderBy("createdAt", "desc"));
      unsubSeg = onSnapshot(qy, s => {
        const ul = q(SEL.lista);
        if (!ul) return;
        ul.innerHTML = "";
        s.forEach(d => {
          const x = d.data();
          const fecha = x.fecha || (x.createdAt?.toDate ? x.createdAt.toDate().toLocaleString() : "—");
          const li = document.createElement("li");
          li.innerHTML =
            "<div><strong>" + (x.estatus || "Contacto") + "</strong>" +
            (x.usuario ? " (" + x.usuario + ")" : "") +
            " — <span class='tag'>" + fecha + "</span></div>" +
            "<div>" + (x.nota || x.comentarios || "") + "</div>";
          ul.appendChild(li);
        });
      }, e => console.error("Historial:", e));

      show(SEL.contPanel, true);
      const fc = q(SEL.f_comentarios); if (fc) try { fc.focus(); } catch {}
    }

    const btnClose = q(SEL.btnClose);
    if (btnClose) btnClose.addEventListener("click", () => { show(SEL.contPanel, false); if (unsubSeg) unsubSeg(); });

    const btnGuardar = q(SEL.btnGuardar);
    if (btnGuardar) btnGuardar.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (!medicoIdActual) return;
      const payload = {
        estatus: getVal(SEL.f_estado) || getVal(SEL.m_estatus) || "prospecto",
        nota: getVal(SEL.f_comentarios) || "",
        usuario: getVal(SEL.f_usuario) || getVal(SEL.m_kam) || "",
        fecha: getVal(SEL.f_fecha) || "",
        createdAt: serverTimestamp()
      };
      try {
        await addDoc(collection(doc(db, "medicos", medicoIdActual), "seguimientos"), payload);
        const updates = {};
        if (getVal(SEL.m_estatus)) updates.estatus = getVal(SEL.m_estatus);
        if (getVal(SEL.m_kam)) updates.kam = getVal(SEL.m_kam);
        if (Object.keys(updates).length) await updateDoc(doc(db, "medicos", medicoIdActual), updates);
        setVal(SEL.f_comentarios, "");
      } catch (e) {
        alert("No pude guardar seguimiento: " + e.message);
      }
    });

    // Delegación del click para abrir panel
    document.addEventListener("click", (e) => {
      const b = e.target.closest(".btnSeguimiento, .btn-seg");
      if (!b) return;
      const id = b.dataset.id || b.getAttribute("data-id");
      if (!id) return;
      abrirPanel(id);
    });
  }
})();