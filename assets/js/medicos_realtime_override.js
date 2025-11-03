
// medicos_realtime_override.js — Lista de médicos 100% en tiempo real desde Firestore
// Sobrescribe initMedicos/applyMedFilters/render usando la misma API global del index.

(function(){
  // Esperar a que el DOM y las funciones del index estén listas
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(init);

  async function init(){
    try{
      const appMod = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js");
      const fsMod  = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
      const app = (window.firebaseApp) || appMod.initializeApp(window.FIREBASE_CONFIG);
      window.firebaseApp = app;
      const db  = (window.firebaseDb) || fsMod.getFirestore(app);
      window.firebaseDb = db;

      const tbMed = document.querySelector('#tableMedicos tbody');
      const badge = document.getElementById('medCount');

      // Función para normalizar cada doc -> fila compatible con el render del index
      function adapt(doc){
        const r = doc.data() || {};
        return {
          _id: doc.id,
          'Nombre': r.Nombre || r.nombre || '',
          'Teléfono': r['Teléfono'] || r.Telefono || r.telefono || r.tel || '',
          'Dirección': r.Dirección || r.Direccion || r.direccion || '',
          'Hospital': r.Hospital || r.hospital || '',
          'Red Social': r['Red Social'] || r.redSocial || r.red || '',
          'Especialidad': r.Especialidad || r.especialidad || '',
          'Base': r.Base || r.base || '',
          'Estado': r.Estado || r.estado || '',
          'Región': r.Región || r.Region || r.region || '',
          'GERENTE/KAM': r['GERENTE/KAM'] || r.KAM || r.kam || ''
        };
      }

      // Sobrescribir initMedicos para que use Firestore en tiempo real
      window.initMedicos = function(){
        // Limpia UI mientras llega el primer snapshot
        if (tbMed) tbMed.innerHTML = '<tr><td colspan="11" class="muted">Cargando desde Firestore…</td></tr>';
        // Suscripción en tiempo real
        const q = fsMod.query(fsMod.collection(db, "medicos"));
        fsMod.onSnapshot(q, (snap)=>{
          // Construye la base global para filtros/exports
          window.MED_BASE = snap.docs.map(adapt);
          // Actualiza badge
          if (badge) badge.textContent = (window.MED_BASE.length || 0) + ' médicos';
          // Reaplica filtros y render
          if (typeof window.applyMedFilters === 'function'){
            try { window.applyMedFilters(); } catch(_){}
          } else if (typeof window.renderMedicos === 'function'){
            try { window.renderMedicos(); } catch(_){}
          }
        });
      };

      // Fuerza lectura desde servidor (para el botón "Refrescar")
      window.forceMedicosFromServer = async function(){
        const col = fsMod.collection(db, "medicos");
        const snap = await fsMod.getDocs(col);
        window.MED_BASE = snap.docs.map(adapt);
        if (badge) badge.textContent = (window.MED_BASE.length || 0) + ' médicos';
        if (typeof window.applyMedFilters === 'function'){
          try { window.applyMedFilters(); } catch(_){}
        } else if (typeof window.renderMedicos === 'function'){
          try { window.renderMedicos(); } catch(_){}
        }
      };

      // Si el index ya intentó correr initMedicos(), lo llamamos otra vez para conectar la subscripción
      if (typeof window.initMedicos === 'function'){ window.initMedicos(); }
    }catch(e){
      console.error('[medicos_realtime_override] error:', e);
    }
  }
})();
