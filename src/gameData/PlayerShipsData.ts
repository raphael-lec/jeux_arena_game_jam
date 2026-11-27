export type PlayerShipsData = {
    [key: string]: PlayerShipData
}

export type PlayerShipData = {
    movementSpeed: number;
    atlas: string;           // texture key of the atlas ('ships')
    texture: string;         // frame name ('ship0'...)
    scale: number;           // display scale of the sprite
    rotationOffset: number;  // 0 for a sprite that faces right, Math.PI / 2 for one that faces up
    bodyRadiusRatio: number; // circle body radius, relative to half of the smallest side of the frame (1 = full)
}