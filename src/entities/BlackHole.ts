import {GameObjects, Physics} from "phaser";
import type {BlackHoleData} from "../gameData/BlackHoleData.ts";
import Entity from "./Entity.ts";
import Player from "./Player.ts";
import Enemy from "./Enemy.ts";
import Health from "../components/Health.ts";

// A black hole that slowly grows, pulls the player and the enemies towards it (the closer, the stronger)
// and kills whatever touches its core
export default class BlackHole extends GameObjects.Sprite {
    // Texture keys: 'blackhole_0' (small), 'blackhole_1', 'blackhole_2' (big).
    // The images are square and centered on the dark core, so it can spin without wobbling
    public static readonly TEXTURE_PREFIX: string = 'blackhole_';
    public static readonly TEXTURE_COUNT: number = 3;

    // Display width (px). It is animated by a tween: the sprite scale, the texture, the pull range
    // and the kill radius all follow it
    public size: number;

    private readonly _data: BlackHoleData;
    private readonly _player: Player;
    private readonly _enemies: Physics.Arcade.Group;
    // Harmless while it fades in
    private _armed: boolean = false;
    private _stage: number = -1;

    constructor(scene: Phaser.Scene, x: number, y: number, data: BlackHoleData,
                player: Player, enemies: Physics.Arcade.Group) {
        super(scene, x, y, BlackHole.TEXTURE_PREFIX + '0');

        this._data = data;
        this._player = player;
        this._enemies = enemies;

        scene.add.existing(this);
        this.size = data.startSize;
        // Under the time fields (10), over the bonuses (5)
        this.setDepth(8).setAlpha(0);
        this.updateVisual();
    }

    public get killRadius(): number {
        return this.size * this._data.killRadiusRatio;
    }

    public get pullRadius(): number {
        return this.size * this._data.pullRadiusRatio;
    }

    public start() {
        // Fade in, then the black hole becomes dangerous
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: this._data.spawnDuration,
            onComplete: () => this._armed = true
        });

        // The size animation: it also decides how long the black hole lives
        this.scene.tweens.add({
            targets: this,
            size: this._data.endSize,
            duration: this._data.duration,
            ease: 'Linear',
            onComplete: () => this.vanish()
        });

        // Slow spin, for the swirl effect
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 8000,
            repeat: -1
        });
    }

    private vanish() {
        this._armed = false;

        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 500,
            onComplete: () => this.destroy()
        });
    }

    destroy(fromScene?: boolean) {
        // Don't leave tweens running on a destroyed object
        this.scene?.tweens?.killTweensOf(this);

        super.destroy(fromScene);
    }

    preUpdate(time: number, delta: number) {
        super.preUpdate(time, delta);

        this.updateVisual();

        if (!this._armed)
            return;

        this.affect(this._player, delta);
        for (const child of this._enemies.getChildren()) {
            this.affect(child as Enemy, delta);
        }
    }

    // Texture (growth stage) and scale follow the size
    private updateVisual() {
        const range: number = this._data.endSize - this._data.startSize;
        const progress: number = range > 0
            ? Phaser.Math.Clamp((this.size - this._data.startSize) / range, 0, 1)
            : 0;

        const stage: number = Math.min(BlackHole.TEXTURE_COUNT - 1, Math.floor(progress * BlackHole.TEXTURE_COUNT));
        if (stage !== this._stage) {
            this._stage = stage;
            this.setTexture(BlackHole.TEXTURE_PREFIX + stage);
        }

        this.setScale(this.size / this.frame.realWidth);
    }

    // Kills the target if it touches the core, otherwise pulls it towards the center
    private affect(target: Entity, deltaTime: number) {
        if (!target.active)
            return;

        const dx: number = this.x - target.x;
        const dy: number = this.y - target.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.killRadius) {
            const health = target.getComponent(Health);
            health?.damage(health.max);
            return;
        }

        const pullRadius: number = this.pullRadius;
        if (distance >= pullRadius)
            return;

        // 0 at the edge of the zone, 1 at the center. Squared: the pull is much stronger when close
        const proximity: number = 1 - distance / pullRadius;
        const step: number = Math.min(
            this._data.maxPullSpeed * proximity * proximity * deltaTime * target.timeScale, distance);

        target.x += dx / distance * step;
        target.y += dy / distance * step;
    }
}
