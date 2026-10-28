'use client';
import {useEffect,useRef,useState} from 'react';
import {FileSpreadsheet,Sparkles,Upload,X} from 'lucide-react';
import Swal from 'sweetalert2';
import type {Item} from '@/lib/delivery';
type Preview={items:Item[];warnings:string[];sources:{sheet:string;row:number}[];model:string};
export default function ImportMaterials({onImport,onBusy,count}:{onImport:(items:Item[],append:boolean)=>void;onBusy:(busy:boolean)=>void;count:number}){
 const [preview,setPreview]=useState<Preview|null>(null);const [filename,setFilename]=useState('');const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(preview)dialog.current?.showModal();},[preview]);
 async function upload(file:File){
  if(file.size>3*1024*1024){await Swal.fire({icon:'error',text:'El archivo debe pesar menos de 3 MB.'});return;}
  onBusy(true);void Swal.fire({title:'Reconociendo materiales con IA',text:'Leyendo las hojas, descripciones, cantidades y unidades…',allowOutsideClick:false,allowEscapeKey:false,didOpen:()=>Swal.showLoading()});
  try{const form=new FormData();form.set('file',file);const response=await fetch('/api/entrega/import',{method:'POST',body:form,signal:AbortSignal.timeout(60000)});const result=await response.json();Swal.close();if(!response.ok||result.error)throw new Error(result.error||'No se pudo leer el archivo.');setFilename(file.name);setPreview(result);}
  catch(e){Swal.close();await Swal.fire({icon:'error',title:'No se importaron materiales',text:e instanceof Error?e.message:'No se pudo conectar con la IA.'});}
  finally{onBusy(false);}
 }
 function accept(append:boolean){if(!preview)return;onImport(preview.items,append);dialog.current?.close();setPreview(null);}
 return <><label className="delivery-secondary"><Sparkles size={18}/> Importar Excel<input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label>
 <dialog ref={dialog} className="delivery-import-dialog" onCancel={()=>setPreview(null)}>{preview&&<><header className="delivery-section-title"><div><h2><FileSpreadsheet/> Revisar materiales reconocidos</h2><p>{filename} · {preview.items.length} materiales</p></div><button aria-label="Cerrar vista previa" onClick={()=>{dialog.current?.close();setPreview(null);}}><X/></button></header>
 <p className="delivery-notice">Verifica las cantidades y unidades. Esta vista previa aún no guarda ni modifica el acta.</p>
 {preview.warnings.length>0&&<details open><summary>{preview.warnings.length} observaciones para revisar</summary><ul>{preview.warnings.map((w,n)=><li key={n}>{w}</li>)}</ul></details>}
 <div className="delivery-preview-scroll"><table className="delivery-balance"><thead><tr><th>Origen</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th>Categoría / Estado</th></tr></thead><tbody>{preview.items.map((i,n)=><tr key={i.id}><td>{preview.sources[n].sheet}<small>Fila {preview.sources[n].row}</small></td><td>{i.description}<small>{i.identification}</small></td><td><input aria-label={'Cantidad del ítem '+(n+1)} type="number" min="0.01" step="any" value={i.quantity} onChange={e=>setPreview({...preview,items:preview.items.map((j,k)=>k===n?{...j,quantity:e.target.value}:j)})}/></td><td><select aria-label={'Unidad del ítem '+(n+1)} value={i.unit} onChange={e=>setPreview({...preview,items:preview.items.map((j,k)=>k===n?{...j,unit:e.target.value as Item['unit']}:j)})}><option>Pza</option><option>Par</option><option>Metros</option></select></td><td>{i.category}<small>{i.condition}</small></td></tr>)}</tbody></table></div>
 <div className="delivery-actions"><button className="delivery-primary" onClick={()=>accept(false)}><Upload size={17}/> Reemplazar lista con estos materiales</button><button className="delivery-secondary" disabled={count+preview.items.length>100} onClick={()=>accept(true)}>Añadir a la lista actual</button><button className="delivery-secondary" onClick={()=>{dialog.current?.close();setPreview(null);}}>Cancelar</button></div></>}</dialog></>;
}
