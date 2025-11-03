
// seg_panel_adapter.js
// Conecta TU panel de Seguimiento a Firestore (si existe).
// No rompe nada: si el panel no está, no hace nada y puedes seguir usando el modal.

(() => {
  // Espera a que el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    const panel = document.querySelector("#panel-seguimiento");
    if (!panel) return; // si no hay panel, no hacemos nada

    // Carga Firestore on-demand
    import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js").then(m => {
      const {
        getFirestore, doc, getDoc, updateDoc,
        collection, addDoc, serverTimestamp,
        query, orderBy, getDocs
      } = m;

      const db = getFirestore();

      // Mapa de selectores (ajusta si tu HTML usa otros IDs)
      const SEL = {
        contPanel:   "#panel-seguimiento",
        titulo:      "#seg-titulo-medico",
        form:        "#seg-form",
        campoNombre: "#seg-medico",
        campoEstado: "#seg-estado",
        campoFecha:  "#seg-fecha",
        campoNotas:  "#seg-notas",
        campoKAM:    "#seg-kam",
        btnGuardar:  "#seg-guardar",
        btnCancelar: "#seg-cancelar",
        listaHist:   "#seg-historial"
      };

      const $  = (s) => document.querySelector(s);
      const show = (s, on) => { const n=$(s); if (n) n.style.display = on ? "" : "none"; };
      const setText = (s, t) => { const n=$(s); if (n) n.textContent = t ?? ""; };
      const setVal  = (s, v) => { const n=$(s); if (n) n.value = v ?? ""; };
      const getVal  = (s) => ($(s)?.value ?? "").trim();

      let currentId = null;
      let currentNombre = null;

      async function cargarHistorial(id) {
        const box = $(SEL.listaHist);
        if (!box) return;
        box.innerHTML = "<li>Cargando…</li>";
        try {
          const q = query(collection(db, "medicos", id, "seguimientos"), orderBy("fecha", "desc"));
          const snap = await getDocs(q);
          box.innerHTML = "";
          snap.forEach(d => {
            const x = d.data();
            let f = x.fecha;
            if (f?.toDate) f = f.toDate();
            const dd = f ? new Date(f) : null;
            const fechaTxt = dd ? dd.toLocaleDateString("es-MX") : "(sin fecha)";
            const li = document.createElement("li");
            li.innerHTML = `<b>${fechaTxt}</b> — ${x.estado || ""} <small>(${x.kam || ""})</small><br>${(x.notas || "").replace(/\n/g, "<br>")}`;
            box.appendChild(li);
          });
          if (!box.children.length) box.innerHTML = "<li>Sin seguimientos aún.</li>";
        } catch (e) {
          console.error(e);
          box.innerHTML = "<li>Error cargando historial.</li>";
        }
      }

      async function abrirPanel(id) {
        currentId = id;
        try {
          const s = await getDoc(doc(db, "medicos", id));
          if (!s.exists()) { alert("No encontré el médico."); return; }
          const med = s.data();

          currentNombre = med.nombre || "";
          setText(SEL.titulo, `Historial de Seguimiento — ${currentNombre}`);
          setVal(SEL.campoNombre, currentNombre);
          setVal(SEL.campoEstado, med.estatus || "Contactado");
          setVal(SEL.campoFecha, "");
          setVal(SEL.campoNotas, "");
          setVal(SEL.campoKAM, med.kam || "");

          await cargarHistorial(id);
          show(SEL.contPanel, true);
          $(SEL.campoNotas)?.focus();
        } catch (e) {
          console.error(e); alert("Error abriendo seguimiento.");
        }
      }

      async function guardarSeguimiento() {
        if (!currentId) return;
        const estado = getVal(SEL.campoEstado);
        const fecha  = getVal(SEL.campoFecha);
        const notas  = getVal(SEL.campoNotas);
        const kam    = getVal(SEL.campoKAM);

        // Agrega a subcolección "seguimientos"
        await addDoc(collection(db, "medicos", currentId, "seguimientos"), {
          estado,
          fecha: fecha ? new Date(fecha) : serverTimestamp(),
          notas,
          kam,
          creadoEn: serverTimestamp()
        });

        // Refleja estado/KAM en el doc del médico
        await updateDoc(doc(db, "medicos", currentId), {
          estatus: estado,
          kam,
          updatedAt: serverTimestamp()
        });

        await cargarHistorial(currentId);
        setVal(SEL.campoFecha, "");
        setVal(SEL.campoNotas, "");
        alert("Seguimiento guardado");
      }

      // Botones del panel
      $(SEL.btnGuardar)?.addEventListener("click", (e) => {
        e.preventDefault();
        guardarSeguimiento().catch(err => { console.error(err); alert("Error al guardar seguimiento."); });
      });
      $(SEL.btnCancelar)?.addEventListener("click", (e) => {
        e.preventDefault();
        show(SEL.contPanel, false);
      });

      // Delegación sobre botones de seguimiento de tu tabla
      document.addEventListener("click", (e) => {
        const b = e.target.closest(".btnSeguimiento, .btn-seg");
        if (!b) return;
        const id = b.dataset.id || b.getAttribute("data-id");
        if (!id) { console.warn("Seguimiento sin data-id"); return; }
        abrirPanel(id);
      });
    }).catch(err => console.error("No pude cargar Firestore:", err));
  }
})();
