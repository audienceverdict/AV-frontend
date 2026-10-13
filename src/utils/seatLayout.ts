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
 return positioned.map(({seat,index,row,column})=>{const label=labels.get(index)!;return {...seat,id:seat.id,label,backendId:seat.backendId||seat.id,row,column};});
}
