import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    public enabled: boolean = true;

    private readonly _bullets: Physics.Arcade.Group;
    private readonly _bulletData: BulletData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData) {
        if (!bullets) {
            console.error("Weapon 'bullets' group cannot be null or undefined");
        }

        this._bullets = bullets;
        this._bulletData = bulletData;
    }

    // Shoots forward, or along direction (normalized) when given
    public shoot(source: Entity, direction?: Phaser.Math.Vector2) {
        if (!this.enabled)
            return;

        if (!this._bullets)
            return;

        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            // Get forward vector of the source entity
            const sourceForward: Phaser.Math.Vector2 = direction ?? new Phaser.Math.Vector2(1, 0).rotate(source.rotation);
            const bulletVelocity: Phaser.Math.Vector2 = sourceForward.clone().scale(this._bulletData.speed);
            // halfWidth follows the sprite scale (body.radius does not): the bullet leaves from the edge of a scaled entity
            const spawnDistance: number = source.arcadeBody.halfWidth;
            bullet.enable(source.x + sourceForward.x * spawnDistance, source.y + sourceForward.y * spawnDistance,
                bulletVelocity.x, bulletVelocity.y, this._bulletData);

            // Maths way
            // const forwardVectorX: number = Math.cos(source.rotation);
            // const forwardVectorY: number = Math.sin(source.rotation);
            // const bulletVelocityX: number = forwardVectorX * this._bulletData.speed;
            // const bulletVelocityY: number = forwardVectorY * this._bulletData.speed;
            // bullet.enable(source.x + forwardVectorX * source.arcadeBody.radius, source.y + forwardVectorY * source.arcadeBody.radius,
            //     bulletVelocityX, bulletVelocityY, this._bulletData);
        }
    }
}