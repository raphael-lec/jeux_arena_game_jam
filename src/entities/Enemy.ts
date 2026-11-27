import type {EnemyData} from '../gameData/EnemyData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";
import GameConstants from "../GameConstants.ts";

// A pooled enemy. What it looks like and how it behaves (chase, keep its distance, shoot...) comes from
// the EnemyData given to enable(): the same pooled object can be reused as any enemy type
export default class Enemy extends Entity {
    private _type: EnemyData | undefined;
    private _bulletsGroup: Phaser.Physics.Arcade.Group;
    private _shootTimer: Phaser.Time.TimerEvent | undefined;
    private _target: Entity;
    private readonly _directionToTarget: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private readonly _shootDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private readonly _moveDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    // Side (-1 / 1) on which the enemy circles around its target, picked once per spawn
    private _strafeSide: number = 1;
    // Enemies spawn outside the camera view, maybe outside the arena: they are only kept inside it after entering
    private _hasEntered: boolean = false;
    // Display scale of the current type: the "inflation" before a shot is relative to it
    private _baseScale: number = 1;
    // Radius of the circle body in unscaled texture pixels (Arcade does not scale a circle radius with the sprite)
    private _bodyRadius: number = 0;

    public get enemyType(): EnemyData | undefined {
        return this._type;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, target: Entity) {
        this._bulletsGroup = bulletsGroup;
        this._target = target;

        // Health, speed and weapon depend on the enemy type: they are set when the type is applied (cf. enable)
        this.addComponent(new Health(1, this));
        this.addComponent(new Movement());

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (health?.current == 0)
            {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (health?.current == 0)
                {
                    this.disable();
                }
            });
        });

        // Create animation when enemy is about to shoot in the global animation manager
        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: 4,
            });
        }
    }

    public enable(x: number, y: number, type: EnemyData) {
        // Pooled enemy: the texture, body and weapon only change when it comes back as another type
        if (this._type !== type)
            this.applyType(type);

        this.enableBody(true, x, y, true, true);
        // Pooled enemy: it may have been killed while slowed down or accelerated
        this.setTimeScale(1);
        this._baseScale = type.scale ?? 1;
        this.setScale(this._baseScale);
        // The circle radius is used for collisions but is not rescaled with the sprite: do it here
        this.arcadeBody.radius = this._bodyRadius * this._baseScale;
        this._hasEntered = false;
        this._strafeSide = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;

        // Full health, without emitting events
        this.getComponent(Health)?.reset(type.health);

        // Only enemies that shoot have a timer. Random delay and start time: enemies don't shoot all together
        this._shootTimer?.remove();
        this._shootTimer = undefined;
        if (type.shoot) {
            const delay: number = Phaser.Math.Between(type.shoot.minDelay, type.shoot.maxDelay);
            this._shootTimer = this.scene.time.addEvent({
                delay: delay,
                startAt: Phaser.Math.Between(0, delay),
                callback: this.startShot,
                callbackScope: this,
                loop: true
            });
        }
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);
        this.scene.tweens.killTweensOf(this);

        this._shootTimer?.remove();
        this._shootTimer = undefined;

        this.disableBody(true, true);
    }

    private applyType(type: EnemyData) {
        this._type = type;

        this.setTexture(type.atlas, type.frame);

        // Circle centered on the frame. Values are in unscaled texture pixels
        const width: number = this.frame.realWidth;
        const height: number = this.frame.realHeight;
        const radius: number = Math.min(width, height) / 2 * type.bodyRadiusRatio;
        this._bodyRadius = radius;
        this.arcadeBody.setCircle(radius, width / 2 - radius, height / 2 - radius);

        this.getComponent(Movement)?.setSpeed(type.speed);

        const oldWeapon = this.getComponent(Weapon);
        if (oldWeapon)
            this.removeComponent(oldWeapon);
        if (type.shoot)
            this.addComponent(new Weapon(this._bulletsGroup, type.shoot.bullet));
    }

    // Timer callback: warns the player with an animation, then fires. Only when the enemy is on screen,
    // or the player would be shot by something he can't see
    private startShot() {
        const shoot = this._type?.shoot;
        if (!shoot || !this.active)
            return;

        if (!this.scene.cameras.main.worldView.contains(this.x, this.y))
            return;

        const animation: string | undefined = this._type?.shootAnimation;
        if (animation) {
            this.play(animation);
            this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                this.setTexture(this._type!.atlas, this._type!.frame);
                this.fire();
            });
        } else {
            // Quick "inflation": the shot leaves at its peak
            this.scene.tweens.add({
                targets: this,
                scale: this._baseScale * 1.2,
                duration: 120,
                yoyo: true,
                onYoyo: () => this.fire(),
                onComplete: () => this.setScale(this._baseScale)
            });
        }
    }

    private fire() {
        if (!this.active)
            return;

        // Aims where the target is when the shot leaves, not when it was announced
        this._shootDirection.set(this._target.x - this.x, this._target.y - this.y).normalize();
        this.getComponent(Weapon)?.shoot(this, this._shootDirection);
        this.scene.sound.play('sfx_laser2');
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime)

        const type = this._type;
        if (!type)
            return;

        // Direction to the target: (target - me), normalized to keep only the direction
        const dx: number = this._target.x - this.x;
        const dy: number = this._target.y - this.y;
        const distance: number = Math.sqrt(dx * dx + dy * dy);
        this._directionToTarget.set(dx, dy).normalize();
        this.rotation = this._directionToTarget.angle() + type.rotationOffset;

        if (type.keepDistance)
            this.computeKeepDistanceDirection(distance, type.keepDistance);
        else
            this._moveDirection.copy(this._directionToTarget);

        // A hit enemy is slowed down while it flashes
        const movementTime: number = this.isTinted ? deltaTime * 0.5 : deltaTime;
        this.getComponent(Movement)?.move(this, this._moveDirection, movementTime);

        if (type.keepDistance)
            this.keepInsideArena();
    }

    // Too far: approaches. Too close: backs off. At the right distance: circles around the target.
    // It is a blend of the three, so the enemy never jerks when it crosses a limit. Length is at most 1
    private computeKeepDistanceDirection(distance: number, data: NonNullable<EnemyData['keepDistance']>) {
        // 1 = far (approach), -1 = close (back off), 0 = right distance
        const radial: number = Phaser.Math.Clamp((distance - data.preferredDistance) / data.tolerance, -1, 1);
        const strafe: number = (1 - Math.abs(radial)) * data.strafeSpeedRatio * this._strafeSide;

        // Tangent = direction to the target rotated by 90°
        this._moveDirection.set(
            this._directionToTarget.x * radial - this._directionToTarget.y * strafe,
            this._directionToTarget.y * radial + this._directionToTarget.x * strafe);
    }

    // Outside the arena the camera can't show it, and it could shoot the player without being seen
    private keepInsideArena() {
        const margin: number = this.arcadeBody.halfWidth;
        const inside: boolean = this.x >= margin && this.x <= GameConstants.ARENA_WIDTH - margin
            && this.y >= margin && this.y <= GameConstants.ARENA_HEIGHT - margin;

        if (inside) {
            this._hasEntered = true;
        } else if (this._hasEntered) {
            this.x = Phaser.Math.Clamp(this.x, margin, GameConstants.ARENA_WIDTH - margin);
            this.y = Phaser.Math.Clamp(this.y, margin, GameConstants.ARENA_HEIGHT - margin);
        }
    }
}