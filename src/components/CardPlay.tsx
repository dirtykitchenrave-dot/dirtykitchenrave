'use client'

import { usePlayer, type PlayerTrack } from './Player'

/** Round play button over a release cover. Plays the release's first Beatport preview. */
export default function CardPlay({ track, label }: { track: PlayerTrack; label: string }) {
  const { current, playing, toggleTrack } = usePlayer()
  const isPlaying = current?.id === track.id && playing
  return (
    <button
      className={`cardplay${isPlaying ? ' on' : ''}`}
      aria-label={`${label}: ${track.title}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleTrack(track, [track], `card:${track.id}`)
      }}
    >
      {isPlaying ? '❚❚' : '▶'}
    </button>
  )
}
