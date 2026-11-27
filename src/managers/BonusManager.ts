import {Plugins, Physics, Scene} from "phaser";
import Player from "../entities/Player.ts";
import Enemy from "../entities/Enemy.ts";
import Health from "../components/Health.ts";
import GameConstants from "../GameConstants.ts";

// Add a new bonus here, load its texture ('bonus_<type>') in HomeScene and handle it in applyBonus
type BonusType = 'kill_all' | 'heal' | 'ammospeed' | 'triple_shot';

const BONUS_TYPES: readonly BonusType[] = ['kill_all', 'heal', 'ammospeed', 'triple_shot'];

export default class BonusManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'BonusManager';
    public static readonly MAPPING_NAME: string = 'bonusManager';

    // Delay (ms) between two bonus spawns
    private static readonly BONUS_INTERVAL: number = 30000;
    // Texture keys: 'bonus_kill_all', ...
    private static readonly BONUS_TEXTURE_PREFIX: string = 'bonus_';
    // The source images are big: they are scaled down to this width (px)
    private static readonly BONUS_DISPLAY_SIZE: number = 120;
    // The bonus appears around the player, or it would most likely be somewhere the camera never shows
    private static readonly MIN_DISTANCE_FROM_PLAYER: number = 300;
    private static readonly MAX_DISTANCE_FROM_PLAYER: number = 700;
    // 'ammospeed' bonus: the player's fire rate is multiplied for this duration (ms)
    private static readonly AMMO_SPEED_MULTIPLIER: number = 2;
    private static readonly AMMO_SPEED_DURATION: number = 15000;
    // 'triple_shot' bonus: the player shoots in 3 directions for this duration (ms)
    private static readonly TRIPLE_SHOT_DURATION: number = 15000;
    // 'kill_all' bonus: a shockwave spreads from the player at this speed (px/s) up to this radius (px).
    // The radius must cover every enemy: they spawn just outside the camera view
    private static readonly SHOCKWAVE_SPEED: number = 2000;
    private static readonly SHOCKWAVE_MAX_RADIUS: number = 2500;

    private _player: Player;
    private _enemies: Physics.Arcade.Group;
    private _bonuses: Physics.Arcade.Group;
    private _ammoSpeedTimer: Phaser.Time.TimerEvent | undefined;
    private _tripleShotTimer: Phaser.Time.TimerEvent | undefined;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, BonusManager.PLUGIN_KEY);

        console.log("[BonusManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[BonusManager] Destroyed");
    }

    public initBonuses(player: Player, enemies: Physics.Arcade.Group) {
        this._player = player;
        this._enemies = enemies;
        this._bonuses = this.scene!.physics.add.group();
        this._ammoSpeedTimer = undefined;
        this._tripleShotTimer = undefined;

        this.scene!.physics.add.overlap(player, this._bonuses, (_player, bonusObj) => {
            const bonus = bonusObj as Physics.Arcade.Sprite;
            const type = bonus.getData('type') as BonusType;

            bonus.destroy();
            this.applyBonus(type);
        });

        // Called on every (re)start of the game scene. The scene clock removes pending timers
        // when the scene stops or restarts, so the timer is reset at the end of each game
        this.scene!.time.addEvent({
            delay: BonusManager.BONUS_INTERVAL,
            callback: this.spawnBonus,
            callbackScope: this,
            loop: true
        });

        console.log("[BonusManager] Bonuses initialized");
    }

    // Without argument, the type is random. The argument is used by the dev cheat keys
    public spawnBonus(forcedType?: BonusType) {
        const type: BonusType = forcedType ?? Phaser.Utils.Array.GetRandom(BONUS_TYPES as BonusType[]);

        const margin: number = BonusManager.BONUS_DISPLAY_SIZE;
        const offset: Phaser.Math.Vector2 = Phaser.Math.RandomXY(new Phaser.Math.Vector2(),
            Phaser.Math.FloatBetween(BonusManager.MIN_DISTANCE_FROM_PLAYER, BonusManager.MAX_DISTANCE_FROM_PLAYER));
        const x: number = Phaser.Math.Clamp(this._player.x + offset.x, margin, GameConstants.ARENA_WIDTH - margin);
        const y: number = Phaser.Math.Clamp(this._player.y + offset.y, margin, GameConstants.ARENA_HEIGHT - margin);

        const bonus = this._bonuses.create(x, y, BonusManager.BONUS_TEXTURE_PREFIX + type) as Physics.Arcade.Sprite;
        bonus.setData('type', type);
        bonus.setDepth(5);
        bonus.setScale(BonusManager.BONUS_DISPLAY_SIZE / bonus.frame.realWidth);

        // Circle slightly smaller than the sprite. Values are in unscaled texture pixels
        const body = bonus.body as Physics.Arcade.Body;
        const radius: number = Math.min(bonus.frame.realWidth, bonus.frame.realHeight) * 0.45;
        body.allowGravity = false;
        body.setCircle(radius, bonus.frame.realWidth / 2 - radius, bonus.frame.realHeight / 2 - radius);

        console.log("[BonusManager] Bonus spawned", type);
    }

    private applyBonus(type: BonusType) {
        switch (type) {
            case 'kill_all':
                this.startShockwave();
                break;
            case 'heal':
                this.healPlayer();
                break;
            case 'ammospeed':
                this.boostFireRate();
                break;
            case 'triple_shot':
                this.boostTripleShot();
                break;
        }

        console.log("[BonusManager] Bonus picked up", type);
    }

    // Gives one life back to the player. Health clamps to its max, so it can't go above it
    private healPlayer() {
        this.scene!.cameras.main.flash(300, 120, 255, 120);

        this._player.getComponent(Health)?.heal(1);
    }

    // Multiplies the player's fire rate for a while. Picking it up again only restarts the duration
    private boostFireRate() {
        this.scene!.cameras.main.flash(300, 255, 220, 80);

        this._player.setFireRateMultiplier(BonusManager.AMMO_SPEED_MULTIPLIER);
        this._ammoSpeedTimer?.remove();
        this._ammoSpeedTimer = this.scene!.time.delayedCall(BonusManager.AMMO_SPEED_DURATION, () => {
            this._player.setFireRateMultiplier(1);
            this._ammoSpeedTimer = undefined;
        });
    }

    // The player shoots in 3 directions for a while. Picking it up again only restarts the duration
    private boostTripleShot() {
        this.scene!.cameras.main.flash(300, 200, 120, 255);

        this._player.setTripleShot(true);
        this._tripleShotTimer?.remove();
        this._tripleShotTimer = this.scene!.time.delayedCall(BonusManager.TRIPLE_SHOT_DURATION, () => {
            this._player.setTripleShot(false);
            this._tripleShotTimer = undefined;
        });
    }

    // A shockwave spreads from where the bonus was picked up and kills every enemy it reaches.
    // Disasters (asteroids, time fields) are not affected
    private startShockwave() {
        const originX: number = this._player.x;
        const originY: number = this._player.y;
        const maxRadius: number = BonusManager.SHOCKWAVE_MAX_RADIUS;

        const graphics = this.scene!.add.graphics().setDepth(12);
        const wave = {radius: 0};

        this.scene!.tweens.add({
            targets: wave,
            radius: maxRadius,
            duration: maxRadius / BonusManager.SHOCKWAVE_SPEED * 1000,
            ease: 'Linear',
            onUpdate: () => {
                // Ring + light disc, fading out as the wave gets further
                graphics.clear();
                graphics.setAlpha(1 - 0.7 * (wave.radius / maxRadius));
                graphics.fillStyle(0x66ccff, 0.12);
                graphics.fillCircle(originX, originY, wave.radius);
                graphics.lineStyle(12, 0x99ddff, 1);
                graphics.strokeCircle(originX, originY, wave.radius);

                this.killEnemiesInRadius(originX, originY, wave.radius);
            },
            onComplete: () => graphics.destroy()
        });
    }

    private killEnemiesInRadius(x: number, y: number, radius: number) {
        const radiusSq: number = radius * radius;

        for (const child of this._enemies.getChildren()) {
            const enemy = child as Enemy;
            if (!enemy.active)
                continue;

            if (Phaser.Math.Distance.BetweenPointsSquared({x, y}, enemy) > radiusSq)
                continue;

            // Already dead enemies take no damage again, so hitting them every frame is harmless
            const health = enemy.getComponent(Health);
            health?.damage(health.max);
        }
    }
}