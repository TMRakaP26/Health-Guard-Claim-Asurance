import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import api from '../api/client';
import { addQuickUser, getQuickUsers } from '../utils/cookies';
import type { User } from '../portal/types';
interface Auth { user: User | null; isLoading: boolean; login: (data: Record<string,string>) => Promise<void>; register: (data: Record<string,string>) => Promise<void>; logout: () => Promise<void>; refreshUser: () => Promise<void> }
const Context = createContext<Auth | null>(null);
export function AuthProvider({children}: {children: ReactNode}) {
 const [user,setUser] = useState<User | null>(null); const [isLoading,setLoading] = useState(true);
 async function refreshUser() { const r = await api.get<User>('/user'); setUser(r.data); }
 useEffect(() => { getQuickUsers(); localStorage.removeItem('auth_user'); if (!localStorage.getItem('auth_token')) {setLoading(false);return;} refreshUser().catch(() => setUser(null)).finally(() => setLoading(false)); },[]);
 async function authenticate(path: string,data: Record<string,string>) { const r = await api.post<{user:User;token:string}>(path,data); localStorage.setItem('auth_token',r.data.token); setUser(r.data.user); if (r.data.user.role !== 'admin') addQuickUser({name:r.data.user.name,email:r.data.user.email,role:r.data.user.role}); }
 async function logout() { await api.post('/logout'); localStorage.removeItem('auth_token'); setUser(null); }
 return <Context.Provider value={{user,isLoading,refreshUser,login:d=>authenticate('/login',d),register:d=>authenticate('/register',d),logout}}>{children}</Context.Provider>;
}
export function useAuth() { const context=useContext(Context); if(!context) throw new Error('Missing authentication provider'); return context; }

