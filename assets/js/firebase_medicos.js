// firebase_medicos.js — realtime, mobile-safe, sin JSON (R2)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, collection, collectionGroup, query, onSnapshot, getDocsFromServer
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth, signInAnonymously, setPersistence, inMemoryPersistence
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// --- Init (una sola vez)
const app = getApps()[0] || initializeApp(window.FIREBASE_CONFIG);
const db  = getFirestore(app);

// Auth anónima solo para escribir; las lecturas son públicas por tus rules
(async () => {
  try {
    const auth = getAuth(app);
    await setPersistence(auth, inMemoryPersistence);
    await signInAnonymously(auth);
    console.log("[medicos] auth anon listo");
  } catch (e) {
    console.warn("[medicos] auth anon opcional:", e);
  }
})();

// --- Helper contador
function updateCounter(total, fromCache) {
  const el = document.querySelector("#medCount") || document.querySelector("#badgeMedicos, .badge-medicos");
  if (el) {
    el.textContent = `${total} médicos${fromCache ? " (caché)" : ""}`;
    el.title = fromCache ? "Mostrando datos en caché" : "Datos desde la red";
  }
}

// --- Render helper (si tu app expone renderMedicos, lo usamos)
function renderIfAvailable(docs) {
  // Adapt docs -> filas esperadas por la tabla
  const rows = (docs||[]).map(r => ({
    _id: r.id,
    'Nombre': r.Nombre || r.nombre || '',
    'Teléfono': r['Teléfono'] || r.Telefono || r.telefono || r.tel || '',
    'Dirección': r.Direccion || r.Dirección || r.direccion || '',
    'Hospital': r.Hospital || r.hospital || '',
    'Red Social': r['Red Social'] || r.redSocial || r.red || '',
    'Especialidad': r.Especialidad || r.especialidad || '',
    'Base': r.Base || r.base || '',
    'Estado': r.Estado || r.estado || '',
    'Región': r.Region || r.Región || r.region || '',
    'GERENTE/KAM': r['GERENTE/KAM'] || r.KAM || r.kam || ''
  }));
  window.MED_BASE = rows;
  if (typeof window.applyMedFilters === 'function') {
    try { window.applyMedFilters(); } catch(e){ console.warn('applyMedFilters error', e); }
  } else if (typeof window.renderMedicos === 'function') {
    try { window.renderMedicos(); } catch(e){ console.warn('renderMedicos error', e); }
  }
  window.__medicosDocs = docs; // por si otros módulos lo consumen
} catch {}
  }
  window.__medicosDocs = docs; // por si otros módulos lo consumen
}

// --- Realtime (onSnapshot) — SIEMPRE Firestore
const q = query(collection(db, "medicos"));
onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  updateCounter(snap.size, snap.metadata.fromCache === true);
  renderIfAvailable(docs);
  document.dispatchEvent(new CustomEvent("medicos:snapshot", { detail: { docs, fromCache: snap.metadata.fromCache === true } }));
});

// --- Forzar lectura de RED (para botón Refrescar)
window.forceMedicosFromServer = async function () {
  const snap = await getDocsFromServer(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  updateCounter(snap.size, false);
  renderIfAvailable(docs);
};
