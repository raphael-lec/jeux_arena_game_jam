import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    private readonly _bulletData: BulletData = {
        width: 12,
        height: 4,
        color: 0xffe066,
        speed: 1024,
        damage: 1
    };

    // Triple shot bonus: angle (deg) between the central bullet and each side bullet
    private static readonly TRIPLE_SHOT_ANGLE: number = 20;

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private _playerShipData: PlayerShipData;
    private _rateOfFire: number;
    // 1 = normal fire rate, 2 = twice as many shots per second (ammospeed bonus)
    private _fireRateMultiplier: number = 1;
    // Triple shot bonus: two more bullets, tilted on each side of the aim direction
    private _tripleShot: boolean = false;
    private _lastShotTime: number;
    private readonly _moveDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private readonly _shootDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private readonly _spreadDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _targets: Phaser.Physics.Arcade.Group;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this.addComponent(new Health(3, this));
        this.addComponent(new Movement());
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        this.angle = -90;

        this.selectPlayerShip(1);

        this._rateOfFire = 0.5;
        this._lastShotTime = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, () => {
            this.arcadeBody.setEnable(false);

            this.scene.time.delayedCall(50, () => {
                // A dead player stays disabled
                if (this.active)
                    this.arcadeBody.setEnable(true);
            });
        });
    }

    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        this.setTexture('sprites', this._playerShipData.texture);
        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed);
    }

    public setFireRateMultiplier(multiplier: number) {
        this._fireRateMultiplier = multiplier;
    }

    public setTripleShot(enabled: boolean) {
        this._tripleShot = enabled;
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // Build the move direction from the arrow keys
        this._moveDirection.set(0, 0);
        if (this._cursorKeys.left.isDown)
            this._moveDirection.x -= 1;
        if (this._cursorKeys.right.isDown)
            this._moveDirection.x += 1;
        if (this._cursorKeys.up.isDown)
            this._moveDirection.y -= 1;
        if (this._cursorKeys.down.isDown)
            this._moveDirection.y += 1;

        if (this._moveDirection.lengthSq() > 0) {
            this._moveDirection.normalize();
            this.getComponent(Movement)?.move(this, this._moveDirection, deltaTime);

            // Face the move direction
            this.rotation = this._moveDirection.angle();
        }

        // Stop player from leaving the arena
        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, GameConstants.ARENA_WIDTH - this.displayWidth / 2);
        this.y = Phaser.Math.Clamp(this.y, this.displayHeight / 2, GameConstants.ARENA_HEIGHT - this.displayHeight / 2);

        // Shoot automatically at the nearest enemy. The fire rate follows the time scale and the fire rate bonus
        if (timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000 / (this.timeScale * this._fireRateMultiplier)) {
            const nearestTarget = this.findNearestTarget();
            if (nearestTarget) {
                this._shootDirection.set(nearestTarget.x - this.x, nearestTarget.y - this.y).normalize();
                const weapon = this.getComponent(Weapon);
                weapon?.shoot(this, this._shootDirection);

                // Triple shot bonus: one more bullet on each side
                if (this._tripleShot) {
                    for (const side of [-1, 1]) {
                        this._spreadDirection.copy(this._shootDirection)
                            .rotate(side * Phaser.Math.DegToRad(Player.TRIPLE_SHOT_ANGLE));
                        weapon?.shoot(this, this._spreadDirection);
                    }
                }
                this.scene.sound.play('sfx_laser1');

                this._lastShotTime = timeSinceLaunch;
            }
        }
    }

    public setTargets(targets: Phaser.Physics.Arcade.Group) {
        this._targets = targets;
    }

    private findNearestTarget(): Entity | null {
        return this.scene.physics.closest(this, this._targets.getMatching('active', true)) as Entity | null;
    }
}