import {useEffect,useMemo,useState} from 'react';
import {Building2,CalendarDays,Check,ChevronDown,Clock,Monitor,RefreshCw,ScanLine,ShieldCheck,Ticket,Users} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {adminUsers} from '../services/auth';
import {listBackendShows,loadTheatreScreens} from '../services/api';
import {Empty,MediaImage,Notice,date} from '../components/Common';
import type {Show,Theatre,User} from '../types';

type AssignmentMap=Record<string,string[]>;
const assignmentIds=(response:any):string[]=>{
 const rows=Array.isArray(response)?response:response?.verifierShowIds||response?.showIds||response?.content||response?.data||[];
 return (Array.isArray(rows)?rows:[]).map((row:any)=>typeof row==='string'?row:String(row?.showId||row?.show?.id||row?.id||'')).filter(Boolean);
};
const isVerifier=(user:User)=>user.roles?.includes('VERIFIER')||false;

export function AdminAvScan(){
 const {data}=useApp();
 const [theatreId,setTheatreId]=useState('');
 const [tab,setTab]=useState<'shows'|'calendar'|'verifiers'>('shows');
 const [accounts,setAccounts]=useState<User[]>([]);
 const [assignments,setAssignments]=useState<AssignmentMap>({});
 const [assigning,setAssigning]=useState<Show|null>(null);
 const [selectedUserIds,setSelectedUserIds]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const theatres=useMemo(()=>data.theatres.filter(item=>item.status==='ACTIVE'),[data.theatres]);
 const currentTheatre=theatres.find(item=>item.id===theatreId)||theatres[0];
 const screens=data.screens.filter(screen=>screen.theatreId===currentTheatre?.id&&screen.status==='ACTIVE').sort((a,b)=>a.number-b.number);
 const verifiers=accounts.filter(isVerifier);
 const assignableAccounts=accounts.filter(account=>account.role!=='ADMIN');
 const verifierIdsFor=(showId:string)=>verifiers.filter(account=>assignments[account.id]?.includes(showId)).map(account=>account.id);
 const today=new Date().toISOString().slice(0,10);
 const todaysShows=data.shows.filter(show=>show.date===today);
 const unassignedCount=data.shows.filter(show=>!verifierIdsFor(show.id).length).length;

 const load=async(forceScreens=false)=>{
  setLoading(true);setError('');
  try{
   if(data.theatres.length)await loadTheatreScreens(data.theatres.map(theatre=>theatre.id),forceScreens);
   const first=await adminUsers.list(0);let rows=[...first.content];
   for(let page=1;page<first.totalPages;page++){const next=await adminUsers.list(page);rows.push(...next.content);}
   const unique=rows.filter((item,index,list)=>list.findIndex(other=>other.id===item.id)===index);
   setAccounts(unique);
   const staff=unique.filter(isVerifier);
   const pairs=await Promise.all(staff.map(async account=>[account.id,assignmentIds(await adminUsers.verifierShows(account.id))] as const));
   setAssignments(Object.fromEntries(pairs));
  }catch(reason){setError((reason as Error).message||'Unable to load verifier assignments.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{if(!theatreId&&theatres.length)setTheatreId(theatres[0].id);},[theatres,theatreId]);
 useEffect(()=>{if(data.theatres.length)void loadTheatreScreens(data.theatres.map(theatre=>theatre.id));},[data.theatres]);
 useEffect(()=>{void load();},[]);
 const showsFor=(screenId:string)=>data.shows.filter(show=>show.screenId===screenId).sort((a,b)=>`${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
 const titleFor=(show:Show)=>data.movies.find(movie=>movie.id===show.movieId)?.title||'Movie unavailable';
 const openAssign=(show:Show)=>{setAssigning(show);setSelectedUserIds(verifierIdsFor(show.id));setError('');setNotice('');};
 const saveAssignment=async()=>{
  if(!assigning)return;setBusy(true);setError('');setNotice('');
  try{
   const currentShows=await listBackendShows();
   const validShowIds=new Set(currentShows.map((show:any)=>String(show.id||'')).filter(Boolean));
   if(!validShowIds.has(assigning.id))throw new Error('This show is no longer available in the backend. Refresh AV Scan and try again.');
   const toUpdate=assignableAccounts.filter(account=>selectedUserIds.includes(account.id)!==Boolean(assignments[account.id]?.includes(assigning.id)));
   const updated=await Promise.all(toUpdate.map(async account=>{
    const current=(assignments[account.id]||[]).filter(id=>validShowIds.has(id));
    const next=selectedUserIds.includes(account.id)?[...new Set([...current,assigning.id])]:current.filter(id=>id!==assigning.id);
    const existingRoles=(account.roles||[]).filter(role=>role!=='USER'&&role!=='ADMIN');
    const roles=selectedUserIds.includes(account.id)?[...new Set([...existingRoles,'VERIFIER'])]:existingRoles.filter(role=>role!=='VERIFIER');
    return {id:account.id,shows:next,roles};
   }));
   const savedUsers=await Promise.all(updated.map(item=>adminUsers.additionalRoles(item.id,item.roles,item.shows)));
   setAccounts(current=>current.map(account=>savedUsers.find(saved=>saved.id===account.id)||account));
   setAssignments(current=>{const next={...current};for(const item of updated)next[item.id]=item.shows;return next;});
   setNotice(`Verifier assignments updated for ${titleFor(assigning)}.`);setAssigning(null);
  }catch(reason){setError((reason as Error).message||'Unable to save verifier assignments.');}
  finally{setBusy(false);}
 };
 const showRows=(show:Show)=>{
  const movie=data.movies.find(item=>item.id===show.movieId);
  const ids=verifierIdsFor(show.id);
  return <div className="avscan-show-row" key={show.id}>
   <div className="avscan-show-time"><strong>{show.startTime}</strong><small>{date(show.date)}</small></div>
   <div className="avscan-movie"><MediaImage url={movie?.posterUrl||''} alt={`${titleFor(show)} poster`} className="avscan-poster"/><span><strong>{titleFor(show)}</strong><small>{movie?.language||'Screening'} · {show.ticketType==='FREE'?'Free':'Paid'}</small></span></div>
   <span className={`avscan-status ${show.status.toLowerCase()}`}>{show.status}</span>
   <div className="avscan-assigned" aria-label={`${ids.length} assigned verifiers`}>{ids.length?ids.slice(0,3).map(id=>{const account=verifiers.find(item=>item.id===id)!;return <span className="avscan-avatar" title={account.name} key={id}>{account.name.split(/\s+/).map(word=>word[0]).join('').slice(0,2).toUpperCase()}</span>;}):<span className="muted">None</span>}{ids.length>3&&<span className="avscan-avatar avscan-more">+{ids.length-3}</span>}</div>
   <button className="button small avscan-assign-button" onClick={()=>openAssign(show)}><Users size={14}/>{ids.length?'Manage':'Assign verifiers'}<ChevronDown size={14}/></button>
  </div>;
 };
 return <main className="admin-content avscan-page">
  <header className="avscan-header"><div><span className="eyebrow">ADMISSION CONTROL</span><h1>AV Scan Management</h1><p>Assign verifiers to theatre shows for ticket scanning.</p></div><button className="button secondary" onClick={()=>void load(true)} disabled={loading}><RefreshCw size={15}/>Refresh data</button></header>
  {error&&<Notice error>{error}</Notice>}{notice&&<Notice>{notice}</Notice>}
  <section className="avscan-stats">
   <article><Building2/><strong>{theatres.length}</strong><span>Theatres</span></article><article><Monitor/><strong>{data.screens.length}</strong><span>Screens</span></article><article><CalendarDays/><strong>{todaysShows.length}</strong><span>Shows today</span></article><article><Users/><strong>{verifiers.length}</strong><span>Assigned verifiers</span></article><article><Ticket/><strong>{unassignedCount}</strong><span>Unassigned shows</span></article>
  </section>
  <section className="avscan-workspace">
   <aside className="avscan-theatre-list"><h2>Theatres</h2>{theatres.map(theatre=><button key={theatre.id} className={`avscan-theatre-item ${currentTheatre?.id===theatre.id?'active':''}`} onClick={()=>setTheatreId(theatre.id)}><span className="avscan-theatre-icon"><Building2 size={17}/></span><span><strong>{theatre.name}</strong><small>{theatre.city}</small></span><span className="avscan-screen-count">{data.screens.filter(screen=>screen.theatreId===theatre.id).length} screens</span><ChevronDown size={15}/></button>)}{!theatres.length&&<Empty title="No active theatres."/>}</aside>
   <div className="avscan-detail">
    {currentTheatre?<><header className="avscan-venue-header"><span className="avscan-venue-icon"><Building2/></span><div><h2>{currentTheatre.name}</h2><p>{currentTheatre.address} · {currentTheatre.city}, {currentTheatre.state}</p></div><span className="avscan-venue-badge">{screens.length} screens</span></header>
     <nav className="avscan-tabs"><button className={tab==='shows'?'active':''} onClick={()=>setTab('shows')}><Monitor size={15}/>Screens &amp; shows</button><button className={tab==='calendar'?'active':''} onClick={()=>setTab('calendar')}><CalendarDays size={15}/>Show calendar</button><button className={tab==='verifiers'?'active':''} onClick={()=>setTab('verifiers')}><ShieldCheck size={15}/>Verifier assignments</button></nav>
     {loading?<div className="panel"><p className="muted" role="status">Loading verifier assignments...</p></div>:tab==='shows'?<div className="avscan-screen-list">{screens.map(screen=>{const shows=showsFor(screen.id);const assigned=shows.reduce((count,show)=>count+(verifierIdsFor(show.id).length?1:0),0);return <details className="avscan-screen-card" key={screen.id} open><summary><span className="avscan-screen-title"><Monitor size={17}/><strong>{screen.name}</strong><small>{screen.seatsPerRow*screen.rows} seats</small></span><span className="avscan-screen-summary">{shows.length} shows · {assigned} assigned</span><ChevronDown size={16}/></summary>{shows.length?<div className="avscan-table"><div className="avscan-table-head"><span>Time / date</span><span>Movie</span><span>Status</span><span>Assigned verifiers</span><span>Actions</span></div>{shows.map(show=>showRows(show))}</div>:<p className="avscan-empty-screen">No shows scheduled on this screen.</p>}</details>;})}{!screens.length&&<Empty title="No active screens in this theatre."/>}</div>:tab==='calendar'?<div className="avscan-screen-list"><section className="avscan-calendar"><h3><CalendarDays size={17}/> Upcoming shows at {currentTheatre.name}</h3>{data.shows.filter(show=>show.theatreId===currentTheatre.id).sort((a,b)=>`${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).map(show=><div className="avscan-calendar-row" key={show.id}><div><strong>{date(show.date)}</strong><small><Clock size={13}/>{show.startTime} – {show.endTime}</small></div><span>{data.screens.find(screen=>screen.id===show.screenId)?.name||'Screen'}</span><strong>{titleFor(show)}</strong><button className="button small secondary" onClick={()=>openAssign(show)}>{verifierIdsFor(show.id).length} assigned · Manage</button></div>)}{!data.shows.some(show=>show.theatreId===currentTheatre.id)&&<Empty title="No shows scheduled at this theatre."/>}</section></div>:<div className="avscan-screen-list"><section className="avscan-calendar"><h3><ShieldCheck size={17}/> Verifiers assigned at {currentTheatre.name}</h3>{verifiers.map(account=>{const assigned=data.shows.filter(show=>show.theatreId===currentTheatre.id&&assignments[account.id]?.includes(show.id));return <div className="avscan-verifier-row" key={account.id}><span className="avscan-avatar">{account.name.split(/\s+/).map(word=>word[0]).join('').slice(0,2).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.email} · {account.mobile}</small></div><span>{assigned.length} shows</span><span className={account.enabled===false?'avscan-status inactive':'avscan-status active'}>{account.enabled===false?'Inactive':'Active'}</span></div>;})}{!verifiers.length&&<Empty title="No verifier accounts are assigned yet."/>}</section></div>}</>:<Empty title="Select an active theatre."/>}
   </div>
  </section>
  {assigning&&<div className="modal-shade" onClick={()=>{if(!busy)setAssigning(null);}}><section className="modal avscan-assign-modal" role="dialog" aria-modal="true" aria-label="Assign verifiers" onClick={event=>event.stopPropagation()}><div className="modal-heading"><div><h2>Assign verifiers</h2><p>Select existing accounts; saved selections receive verifier access. {titleFor(assigning)} · {currentTheatre?.name} · {data.screens.find(screen=>screen.id===assigning.screenId)?.name} · {date(assigning.date)} {assigning.startTime}</p></div><button className="icon-button" disabled={busy} onClick={()=>setAssigning(null)} aria-label="Close">×</button></div>{error&&<Notice error>{error}</Notice>}<div className="avscan-verifier-choices">{assignableAccounts.map(account=><label key={account.id} className="avscan-verifier-choice"><input type="checkbox" checked={selectedUserIds.includes(account.id)} onChange={event=>setSelectedUserIds(current=>event.target.checked?[...current,account.id]:current.filter(id=>id!==account.id))}/><span className="avscan-avatar">{account.name.split(/\s+/).map(word=>word[0]).join('').slice(0,2).toUpperCase()}</span><span><strong>{account.name}</strong><small>{account.email} · {account.mobile}</small></span><span className={account.enabled===false?'avscan-status inactive':'avscan-status active'}>{account.enabled===false?'Inactive':'Active'}</span></label>)}{!assignableAccounts.length&&<p className="muted">No user accounts are available to assign.</p>}</div><div className="button-row"><button className="button" disabled={busy||!assignableAccounts.length} onClick={()=>void saveAssignment()}>{busy?'Saving...':<><Check size={15}/>Save assignments</>}</button><button className="button secondary" disabled={busy} onClick={()=>setAssigning(null)}>Cancel</button></div></section></div>}
 </main>;
}
