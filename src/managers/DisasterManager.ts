import {Plugins, Physics, Scene} from "phaser";
import type {AsteroidBeltData} from "../gameData/AsteroidBeltData.ts";
import type {TimeFieldData} from "../gameData/TimeFieldData.ts";
import type ITimeScalable from "../components/ITimeScalable.ts";
import Asteroid from "../entities/Asteroid.ts";
import Player from "../entities/Player.ts";
import Enemy from "../entities/Enemy.ts";
import Health from "../components/Health.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";

// Direction the belt travels in. A belt moving right (x: 1) spawns beyond the left border
const BELT_DIRECTIONS: readonly Readonly<{ x: number, y: number }>[] = [
    {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}
];

export default class DisasterManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'DisasterManager';
    public static readonly MAPPING_NAME: string = 'disasterManager';

    // Delay (ms) between two automatic disasters: shrinks linearly from START to MIN
    // over RAMP_DURATION, then stays at MIN
    private static readonly DISASTER_INTERVAL_START: number = 30000;
    private static readonly DISASTER_INTERVAL_MIN: number = 10000;
    private static readonly DISASTER_RAMP_DURATION: number = 180000; // 3 min
    // The player can't be hit by asteroids again during this time (ms)
    private static readonly PLAYER_HIT_COOLDOWN: number = 1000;
    // Texture keys: 'timefield_slow', 'timefield_icon_slow', 'timefield_fast', 'timefield_icon_fast'
    private static readonly TIME_FIELD_TEXTURE_PREFIX: string = 'timefield_';
    private static readonly TIME_FIELD_ICON_PREFIX: string = 'timefield_icon_';

    private readonly _asteroidBeltData: AsteroidBeltData = {
        count: 60,
        batchSize: 3,
        duration: 8000,
        bandWidth: 1000,
        spawnMargin: 400,
        spawnDepth: 300,
        minSpeed: 400,
        maxSpeed: 700,
        minScale: 0.8,
        maxScale: 1.6,
        maxSpin: 90,
        damage: 1,
    };

    private readonly _timeFieldData: TimeFieldData = {
        radius: 450,
        warningDuration: 3000,
        duration: 12000,
        slowScale: 0.4,
        fastScale: 1.8,
        minDistanceFromPlayer: 200,
        maxDistanceFromPlayer: 700,
    };

    private _player: Player;
    private _timeFieldActive: boolean = false;
    private _asteroids: Physics.Arcade.Group;
    private _nextPlayerHitTime: number = 0;
    private _disasterStartTime: number = 0;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, DisasterManager.PLUGIN_KEY);

        console.log("[DisasterManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[DisasterManager] Destroyed");
    }

    public initDisasters(player: Player, enemies: Physics.Arcade.Group) {
        this._asteroids = this.scene!.physics.add.group({
            classType: Asteroid,
            defaultKey: GameConstants.ASTEROID_TEXTURE_PREFIX + '0',
            maxSize: 128
        });
        GroupUtils.populate(64, this._asteroids);
        this._nextPlayerHitTime = 0;
        this._player = player;
        this._timeFieldActive = false;

        // Overlap, not collider: asteroids never get pushed around
        this.scene!.physics.add.overlap(this._asteroids, enemies, (_asteroid, enemy) => {
            const enemyHealth = (enemy as Enemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth.max);
        });

        this.scene!.physics.add.overlap(player, this._asteroids, (playerObj, asteroidObj) => {
            // Overlap fires every frame while touching: without a cooldown the player would die instantly
            if (this.scene!.time.now < this._nextPlayerHitTime)
                return;
            this._nextPlayerHitTime = this.scene!.time.now + DisasterManager.PLAYER_HIT_COOLDOWN;

            (playerObj as Player).getComponent(Health)?.damage((asteroidObj as Asteroid).damage);

            this.scene!.cameras.main.shake(150, 0.02);
            // Blink during the cooldown (5 x 200ms) so the player sees they are protected
            this.scene!.tweens.add({targets: playerObj, alpha: 0.3, duration: 100, yoyo: true, repeat: 4});
        });

        // Spawn rate ramps up over time. initDisasters runs on every (re)start of the scene,
        // so the ramp is reset at the end of each game
        this._disasterStartTime = this.scene!.time.now;
        this.scheduleNextDisaster();

        console.log("[DisasterManager] Disasters initialized");
    }

    private scheduleNextDisaster() {
        const elapsed: number = this.scene!.time.now - this._disasterStartTime;
        const progress: number = Phaser.Math.Clamp(elapsed / DisasterManager.DISASTER_RAMP_DURATION, 0, 1);
        const delay: number = Phaser.Math.Linear(
            DisasterManager.DISASTER_INTERVAL_START, DisasterManager.DISASTER_INTERVAL_MIN, progress);

        // One-shot timers instead of a loop: the delay is recomputed each time.
        // The scene clock removes pending timers when the scene stops or restarts
        this.scene!.time.delayedCall(delay, () => {
            this.startRandomDisaster();
            this.scheduleNextDisaster();
        });
    }

    private startRandomDisaster() {
        if (Phaser.Math.Between(0, 1) === 0)
            this.startAsteroidBelt();
        else
            this.startTimeField();
    }

    public startAsteroidBelt() {
        const data: AsteroidBeltData = this._asteroidBeltData;
        const direction = Phaser.Utils.Array.GetRandom(BELT_DIRECTIONS as { x: number, y: number }[]);

        // The band is placed along the axis perpendicular to the direction, and kept inside the arena
        const crossLength: number = direction.x !== 0 ? GameConstants.ARENA_HEIGHT : GameConstants.ARENA_WIDTH;
        const bandWidth: number = Math.min(data.bandWidth, crossLength);
        const bandStart: number = Phaser.Math.Between(0, crossLength - bandWidth);

        // Spread the spawns over time: no lag spike, and a belt that "flows" instead of a wall
        const batchCount: number = Math.ceil(data.count / data.batchSize);
        let remaining: number = data.count;
        this.scene!.time.addEvent({
            delay: data.duration / batchCount,
            repeat: batchCount - 1,
            callback: () => {
                const quantity: number = Math.min(data.batchSize, remaining);
                for (let i: number = 0; i < quantity; i++)
                    this.spawnAsteroid(direction, bandStart, bandWidth);
                remaining -= quantity;
            }
        });

        // Hook for a future warning UI
        this.game!.events.emit(GameConstants.Events.ASTEROID_BELT_STARTED_EVENT, direction, bandStart, bandWidth);

        console.log("[DisasterManager] Asteroid belt started", direction);
    }

    // A zone that slows down or accelerates everything inside it: player, enemies, bullets and asteroids
    public startTimeField() {
        // One field at a time
        if (this._timeFieldActive)
            return;
        this._timeFieldActive = true;

        const data: TimeFieldData = this._timeFieldData;
        const isSlow: boolean = Phaser.Math.Between(0, 1) === 0;
        const scale: number = isSlow ? data.slowScale : data.fastScale;

        // Appear around the player, or it would most likely be somewhere on the arena the camera never shows
        const offset: Phaser.Math.Vector2 = Phaser.Math.RandomXY(new Phaser.Math.Vector2(),
            Phaser.Math.FloatBetween(data.minDistanceFromPlayer, data.maxDistanceFromPlayer));
        const x: number = Phaser.Math.Clamp(this._player.x + offset.x, data.radius, GameConstants.ARENA_WIDTH - data.radius);
        const y: number = Phaser.Math.Clamp(this._player.y + offset.y, data.radius, GameConstants.ARENA_HEIGHT - data.radius);

        // Drawn over the world. The rift spins (slowly or quickly depending on the type) and "breathes", the icon stays upright
        const type: string = isSlow ? 'slow' : 'fast';
        const bubble = this.scene!.add.image(x, y, DisasterManager.TIME_FIELD_TEXTURE_PREFIX + type)
            .setDisplaySize(data.radius * 2, data.radius * 2).setDepth(10);
        const icon = this.scene!.add.image(x, y, DisasterManager.TIME_FIELD_ICON_PREFIX + type)
            .setDisplaySize(data.radius * 0.5, data.radius * 0.5).setDepth(11);
        const visuals = [bubble, icon];

        // Warning phase: pulsing, no effect yet
        const pulse = this.scene!.tweens.add({
            targets: visuals, alpha: {from: 0.2, to: 0.7}, duration: 300, yoyo: true, repeat: -1
        });

        this.scene!.time.delayedCall(data.warningDuration, () => {
            pulse.stop();
            visuals.forEach(visual => visual.setAlpha(1));
            const spin = this.scene!.tweens.add({
                targets: bubble, angle: isSlow ? -360 : 360, duration: isSlow ? 20000 : 3000, repeat: -1
            });
            // Unstable rift: the size slightly oscillates, faster for an accelerated field
            const baseScale: number = bubble.scaleX;
            const breath = this.scene!.tweens.add({
                targets: bubble, scale: {from: baseScale * 0.96, to: baseScale * 1.04},
                duration: isSlow ? 1400 : 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });

            // Active phase: rescale everything inside, 20 times per second
            const effect = this.scene!.time.addEvent({
                delay: 50,
                loop: true,
                callback: () => this.applyTimeScale(x, y, data.radius, scale)
            });

            this.scene!.time.delayedCall(data.duration, () => {
                effect.remove();
                this.applyTimeScale(x, y, data.radius, 1); // Back to normal speed for everyone
                this._timeFieldActive = false;

                spin.stop();
                breath.stop();
                this.scene!.tweens.add({
                    targets: visuals, alpha: 0, duration: 500,
                    onComplete: () => visuals.forEach(visual => visual.destroy())
                });
            });
        });

        console.log("[DisasterManager] Time field started", isSlow ? "(slow)" : "(fast)");
    }

    // Objects inside the circle get insideScale, all the others get back to normal speed
    private applyTimeScale(centerX: number, centerY: number, radius: number, insideScale: number) {
        const radiusSq: number = radius * radius;

        // Only enabled bodies are in the world: pooled (disabled) objects are skipped
        for (const body of this.scene!.physics.world.bodies.entries) {
            const target = body.gameObject as unknown as ITimeScalable | null;
            if (!target || typeof target.setTimeScale !== 'function')
                continue;

            const dx: number = body.center.x - centerX;
            const dy: number = body.center.y - centerY;
            const scale: number = dx * dx + dy * dy <= radiusSq ? insideScale : 1;
            if (target.timeScale !== scale)
                target.setTimeScale(scale);
        }
    }

    private spawnAsteroid(direction: { x: number, y: number }, bandStart: number, bandWidth: number) {
        const asteroid = this._asteroids.get() as Asteroid | null;
        if (!asteroid)
            return;

        const data: AsteroidBeltData = this._asteroidBeltData;

        // Beyond the arena border: the camera is bound to the arena, so the player can never see the spawn
        const offset: number = data.spawnMargin + Phaser.Math.Between(0, data.spawnDepth);
        const cross: number = bandStart + Phaser.Math.Between(0, bandWidth);
        let x: number, y: number;
        if (direction.x !== 0) {
            x = direction.x > 0 ? -offset : GameConstants.ARENA_WIDTH + offset;
            y = cross;
        } else {
            x = cross;
            y = direction.y > 0 ? -offset : GameConstants.ARENA_HEIGHT + offset;
        }

        // Same direction for the whole belt, only the speed varies
        const speed: number = Phaser.Math.FloatBetween(data.minSpeed, data.maxSpeed);
        const texture: string = GameConstants.ASTEROID_TEXTURE_PREFIX
            + Phaser.Math.Between(0, GameConstants.ASTEROID_TEXTURE_COUNT - 1);

        asteroid.enable(x, y, direction.x * speed, direction.y * speed, texture,
            Phaser.Math.FloatBetween(data.minScale, data.maxScale),
            Phaser.Math.FloatBetween(-data.maxSpin, data.maxSpin), data.damage);
    }
}