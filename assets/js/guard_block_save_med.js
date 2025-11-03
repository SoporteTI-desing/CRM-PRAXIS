// guard_block_save_med.js — evita que "Guardar médico" (Sheets) se dispare cuando el modal de seguimiento está abierto
(function(){
  document.addEventListener('click', function(e){
    try{
      const md = document.getElementById('modalBackdrop');
      const modalOpen = md && (md.style.display === 'flex' || md.style.display === '' && md.classList.contains('open'));
      if(!modalOpen) return;
      const target = e.target;
      const isSaveMed = target.closest && target.closest('#btnSaveMed, #saveMed, button#btnSaveMed, button#saveMed');
      if(isSaveMed){
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
      }
    }catch(_){}
  }, true);
})();