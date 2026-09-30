// On Vercel this is the production domain: *.vercel.app until the custom domain is added,
// then that domain. It wins over NEXT_PUBLIC_SITE_URL so canonicals and share images never
// point to a domain that does not serve this site yet (dirtykitchenrave.com -> Linktree today).
const vercelProd = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
const siteUrl = (
  vercelProd ? `https://${vercelProd}` : process.env.NEXT_PUBLIC_SITE_URL || 'https://dirtykitchenrave.com'
).replace(/\/+$/, '')

/** Fixed label links (from the label's Linktree). Empty strings are hidden in the UI. */
export const SITE = {
  name: 'Dirty Kitchen Rave',
  short: 'DKR',
  city: 'London, UK',
  url: siteUrl,
  /** Test deployments (*.vercel.app or Vercel previews) must not be indexed. */
  indexable: !new URL(siteUrl).hostname.endsWith('.vercel.app') && process.env.VERCEL_ENV !== 'preview',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'dirtykitchenrave@gmail.com',
  beatportLabelId: 112835,
}

/** Slug of the label manager (shown with that role on artist pages). */
export const LABEL_MANAGER_SLUG = 'afghan-headspin'

/**
 * Artist bios live on Optimal Breaks, not here. Only slugs that already have a
 * page there (matched 30 sep 2026). A miss would be a 404, so those artists
 * stay without the link.
 */
const OPTIMAL_BREAKS_ARTISTS = new Set([
  'acenoise',
  'afghan-headspin',
  'andrewfx',
  'anuschka',
  'blow-sp',
  'bosketta',
  'brothers-bud',
  'citybox',
  'cude',
  'curly-ch',
  'danny-phr3ntic',
  'datafunk',
  'dexterbeat',
  'dilos',
  'dj-brownie',
  'dj-guanxe',
  'dj-justin-johnson',
  'dub-elements',
  'eskila',
  'evil-crew',
  'fm-3',
  'fran-break',
  'godino',
  'gruv42',
  'hankook',
  'hatstandy',
  'huda-hudia',
  'inner-realms',
  'ismabreakz',
  'j-break',
  'jan-b',
  'jem-haynes',
  'jormek',
  'khaine',
  'kid-ellipsis',
  'lucas',
  'manxito',
  'menges',
  'mixedup-mike',
  'mizzo',
  'nitro-esp',
  'obsidian-wave',
  'paket',
  'periko',
  'phrenetic',
  'playbass',
  'prato',
  'ral',
  'rennie-pilgrem',
  'ryan-blake',
  'sans',
  'seekflow',
  'sl-83',
  'slug-fl',
  'specimen-a',
  'swankout',
  'swarov',
  'the-push',
  'vazteria-x',
  'vkyng',
  'wez-whatevr',
  'woter',
  'xana',
])

/** Optimal Breaks artist page, or null when that artist has no page there. */
export function optimalBreaksArtistUrl(slug: string, lang: 'en' | 'es'): string | null {
  if (!OPTIMAL_BREAKS_ARTISTS.has(slug)) return null
  return `https://www.optimalbreaks.com/${lang}/artists/${slug}`
}

export const LINKS = {
  beatport: 'https://www.beatport.com/label/dirty-kitchen-rave/112835',
  bandcamp: 'https://dirtykitchenrave.bandcamp.com/',
  juno: 'https://www.junodownload.com/labels/Dirty+Kitchen+Rave/',
  podcast: 'https://podcasts.apple.com/us/podcast/the-dirty-kitchen-rave-podcast/id1895541519',
  discord: 'https://discord.gg/vXFj3tQkme',
  demos: 'https://www.labelradar.com/labels/dirtykitchenrave/portal',
  merch: 'https://afghan-headspin-shop.fourthwall.com/en-gbp/collections/all',
  merchEu: 'https://deejayskin.com/?s=dirty+kitchen+rave&post_type=product&et_search=true',
  merchUs: 'https://www.amazon.com/dp/B0CFNLWDWL',
  merchUk: 'https://www.amazon.co.uk/dp/B0CFNFH49V',
  vinyl: 'https://elasticstage.com/dirtykitchenrave/releases/tales-from-the-cowshed-singleep',
  facebook: 'https://www.facebook.com/dirtykitchenrave/',
  instagram: 'https://www.instagram.com/dirtykitchenrave/',
  tiktok: 'https://www.tiktok.com/@dirtykitchenrave',
  youtube: 'https://www.youtube.com/channel/UCkDNqfxqe9wkus4Ni74kpcw',
  twitch: 'https://www.twitch.tv/afghan_headspin',
  soundcloud: 'https://soundcloud.com/dirtykitchenrave',
  spotify: 'https://open.spotify.com/playlist/19bJxmaL0eG3KjSVZFGsHY',
  whatsapp: 'https://api.whatsapp.com/send?phone=447590630773',
  amazonStore: 'https://www.amazon.co.uk/Clothing-Dirty-Kitchen-Rave/s?rh=n%3A83450031%2Cp_4%3ADirty%2BKitchen%2BRave',
}

export const GENRE_MARQUEE = [
  'Breaks',
  'UK Bass',
  'UKG',
  'Bassline',
  'Rave',
  'Jungle',
  'DnB',
  'Breakbeat',
  'Dubstep',
  'Disco',
]
