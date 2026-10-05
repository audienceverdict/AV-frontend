import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {authService,database,emptyData,loadBackendData} from '../services/api';
import type {Data,User} from '../types';
const Context=createContext<{data:Data;user:User|null;admin:boolean;authLoading:boolean;authError:string}>({data:database.read(),user:null,admin:false,authLoading:true,authError:''});
export function AppProvider({children}:{children:ReactNode}){
 const [data,setData]=useState(emptyData);const [user,setUser]=useState<User|null>(authService.current);const [authLoading,setAuthLoading]=useState(true);const [authError,setAuthError]=useState('');
 useEffect(()=>{let active=true;const refresh=()=>setData(database.read());const syncBackend=()=>{void loadBackendData().then(refresh).catch(error=>{if(active)setAuthError((error as Error).message);});};const auth=()=>{setUser(authService.current());setAuthError('');syncBackend();};
 const restore=async()=>{try{await authService.restore();}catch(e){if(active&&((e as {status?:number}).status!==401))setAuthError((e as Error).message);}finally{if(active)setAuthLoading(false);}};
 database.removeLocal();void loadBackendData().then(refresh).catch(error=>{if(active)setAuthError((error as Error).message);});window.addEventListener('av-change',refresh);window.addEventListener('av-auth-change',auth);window.addEventListener('storage',refresh);
 const focus=()=>{void loadBackendData().then(refresh).catch(()=>{});void restore();};window.addEventListener('focus',focus);void restore();
 return()=>{active=false;window.removeEventListener('av-change',refresh);window.removeEventListener('av-auth-change',auth);window.removeEventListener('storage',refresh);window.removeEventListener('focus',focus);};},[]);
 return <Context.Provider value={{data,user,admin:user?.role==='ADMIN',authLoading,authError}}>{children}</Context.Provider>;
}
export const useApp=()=>useContext(Context);
