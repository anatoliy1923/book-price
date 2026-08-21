'use client';
import { useEffect, useState } from 'react';
import { authHeaders } from '@/lib/client-auth';
type User = { id:string; email:string; role:'free'|'plus'|'admin'; created_at:string };
export default function AdminPage() {
  const [users,setUsers]=useState<User[]>([]); const [error,setError]=useState('');
  const load=async()=>{const res=await fetch('/api/admin/users',{headers:await authHeaders()}); if(!res.ok){setError('Доступ лише для адміністратора');return;}setUsers(await res.json());}; useEffect(()=>{load();},[]);
  const update=async(userId:string,role:User['role'])=>{const res=await fetch('/api/admin/users',{method:'PATCH',headers:{'Content-Type':'application/json',...(await authHeaders())},body:JSON.stringify({userId,role})});if(res.ok) setUsers((list)=>list.map((user)=>user.id===userId?{...user,role}:user));};
  return <div><h1 className="text-[32px] font-bold text-vivat-dark mb-2">Адміністрування</h1><p className="text-gray-500 mb-6">Акаунти та рівні доступу</p>{error?<p className="text-red-600">{error}</p>:<div className="space-y-3">{users.map((user)=><div key={user.id} className="rounded-2xl bg-white border border-vivat-light p-4 flex gap-3 items-center justify-between"><div><p className="font-medium text-vivat-dark">{user.email}</p><p className="text-xs text-gray-400">{new Date(user.created_at).toLocaleDateString('uk-UA')}</p></div><select value={user.role} onChange={(e)=>update(user.id,e.target.value as User['role'])} className="rounded-xl border border-gray-200 px-3 py-2"><option value="free">Free</option><option value="plus">Plus</option><option value="admin">Admin</option></select></div>)}</div>}</div>;
}
