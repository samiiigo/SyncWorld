// clockInterval.ts — how often the app clock ticks.
// Every tick re-renders the screens, so tick every second only while a vote
// or an alarm countdown is on screen; otherwise twice a minute is plenty.

export function clockIntervalMs(roomStatus: string | undefined): number {
  return roomStatus === 'VOTING' || roomStatus === 'LOCKED' || roomStatus === 'FIRED' ? 1000 : 30_000;
}
