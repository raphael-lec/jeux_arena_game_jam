export type SolarFlareData = {
    warningDuration: number; // ms: the path is shown but the flare hasn't started yet
    speed: number;           // px/s
    bandWidth: number;       // px: width of the flare, perpendicular to its direction
    thickness: number;       // px: visual depth of the flare, along its direction (bright front + fading tail)
    hitThickness: number;    // px: deadly depth, measured from the front of the flare (the tail is harmless)
    damage: number;          // damage dealt to the player
}
