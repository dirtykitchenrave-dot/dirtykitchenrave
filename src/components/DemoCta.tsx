import type { Dictionary } from '@/i18n/dictionaries'
import { LINKS } from '@/lib/site'

export default function DemoCta({ d }: { d: Dictionary }) {
  return (
    <section className="demo pad" id="demo">
      <h2>{d.home.demoTitle}</h2>
      <p>{d.home.demoText}</p>
      <a className="btn dark" href={LINKS.demos} target="_blank" rel="noopener noreferrer">
        {d.home.demoCta}
      </a>
    </section>
  )
}
