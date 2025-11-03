// firebase_medicos.js — versión ligera y segura
// - Inicializa Firebase si no existe (usa window.FIREBASE_CONFIG)
// - No crea ni abre modales. No borra.
// - Delega el click en .btn-seg para que lo maneje seg_panel_adapter.js
// - Convierte .btn-del -> .btn-seg (Seguimiento)

// 1) Firebase init (idempotente)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

(function(){
  let app = getApps()[0];
  if (!app && window.FIREBASE_CONFIG) {
    app = initializeApp(window.FIREBASE_CONFIG);
  }
  if (!app) {
    console.warn("[firebase_medicos] No hay FIREBASE_CONFIG. Solo seguimiento local.");
    return;
  }
  try { signInAnonymously(getAuth(app)); } catch(e){ /* ignore */ }

  // 2) Convertir botones legacy .btn-del en "+ Seguimiento"
  function convertDeleteToSeguimiento(root=document){
    root.querySelectorAll("button.btn-del").forEach(b => {
      const id = b.getAttribute("data-del") || b.dataset.del;
      if (!id) return;
      const seg = document.createElement("button");
      seg.className = "btn btn-sm btn-primary btn-seg";
      seg.setAttribute("data-id", id);
      seg.textContent = "+ Seguimiento";
      b.replaceWith(seg);
    });
  }
  convertDeleteToSeguimiento();
  const mo = new MutationObserver(() => convertDeleteToSeguimiento());
  mo.observe(document.body, { childList:true, subtree:true });

  // 3) Delegación del click: el adapter abrirá el panel lateral
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".btn-seg");
    if (!b) return;
    // No hacemos nada aquí a propósito: seg_panel_adapter.js se encarga de abrir el panel
  });
})();