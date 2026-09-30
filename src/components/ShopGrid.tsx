import type { Dictionary } from '@/i18n/dictionaries'
import { LINKS } from '@/lib/site'

/** Merch / vinyl / EU store grid from proposal 05 (home + /shop). */
export default function ShopGrid({ d }: { d: Dictionary }) {
  return (
    <div className="shop">
      <a className="item" href={LINKS.merch} target="_blank" rel="noopener noreferrer">
        <div className="img">
          <svg className="tee" viewBox="0 0 200 200" aria-hidden="true">
            <path
              d="M60 20 L85 30 Q100 42 115 30 L140 20 L185 50 L165 85 L145 75 L145 185 L55 185 L55 75 L35 85 L15 50Z"
              fill="#101113"
            />
            <text x="100" y="118" textAnchor="middle" fontFamily="Archivo Variable" fontWeight="900" fontSize="26" fill="#FF5B14">
              DKR
            </text>
          </svg>
        </div>
        <h3>{d.shop.merch}</h3>
        <p>{d.shop.merchText}</p>
      </a>
      <a className="item" href={LINKS.vinyl} target="_blank" rel="noopener noreferrer">
        <div className="img">
          <svg className="tee" viewBox="0 0 200 200" aria-hidden="true">
            <rect x="20" y="20" width="130" height="160" fill="#101113" />
            <circle cx="130" cy="100" r="62" fill="#26272b" />
            <circle cx="130" cy="100" r="18" fill="#FF5B14" />
            <circle cx="130" cy="100" r="3" fill="#FAFAF8" />
          </svg>
        </div>
        <h3>{d.shop.vinyl}</h3>
        <p>{d.shop.vinylText}</p>
      </a>
      <a className="item" href={LINKS.merchEu} target="_blank" rel="noopener noreferrer">
        <div className="img">
          <svg className="tee" viewBox="0 0 200 200" aria-hidden="true">
            <rect x="30" y="40" width="140" height="120" rx="8" fill="#101113" />
            <circle cx="100" cy="100" r="42" fill="#26272b" />
            <text x="100" y="108" textAnchor="middle" fontFamily="Archivo Variable" fontWeight="900" fontSize="22" fill="#FF5B14">
              DKR
            </text>
          </svg>
        </div>
        <h3>{d.shop.eu}</h3>
        <p>{d.shop.euText}</p>
      </a>
    </div>
  )
}
