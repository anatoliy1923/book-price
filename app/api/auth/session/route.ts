import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
export async function GET(request: NextRequest) { const user = await requireUser(request); return NextResponse.json({ authenticated: Boolean(user), email: user?.email || null }); }
