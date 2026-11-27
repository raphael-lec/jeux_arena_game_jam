export type CryogenicData = {
    duration: number;         // ms: time during which everyone is slowed down
    fadeDuration: number;     // ms: the frost fades in / out on the screen
    playerTimeScale: number;  // time scale of the player (0.5 = 50% slower)
    enemyTimeScale: number;   // time scale of the enemies (0.75 = 25% slower)
}
