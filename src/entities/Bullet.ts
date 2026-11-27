import {BulletData} from "../gameData/BulletData.ts";
import GameConstants from "../GameConstants.ts";
import ITimeScalable from "../components/ITimeScalable.ts";

export default class Bullet extends Phaser.GameObjects.Rectangle implements ITimeScalable {
    private _arcadeBody: Phaser.Physics.Arcade.Body;

    private _damage: number = 0;
    private readonly _baseVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _timeScale: number = 1;

    public get damage(): number {
        return this._damage;
    }

    public get timeScale(): number {
        return this._timeScale;
    }

    // The velocity at normal speed is kept aside, and the body velocity is rescaled from it
    public setTimeScale(scale: number): void {
        this._timeScale = scale;
        this._arcadeBody.setVelocity(this._baseVelocity.x * scale, this._baseVelocity.y * scale);
    }

    public init() {
        this.scene.physics.add.existing(this);

        this._arcadeBody = this.body as Phaser.Physics.Arcade.Body;
        this._arcadeBody.allowGravity = false;
        this._arcadeBody.setFriction(0, 0);
    }

    public enable(x: number, y: number, velocityX: number, velocityY: number, data: BulletData) {
        this.setPosition(x, y);
        this.setSize(data.width, data.height);
        this.setOrigin(0.5);
        this.setFillStyle(data.color);

        this.scene.physics.world.add(this._arcadeBody);
        this.setActive(true);
        this.setVisible(true);

        this._baseVelocity.set(velocityX, velocityY);
        this.setTimeScale(1);
        this._damage = data.damage;

        // Rotate the bullet to face the direction it's moving
        this.setRotation(this._arcadeBody.velocity.angle());

        // Maths way
        // this.setRotation(Math.atan2(velocityY, velocityX));

        // Arcade bodies can't rotate: fit the body to the rotated bullet bounds
        const cos: number = Math.abs(Math.cos(this.rotation));
        const sin: number = Math.abs(Math.sin(this.rotation));
        this._arcadeBody.setSize(data.width * cos + data.height * sin, data.width * sin + data.height * cos);
    }

    public disable() {
        this.scene.physics.world.disableBody(this._arcadeBody);
        this.setActive(false);
        this.setVisible(false);
    }

    update(timeSinceLaunch: number, deltaTime: number) {
        super.update(timeSinceLaunch, deltaTime);

        // Recycle bullets when they leave the arena on any side
        if (this.x < -this.displayWidth || this.x > GameConstants.ARENA_WIDTH + this.displayWidth
            || this.y < -this.displayHeight || this.y > GameConstants.ARENA_HEIGHT + this.displayHeight) {
            this.disable();
        }
    }
}