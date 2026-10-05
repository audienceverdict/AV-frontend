// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {authService,adminUsers} from './auth';
const user={id:'user-uuid',name:'New Member',mobile:'+919876543210',email:'member@example.com',role:'USER',enabled:true,createdAt:'2026-09-29T12:00:00Z'};
const response=(body:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
beforeEach(()=>{sessionStorage.clear();localStorage.clear();authService.logout();});
afterEach(()=>vi.unstubAllGlobals());
describe('backend authentication',()=>{
 it('requests email OTP, completes new user registration, restores /me, updates profile, and logs out',async()=>{
 const fetch=vi.fn().mockImplementationOnce(()=>response({success:true,expiresInSeconds:300,resendAfterSeconds:30})).mockImplementationOnce(()=>response({registrationRequired:true,user:null,accessToken:null,tokenType:null})).mockImplementationOnce(()=>response({registrationRequired:false,user,accessToken:'server-token',tokenType:'Bearer'})).mockImplementationOnce(()=>response(user)).mockImplementationOnce(()=>response({...user,name:'John'}));vi.stubGlobal('fetch',fetch);
 await authService.requestEmailOtp('member@example.com');expect(fetch.mock.calls[0][0]).toBe('/api/v1/auth/email-otp/request');
 const verified=await authService.verifyEmailOtp('member@example.com','654321');expect(fetch.mock.calls[1][0]).toBe('/api/v1/auth/email-otp/verify');expect(verified.registrationRequired).toBe(true);expect(authService.current()).toBeNull();
 await authService.completeEmailRegistration('member@example.com','New Member','9876543210');expect(fetch.mock.calls[2][0]).toBe('/api/v1/auth/email-otp/register');expect(fetch.mock.calls[2][1].body).toBe(JSON.stringify({email:'member@example.com',name:'New Member',mobile:'9876543210'}));
 await authService.restore();expect(fetch.mock.calls[3][0]).toBe('/api/v1/auth/me');expect(fetch.mock.calls[3][1].headers.Authorization).toBe('Bearer server-token');expect(authService.current()?.email).toBe('member@example.com');expect(authService.isAdmin()).toBe(false);
 await authService.updateProfile('John','member@example.com');expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({name:'John',email:'member@example.com'});expect(authService.current()?.name).toBe('John');authService.logout();expect(authService.current()).toBeNull();expect(sessionStorage.getItem('av_access_token')).toBeNull();
 });
 it('does not request a registration step for an existing verified account',async()=>{
 vi.stubGlobal('fetch',vi.fn(()=>response({registrationRequired:false,user,accessToken:'existing-token',tokenType:'Bearer'})));
 const result=await authService.verifyEmailOtp('member@example.com','654321');expect(result.registrationRequired).toBe(false);expect(authService.current()?.id).toBe(user.id);
 });
 it('ignores legacy demo admin flags and trusts the backend role',async()=>{
 localStorage.setItem('av_admin_session','true');expect(authService.isAdmin()).toBe(false);sessionStorage.setItem('av_access_token','admin-token');vi.stubGlobal('fetch',vi.fn(()=>response({...user,role:'ADMIN'})));await authService.restore();expect(authService.isAdmin()).toBe(true);
 });
 it('clears expired authentication and exposes backend errors',async()=>{
 sessionStorage.setItem('av_access_token','expired');vi.stubGlobal('fetch',vi.fn(()=>response({message:'Authentication required'},401)));await expect(authService.restore()).rejects.toThrow('Authentication required');expect(authService.current()).toBeNull();expect(sessionStorage.getItem('av_access_token')).toBeNull();
 });
 it('does not restore a session after logout races with /me',async()=>{
 sessionStorage.setItem('av_access_token','old-token');let finish!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})));const restore=authService.restore();authService.logout();finish(new Response(JSON.stringify(user)));await restore;expect(authService.current()).toBeNull();
 });
 it('sends admin operations to protected endpoints',async()=>{
 sessionStorage.setItem('av_access_token','admin-token');const fetch=vi.fn((_url:string,_options?:RequestInit)=>response(user));vi.stubGlobal('fetch',fetch);await adminUsers.role(user.id,'ADMIN');await adminUsers.status(user.id,false);expect(fetch.mock.calls[0][0]).toBe('/api/v1/admin/users/user-uuid/role');expect(fetch.mock.calls[1][0]).toBe('/api/v1/admin/users/user-uuid/status');
 });
});
