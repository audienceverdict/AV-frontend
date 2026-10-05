import type {User} from '../types';
const TOKEN_KEY='av_access_token';
let currentUser:User|null=null;
let generation=0;
const notify=()=>window.dispatchEvent(new Event('av-auth-change'));
const token=()=>localStorage.getItem(TOKEN_KEY)||sessionStorage.getItem(TOKEN_KEY);
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 const accessToken=token();
 const response=await fetch(`/api/v1${path}`,{...options,headers:{'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`} :{}),...options.headers}});
 const body=await response.json().catch(()=>null);
 if(!response.ok){if(response.status===401&&accessToken===token())authService.logout();throw new ApiError(body?.message||`Request failed (${response.status})`,response.status);}
 return body as T;
}
const mapUser=(u:User):User=>({...u,email:u.email||''});
export interface EmailOtpResult {registrationRequired:boolean;user:User|null;accessToken:string|null;tokenType:string|null}
export const authService={
 current:()=>currentUser,
 isAdmin:()=>currentUser?.role==='ADMIN',
 async requestEmailOtp(email:string){return request<{success:boolean;message:string;expiresInSeconds:number;resendAfterSeconds:number}>('/auth/email-otp/request',{method:'POST',body:JSON.stringify({email})});},
 async verifyEmailOtp(email:string,otp:string){const started=generation;const result=await request<EmailOtpResult>('/auth/email-otp/verify',{method:'POST',body:JSON.stringify({email,otp})});if(started!==generation)throw new Error('Sign-in cancelled');if(result.registrationRequired)return result;if(!result.user||!result.accessToken)throw new Error('Unable to complete sign-in.');localStorage.setItem(TOKEN_KEY,result.accessToken);sessionStorage.setItem(TOKEN_KEY,result.accessToken);currentUser=mapUser(result.user);notify();return {...result,user:currentUser};},
 async completeEmailRegistration(email:string,name:string,mobile:string){const started=generation;const result=await request<EmailOtpResult>('/auth/email-otp/register',{method:'POST',body:JSON.stringify({email,name,mobile})});if(started!==generation)throw new Error('Sign-in cancelled');if(!result.user||!result.accessToken)throw new Error('Unable to complete registration.');localStorage.setItem(TOKEN_KEY,result.accessToken);sessionStorage.setItem(TOKEN_KEY,result.accessToken);currentUser=mapUser(result.user);notify();return currentUser;},
 async restore(){const started=generation;if(!token()){currentUser=null;notify();return null;}const user=await request<User>('/auth/me');if(started!==generation)return null;currentUser=mapUser(user);notify();return currentUser;},
 async updateProfile(name:string,email:string){const started=generation;const user=await request<User>('/auth/me',{method:'PUT',body:JSON.stringify({name,email:email.trim()||null})});if(started===generation){currentUser=mapUser(user);notify();}return mapUser(user);},
 logout(){generation++;localStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem(TOKEN_KEY);sessionStorage.removeItem('av_otp_mobile');sessionStorage.removeItem('av_otp_email');sessionStorage.removeItem('av_otp_method');sessionStorage.removeItem('av_registration_required');sessionStorage.removeItem('av_otp_resend_at');sessionStorage.removeItem('av_otp_expires_at');currentUser=null;notify();}
};
export interface UserPage {content:User[];totalPages:number;totalElements:number;number:number}
export const adminUsers={
 list:(page=0)=>request<UserPage>(`/admin/users?page=${page}&size=20`),
 role:(id:string,role:'USER'|'ADMIN')=>request<User>(`/admin/users/${encodeURIComponent(id)}/role`,{method:'PATCH',body:JSON.stringify({role})}),
 status:(id:string,enabled:boolean)=>request<User>(`/admin/users/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({enabled})})
};
