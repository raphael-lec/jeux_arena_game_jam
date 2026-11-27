import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import Player from "../entities/Player.ts";
import type {EnemyData} from "../gameData/EnemyData.ts";
import {ENEMY_TYPES} from "../gameData/EnemyTypes.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // Enemy spawn rate: the delay between two spawns shrinks as the game goes on
    private static readonly SPAWN_DELAY_START: number = 500;     // ms, at the start of the game
    private static readonly SPAWN_DELAY_MIN: number = 200;       // ms, the delay never goes below this
    private static readonly SPAWN_DELAY_DECREASE: number = 2;    // ms removed from the delay each second
    private static readonly MAX_ACTIVE_ENEMIES: number = 50;

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 256,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    }

    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    private _enemies: Physics.Arcade.Group;
    private _enemyBullets: Physics.Arcade.Group;
    private readonly _spawnOffset: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _gameStartTime: number = 0;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._player = new Player(this.scene!, GameConstants.ARENA_WIDTH / 2, GameConstants.ARENA_HEIGHT / 2);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(): Physics.Arcade.Group {
        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets, this._player);
            }
        });

        this._player.setTargets(this._enemies);

        // Spawn enemies indefinitely, faster and faster. Called on every (re)start of the game scene,
        // so the spawn rate is reset at the end of each game
        this._gameStartTime = this.scene!.time.now;
        this.scheduleNextSpawn();

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    public initGroupCollisions() {
        // Push enemies apart so they don't stack into a single blob
        this.scene!.physics.add.collider(this._enemies, this._enemies);

        this.scene!.physics.add.overlap(this._playerBullets, this._enemies, (bullet, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (enemy as Enemy).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        this.scene!.physics.add.overlap(this._player, this._enemies, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as Enemy).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    private scheduleNextSpawn() {
        const elapsedSeconds: number = (this.scene!.time.now - this._gameStartTime) / 1000;
        const delay: number = Math.max(EntityManager.SPAWN_DELAY_MIN,
            EntityManager.SPAWN_DELAY_START - elapsedSeconds * EntityManager.SPAWN_DELAY_DECREASE);

        // One-shot timers instead of a loop: the delay is recomputed each time.
        // The scene clock removes pending timers when the scene stops or restarts
        this.scene!.time.delayedCall(delay, () => {
            this.spawnEnemy();
            this.scheduleNextSpawn();
        });
    }

    private spawnEnemy() {
        if (this._enemies.countActive(true) >= EntityManager.MAX_ACTIVE_ENEMIES) {
            return;
        }

        const type: EnemyData | undefined = this.pickEnemyType();
        if (!type) {
            return;
        }

        const enemy = this._enemies.get() as Enemy;
        if (!enemy) {
            return;
        }

        // Spawn on a circle around the camera view, a bit further than its corners: always outside the screen.
        // Center on the view, not the player: at the arena edges the camera stops and the player is off-center
        const view = this.scene!.cameras.main.worldView;
        const spawnRadius = Phaser.Math.Distance.Between(view.centerX, view.centerY, view.right, view.top) + 128;
        Phaser.Math.RandomXY(this._spawnOffset, spawnRadius);
        enemy.enable(view.centerX + this._spawnOffset.x, view.centerY + this._spawnOffset.y, type);

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);

        console.log("[EntityManager] Enemy spawned", type.name);
    }

    // Random enemy type among the ones that can spawn now: the game lasts long enough, and not too many are alive.
    // The weight of a type is its chance relative to the others
    private pickEnemyType(): EnemyData | undefined {
        const elapsedSeconds: number = (this.scene!.time.now - this._gameStartTime) / 1000;
        const candidates: EnemyData[] = ENEMY_TYPES.filter(type =>
            elapsedSeconds >= type.spawnAfter && this.countActive(type) < type.maxActive);
        if (candidates.length === 0)
            return undefined;

        const totalWeight: number = candidates.reduce((sum, type) => sum + type.weight, 0);
        let roll: number = Phaser.Math.FloatBetween(0, totalWeight);
        for (const type of candidates) {
            roll -= type.weight;
            if (roll <= 0)
                return type;
        }

        return candidates[candidates.length - 1];
    }

    private countActive(type: EnemyData): number {
        return this._enemies.getChildren().filter(child => child.active && (child as Enemy).enemyType === type).length;
    }
}