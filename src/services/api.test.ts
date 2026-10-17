// @vitest-environment jsdom
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createBooking,database,emptyData,validateBooking,embedUrl,removeEntity,normalizeMovie,serializeMovie,saveLayoutSeats,resolveMediaUrl,resolveMediaImageUrl} from './api';
import type {Data} from '../types';
const makeTestData=():Data=>{
 const data=emptyData();
 const user={id:'test-user',name:'Test User',email:'test@example.invalid',mobile:'9000000000',createdAt:'2026-01-01T00:00:00Z'};
 const theatre={id:'demo-theatre-test',name:'Test Theatre',address:'',city:'',state:'',contact:'',status:'ACTIVE' as const};
 const screen={id:'demo-screen-test',theatreId:theatre.id,name:'Test Screen',number:1,rows:3,seatsPerRow:6,status:'ACTIVE' as const,seats:Array.from({length:18},(_,index)=>{const row=Math.floor(index/6);const column=index%6;return {id:`${String.fromCharCode(65+row)}${column+1}`,row:row+1,column:column+1,category:'REGULAR',disabled:false};})};
 const show=(id:string,movieId:string,ticketType:'FREE'|'PAID',ticketPrice:number)=>({id,movieId,theatreId:theatre.id,screenId:screen.id,date:'2099-12-31',startTime:'20:00',endTime:'22:00',ticketType,ticketPrice,maxTicketsPerMobile:4,requireAdminConfirmation:false,bookingOpens:'2000-01-01T00:00:00Z',bookingCloses:'2099-12-31T23:59:59Z',status:'OPEN' as const});
 data.users=[user];data.theatres=[theatre];data.screens=[screen];
 data.movies=[{id:'interstellar',title:'Interstellar',posterUrl:'',trailerUrl:'',description:'',genre:[],language:'',duration:0,releaseDate:'',certification:'',director:'',cast:[],production:'',status:'ACTIVE'}];
 data.shows=[show('demo-show-sita-jubilee-matinee','interstellar','PAID',250),show('demo-show-sita-community','interstellar','FREE',0)];
 data.bookings=[{id:'demo-booking-existing',userId:user.id,showId:'demo-show-sita-jubilee-matinee',seatIds:['C5'],ticketCount:2,totalAmount:500,status:'CONFIRMED',confirmationStatus:'AUTO',createdAt:'2026-01-01T00:00:00Z',attended:false,notification:'',snapshot:{movie:'Interstellar',theatre:theatre.name,screen:screen.name,date:'2099-12-31',time:'20:00',mobile:user.mobile,email:user.email}}];
 data.reviews=[{id:'test-review',movieId:'interstellar',author:'Test User',title:'',text:'',rating:5,videoUrl:'',platform:'OTHER',thumbnail:'',isHighlighted:false,status:'APPROVED',createdAt:'2026-01-01T00:00:00Z'}];
 return data;
};
beforeEach(()=>{localStorage.clear();database.write(makeTestData());});
describe('booking integrity',()=>{
 it('blocks already booked seats',()=>{const d=database.read();expect(()=>validateBooking(d,d.users[0],'demo-show-sita-jubilee-matinee',['C5'])).toThrow('already booked');});
 it('counts all active bookings for the same mobile',()=>{const d=database.read();d.shows.find(s=>s.id==='demo-show-sita-jubilee-matinee')!.maxTicketsPerMobile=4;expect(()=>validateBooking(d,d.users[0],'demo-show-sita-jubilee-matinee',['A1','A2','A3'])).toThrow('maximum of 4');});
 it('does not count cancelled bookings',()=>{const d=database.read();d.bookings[0].status='CANCELLED';expect(validateBooking(d,d.users[0],'demo-show-sita-jubilee-matinee',['C5','C6','A1','A2']).id).toBe('demo-show-sita-jubilee-matinee');});
 it('rejects missing, disabled and duplicate seats',()=>{const d=database.read();d.screens[0].seats[0].disabled=true;expect(()=>validateBooking(d,d.users[0],'demo-show-sita-jubilee-matinee',['A1'])).toThrow('unavailable');expect(()=>validateBooking(d,d.users[0],'demo-show-sita-jubilee-matinee',['Z99'])).toThrow('unavailable');expect(()=>validateBooking(d,d.users[0],'demo-show-sita-jubilee-matinee',['A2','A2'])).toThrow('select');});
 it('rejects a closed show and expired booking window',()=>{const d=database.read();d.shows[0].status='CLOSED';expect(()=>validateBooking(d,d.users[0],d.shows[0].id,['A1'])).toThrow('unavailable');d.shows[0].status='OPEN';d.shows[0].bookingCloses='2000-01-01T10:00';expect(()=>validateBooking(d,d.users[0],d.shows[0].id,['A1'])).toThrow('unavailable');});
 it('creates a free pending ticket when confirmation is required',async()=>{database.update(d=>{d.settings.requireAdminConfirmation=true;});const b=await createBooking(database.read().users[0],'demo-show-sita-community',['A1','A2']);expect(b.totalAmount).toBe(0);expect(b.status).toBe('PENDING');expect(database.read().bookings.find(x=>x.id===b.id)?.notification).toContain('No ticket email');});
 it('charges the configured mock price and confirms automatically',async()=>{database.update(d=>{d.shows.find(s=>s.id==='demo-show-sita-jubilee-matinee')!.maxTicketsPerMobile=4;});const b=await createBooking(database.read().users[0],'demo-show-sita-jubilee-matinee',['A1','A2']);expect(b.totalAmount).toBe(database.read().shows.find(s=>s.id==='demo-show-sita-jubilee-matinee')!.ticketPrice*2);expect(b.confirmationStatus).toBe('AUTO');expect(()=>validateBooking(database.read(),database.read().users[0],'demo-show-sita-jubilee-matinee',['A3'])).toThrow('maximum');});
 it('cascades related demo records when an admin deletes a movie or show',()=>{removeEntity('shows','demo-show-sita-jubilee-matinee');expect(database.read().bookings.some(b=>b.showId==='demo-show-sita-jubilee-matinee')).toBe(false);removeEntity('movies','interstellar');expect(database.read().movies.some(movie=>movie.id==='interstellar')).toBe(false);expect(database.read().shows.some(show=>show.movieId==='interstellar')).toBe(false);expect(database.read().reviews.some(review=>review.movieId==='interstellar')).toBe(false);});
});
describe('demo services',()=>{
 it('resolves shared Drive image links to direct image thumbnail URLs',()=>{const id='14ENwA8DLw16PdDRC7yO3DKISTRhcOw2S';expect(resolveMediaUrl(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(`https://drive.usercontent.google.com/download?id=${id}&export=view`);expect(resolveMediaImageUrl(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toBe(`https://drive.google.com/thumbnail?id=${id}&sz=w2000`);expect(resolveMediaImageUrl(`https://drive.usercontent.google.com/download?id=${id}&export=view`)).toBe(`https://drive.google.com/thumbnail?id=${id}&sz=w2000`);});
 it('allows known embed hosts and rejects arbitrary URLs',()=>{expect(embedUrl('https://youtu.be/zSWdZVtXT7E')).toBe('https://www.youtube-nocookie.com/embed/zSWdZVtXT7E');expect(embedUrl('https://youtube.com.evil.test/watch?v=zSWdZVtXT7E')).toBeNull();expect(embedUrl('javascript:alert(1)')).toBeNull();});
 it('normalizes supported movie DTO aliases without inventing optional data',()=>{const movie=normalizeMovie({id:'m-1',title:'Example',genres:'Drama, Romance',externalTrailerUrl:'https://youtu.be/zSWdZVtXT7E',synopsis:'A real description',cast:['Actor A'],posterImages:['https://example.com/a.webp'],status:'ACTIVE'});expect(movie.genre).toEqual(['Drama','Romance']);expect(movie.trailerUrl).toBe('https://youtu.be/zSWdZVtXT7E');expect(movie.description).toBe('A real description');expect(movie.cast).toEqual(['Actor A']);expect(movie.posterImages).toEqual(['https://example.com/a.webp']);expect(movie.director).toBe('');expect(movie.status).toBe('ACTIVE');});
 it('serializes edited movies using the field names returned by the backend',()=>{const canonical=normalizeMovie({id:'m-1',title:'Example',genres:['Drama'],synopsis:'Original',externalTrailerUrl:'https://youtu.be/old'});const canonicalPayload=serializeMovie({...canonical,genre:['Romance'],description:'Updated',trailerUrl:'https://youtu.be/new'});expect(canonicalPayload.genres).toEqual(['Romance']);expect(canonicalPayload.synopsis).toBe('Updated');expect(canonicalPayload.externalTrailerUrl).toBe('https://youtu.be/new');expect(canonicalPayload).not.toHaveProperty('genre');expect(canonicalPayload).not.toHaveProperty('description');const legacy=normalizeMovie({id:'m-2',title:'Legacy',genre:['Drama'],description:'Legacy synopsis',trailerUrl:'https://youtu.be/legacy'});const legacyPayload=serializeMovie({...legacy,description:'Changed'});expect(legacyPayload.description).toBe('Changed');expect(legacyPayload).not.toHaveProperty('synopsis');});
});
describe('layout seat API payload',()=>{
 it('sends only backend fields, preserving existing IDs and omitting IDs for new seats',async()=>{
  const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('[]',{status:200,headers:{'Content-Type':'application/json'}}));
  const seats=[
   {id:'A1',backendId:'backend-seat-7',editorId:'frontend-key-7',label:'A1',row:1,column:1,category:'PREMIUM',disabled:false,color:'#c19548',selected:true},
   {id:'temporary-label',editorId:'frontend-key-new',label:'A2',row:1,column:2,category:'REGULAR',disabled:true,color:'#8b7a91',selected:false}
  ];
  await saveLayoutSeats('screen-1','version-1',seats);
  const [,init]=fetchMock.mock.calls[0];
  const payload=JSON.parse(String(init?.body));
  expect(payload).toEqual([
   {id:'backend-seat-7',label:'A1',rowNumber:1,columnNumber:1,category:'PREMIUM',disabled:false,color:'#c19548'},
   {label:'A2',rowNumber:1,columnNumber:2,category:'REGULAR',disabled:true,color:'#8b7a91'}
  ]);
  expect(Array.isArray(payload)).toBe(true);
  expect(JSON.stringify(payload)).not.toContain('editorId');
  expect(seats[0].editorId).toBe('frontend-key-7');
  expect(seats[1].editorId).toBe('frontend-key-new');
  fetchMock.mockRestore();
 });
});
