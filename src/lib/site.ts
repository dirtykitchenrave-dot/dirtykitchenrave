/** Fixed label links (from the label's Linktree). Empty strings are hidden in the UI. */
export const SITE = {
  name: 'Dirty Kitchen Rave',
  short: 'DKR',
  city: 'London, UK',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://dirtykitchenrave.com').replace(/\/+$/, ''),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'dirtykitchenrave@gmail.com',
  beatportLabelId: 112835,
}

/** Slug of the label manager (shown with that role on artist pages). */
export const LABEL_MANAGER_SLUG = 'afghan-headspin'

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
