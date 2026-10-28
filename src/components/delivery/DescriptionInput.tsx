'use client';
import {useEffect,useId,useState} from 'react';
import {deliveryDescriptions} from '@/app/entrega/actions';
export default function DescriptionInput({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [focused,setFocused]=useState(false);const id=useId();const [rows,setRows]=useState<string[]>([]);const [error,setError]=useState('');
 useEffect(()=>{if(!focused||disabled)return;let active=true;const timer=setTimeout(()=>{deliveryDescriptions(value.slice(0,200)).then(r=>{if(active){setRows(r.rows||[]);setError(r.error||'');}}).catch(()=>{if(active)setError('No se pudieron cargar las sugerencias. Puedes escribir la descripción.');});},300);return()=>{active=false;clearTimeout(timer);};},[value,focused,disabled]);
 return <><input onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} list={id} disabled={disabled} maxLength={1000} value={value} onChange={e=>onChange(e.target.value.toLocaleUpperCase('es'))}/><datalist id={id}>{rows.map(row=><option key={row} value={row}/>)}</datalist>{error&&<small>{error}</small>}</>;
}
