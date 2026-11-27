export type SolarFlareData = {
    warningDuration: number;       // ms: the beam zone is shown but the beam isn't on yet
    minDuration: number;           // ms: the beam stays on at least this long, at the same place
    maxDuration: number;           // ms: ... and at most this long (random between the two)
    thickness: number;             // px: width of the beam. The image keeps its ratio, it is repeated along the beam
    hitMargin: number;             // px: the deadly zone is the beam shrunk by this margin on each side
    damage: number;                // damage dealt to the player (the player's hit cooldown still applies)
    minDistanceFromPlayer: number; // px: the beam appears around the player to be seen
    maxDistanceFromPlayer: number; // px
}