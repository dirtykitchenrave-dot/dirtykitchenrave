import { notFound } from 'next/navigation'

/** Any unknown path under /en or /es renders the localized-layout 404. */
export default function CatchAll() {
  return notFound()
}
