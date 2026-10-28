import type { Draft, Item } from './delivery';

export async function downloadDeliveryExcel(draft?:Draft,folio?:string){
  const {default:ExcelJS}=await import('exceljs');
  const book=new ExcelJS.Workbook();
  const sheet=book.addWorksheet('Materiales',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:6'}});
  sheet.columns=[{width:18},{width:48},{width:14},{width:14},{width:26},{width:36}];
  sheet.mergeCells('B1:F1');sheet.getCell('B1').value='ENDE · '+(draft?.kind==='DEV'?'DEVOLUCIÓN':'ENTREGA')+' DE HERRAMIENTAS Y EPP';
  sheet.mergeCells('A2:F2');sheet.getCell('A2').value=folio?'FOLIO: '+folio:'PLANTILLA DE CARGA · SIN FOLIO';
  sheet.mergeCells('A3:F3');sheet.getCell('A3').value='TRABAJADOR: '+(draft?.worker?.fullName||'________________________')+'   CI: '+(draft?.worker?.ci||'________________');
  sheet.mergeCells('A4:F4');sheet.getCell('A4').value='FECHA: '+(draft?.date||'________________')+'   ÁREA: '+(draft?.area||'________________');
  sheet.mergeCells('A5:F5');sheet.getCell('A5').value=draft?'DETALLE DE MATERIALES ENTREGADOS / DEVUELTOS':'Complete las filas desde la 7. Unidades: Pza, Par, Metros. Máximo 100 materiales.';
  sheet.addRow(['Categoría','Descripción','Cantidad','Unidad','Estado','Identificación / accesorios']);
  const items=draft?.items||[];
  for(let n=0;n<(draft?items.length:25);n++){
    const i=items[n];const row=sheet.addRow(i?[i.category,i.description,Number(i.quantity),i.unit,i.condition,i.identification]:['Herramientas','','','Pza','Nuevo','']);
    row.height=30;
    row.getCell(1).dataValidation={type:'list',allowBlank:true,formulae:['"Herramientas,EPP"']};
    row.getCell(4).dataValidation={type:'list',allowBlank:true,formulae:['"Pza,Par,Metros"']};
    row.getCell(5).dataValidation={type:'list',allowBlank:true,formulae:['"Nuevo,Usado en buen estado,Con observaciones"']};
  }
  sheet.pageSetup.printArea='A1:F'+sheet.rowCount;
  sheet.eachRow(row=>row.eachCell({includeEmpty:true},cell=>{cell.alignment={vertical:'middle',wrapText:true};cell.border={bottom:{style:'hair',color:{argb:'FFCBD5E1'}}};}));
  [1,6].forEach(n=>{sheet.getRow(n).height=30;sheet.getRow(n).eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF002F6C'}};c.font={bold:true,color:{argb:'FFFFFFFF'}};});});
  sheet.headerFooter.oddFooter='ENDE · '+(folio||'PLANTILLA')+' · Página &P de &N';
  const info=book.addWorksheet('Conformidad');
  info.columns=[{width:36},{width:36},{width:36},{width:36}];
  info.mergeCells('B1:D1');info.getCell('B1').value='ENDE · '+(folio||'PLANTILLA SIN FOLIO');
  info.mergeCells('A2:D3');info.getCell('A2').value='OBSERVACIONES: '+(draft?.observations||'');info.getCell('A2').alignment={wrapText:true};
  info.getRow(5).height=80;
  info.addRow([draft?.kind==='DEV'?'RECIBÍ CONFORME':'ENTREGUÉ CONFORME','CONFORMIDAD','CONFORMIDAD',draft?.kind==='DEV'?'ENTREGUÉ CONFORME':'RECIBÍ CONFORME']);
  info.addRow(['SUPERVISOR DE ÁREA','RESPONSABLE DE ÁREA','SEGURIDAD INDUSTRIAL',draft?.worker?.fullName||'NOMBRE DEL TRABAJADOR']);
  info.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:1};
  const logoResponse=await fetch('/logo_ende_deoruro.png');
  if(!logoResponse.ok)throw new Error('No se pudo cargar el logo ENDE.');
  const logoBytes=new Uint8Array(await logoResponse.arrayBuffer());
  let binary='';for(const byte of logoBytes)binary+=String.fromCharCode(byte);
  const logo=book.addImage({base64:'data:image/png;base64,'+btoa(binary),extension:'png'});
  for(const page of [sheet,info]){page.getRow(1).height=45;page.addImage(logo,{tl:{col:0,row:0},ext:{width:100,height:55}});}
  const bytes=await book.xlsx.writeBuffer();
  const url=URL.createObjectURL(new Blob([bytes as ArrayBuffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=(folio||'Plantilla_materiales_ENDE')+'.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function parseDeliveryExcel(file:File):Promise<Item[]>{
  if(file.size>5*1024*1024)throw new Error('El Excel debe pesar menos de 5 MB.');
  const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());
  const sheet=book.getWorksheet('Materiales');if(!sheet)throw new Error('Usa la plantilla descargada: falta la hoja Materiales.');
  const items:Item[]=[];
  sheet.eachRow((row,n)=>{
    if(n<7)return;
    const values=[1,2,3,4,5,6].map(col=>row.getCell(col).text.trim());
    if(!values[1]&&!values[2])return;
    if([1,2,3,4,5,6].some(col=>row.getCell(col).type===6))throw new Error('Fila '+n+': reemplaza las fórmulas por valores.');
    const [category,description,quantity,unit,condition,identification]=values;
    const item={id:crypto.randomUUID(),category:category||'Herramientas',description:description.toLocaleUpperCase('es'),quantity:quantity.replace(',','.'),unit:unit||'Pza',condition:condition||'Nuevo',identification:identification.toLocaleUpperCase('es')};
    if(!['Herramientas','EPP'].includes(item.category)||!['Pza','Par','Metros'].includes(item.unit)||!['Nuevo','Usado en buen estado','Con observaciones'].includes(item.condition)||!item.description||item.description.length>1000||item.identification.length>500||!Number.isFinite(Number(item.quantity))||Number(item.quantity)<=0)throw new Error('Revisa categoría, descripción, cantidad, unidad y estado en la fila '+n+'.');
    items.push(item as Item);
  });
  if(!items.length||items.length>100)throw new Error('El archivo debe contener entre 1 y 100 materiales.');
  return items;
}
