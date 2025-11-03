
// save_med_index.js — guarda el formulario superior "Registrar nuevo médico" en Firestore
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

(function(){
  function $(id){ return document.getElementById(id); }
  function trim(v){ return (v||'').toString().trim(); }
  function slug(s){ return trim(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$|_/g,''); }

  let app, db, auth, readyAuth = false;

  function ensureFirebase(){
    app = getApps()[0];
    if(!app && window.FIREBASE_CONFIG){
      app = initializeApp(window.FIREBASE_CONFIG);
      console.log('[save_med] Firebase init OK');
    }
    auth = getAuth();
    try { signInAnonymously(auth).catch(()=>{}); } catch(_){}
    onAuthStateChanged(auth, (u)=>{
      readyAuth = !!u;
      console.log('[save_med] auth:', u ? u.uid : null);
    });
    db = getFirestore();
  }

  async function handleSave(){
    try{
      ensureFirebase();
      const payload = {
        nombre: trim($('m_nombre')?.value),
        telefono: trim($('m_tel')?.value),
        direccion: trim($('m_dir')?.value),
        hospital: trim($('m_hosp')?.value),
        redSocial: trim($('m_red')?.value),
        especialidad: trim($('m_esp')?.value),
        estado: trim($('m_estado')?.value),
        region: trim($('m_region')?.value),
        kam: trim($('m_kam')?.value),
        base: trim($('m_base')?.value),
        createdAt: serverTimestamp(),
        createdBy: (auth.currentUser && auth.currentUser.uid) || null
      };
      if(!payload.nombre){
        alert('⚠️ Nombre es obligatorio'); return;
      }
      // si no hay dirección, igual guardamos (slug con solo nombre)
      const id = slug((payload.nombre||'') + ' ' + (payload.direccion||''));
      console.log('[save_med] setDoc medicos/', id, payload);
      await setDoc(doc(db,'medicos', id), payload, { merge: true });
      const btn = $('btnSaveMed');
      if(btn){ btn.textContent = 'Guardado ✓'; setTimeout(()=> btn.textContent='Guardar médico', 1200); }
      ['m_nombre','m_tel','m_dir','m_hosp','m_red','m_esp','m_estado','m_region','m_kam','m_base'].forEach(i=>{ const el=$(i); if(el) el.value=''; });
      document.dispatchEvent(new CustomEvent('medico:guardado', { detail: { id, payload } }));
    }catch(e){
      console.error('[save_med] ERROR:', e);
      alert('❌ No se pudo guardar en Firestore:\n' + (e && e.message ? e.message : e));
    }
  }

  // Delegación por si el botón aparece después
  document.addEventListener('click', (e)=>{
    const b = e.target.closest && e.target.closest('#btnSaveMed');
    if(!b) return;
    e.preventDefault();
    handleSave();
  });

  // Si el botón ya existe al cargar, dejamos un log para confirmar enganche
  if(document.getElementById('btnSaveMed')){
    console.log('[save_med] Listener activo en #btnSaveMed');
  } else {
    console.log('[save_med] Esperando #btnSaveMed (delegación activa)');
  }
})();
