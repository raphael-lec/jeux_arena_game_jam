import type {EnemyData} from "./EnemyData.ts";

// Frames of the 'enemies' atlas (Enemies/enemies.png + enemies.json), in reading order:
//   enemy0 red turret ring       enemy1 orange spiked sphere   enemy2 purple crescent wings
//   enemy3 purple diamond        enemy4 red ring segments      enemy5 green X cannons
//   enemy6 orange spiked mine    enemy7 blue fighter (faces up) enemy8 red box
//   enemy9 purple crescent pod
// To add an enemy: add an entry here and put it in ENEMY_TYPES

// The original enemy: rushes at the player, dies in one hit. Three looks (baseEnemy0..2 of the 'baseenemies'
// atlas), each with a third of the spawn weight
const makeChaser = (frame: string): EnemyData => ({
    name: 'chaser_' + frame,
    atlas: 'baseenemies',
    frame: frame,
    rotationOffset: 0,    // Math.PI / 2 if the sprite faces up
    scale: 0.2,           // the images are ~450px wide
    bodyRadiusRatio: 0.45,
    health: 1,
    speed: 0.2,
    spawnAfter: 0,
    weight: 1 / 3,
    maxActive: 50,
});

export const CHASERS: readonly EnemyData[] = ['baseEnemy0', 'baseEnemy1', 'baseEnemy2'].map(makeChaser);
// Kept for the code that imports it
export const CHASER: EnemyData = CHASERS[0];

// Keeps its distance from the player, circles around him and shoots. Blue fighter: it faces up in the image
export const GUNNER: EnemyData = {
    name: 'gunner',
    atlas: 'enemies',
    frame: 'enemy7',
    rotationOffset: Math.PI / 2,
    scale: 1.5,
    bodyRadiusRatio: 0.45,
    health: 2,
    speed: 0.22,
    keepDistance: {
        preferredDistance: 500,
        tolerance: 150,
        strafeSpeedRatio: 0.5,
    },
    shoot: {
        minDelay: 1800,
        maxDelay: 2600,
        bullet: {
            width: 14,
            height: 14,
            color: 0x4cc9f0,
            speed: 450,
            damage: 1,
        },
    },
    spawnAfter: 20,
    weight: 0.3,
    maxActive: 6,
};

export const ENEMY_TYPES: readonly EnemyData[] = [...CHASERS, GUNNER];