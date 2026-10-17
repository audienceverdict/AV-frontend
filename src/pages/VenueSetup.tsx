import {useEffect, useState, type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Armchair, Building2, Check, CircleX, ChevronRight, Eye, MapPinned, Pencil, Plus, Save, Trash2} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {createScreen, database, loadTheatreScreens, repositories} from '../services/api';
import {Empty, MediaImage, Modal, Notice, SectionHeading} from '../components/Common';
import type {Screen,Theatre} from '../types';
import './venue-list.css';
import venueBackdrop from '../../images/about-cinema-hero.png?url';

const createVenue=():Theatre=>({id:crypto.randomUUID(),name:'',address:'',city:'Hyderabad',state:'Telangana',contact:'',status:'ACTIVE',mapUrl:'',media:[]});

export function VenueSetup(){
 const {data}=useApp();
 const [editing,setEditing]=useState<Theatre|null>(null);
 const [viewing,setViewing]=useState<Theatre|null>(null);
 const [deleting,setDeleting]=useState<Theatre|null>(null);
 const [viewingScreen,setViewingScreen]=useState<Screen|null>(null);
 const [editingScreen,setEditingScreen]=useState<Screen|null>(null);
 const [deletingScreen,setDeletingScreen]=useState<Screen|null>(null);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [saving,setSaving]=useState(false);

 useEffect(()=>{
  if(data.theatres.length)void loadTheatreScreens(data.theatres.map(item=>item.id)).catch(reason=>setError((reason as Error).message));
 },[data.theatres]);

 const save=async(event:FormEvent)=>{
  event.preventDefault();
  if(!editing||saving)return;
  setSaving(true);setError('');setMessage('');
  try{
   if(!editing.name.trim()||!editing.address.trim()||!editing.city.trim())throw new Error('Enter the theatre name, full address, and city.');
   await repositories.theatres.save({...editing,name:editing.name.trim(),address:editing.address.trim(),city:editing.city.trim()});
   setEditing(null);setMessage('Theatre saved successfully.');
  }catch(reason){setError((reason as Error).message);}finally{setSaving(false);}
 };

 const remove=async()=>{
  if(!deleting)return;
  try{await repositories.theatres.delete(deleting.id);setDeleting(null);setViewing(null);setMessage(`${deleting.name} was deleted.`);setError('');}
  catch(reason){setError((reason as Error).message);setDeleting(null);}
 };

 const saveScreen=async(event:FormEvent)=>{
  event.preventDefault();if(!editingScreen)return;
  try{if(!editingScreen.name.trim()||editingScreen.number<1||!Number.isInteger(editingScreen.number))throw new Error('Enter a screen name and a positive whole screen number.');await repositories.screens.save({...editingScreen,name:editingScreen.name.trim()});setEditingScreen(null);setMessage('Screen details saved.');setError('');}
  catch(reason){setError((reason as Error).message);}
 };

 const removeScreen=async()=>{
  if(!deletingScreen)return;
  try{await repositories.screens.delete(deletingScreen.id);setDeletingScreen(null);setViewingScreen(null);setMessage(`${deletingScreen.name} was deleted.`);setError('');}
  catch(reason){setError((reason as Error).message);setDeletingScreen(null);}
 };

 const addScreen=async(theatre:Theatre)=>{
  try{
   const number=data.screens.filter(item=>item.theatreId===theatre.id).length+1;
   const screen={id:crypto.randomUUID(),theatreId:theatre.id,name:`Screen ${number}`,number,rows:6,seatsPerRow:10,seats:[],status:'ACTIVE' as const};
   const saved=await createScreen(theatre.id,screen);
   database.update(current=>{current.screens=[...current.screens.filter(item=>item.id!==saved.id),{...saved,seats:[]}]});
   setViewing({...theatre});setMessage(`${screen.name} added. Configure its seating layout in the screen workspace.`);setError('');
  }catch(reason){setError((reason as Error).message);}
 };

 const startEdit=(theatre?:Theatre)=>{setViewing(null);setEditing(theatre?{...theatre}:createVenue());setError('');setMessage('');};

 return <div className="admin-content venue-setup">
  <div className="venue-list-heading" style={{backgroundImage:'linear-gradient(90deg,rgba(7,13,22,.98),rgba(7,13,22,.75) 48%,rgba(7,13,22,.2)),url("'+venueBackdrop+'")'}}><SectionHeading eyebrow="VENUE MANAGEMENT" title="Venues" description="Review your theatres, open their details, and manage screens."/><button className="button" type="button" onClick={()=>startEdit()}><Plus size={17}/> Add Venue</button></div>
  <div className="venue-stat-grid"><div className="venue-stat red"><Building2/><strong>{data.theatres.length}</strong><span>Total Venues</span></div><div className="venue-stat blue"><Armchair/><strong>{data.screens.length}</strong><span>Total Screens</span></div><div className="venue-stat green"><Check/><strong>{data.theatres.filter(item=>item.status==='ACTIVE').length}</strong><span>Active Venues</span></div><div className="venue-stat amber"><CircleX/><strong>{data.theatres.filter(item=>item.status!=='ACTIVE').length}</strong><span>Inactive Venues</span></div></div>
  {message&&<Notice>{message}</Notice>}{error&&<Notice error>{error}</Notice>}
  {data.theatres.length?<div className="venue-cards">{data.theatres.map(theatre=>{
   const screens=data.screens.filter(screen=>screen.theatreId===theatre.id);
   return <article className="venue-card" key={theatre.id}>
    <div className="venue-card-art"><MediaImage url={theatre.media?.find(item=>item.type==='IMAGE')?.url||''} alt={`${theatre.name} venue`} showFallbackLink={false}/><span className={`status ${theatre.status.toLowerCase()}`}>{theatre.status}</span></div>
    <div className="venue-card-icon"><Building2 size={22}/></div>
    <div className="venue-card-content"><div className="venue-card-title"><h3>{theatre.name}</h3><span className={`status ${theatre.status.toLowerCase()}`}>{theatre.status}</span></div>
     <p>{theatre.address}</p><div className="venue-card-meta"><span>{theatre.city}{theatre.state?`, ${theatre.state}`:''}</span><span>{screens.length} {screens.length===1?'screen':'screens'}</span>{theatre.contact&&<span>{theatre.contact}</span>}</div>
    </div>
    <div className="venue-card-actions"><button type="button" className="button secondary small" onClick={()=>{setViewing(theatre);setError('');}}><Eye size={15}/> View</button><button type="button" className="button secondary small" onClick={()=>startEdit(theatre)}><Pencil size={15}/> Edit</button><button type="button" className="button secondary small venue-delete-button" onClick={()=>setDeleting(theatre)}><Trash2 size={15}/> Delete</button></div>
   </article>;
  })}</div>:<section className="panel"><Empty title="No venues have been added yet."><button className="button" type="button" onClick={()=>startEdit()}><Plus size={16}/> Add your first venue</button></Empty></section>}

  {editing&&<Modal title={data.theatres.some(item=>item.id===editing.id)?'Edit venue':'Add venue'} onClose={()=>!saving&&setEditing(null)}>
   <form className="entity-form venue-edit-form" onSubmit={save}><div className="form-grid">
    <label>Venue name<input value={editing.name} onChange={event=>setEditing({...editing,name:event.target.value})} required/></label>
    <label>Contact number<input value={editing.contact} onChange={event=>setEditing({...editing,contact:event.target.value})}/></label>
    <label className="span-two">Full address<input value={editing.address} onChange={event=>setEditing({...editing,address:event.target.value})} required/></label>
    <label>City<input value={editing.city} onChange={event=>setEditing({...editing,city:event.target.value})} required/></label>
    <label>State<input value={editing.state} onChange={event=>setEditing({...editing,state:event.target.value})}/></label>
    <label className="span-two">Google Maps link<input type="url" placeholder="https://maps.google.com/..." value={editing.mapUrl||''} onChange={event=>setEditing({...editing,mapUrl:event.target.value})}/></label>
    <label>Status<select value={editing.status} onChange={event=>setEditing({...editing,status:event.target.value as Theatre['status']})}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
   </div><div className="button-row"><button className="button" disabled={saving}><Save size={16}/>{saving?'Saving...':'Save venue'}</button><button type="button" className="button secondary" disabled={saving} onClick={()=>setEditing(null)}>Cancel</button></div></form>
  </Modal>}

  {viewing&&<Modal title={viewing.name||'Venue details'} onClose={()=>setViewing(null)}><div className="venue-view-details">
   <div className="venue-detail-grid"><div><small>ADDRESS</small><p>{viewing.address||'Not provided'}</p></div><div><small>CITY / STATE</small><p>{[viewing.city,viewing.state].filter(Boolean).join(', ')||'Not provided'}</p></div><div><small>CONTACT</small><p>{viewing.contact||'Not provided'}</p></div><div><small>STATUS</small><p>{viewing.status}</p></div></div>
   {viewing.mapUrl&&<a className="button secondary" href={viewing.mapUrl} target="_blank" rel="noreferrer"><MapPinned size={16}/> Open map</a>}
   <div className="screen-list-heading"><div><h3>Screens</h3><p className="muted">Open a screen to manage its seating layout.</p></div><button className="button small" type="button" onClick={()=>void addScreen(viewing)}><Plus size={15}/> Add screen</button></div>
   {data.screens.filter(screen=>screen.theatreId===viewing.id).length?<div className="screen-cards">{data.screens.filter(screen=>screen.theatreId===viewing.id).map(screen=><article className="screen-card venue-screen-card" key={screen.id}><Armchair/><div className="venue-screen-copy"><strong>{screen.name}</strong><small>Screen {screen.number} · {screen.seats.length} seats · {screen.status}</small></div><div className="venue-screen-actions"><button type="button" className="button secondary small" onClick={()=>setViewingScreen(screen)}><Eye size={14}/> View</button><button type="button" className="button secondary small" onClick={()=>setEditingScreen({...screen})}><Pencil size={14}/> Edit</button><button type="button" className="button secondary small venue-delete-button" onClick={()=>setDeletingScreen(screen)}><Trash2 size={14}/> Delete</button><Link className="button secondary small" to={`/admin/venues/${viewing.id}/screens/${screen.id}`} onClick={()=>setViewing(null)}><ChevronRight size={15}/> Layout</Link></div></article>)}</div>:<p className="muted">No screens have been added yet.</p>}
   <div className="button-row"><button className="button secondary" type="button" onClick={()=>startEdit(viewing)}><Pencil size={15}/> Edit venue</button><button className="button secondary venue-delete-button" type="button" onClick={()=>setDeleting(viewing)}><Trash2 size={15}/> Delete venue</button></div>
  </div></Modal>}

  {viewingScreen&&<Modal title={viewingScreen.name||'Screen details'} onClose={()=>setViewingScreen(null)}><div className="venue-view-details"><div className="venue-detail-grid"><div><small>SCREEN NUMBER</small><p>{viewingScreen.number}</p></div><div><small>STATUS</small><p>{viewingScreen.status}</p></div><div><small>SEATING GRID</small><p>{viewingScreen.rows} rows · {viewingScreen.seatsPerRow} seats per row</p></div><div><small>SEATS</small><p>{viewingScreen.seats.length} configured</p></div><div><small>LAYOUT VERSION</small><p>{viewingScreen.layoutVersion||1}</p></div><div><small>LAYOUT LOCK</small><p>{viewingScreen.layoutLocked?'Locked':'Unlocked'}</p></div></div><div className="button-row"><Link className="button" to={`/admin/venues/${viewingScreen.theatreId}/screens/${viewingScreen.id}`} onClick={()=>{setViewingScreen(null);setViewing(null);}}>Open screen workspace</Link><button type="button" className="button secondary" onClick={()=>{setEditingScreen({...viewingScreen});setViewingScreen(null);}}><Pencil size={15}/> Edit screen</button></div></div></Modal>}

  {editingScreen&&<Modal title="Edit screen" onClose={()=>setEditingScreen(null)}><form className="entity-form venue-edit-form" onSubmit={saveScreen}><div className="form-grid"><label>Screen name<input required value={editingScreen.name} onChange={event=>setEditingScreen({...editingScreen,name:event.target.value})}/></label><label>Screen number<input required type="number" min="1" step="1" value={editingScreen.number} onChange={event=>setEditingScreen({...editingScreen,number:Number(event.target.value)})}/></label><label>Status<select value={editingScreen.status} onChange={event=>setEditingScreen({...editingScreen,status:event.target.value as Screen['status']})}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label></div><p className="muted">Use the screen workspace to edit rows, seats, and the visual layout.</p><div className="button-row"><button className="button"><Save size={16}/> Save screen</button><Link className="button secondary" to={`/admin/venues/${editingScreen.theatreId}/screens/${editingScreen.id}`} onClick={()=>setEditingScreen(null)}>Open layout</Link></div></form></Modal>}

  {deleting&&<Modal title="Delete venue?" onClose={()=>setDeleting(null)}><p>Delete <strong>{deleting.name}</strong>? This cannot be undone. Venues with linked screens or shows may be rejected by the backend.</p><div className="button-row"><button type="button" className="button danger" onClick={()=>void remove()}>Delete venue</button><button type="button" className="button secondary" onClick={()=>setDeleting(null)}>Cancel</button></div></Modal>}
  {deletingScreen&&<Modal title="Delete screen?" onClose={()=>setDeletingScreen(null)}><p>Delete <strong>{deletingScreen.name}</strong>? Any linked shows may prevent deletion.</p><div className="button-row"><button type="button" className="button danger" onClick={()=>void removeScreen()}>Delete screen</button><button type="button" className="button secondary" onClick={()=>setDeletingScreen(null)}>Cancel</button></div></Modal>}
 </div>;
}
