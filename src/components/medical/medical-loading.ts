'use client';

import Swal from 'sweetalert2';

/** Each request closes only its own dialog, even if another request replaces it. */
export function showMedicalLoading(stage: 'expediente' | 'plantillas') {
  void Swal.fire({
    titleText: stage === 'expediente' ? 'Buscando expediente' : 'Cargando las nueve plantillas',
    html: `<div class="medical-loading-art" aria-hidden="true"><div class="medical-loading-sheet"><span></span><span></span><span></span><span></span></div><svg class="medical-loading-glass" viewBox="0 0 80 80" fill="none"><circle cx="31" cy="31" r="22" fill="#eff6ff" fill-opacity=".85" stroke="#002f6c" stroke-width="7"/><path d="M48 48L69 69" stroke="#eab308" stroke-width="12" stroke-linecap="round"/><path d="M21 23a13 13 0 0 1 14-5" stroke="#60a5fa" stroke-width="4" stroke-linecap="round"/></svg></div><p class="medical-loading-caption" role="status">${stage === 'expediente' ? 'Estamos consultando el historial de la persona atendida.' : 'Preparando los formatos y recuperando sus registros guardados.'}</p><div class="medical-loading-track" aria-hidden="true"><span></span></div><p class="medical-loading-note">La ventana se cerrará al terminar la carga.</p>`,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,
    returnFocus: false,
    width: 460,
    customClass: { popup: 'medical-loading-popup', title: 'medical-loading-title' },
  });
  const popup = Swal.getPopup();
  return () => { if (popup && Swal.getPopup() === popup) Swal.close(); };
}
