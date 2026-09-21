import { NextResponse } from 'next/server'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export function options() {
  return new NextResponse(null, { status: 204 })
}
