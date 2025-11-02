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
      <td><button class="btn-del" data-del="${esc(m.id)}">Borrar</button></td>
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
