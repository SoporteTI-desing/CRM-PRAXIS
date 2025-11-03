// firebase_medicos.js — versión ligera y segura
// - Inicializa Firebase si no existe (usa window.FIREBASE_CONFIG)
// - No crea ni abre modales. No borra.
// - Delega el click en .btn-seg para que lo maneje seg_panel_adapter.js
// - Convierte .btn-del -> .btn-seg (Seguimiento)

// 1) Firebase init (idempotente)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  import { setPersistence, inMemoryPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

// --- Firestore REALTIME (no JSON fallback) ---
import { getFirestore, collection, query, onSnapshot, getDocsFromServer } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { initializeApp, getApps } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

(function(){
  const app = getApps()[0] || initializeApp(window.FIREBASE_CONFIG);
  const db = getFirestore(app);

  function updateCounter(total, fromCache){
    const els = Array.from(document.querySelectorAll('#badgeMedicos, .badge-medicos')).slice(0,1);
    if(els.length){ els[0].textContent = total + " médicos" + (fromCache ? " (caché)" : ""); }
  }

  const q = query(collection(db, "medicos"));
  onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const fromCache = snap.metadata.fromCache === true;
    updateCounter(snap.size, fromCache);
    // Guarda global + evento para otros módulos
    window.__medicosDocs = docs;
    document.dispatchEvent(new CustomEvent("medicos:snapshot", { detail: { docs, fromCache } }));
    // Intenta render si hay función global
    if (typeof window.renderMedicos === "function") {
      try { window.renderMedicos(docs); } catch(_){}
    }
  });

  // Exponer refresh forzado a red
  window.forceMedicosFromServer = async function(){
    const snap = await getDocsFromServer(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateCounter(snap.size, false);
    window.__medicosDocs = docs;
    document.dispatchEvent(new CustomEvent("medicos:snapshot", { detail: { docs, fromCache:false } }));
    if (typeof window.renderMedicos === "function") {
      try { window.renderMedicos(docs); } catch(_){}
    } else {
      location.reload();
    }
  }
})();
