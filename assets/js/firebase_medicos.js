// Firestore-only (tabla en vivo) + botones opcionales
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyksNhyRX-7QnZSOF27txNU-_SeMoOGps",
  authDomain: "crm-innvida-76e2e.firebaseapp.com",
  projectId: "crm-innvida-76e2e",
  storageBucket: "crm-innvida-76e2e.firebasestorage.app",
  messagingSenderId: "865341286325",
  appId: "1:865341286325:web:9fe061fa3c2c7fea4e9bfc"
};

const app = initializeApp(firebaseConfig);
initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
const db   = getFirestore(app);
const auth = getAuth(app);
const col  = collection(db, "medicos");

signInAnonymously(auth).catch(()=>{});

onAuthStateChanged(auth, (user) => {
  if (!user) return;
  startRealtime();
  wireUpForm();
  wireUpCSV();
});

function startRealtime(){
  const tbody = document.getElementById("tbody-medicos");
  if(!tbody){ return; }
  const q = query(col, orderBy("createdAt","desc"));
  onSnapshot(q, (snap)=>{
    const lista = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    tbody.innerHTML = lista.map(rowHTML).join("");
    prepareCSV(lista);
  });
}
function rowHTML(m){
  const esc = (s)=> String(s ?? "").replace(/[&<>]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  return `
    <tr>
      <td>${esc(m.nombre)}</td>
      <td>${esc(m.telefono)}</td>
      <td>${esc(m.direccion)}</td>
      <td>${esc(m.hospital)}</td>
      <td>${esc(m.redSocial ?? "No clasificado")}</td>
      <td>${esc(m.especialidad)}</td>
      <td>${esc(m.base)}</td>
      <td>${esc(m.estado)}</td>
      <td>${esc(m.region)}</td>
      <td>${esc(m.kam)}</td>
      <td><button class="btn-seg" data-id="${esc(m.id)}">+ Seguimiento</button></td>
    </tr>
  `;
}
function wireUpForm(){
  const btn = document.getElementById("btnGuardarMedico") || Array.from(document.querySelectorAll("button")).find(b => /guardar\s+m[ée]dico/i.test(b.textContent||""));
  if(btn){ btn.addEventListener("click", guardarMedicoDesdeForm); }
  document.addEventListener("click", async (ev)=>{
    const el = ev.target;
    if(el && el.classList?.contains("btn-del")){
      const id = el.getAttribute("data-del");
      if(id && confirm("¿Borrar este médico?")){ await deleteDoc(doc(db, "medicos", id)); }
    }
  });
}
function byId(id){ return document.getElementById(id); }
function val(id, sel){ return (byId(id)?.value || (sel ? (document.querySelector(sel)?.value || "") : "")).trim(); }

export async function guardarMedicoDesdeForm(){
  const payload = {
    nombre:       val("i_nombre",       'input[placeholder="Nombre"]'),
    telefono:     val("i_telefono",     'input[placeholder*="Tel"]'),
    direccion:    val("i_direccion",    'input[placeholder^="Dirección"]'),
    hospital:     val("i_hospital",     'input[placeholder^="Hospital"]'),
    redSocial:    val("i_red",          'input[placeholder*="Red"]'),
    especialidad: val("i_especialidad", 'input[placeholder*="Especialidad"]'),
    estado:       val("i_estado",       'input[placeholder*="Estado"]'),
    region:       val("i_region",       'input[placeholder*="Región"]'),
    kam:          val("i_kam",          'input[placeholder*="KAM"], input[placeholder*="Gerente"]'),
    base:         val("i_base",         'input[placeholder*="Base"], input[placeholder*="campaña"]'),
    estatus:      "prospecto",
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp()
  };
  if(!payload.nombre){ alert("Falta el nombre"); return; }
  try {
    const docRef = await addDoc(col, payload);
    console.log("Médico guardado:", docRef.id);
    alert("Médico registrado");
  } catch (e) {
    console.error("Error guardando médico:", e);
    alert("Error guardando: " + (e.message || e));
  }
}
window.guardarMedicoDesdeForm = guardarMedicoDesdeForm;

// CSV
let csvCache = "";
function prepareCSV(lista){
  const headers = ["nombre","telefono","direccion","hospital","redSocial","especialidad","base","estado","region","kam","estatus","createdAt","updatedAt"];
  const rows = lista.map(m => ([
    m.nombre||"", m.telefono||"", m.direccion||"", m.hospital||"", m.redSocial||"",
    m.especialidad||"", m.base||"", m.estado||"", m.region||"", m.kam||"", m.estatus||"",
    m.createdAt?.toDate?.()?.toISOString?.() || "", m.updatedAt?.toDate?.()?.toISOString?.() || ""
  ]));
  const q = (v)=> `"${String(v).replaceAll('"','""')}"`;
  csvCache = [headers.map(q).join(","), ...rows.map(r=>r.map(q).join(","))].join("\n");
}
function wireUpCSV(){
  const btn = document.getElementById("btnCSV") || Array.from(document.querySelectorAll("button")).find(b => /^\\s*csv\\s*$/i.test(b.textContent||""));
  if(btn){
    btn.addEventListener("click", ()=>{
      const blob = new Blob([csvCache], {type:"text/csv;charset=utf-8"});
      const url  = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href=url; a.download="medicos.csv";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  }
}


// ====== SEGUIMIENTO + PAGINACIÓN "TODOS" (patch) ======
if (!window.__seguimientoPatched) {
  window.__seguimientoPatched = true;
  import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js").then((m) => {
    const { getFirestore, collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } = m;
    const db = getFirestore();
    const T_BODY_ID = "tbody-medicos";
    const tbody = document.getElementById(T_BODY_ID) || document.querySelector("tbody");

    function esc(s){ return (s ?? "").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    function getPageSize(){
      const sel = document.getElementById("page-size");
      const v = sel?.value || "20";
      return v === "all" ? Number.MAX_SAFE_INTEGER : parseInt(v,10);
    }
    function showModalSeg(show){
      const m = document.getElementById("modal-seg");
      if (m) m.style.display = show ? "block" : "none";
    }
    function renderFilas(lista){
      if (!tbody) return;
      tbody.innerHTML = lista.map(m => `
        <tr>
          <td>${esc(m.nombre)}</td>
          <td>${esc(m.telefono)}</td>
          <td>${esc(m.direccion)}</td>
          <td>${esc(m.hospital)}</td>
          <td>${esc(m.redSocial || "No clasificado")}</td>
          <td>${esc(m.especialidad)}</td>
          <td>${esc(m.base)}</td>
          <td>${esc(m.estado)}</td>
          <td>${esc(m.region)}</td>
          <td>${esc(m.kam)}</td>
          <td><button class="btn btn-sm btn-primary btn-seg" data-id="${m.id}">Seguimiento</button></td>
        </tr>
      `).join("");
    }

    let LISTA = [];
    function aplicarPaginacionYRender(){
      const size = getPageSize();
      const visible = LISTA.slice(0, size);
      renderFilas(visible);
    }
    document.getElementById("page-size")?.addEventListener("change", aplicarPaginacionYRender);

    try {
      const q = query(collection(db,"medicos"), orderBy("nombre"));
      onSnapshot(q, (snap)=>{
        LISTA = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        aplicarPaginacionYRender();
      });
    } catch (e) {
      console.warn("Snapshot secundario no iniciado:", e);
    }

    document.addEventListener("click", async (e) => {
      const b = e.target.closest(".btn-seg");
      if (!b) return;
      const id = b.dataset.id;
      try {
        const s = await getDoc(doc(db, "medicos", id));
        if (!s.exists()) { alert("No encontré el médico."); return; }
        const med = s.data();
        document.getElementById("seg-id").value = id;
        const set = (x,v)=>{ const el = document.getElementById(x); if (el) el.value = v || ""; };
        set("seg-nombre", med.nombre);
        set("seg-telefono", med.telefono);
        set("seg-direccion", med.direccion);
        set("seg-hospital", med.hospital);
        set("seg-redSocial", med.redSocial);
        set("seg-especialidad", med.especialidad);
        set("seg-base", med.base);
        set("seg-estado", med.estado);
        set("seg-region", med.region);
        set("seg-kam", med.kam);
        set("seg-estatus", med.estatus || "prospecto");
        showModalSeg(true);
      } catch (err) {
        console.error(err); alert("Error cargando médico.");
      }
    });

    document.getElementById("seg-cerrar")?.addEventListener("click", () => showModalSeg(false));

    document.getElementById("seg-guardar")?.addEventListener("click", async () => {
      const id = document.getElementById("seg-id")?.value;
      if (!id) return;
      const pick = (x)=>document.getElementById(x)?.value?.trim() || "";
      const datos = {
        nombre: pick("seg-nombre"),
        telefono: pick("seg-telefono"),
        direccion: pick("seg-direccion"),
        hospital: pick("seg-hospital"),
        redSocial: pick("seg-redSocial"),
        especialidad: pick("seg-especialidad"),
        base: pick("seg-base"),
        estado: pick("seg-estado"),
        region: pick("seg-region"),
        kam: pick("seg-kam"),
        estatus: pick("seg-estatus") || "prospecto",
        updatedAt: serverTimestamp()
      };
      try {
        await updateDoc(doc(db,"medicos",id), datos);
        showModalSeg(false);
      } catch(e){ console.error(e); alert("No pude guardar cambios."); }
    });
  });
}
