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
async function input(node:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
async function submit(){await act(async()=>{container.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});}
it('requires email verification and profile details before opening protected pages',async()=>{
 let registered=false;let saved={...user};const fetch=vi.fn(async(url:string,options:RequestInit={})=>{
 let body:unknown;
 if(url.endsWith('/email-otp/request'))body={success:true,expiresInSeconds:300,resendAfterSeconds:30};
 else if(url.endsWith('/email-otp/verify'))body={registrationRequired:true,user:null,accessToken:null,tokenType:null};
 else if(url.endsWith('/email-otp/register')){registered=true;saved={...saved,...JSON.parse(options.body as string)};body={registrationRequired:false,user:saved,accessToken:'test-token',tokenType:'Bearer'};}
 else if(url.endsWith('/auth/me')){if(options.method==='PUT')saved={...saved,...JSON.parse(options.body as string)};body=saved;}
 else throw new Error(`Unexpected API ${url}`);
 return new Response(JSON.stringify(body),{status:200});
 });vi.stubGlobal('fetch',fetch);
 await act(async()=>root.render(<AppProvider><MemoryRouter initialEntries={['/login?next=/profile']}><Routes><Route path="/login" element={<Login/>}/><Route path="/verify-otp" element={<Login/>}/><Route path="/profile" element={<ProtectedRoute><Profile/></ProtectedRoute>}/></Routes></MemoryRouter></AppProvider>));
 await input(container.querySelector('input[type="email"]')!,'member@example.com');await submit();expect(container.textContent).toContain('Enter email OTP');
 await input(container.querySelector('input[autocomplete="one-time-code"]')!,'654321');await submit();expect(container.textContent).toContain('Complete your profile');expect(registered).toBe(false);
 const fields=container.querySelectorAll('input');await input(fields[2],'New Member');await input(fields[3],'9876543210');await submit();expect(registered).toBe(true);expect(container.textContent).toContain('Your profile');expect(saved.name).toBe('New Member');expect(saved.mobile).toBe('9876543210');
 await input(fields[2],'Updated name');await submit();expect(container.textContent).toContain('Your profile has been saved');expect(saved.name).toBe('Updated name');
 const logout=Array.from(container.querySelectorAll('button')).find(x=>x.textContent?.includes('Logout'))!;await act(async()=>logout.click());expect(container.textContent).toContain('Send email OTP');expect(sessionStorage.getItem('av_access_token')).toBeNull();
});
