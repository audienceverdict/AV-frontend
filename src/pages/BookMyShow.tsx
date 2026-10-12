import {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Film, MapPin, Monitor, Ticket, Users, ShieldCheck, Armchair, ChevronLeft, ChevronRight, Wallet} from 'lucide-react';
import {useApp} from '../context/AppContext';
import {createBooking, createSeatHold, getSeatHolds, getShowAvailability, joinWaitingList} from '../services/api';
import {Empty, Notice, Poster, date, money} from '../components/Common';
import '../booking-page.css';
import termsHeroImage from '../../images/booking-terms-hero.png?url';
import termsCardArtwork from '../../images/booking-terms-cards.png?url';

export function BookMyShow() {
  const {movieId}=useParams();
  const {data,user}=useApp();
  const navigate=useNavigate();
  const movie=data.movies.find(item=>item.id===movieId);
  const [showId,setShowId]=useState('');
  const [seatMapOpen,setSeatMapOpen]=useState(false);
  const [selectedSeats,setSelectedSeats]=useState<string[]>([]);
  const [confirming,setConfirming]=useState(false);
  const [busy,setBusy]=useState(false);
  const [alternativeMobile,setAlternativeMobile]=useState('');
  const [acceptedTerms,setAcceptedTerms]=useState<string[]>([]);
  const [activeTerm,setActiveTerm]=useState(0);
  const termsTrackRef=useRef<HTMLDivElement|null>(null);
  const [city,setCity]=useState('');
  const [day,setDay]=useState('');
  const [error,setError]=useState('');
  const [availabilityError,setAvailabilityError]=useState('');
  const [availabilityColumns,setAvailabilityColumns]=useState(0);
  const [versionSeats,setVersionSeats]=useState<any[]|null>(null);
  const [availabilityScreen,setAvailabilityScreen]=useState<any|null>(null);
  const [backendBooked,setBackendBooked]=useState<string[]>([]);
  const [holdExpiresAt,setHoldExpiresAt]=useState<number|null>(null);
  const [holdRemaining,setHoldRemaining]=useState(0);
  const [waitCount,setWaitCount]=useState(1);
  const [waitBusy,setWaitBusy]=useState(false);
  const [waitEntry,setWaitEntry]=useState<any|null>(null);

  const shows=useMemo(()=>data.shows.filter(show=>show.movieId===movie?.id&&show.status==='OPEN'&&new Date(`${show.date}T${show.startTime}`)>new Date()&&data.theatres.some(theatre=>theatre.id===show.theatreId&&theatre.status==='ACTIVE')),[data.shows,data.theatres,movie?.id]);
  const cities=useMemo(()=>[...new Set(shows.map(show=>data.theatres.find(theatre=>theatre.id===show.theatreId)?.city).filter(Boolean) as string[])],[shows,data.theatres]);
  const activeCity=city||cities[0]||'';
  const cityShows=shows.filter(show=>data.theatres.find(theatre=>theatre.id===show.theatreId)?.city===activeCity);
  const dates=[...new Set(cityShows.map(show=>show.date))].sort();
  const activeDay=dates.includes(day)?day:dates[0]||'';
  const datedShows=cityShows.filter(show=>show.date===activeDay);
  const show=shows.find(item=>item.id===showId);
  const screen=data.screens.find(item=>item.id===show?.screenId);

  useEffect(()=>{if(cities.length&&!city)setCity(cities.includes('Hyderabad')?'Hyderabad':cities[0]);},[cities,city]);
  useEffect(()=>{if(dates.length&&!dates.includes(day))setDay(dates[0]);},[dates,day]);
  useEffect(()=>{if(!showId){setVersionSeats(null);setAvailabilityScreen(null);setBackendBooked([]);setAvailabilityError('');setAvailabilityColumns(0);return;}let active=true;setVersionSeats(null);setAvailabilityScreen(null);setBackendBooked([]);setAvailabilityError('');setAvailabilityColumns(0);getShowAvailability(showId).then(result=>{if(active){const layout=result.layout||{};setAvailabilityScreen(result.screen||null);setBackendBooked([...(result.bookedSeatIds||[]),...(result.reservedSeatIds||[]),...(result.heldSeatIds||[])]);setAvailabilityColumns(Number(result.screen?.seatsPerRow||layout.version?.seatsPerRow)||0);const layoutSeats=Array.isArray(layout.seats)?layout.seats:[];setVersionSeats(layoutSeats.map((seat:any)=>({...seat,row:seat.rowNumber,column:seat.columnNumber})));}}).catch(reason=>{if(active){setVersionSeats(null);setBackendBooked([]);setAvailabilityError((reason as Error).message);}});return()=>{active=false;};},[showId]);
  useEffect(()=>{if(!showId||!user){setHoldExpiresAt(null);return;}let active=true;setHoldExpiresAt(null);getSeatHolds(showId).then(items=>{if(active)setHoldExpiresAt(items.length?Math.min(...items.map((hold:any)=>new Date(hold.expiresAt).getTime())):null);}).catch(()=>{});return()=>{active=false;};},[showId,user]);
  useEffect(()=>{if(!holdExpiresAt){setHoldRemaining(0);return;}const tick=()=>setHoldRemaining(Math.max(0,holdExpiresAt-Date.now()));tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);},[holdExpiresAt]);

  if(!movie||!user)return <Empty title="Movie not found"/>;
  const positionedSeats=(versionSeats||[]).map(seat=>({...seat,row:seat.rowNumber,column:seat.columnNumber}));
  const seatColumns=Math.max(1,availabilityColumns,...positionedSeats.map(seat=>Number(seat.column)||0));
  const booked=data.bookings.filter(booking=>booking.showId===showId&&booking.status!=='CANCELLED');
  const unavailableIds=new Set([...backendBooked,...booked.flatMap(booking=>booking.seatIds)]);
  const availableSeats=positionedSeats.filter(seat=>seat.clickable===true&&!seat.disabled&&!unavailableIds.has(seat.id));
  const soldOut=Boolean(show&&positionedSeats.length>0&&availableSeats.length===0);
  const used=booked.filter(booking=>booking.snapshot.mobile===user.mobile).reduce((total,booking)=>total+booking.ticketCount,0);
  const amount=show?.ticketType==='PAID'?selectedSeats.reduce((sum,id)=>{const seat=positionedSeats.find(item=>item.id===id);return sum+(show.seatPrices?.[seat?.category||'']??show.ticketPrice);},0):0;
  const selectedSeatLabels=selectedSeats.map(id=>positionedSeats.find(seat=>seat.id===id)?.label||id);
  const bookingScreen=availabilityScreen||screen;
  const theatre=show?data.theatres.find(item=>item.id===show.theatreId):undefined;

  const chooseShow=(nextShow:typeof shows[number])=>{setWaitEntry(null);setWaitCount(1);setShowId(nextShow.id);setSelectedSeats([]);setVersionSeats(null);setAvailabilityScreen(null);setBackendBooked([]);setAvailabilityColumns(0);setAvailabilityError('');setHoldExpiresAt(null);setAcceptedTerms([]);setConfirming(false);setSeatMapOpen(true);setError('');};
  const toggleSeat=async(seatId:string)=>{if(!show)return;setError('');if(selectedSeats.includes(seatId)){setAcceptedTerms([]);return setSelectedSeats(selectedSeats.filter(id=>id!==seatId));}const seat=positionedSeats.find(item=>item.id===seatId);if(seat?.clickable!==true)return;if(selectedSeats.length+used>=show.maxTicketsPerMobile)return setError(`You can book a maximum of ${show.maxTicketsPerMobile} tickets for this screening using the same mobile number.`);const next=[...selectedSeats,seatId];try{await createSeatHold(show.id,next);setSelectedSeats(next);setAcceptedTerms([]);}catch(reason){setError((reason as Error).message);}};
  const joinWaitlist=async()=>{if(!show)return;setWaitBusy(true);setError('');try{const entry=await joinWaitingList(show.id,waitCount);setWaitEntry(entry);}catch(reason){setError((reason as Error).message);}finally{setWaitBusy(false);}};
  const terms=[
    {id:'confirmation',title:<>Stay connected<br/>for <em>confirmation</em></>,text:'We’ll contact you by call or email if your booking needs confirmation. Keep your contact details available.'},
    {id:'screening',title:<>Check your show<br/>before you <em>confirm</em></>,text:'Review the movie, cinema, screening time, and selected seats shown above. Your ticket is valid for these details.'},
    {id:'cancellation',title:<>Cancellation<br/>with <em>clear timing</em></>,text:'You may cancel up to one hour before showtime. Any refund follows the terms displayed for your booking.'},
    {id:'venue',title:<>Follow your<br/><em>cinema’s rules</em></>,text:'Entry, age restrictions, and venue policies are set by the cinema. Please follow staff instructions.'},
  ];
  const confirm=async()=>{if(acceptedTerms.length!==terms.length){setError('Please agree to all four conditions before confirming.');return;}if(!show||!user){navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);return;}setBusy(true);try{const booking=await createBooking(user,show.id,selectedSeats,alternativeMobile,true);navigate(`/booking/${booking.id}`);}catch(reason){const message=(reason as Error).message;if(message.includes('Authentication required')||message.includes('Backend request failed (401)')){navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);return;}setError(message);setConfirming(false);}finally{setBusy(false);}};

  const stepNumber=confirming?3:seatMapOpen?2:1;
  const stepLabel=(number:number,label:string)=><span className={stepNumber===number?'active':''}><i>{stepNumber>number?<Check size={14}/>:number}</i>{label}</span>;
  const dayLabel=(value:string)=>{const parsed=new Date(`${value}T12:00:00`);return {weekday:new Intl.DateTimeFormat('en',{weekday:'short'}).format(parsed),day:new Intl.DateTimeFormat('en',{day:'2-digit'}).format(parsed),month:new Intl.DateTimeFormat('en',{month:'short'}).format(parsed)};};

  const activeTermIndex=(direction:number)=>{const next=Math.max(0,Math.min(terms.length-1,activeTerm+direction));setActiveTerm(next);termsTrackRef.current?.children[next]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});};
  const toggleTerm=(id:string)=>setAcceptedTerms(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);

  return <main className="booking-page">
    <section className={`booking-hero${confirming?' booking-hero-terms':''}`} style={confirming?{backgroundImage:`linear-gradient(90deg,rgba(7,10,12,.96) 0%,rgba(9,10,14,.84) 42%,rgba(9,10,14,.14) 100%),linear-gradient(0deg,rgba(6,8,10,.46),transparent 65%),url("${termsHeroImage}")`}:undefined} aria-label="Cinema audience enjoying a movie">
      <div className="booking-hero-shade"/>
      <div className="booking-hero-copy">
        {confirming?<button type="button" className="booking-back" onClick={()=>{setConfirming(false);setAcceptedTerms([]);setError('');}}><ArrowLeft size={15}/> Back to booking</button>:<Link className="booking-back" to={`/movie/${movie.id}`}><ArrowLeft size={15}/> Back to {movie.title}</Link>}
        <span className="eyebrow">{confirming?'IMPORTANT BEFORE YOU CONFIRM':'BOOK YOUR EXPERIENCE'}</span>
        <h1>{confirming?<>Terms &amp; <em>Conditions</em></>:<>Choose a cinema,<br/>then choose <em>your seat.</em></>}</h1>
        <p>{confirming?'Please review your booking details and agree to the conditions below for a smooth movie experience.':'Great stories deserve the big screen. Find the best showtimes near you and book your seats in a few clicks.'}</p>
        <div className="booking-progress">{stepLabel(1,'Theatre & Show')}<i/>{stepLabel(2,'Seats')}<i/>{stepLabel(3,'Confirm')}</div>
      </div>
    </section>

    <div className="booking-content">
      {!shows.length?<Empty title="No shows are currently available for this movie."/>:<div className={`booking-layout${confirming?' booking-layout-confirming':''}`}>
        <section className="booking-main-panel">
          {!seatMapOpen&&!confirming&&<>
            <div className="booking-controls">
              <label className="booking-city"><MapPin size={18}/><select aria-label="Choose a city" value={activeCity} onChange={event=>{setCity(event.target.value);setDay('');setShowId('');setSelectedSeats([]);}}>{cities.map(value=><option key={value} value={value}>{value}, Telangana</option>)}</select></label>
              <div className="booking-date-list" aria-label="Choose a date">{dates.map(value=>{const label=dayLabel(value);return <button type="button" key={value} className={activeDay===value?'selected':''} onClick={()=>{setDay(value);setShowId('');setSelectedSeats([]);}}><span>{label.weekday}</span><strong>{label.day} {label.month}</strong></button>;})}</div>
            </div>
            <div className="booking-theatre-list">{data.theatres.filter(item=>item.status==='ACTIVE'&&item.city===activeCity&&datedShows.some(showing=>showing.theatreId===item.id)).map(item=>{
              const itemShows=datedShows.filter(showing=>showing.theatreId===item.id);
              return <article className="booking-theatre" key={item.id}>
                <div className="booking-theatre-details"><h2>{item.name}</h2><p><MapPin size={13}/>{item.address}, {item.city}</p><div className="booking-perks"><span><Monitor size={12}/>Dolby Atmos</span><i/> <span>Recliners</span><i/> <span>Food & beverages</span><i/> <span>Parking</span></div></div>
                <div className="booking-times">{itemShows.map(itemShow=><button key={itemShow.id} type="button" className={showId===itemShow.id?'chosen':''} onClick={()=>chooseShow(itemShow)}><strong>{itemShow.startTime}</strong><small>{itemShow.ticketType==='FREE'?'FREE':money(itemShow.ticketPrice)}</small></button>)}</div>
              </article>;
            })}{!datedShows.length&&<div className="booking-no-shows">No showtimes are available on this date. Choose another day.</div>}</div>
          </>}

          {seatMapOpen&&show&&!confirming&&<div className="booking-seat-step">
            <button type="button" className="booking-step-back" onClick={()=>{setSeatMapOpen(false);setShowId('');setSelectedSeats([]);setError('');}}><ArrowLeft size={16}/> Back to cinemas</button>
            <div className="booking-seat-heading"><div><span className="eyebrow">SELECT YOUR SEATS</span><h2>{theatre?.name}</h2><p><CalendarDays size={14}/>{date(show.date)} <span>·</span><Clock3 size={14}/>{show.startTime} <span>·</span>{bookingScreen?.name||'Screen'}</p></div><span className="booking-seat-count">{selectedSeats.length} selected</span></div>
            {soldOut?<div className="booking-soldout"><span className="eyebrow">THIS SHOW IS FULL</span><h3>Join the waiting list</h3><p>If seats become available, we’ll let you know.</p><label>Tickets needed<select value={waitCount} onChange={event=>setWaitCount(Number(event.target.value))}>{Array.from({length:show.maxTicketsPerMobile},(_,index)=><option key={index+1} value={index+1}>{index+1} {index===0?'ticket':'tickets'}</option>)}</select></label>{waitEntry?<Notice>Waiting-list request placed · position #{waitEntry.position}.</Notice>:<button className="button" disabled={waitBusy} onClick={joinWaitlist}>{waitBusy?'Joining…':'Join waiting list'}<ArrowRight size={16}/></button>}</div>:<>
              <div className="booking-screen-label">SCREEN</div>{positionedSeats.length===0?<p className="booking-no-shows">{availabilityError||'The seat layout is not available for this show yet. Please contact the cinema.'}</p>:<div className="booking-seat-scroll"><div className="seat-grid" style={{gridTemplateColumns:`repeat(${seatColumns}, minmax(24px, 32px))`}}>{positionedSeats.map(seat=>{const selected=selectedSeats.includes(seat.id);const unavailable=seat.clickable!==true||seat.disabled||unavailableIds.has(seat.id);return <button key={seat.id} title={seat.label} aria-label={`${seat.label}, ${unavailable?'unavailable':selected?'selected':'available'}`} className={`seat ${seat.category==='PREMIUM'?'premium':''} ${selected?'selected':''} ${unavailable?'booked':''}`} style={{gridColumn:seat.column,gridRow:seat.row,borderColor:seat.color||undefined}} disabled={!selected&&unavailable} onClick={()=>void toggleSeat(seat.id)}>{seat.label}</button>;})}</div></div>}
              <div className="booking-seat-legend"><span><i/>Available</span><span><i className="premium"/>Premium</span><span><i className="selected"/>Selected</span><span><i className="booked"/>Unavailable</span></div>
            </>}
          </div>}

          {confirming&&show&&<div className="booking-confirm-step booking-confirm-terms">
            <section className="terms-booking-details" aria-labelledby="terms-booking-title"><div className="terms-details-heading"><h2 id="terms-booking-title">Your Booking Details</h2><span><ShieldCheck size={16}/>Please review your booking details and agree to the terms below.</span></div><div className="terms-details-grid"><div className="terms-movie-detail"><Poster movie={movie}/><div><h3>{movie.title}</h3><p><Film size={14}/>{movie.language}<span>·</span><Clock3 size={14}/>{Math.floor(movie.duration/60)}h {movie.duration%60}m</p><small>{movie.genre.join(' / ')}</small></div></div><div className="terms-detail-item"><MapPin/><div><span>Selected theatre</span><strong>{theatre?.name||'—'}</strong><small>{theatre?.address||''}{theatre?.city?`, ${theatre.city}`:''}{bookingScreen?` · ${bookingScreen.name}`:''}</small></div></div><div className="terms-detail-item"><CalendarDays/><div><span>Show date &amp; time</span><strong>{new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${show.date}T12:00:00`))}</strong><small>{show.startTime}</small></div></div><div className="terms-detail-item"><Armchair/><div><span>Seats selected</span><strong>{selectedSeatLabels.join(', ')}</strong><small>{selectedSeats.length} {selectedSeats.length===1?'ticket':'tickets'}</small></div></div><div className="terms-detail-item terms-amount"><Wallet/><div><span>Total amount</span><strong>{money(amount)}</strong></div></div></div></section>
            <label className="terms-mobile-field">Alternative mobile (optional)<input type="tel" value={alternativeMobile} onChange={event=>setAlternativeMobile(event.target.value.replace(/\D/g,''))} maxLength={10} placeholder="For booking updates"/></label>
            <div className="terms-section-heading"><h2>Terms &amp; Conditions</h2><p>Please read and agree to each condition to continue.</p></div>
            <div className="booking-terms-carousel"><button type="button" className="terms-carousel-arrow" aria-label="Previous condition" disabled={activeTerm===0} onClick={()=>activeTermIndex(-1)}><ChevronLeft size={20}/></button><div className="booking-terms-track" ref={termsTrackRef}>{terms.map((term,index)=>{const accepted=acceptedTerms.includes(term.id);return <article key={term.id} className={`booking-term-card${activeTerm===index?' active':''}${accepted?' accepted':''}`} onClick={()=>setActiveTerm(index)}><span className="booking-term-number">{String(index+1).padStart(2,'0')}</span><div className={`booking-term-art term-art-${term.id}`} style={{backgroundImage:`url("${termsCardArtwork}")`}} aria-hidden="true"/><h3>{term.title}</h3><p>{term.text}</p><label className="booking-term-accept" onClick={event=>event.stopPropagation()}><input type="checkbox" checked={accepted} onChange={()=>toggleTerm(term.id)}/><span>I agree to this condition.</span></label></article>;})}</div><button type="button" className="terms-carousel-arrow" aria-label="Next condition" disabled={activeTerm===terms.length-1} onClick={()=>activeTermIndex(1)}><ChevronRight size={20}/></button></div>
            <div className="terms-pagination" aria-label="Choose a condition">{terms.map((term,index)=><button key={term.id} type="button" aria-label={`Show condition ${index+1}`} aria-current={activeTerm===index?'step':undefined} className={activeTerm===index?'active':''} onClick={()=>{setActiveTerm(index);termsTrackRef.current?.children[index]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});}}/> )}</div>
            {error&&<Notice error>{error}</Notice>}<div className="terms-confirm-action"><button type="button" className="button full booking-proceed" disabled={acceptedTerms.length!==terms.length||busy} onClick={()=>void confirm()}>{busy?'Preparing your booking…':'Confirm booking'} <ArrowRight size={18}/></button><p>{acceptedTerms.length===terms.length?'Your booking will be confirmed using the details above.':`Please agree to all ${terms.length} conditions to proceed.`}</p></div>
            <div className="terms-payment-note"><Check size={18}/>{show.ticketType==='FREE'?'This is a free demo screening. No payment is required.':'Payment is simulated. No money is charged.'}</div>
          </div>}
        </section>

        {!confirming&&<aside className="booking-summary">
          <div className="booking-summary-movie"><Poster movie={movie}/><div><span className="eyebrow">YOUR MOVIE</span><h2>{movie.title}</h2><p><Film size={13}/>{movie.language}<Users size={13}/>{movie.duration} min</p><small>{movie.genre.join(' / ')}</small></div></div>
          <div className="booking-summary-lines"><div><MapPin/><span>Selected theatre</span><strong>{theatre?.name||'Choose a theatre'}</strong></div><div><CalendarDays/><span>Showtime</span><strong>{show?`${date(show.date)} · ${show.startTime}`:'Choose a showtime'}</strong></div><div><Monitor/><span>Seats</span><strong>{selectedSeatLabels.join(', ')||'Select seats'}</strong></div><div><Ticket/><span>Tickets</span><strong>{selectedSeats.length}</strong></div></div>
          <div className="booking-total"><span>Total amount</span><strong>{money(amount)}</strong></div>
          {holdRemaining>0&&<Notice>Your seats are held for {Math.ceil(holdRemaining/1000)} seconds.</Notice>}{holdExpiresAt&&holdRemaining===0&&selectedSeats.length>0&&<Notice error>Your seat hold has expired. Please select seats again.</Notice>}{error&&<Notice error>{error}</Notice>}
          {(!soldOut||confirming)&&<button className="button full booking-proceed" disabled={!show||!selectedSeats.length||busy} onClick={()=>confirming?void confirm():setConfirming(true)}>{busy?'Preparing your ticket…':confirming?'Confirm booking':<><Ticket size={16}/>{seatMapOpen?'Proceed to confirm':'Proceed to select seats'}<ArrowRight size={16}/></>}</button>}
          <p className="booking-demo-note">Frontend preview · No real tickets or payments</p>
        </aside>}
      </div>}
      <aside className="booking-cinema-note"><Ticket size={37}/><div><strong>Enjoy the big screen experience!</strong><p>Great stories are always better with an audience.</p></div><span className="booking-seat-art"/></aside>
    </div>
  </main>;
}
