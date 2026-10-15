// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {authService,adminUsers} from './auth';
const user={id:'user-uuid',name:'New Member',mobile:'+919876543210',email:'member@example.com',role:'USER',enabled:true,createdAt:'2026-09-29T12:00:00Z'};
const response=(body:unknown,status=200)=>Promise.resolve(new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
beforeEach(()=>{sessionStorage.clear();localStorage.clear();authService.logout();});
afterEach(()=>vi.unstubAllGlobals());
describe('backend authentication',()=>{
 it('requests email OTP, completes new user registration, restores /me, updates profile, and logs out',async()=>{
 const fetch=vi.fn().mockImplementationOnce(()=>response({success:true,expiresInSeconds:300,resendAfterSeconds:30})).mockImplementationOnce(()=>response({registrationRequired:false,user,accessToken:'server-token',tokenType:'Bearer'})).mockImplementationOnce(()=>response({success:true,expiresInSeconds:600,resendAfterSeconds:30})).mockImplementationOnce(()=>response({registrationToken:'mobile-token'})).mockImplementationOnce(()=>response({success:true,expiresInSeconds:600,resendAfterSeconds:30})).mockImplementationOnce(()=>response({registrationToken:'email-token'})).mockImplementationOnce(()=>response({registrationRequired:false,user,accessToken:'registered-token',tokenType:'Bearer'})).mockImplementationOnce(()=>response(user)).mockImplementationOnce(()=>response({...user,name:'John'}));vi.stubGlobal('fetch',fetch);
 await authService.requestEmailOtp('member@example.com');expect(String(fetch.mock.calls[0][0])).toContain('/api/v1/auth/otp/request');expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({destination:'member@example.com'});
 const verified=await authService.verifyEmailOtp('member@example.com','654321');expect(String(fetch.mock.calls[1][0])).toContain('/api/v1/auth/otp/verify');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({destination:'member@example.com',otp:'654321'});expect(verified.registrationRequired).toBe(false);expect(authService.current()?.id).toBe(user.id);authService.logout();
 await authService.requestRegistrationWhatsAppOtp('9876543210');expect(String(fetch.mock.calls[2][0])).toContain('/api/v1/auth/otp/registration/request');expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({destination:'+919876543210'});
 const mobileVerified=await authService.verifyRegistrationWhatsAppOtp('9876543210','123456');expect(String(fetch.mock.calls[3][0])).toContain('/api/v1/auth/otp/registration/verify');expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({destination:'+919876543210',otp:'123456'});expect(mobileVerified.registrationToken).toBe('mobile-token');
 await authService.requestRegistrationEmailOtp('member@example.com','mobile-token');expect(String(fetch.mock.calls[4][0])).toContain('/api/v1/auth/otp/registration/email/request');expect(JSON.parse(fetch.mock.calls[4][1].body)).toEqual({registrationToken:'mobile-token',email:'member@example.com'});
 const emailVerified=await authService.verifyRegistrationEmailOtp('member@example.com','654321','mobile-token');expect(String(fetch.mock.calls[5][0])).toContain('/api/v1/auth/otp/registration/email/verify');expect(JSON.parse(fetch.mock.calls[5][1].body)).toEqual({registrationToken:'mobile-token',email:'member@example.com',otp:'654321'});expect(emailVerified.registrationToken).toBe('email-token');
 await authService.completeEmailRegistration('member@example.com','New Member','9876543210','mobile-token','email-token');expect(String(fetch.mock.calls[6][0])).toContain('/api/v1/auth/otp/register');expect(fetch.mock.calls[6][1].body).toBe(JSON.stringify({email:'member@example.com',name:'New Member',mobile:'+919876543210',registrationToken:'mobile-token',emailVerificationToken:'email-token'}));
 await authService.restore();expect(String(fetch.mock.calls[7][0])).toContain('/api/v1/auth/me');expect(fetch.mock.calls[7][1].headers.Authorization).toBe('Bearer registered-token');expect(authService.current()?.email).toBe('member@example.com');expect(authService.isAdmin()).toBe(false);
 await authService.updateProfile('John','member@example.com');expect(JSON.parse(fetch.mock.calls[8][1].body)).toEqual({name:'John',email:'member@example.com'});expect(authService.current()?.name).toBe('John');authService.logout();expect(authService.current()).toBeNull();expect(sessionStorage.getItem('av_access_token')).toBeNull();
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
 sessionStorage.setItem('av_access_token','admin-token');const fetch=vi.fn((_url:string,_options?:RequestInit)=>response(user));vi.stubGlobal('fetch',fetch);await adminUsers.role(user.id,'ADMIN');await adminUsers.status(user.id,false);expect(String(fetch.mock.calls[0][0])).toContain('/api/v1/admin/users/user-uuid/role');expect(String(fetch.mock.calls[1][0])).toContain('/api/v1/admin/users/user-uuid/status');
 });
});
