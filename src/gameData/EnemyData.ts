import type {BulletData} from "./BulletData.ts";

// An enemy that stays at a given distance from its target (and circles around it) instead of rushing at it
export type KeepDistanceData = {
    preferredDistance: number; // px: the distance the enemy tries to keep from its target
    tolerance: number;         // px: it approaches beyond preferred + tolerance, backs off below preferred - tolerance
    strafeSpeedRatio: number;  // 0-1: speed (relative to its max speed) at which it circles around the target
}

export type EnemyShootData = {
    minDelay: number;  // ms: min delay between two shots (random per enemy, between min and max)
    maxDelay: number;  // ms
    bullet: BulletData;
}

export type EnemyData = {
    name: string;
    atlas: string;                  // texture key of the atlas ('sprites', 'enemies')
    frame: string;
    // Added to the rotation toward the target: 0 for a sprite that faces right, Math.PI / 2 for one that faces up
    rotationOffset: number;
    scale?: number;                 // display scale of the sprite (1 by default). The body follows it
    bodyRadiusRatio: number;        // circle body radius, relative to half of the smallest side of the frame (0.5 = full)
    health: number;
    speed: number;                  // px/ms (cf. Movement)
    keepDistance?: KeepDistanceData; // without it, the enemy chases its target
    shoot?: EnemyShootData;         // without it, the enemy never shoots. It only shoots when it is on screen
    shootAnimation?: string;        // played before the shot. Without it, the enemy "inflates" a bit before shooting
    spawnAfter: number;             // s: the enemy can spawn once the game lasts this long
    weight: number;                 // spawn chance, relative to the other enemies that can spawn
    maxActive: number;              // max number of this enemy alive at the same time
}