const rowLabel=(row:number)=>{let label='';for(let value=row;value>0;value=Math.floor((value-1)/26))label=String.fromCharCode(65+(value-1)%26)+label;return label;};

export function normalizeSeatLayout(seats:any[]=[],columns=12){
 const positioned=seats.map((seat,index)=>({seat,index,row:Number(seat.row??seat.rowNumber)||Math.floor(index/Math.max(1,columns))+1,column:Number(seat.column??seat.columnNumber)||index%Math.max(1,columns)+1}));
 const numbers=new Map<number,number>();
 const labels=new Map<number,string>();
 const rowNames=new Map([...new Set(positioned.map(item=>item.row).sort((a,b)=>a-b))].map((row,index)=>[row,index+1]));
 for(const item of [...positioned].sort((a,b)=>a.row-b.row||a.column-b.column||a.index-b.index)){
  const number=(numbers.get(item.row)||0)+1;numbers.set(item.row,number);
  labels.set(item.index,`${rowLabel(rowNames.get(item.row)||item.row)}${number}`);
 }
 return positioned.map(({seat,index,row,column})=>{const generated=labels.get(index)!;const supplied=String(seat.label||'').trim();const label=supplied&&!isOpaqueSeatId(supplied)?supplied:generated;return {...seat,id:seat.id,label,backendId:seat.backendId||seat.id,row,column};});
}

function isOpaqueSeatId(value:string){return /^[{]?[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[}]?$/i.test(value);}

export function createSeatLabelMap(seats:any[]=[],columns=12):Record<string,string>{
 const normalized=normalizeSeatLayout(seats,columns);
 const labels:Record<string,string>={};
 seats.forEach((seat,index)=>{
  const label=normalized[index]?.label;
  if(!label)return;
  for(const key of [seat.id,seat.seatId,seat.backendId,seat.code])if(key!==undefined&&key!==null&&String(key).trim())labels[String(key)]=label;
 });
 return labels;
}
