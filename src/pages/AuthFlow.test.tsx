// @vitest-environment jsdom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {AppProvider} from '../context/AppContext';
import {Login,Profile,ProtectedRoute} from './User';
import {authService} from '../services/auth';
let container:HTMLDivElement;let root:Root;
const user={id:'test-uuid',name:'New Member',mobile:'+919876543210',email:'member@example.com',role:'USER',enabled:true,createdAt:'2026-09-29T12:00:00Z'};
beforeEach(()=>{(globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;sessionStorage.clear();localStorage.clear();authService.logout();container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();});
async function input(node:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(node.ownerDocument.defaultView!.HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
async function submit(){await act(async()=>{container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});}
it('requires email verification and profile details before opening protected pages',async()=>{
 let registered=false;let saved={...user};const fetch=vi.fn(async(url:string,options:RequestInit={})=>{
 let body:unknown;
 if(url.endsWith('/movies?size=200'))body={content:[]};
 else if(url.endsWith('/theatres?size=200'))body={content:[]};
 else if(url.endsWith('/shows'))body=[];
 else if(url.endsWith('/reviews'))body=[];
 else if(url.endsWith('/otp/request'))body={success:true,expiresInSeconds:300,resendAfterSeconds:30};
 else if(url.endsWith('/otp/verify'))body={registrationRequired:false,user:saved,accessToken:'test-token',tokenType:'Bearer'};
 else if(url.endsWith('/otp/registration/request'))body={success:true,expiresInSeconds:600,resendAfterSeconds:30};
 else if(url.endsWith('/otp/registration/verify'))body={registrationToken:'mobile-registration-token'};
 else if(url.endsWith('/otp/registration/email/request'))body={success:true,expiresInSeconds:600,resendAfterSeconds:30};
 else if(url.endsWith('/otp/registration/email/verify'))body={registrationToken:'email-verification-token'};
 else if(url.endsWith('/otp/register')){registered=true;saved={...saved,...JSON.parse(options.body as string)};body={registrationRequired:false,user:saved,accessToken:'test-token',tokenType:'Bearer'};}
 else if(url.endsWith('/auth/me')){if(options.method==='PUT')saved={...saved,...JSON.parse(options.body as string)};body=saved;}
 else throw new Error(`Unexpected API ${url}`);
 return new Response(JSON.stringify(body),{status:200});
 });vi.stubGlobal('fetch',fetch);
 await act(async()=>root.render(<AppProvider><MemoryRouter initialEntries={['/login?next=/profile']}><Routes><Route path="/login" element={<Login/>}/><Route path="/verify-otp" element={<Login/>}/><Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>}/></Routes></MemoryRouter></AppProvider>));
 await input(container.querySelector('input[type="email"]')!,'member@example.com');await submit();expect(container.textContent).toContain('Enter email OTP');expect(String(fetch.mock.calls.find(call=>String(call[0]).endsWith('/otp/request'))?.[0])).toContain('/auth/otp/request');
 await input(container.querySelector('input[aria-label="Email OTP"]')!,'654321');await submit();expect(container.textContent).toContain('Your profile');expect(registered).toBe(false);
 const logout=Array.from(container.querySelectorAll('button')).find(x=>x.textContent?.includes('Logout'))!;await act(async()=>logout.click());expect(container.textContent).toContain('Send email OTP');
 const startRegistration=Array.from(container.querySelectorAll('button')).find(x=>x.textContent?.includes('Create a new account'))!;await act(async()=>startRegistration.click());
 await input(container.querySelector('input[aria-label="Registration email"]')!,'new-member@example.com');await input(container.querySelector('input[autocomplete="name"]')!,'New Member');await input(container.querySelector('input[autocomplete="tel-national"]')!,'9998887776');await submit();expect(container.textContent).toContain('WhatsApp OTP');expect(registered).toBe(false);
 await input(container.querySelector('input[aria-label="WhatsApp OTP"]')!,'123456');await submit();expect(container.textContent).toContain('Your mobile is verified');
 await submit();expect(container.textContent).toContain('Enter the email OTP sent');await input(container.querySelector('input[aria-label="Registration email OTP"]')!,'654321');await submit();expect(container.textContent).toContain('Email verified. You can create your account');expect(registered).toBe(false);
 await submit();expect(registered).toBe(true);expect(container.textContent).toContain('Your profile');expect(saved.name).toBe('New Member');expect(saved.email).toBe('new-member@example.com');expect(saved.mobile).toBe('+919998887776');
 const profileName=container.querySelector<HTMLInputElement>('.profile-card-form input')!;await input(profileName,'Updated name');await submit();expect(container.textContent).toContain('Your profile has been saved');expect(saved.name).toBe('Updated name');
 const logoutAfterRegistration=Array.from(container.querySelectorAll('button')).find(x=>x.textContent?.includes('Logout'))!;await act(async()=>logoutAfterRegistration.click());expect(container.textContent).toContain('Send email OTP');expect(sessionStorage.getItem('av_access_token')).toBeNull();
});
