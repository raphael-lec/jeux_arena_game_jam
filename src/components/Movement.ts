import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Movement implements IComponent {
    public enabled: boolean = true;

    private _speed: number = 0;

    public constructor(speed?: number) {
        if (speed) {
            this._speed = speed;
        }
    }

    public setSpeed(speed: number) {
        this._speed = speed;
    }

    public moveHorizontally(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.x += this._speed * deltaTime * entity.timeScale;
    }

    public moveVertically(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.y += this._speed * deltaTime * entity.timeScale;
    }

    // direction must be normalized, or diagonals go faster
    public move(entity: Entity, direction: Phaser.Math.Vector2, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.x += direction.x * this._speed * deltaTime * entity.timeScale;
        entity.y += direction.y * this._speed * deltaTime * entity.timeScale;
    }
}