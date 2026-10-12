import type {Seat} from '../types';

// Generate an empty screen layout for the admin editor; no venue data is seeded.
export const seatsFor=(rows:number,cols:number):Seat[]=>Array.from({length:rows*cols},(_,i)=>({id:`${String.fromCharCode(65+Math.floor(i/cols))}${i%cols+1}`,category:Math.floor(i/cols)<2?'PREMIUM':'REGULAR',disabled:false,color:Math.floor(i/cols)<2?'#d89556':'#8b7a91',row:Math.floor(i/cols)+1,column:i%cols+1}));
