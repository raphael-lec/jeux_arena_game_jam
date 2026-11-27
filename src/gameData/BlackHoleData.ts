export type BlackHoleData = {
    duration: number;              // ms: time to grow from startSize to endSize (= lifetime of the black hole)
    spawnDuration: number;         // ms: fade-in during which the black hole is harmless
    startSize: number;             // px: display width when it appears
    endSize: number;               // px: display width at the end of its life
    killRadiusRatio: number;       // radius of the deadly core, relative to the size
    pullRadiusRatio: number;       // radius of the attraction zone, relative to the size
    maxPullSpeed: number;          // px/ms: pull at the very center of the zone (it falls off with the distance)
    minDistanceFromPlayer: number; // px: the black hole appears around the player to be seen
    maxDistanceFromPlayer: number; // px
}
