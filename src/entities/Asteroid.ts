import Entity from "./Entity.ts";
import GameConstants from "../GameConstants.ts";

export default class Asteroid extends Entity {
    private _damage: number = 0;
    // Asteroids spawn outside the arena: only recycle them once they have crossed it and left again
    private _hasEntered: boolean = false;
    // Velocity and spin at normal speed: the body ones are rescaled from them by the time scale
    private readonly _baseVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _baseSpin: number = 0;

    public get damage(): number {
        return this._damage;
    }

    public enable(x: number, y: number, velocityX: number, velocityY: number,
                  texture: string, scale: number, spin: number, damage: number) {
        this.setTexture(texture);
        this.setScale(scale);
        this.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        // Circle slightly smaller than the sprite: fairer hitbox. Values are in unscaled texture pixels
        const radius: number = Math.min(this.frame.realWidth, this.frame.realHeight) * 0.45;
        this.arcadeBody.setCircle(radius, this.frame.realWidth / 2 - radius, this.frame.realHeight / 2 - radius);

        this.enableBody(true, x, y, true, true);
        this._baseVelocity.set(velocityX, velocityY);
        this._baseSpin = spin;
        this.setTimeScale(1);

        this._damage = damage;
        this._hasEntered = false;
    }

    setTimeScale(scale: number): void {
        super.setTimeScale(scale);

        this.arcadeBody.setVelocity(this._baseVelocity.x * scale, this._baseVelocity.y * scale);
        this.arcadeBody.setAngularVelocity(this._baseSpin * scale);
    }

    public disable() {
        this.disableBody(true, true);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        const halfSize: number = Math.max(this.displayWidth, this.displayHeight) / 2;
        const inside: boolean = this.x >= 0 && this.x <= GameConstants.ARENA_WIDTH
            && this.y >= 0 && this.y <= GameConstants.ARENA_HEIGHT;

        if (inside) {
            this._hasEntered = true;
        } else if (this._hasEntered
            && (this.x < -halfSize || this.x > GameConstants.ARENA_WIDTH + halfSize
                || this.y < -halfSize || this.y > GameConstants.ARENA_HEIGHT + halfSize)) {
            this.disable();
        }
    }
}