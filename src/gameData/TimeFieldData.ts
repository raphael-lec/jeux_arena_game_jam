export type TimeFieldData = {
    radius: number;                // px
    warningDuration: number;       // ms: the zone is shown but has no effect yet
    duration: number;              // ms: the zone is active
    slowScale: number;             // time scale applied by a "slow" field (< 1)
    fastScale: number;             // time scale applied by a "fast" field (> 1)
    minDistanceFromPlayer: number; // px: the zone appears around the player to be seen
    maxDistanceFromPlayer: number; // px
}
