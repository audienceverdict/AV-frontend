// @vitest-environment jsdom
import {beforeEach,describe,expect,it} from 'vitest';
import {seed} from '../data/seed';
import {createBooking,database,validateBooking,embedUrl,removeEntity} from './api';
beforeEach(()=>{localStorage.clear();database.write(structuredClone(seed));});
describe('booking integrity',()=>{
 it('blocks already booked seats',()=>{const d=database.read();expect(()=>validateBooking(d,d.users[0],'show-0-0',['C5'])).toThrow('already booked');});
 it('counts all active bookings for the same mobile',()=>{const d=database.read();expect(()=>validateBooking(d,d.users[0],'show-0-0',['A1','A2','A3'])).toThrow('maximum of 4');});
 it('does not count cancelled bookings',()=>{const d=database.read();d.bookings[0].status='CANCELLED';expect(validateBooking(d,d.users[0],'show-0-0',['C5','C6','A1','A2']).id).toBe('show-0-0');});
 it('rejects missing, disabled and duplicate seats',()=>{const d=database.read();d.screens[0].seats[0].disabled=true;expect(()=>validateBooking(d,d.users[0],'show-0-0',['A1'])).toThrow('unavailable');expect(()=>validateBooking(d,d.users[0],'show-0-0',['Z99'])).toThrow('unavailable');expect(()=>validateBooking(d,d.users[0],'show-0-0',['A2','A2'])).toThrow('select');});
 it('rejects a closed show and expired booking window',()=>{const d=database.read();d.shows[0].status='CLOSED';expect(()=>validateBooking(d,d.users[0],d.shows[0].id,['A1'])).toThrow('unavailable');d.shows[0].status='OPEN';d.shows[0].bookingCloses='2000-01-01T10:00';expect(()=>validateBooking(d,d.users[0],d.shows[0].id,['A1'])).toThrow('unavailable');});
 it('creates a free pending ticket when confirmation is required',async()=>{database.update(d=>{d.settings.requireAdminConfirmation=true;});const b=await createBooking(database.read().users[0],'show-0-2',['A1','A2']);expect(b.totalAmount).toBe(0);expect(b.status).toBe('PENDING');expect(database.read().bookings.find(x=>x.id===b.id)?.notification).toContain('Nothing was sent');});
 it('charges the configured mock price and confirms automatically',async()=>{const b=await createBooking(database.read().users[0],'show-0-0',['A1','A2']);expect(b.totalAmount).toBe(500);expect(b.confirmationStatus).toBe('AUTO');expect(()=>validateBooking(database.read(),database.read().users[0],'show-0-0',['A3'])).toThrow('maximum');});
 it('cascades related demo records when an admin deletes a movie or show',()=>{removeEntity('shows','show-0-0');expect(database.read().bookings.some(b=>b.showId==='show-0-0')).toBe(false);removeEntity('movies','interstellar');expect(database.read().movies.some(movie=>movie.id==='interstellar')).toBe(false);expect(database.read().shows.some(show=>show.movieId==='interstellar')).toBe(false);expect(database.read().reviews.some(review=>review.movieId==='interstellar')).toBe(false);});
});
describe('demo services',()=>{
 it('allows known embed hosts and rejects arbitrary URLs',()=>{expect(embedUrl('https://youtu.be/zSWdZVtXT7E')).toBe('https://www.youtube-nocookie.com/embed/zSWdZVtXT7E');expect(embedUrl('https://youtube.com.evil.test/watch?v=zSWdZVtXT7E')).toBeNull();expect(embedUrl('javascript:alert(1)')).toBeNull();});
});
