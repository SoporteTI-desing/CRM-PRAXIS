
// save_med_index.js — guarda el formulario superior "Registrar nuevo médico" en Firestore
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

(function(){
  function $(id){ return document.getElementById(id); }
  function trim(v){ return (v||'').toString().trim(); }
  function slug(s){ return trim(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$|_/g,''); }

  function init(){
    var app = getApps()[0];
    if(!app && window.FIREBASE_CONFIG){
      app = initializeApp(window.FIREBASE_CONFIG);
    }
    const auth = getAuth();
    signInAnonymously(auth).catch(()=>{});
    const db = getFirestore();

    const btn = document.getElementById('btnSaveMed');
    if(!btn) return;
    btn.addEventListener('click', async function(){
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
      const id = slug(payload.nombre + ' ' + payload.direccion || '');
      await setDoc(doc(db,'medicos', id), payload, { merge: true });
      // mini toast
      btn.textContent = "Guardado ✓"; setTimeout(()=> btn.textContent="Guardar médico", 1200);
      // limpia
      ['m_nombre','m_tel','m_dir','m_hosp','m_red','m_esp','m_estado','m_region','m_kam','m_base'].forEach(i=>{ const el=$(i); if(el) el.value=''; });
      // opcional: emitir evento para que otros paneles refresquen
      document.dispatchEvent(new CustomEvent('medico:guardado', { detail: { id, payload } }));
    });
  }

  if(document.readyState!=='loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
