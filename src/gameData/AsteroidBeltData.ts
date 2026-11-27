export type AsteroidBeltData = {
    count: number;        // Total number of asteroids in the belt
    batchSize: number;    // Asteroids spawned at once
    duration: number;     // Time (ms) over which the whole belt is spawned
    bandWidth: number;    // Width (px) of the belt, perpendicular to its direction
    spawnMargin: number;  // Min distance (px) between the arena border and the spawn point
    spawnDepth: number;   // Extra random distance (px) beyond spawnMargin, to avoid a straight line of spawns
    minSpeed: number;     // px/s
    maxSpeed: number;     // px/s
    minScale: number;
    maxScale: number;
    maxSpin: number;      // deg/s, applied in both directions
    damage: number;
}
