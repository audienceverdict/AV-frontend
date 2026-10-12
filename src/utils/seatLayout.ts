const rowLabel=(row:number)=>String.fromCharCode(64+row);
const seatLabelPattern=/^[A-Z]+\d+$/i;

export function normalizeSeatLayout(seats:any[]=[],columns=12){
 const positioned=seats.map((seat,index)=>({seat,index,row:Number(seat.row??seat.rowNumber)||Math.floor(index/Math.max(1,columns))+1,column:Number(seat.column??seat.columnNumber)||index%Math.max(1,columns)+1}));
 const numbers=new Map<number,number>();
 const labels=new Map<number,string>();
 for(const item of [...positioned].sort((a,b)=>a.row-b.row||a.column-b.column||a.index-b.index)){
  const number=(numbers.get(item.row)||0)+1;numbers.set(item.row,number);
  const candidate=String(item.seat.label||item.seat.id||'');
  labels.set(item.index,seatLabelPattern.test(candidate)?candidate:`${rowLabel(item.row)}${number}`);
 }
 return positioned.map(({seat,index,row,column})=>{const label=labels.get(index)!;return {...seat,id:seat.id,label,backendId:seat.backendId||seat.id,row,column};});
}
