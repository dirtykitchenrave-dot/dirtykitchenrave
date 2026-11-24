import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Preview counts are no longer stored. The player can keep calling this. */
export async function POST() {
  return new NextResponse(null, { status: 204 })
}
