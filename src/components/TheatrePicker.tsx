import {MapPin, MonitorPlay, Ticket} from 'lucide-react';
import type {Show, Theatre, Screen} from '../types';
import {date, money} from './Common';

type Props = {theatres: Theatre[]; shows: Show[]; screens: Screen[]; selectedShowId: string; onSelect: (show: Show) => void;};
export function TheatrePicker({theatres, shows, screens, selectedShowId, onSelect}: Props) {
 const dates=[...new Set(shows.map(show=>show.date))].sort();
 return <div className="theatre-picker"><div className="theatre-picker-head"><div><span className="eyebrow">CHOOSE YOUR SCREEN</span><h3>Pick a screen and showtime</h3></div><span className="muted">{dates.map(date).join(' · ')}</span></div>{screens.filter(screen=>shows.some(show=>show.screenId===screen.id)).map(screen=>{const theatre=theatres.find(item=>item.id===screen.theatreId);const screenShows=shows.filter(show=>show.screenId===screen.id);return <article className="venue-card" key={screen.id} onClick={()=>onSelect(screenShows[0])}><div className="venue-icon"><MapPin size={20}/></div><div className="venue-info"><h3>{screen.name}</h3><p>{theatre?.name} · {theatre?.city}, {theatre?.state}</p><small>{screen.seats.length} seats · {screen.status}</small></div><div className="venue-shows">{screenShows.map(show=><button type="button" className={selectedShowId===show.id?'show-chip selected':'show-chip'} key={show.id} onClick={event=>{event.stopPropagation();onSelect(show)}}><MonitorPlay size={13}/><span>{date(show.date)}<strong>{show.startTime}</strong></span><small>{show.ticketType==='FREE'?'FREE':money(show.ticketPrice)}</small></button>)}</div></article>})}<p className="fine-print"><Ticket size={12}/> Select a showtime to reveal the seat map.</p></div>;
}
