import {GameObjects, Physics} from "phaser";
import type {SolarFlareData} from "../gameData/SolarFlareData.ts";
import Entity from "./Entity.ts";
import Player from "./Player.ts";
import Enemy from "./Enemy.ts";
import Health from "../components/Health.ts";
import GameConstants from "../GameConstants.ts";

// A fixed fire laser that crosses the whole arena (horizontally or vertically) and stays in place
// for several seconds.
// 1. Warning phase: the beam zone is shown (pulsing red zone), no effect yet
// 2. The beam snaps on, burns the player that touches it and kills the enemies, for a random duration
// 3. The beam shuts down and disappears
//
// The visual is the 'eruptionsolaire' image (cf. HomeScene), repeated along the beam without any
// deformation: the long side of the image follows the beam, and the beam flows by scrolling the tiles
export default class SolarFlare extends GameObjects.Container {
    // Texture key: loaded in HomeScene
    public static readonly TEXTURE_KEY: string = 'solarflare';
    // Tiles overlap a bit, to hide the seams between two images
    private static readonly TILE_OVERLAP: number = 0.06;
    // How fast the flames flow along the beam (px/s)
    private static readonly SCROLL_SPEED: number = 600;
    // Beam snaps on / shuts down (ms)
    private static readonly SWITCH_ON_DURATION: number = 300;
    private static readonly SWITCH_OFF_DURATION: number = 400;
    // The beam "breathes" across its width: scale oscillation (+/- ratio) and period (ms)
    private static readonly PULSE_AMOUNT: number = 0.06;
    private static readonly PULSE_DURATION: number = 140;
    // Light camera shake while the beam is on
    private static readonly SHAKE_INTENSITY: number = 0.003;

    private readonly _data: SolarFlareData;
    private readonly _horizontal: boolean;
    private readonly _crossCenter: number;
    private readonly _player: Player;
    private readonly _enemies: Physics.Arcade.Group;
    private readonly _onPlayerHit: (damage: number) => void;
    private readonly _warning: GameObjects.Rectangle;
    private readonly _tiles: GameObjects.Image[] = [];
    private readonly _tileStep: number;
    private readonly _tilesStart: number;
    private readonly _activeDuration: number;
    private _elapsed: number = 0;
    private _scroll: number = 0;
    private _launched: boolean = false;
    private _armed: boolean = false;
    private _stopping: boolean = false;

    // horizontal: the beam runs along X (otherwise along Y). crossCenter: its position on the other axis
    constructor(scene: Phaser.Scene, data: SolarFlareData, horizontal: boolean, crossCenter: number,
                player: Player, enemies: Physics.Arcade.Group, onPlayerHit: (damage: number) => void) {
        super(scene, 0, 0);

        this._data = data;
        this._horizontal = horizontal;
        this._crossCenter = crossCenter;
        this._player = player;
        this._enemies = enemies;
        this._onPlayerHit = onPlayerHit;
        this._activeDuration = Phaser.Math.Between(data.minDuration, data.maxDuration);

        const length: number = horizontal ? GameConstants.ARENA_WIDTH : GameConstants.ARENA_HEIGHT;
        const centerX: number = horizontal ? GameConstants.ARENA_WIDTH / 2 : crossCenter;
        const centerY: number = horizontal ? crossCenter : GameConstants.ARENA_HEIGHT / 2;

        // The container is the beam: local X = along the beam, local Y = across it.
        // Rotated by 90° for a vertical beam
        this.setPosition(centerX, centerY);
        this.setRotation(horizontal ? 0 : Math.PI / 2);
        this.setDepth(9);

        // Tiles keep the image ratio: no deformation
        const frame = scene.textures.getFrame(SolarFlare.TEXTURE_KEY);
        const tileWidth: number = data.thickness * frame.realWidth / frame.realHeight;
        this._tileStep = tileWidth * (1 - SolarFlare.TILE_OVERLAP);
        // One tile before the start and a few after the end, so scrolling never shows a hole
        this._tilesStart = -length / 2 - this._tileStep;
        const tileCount: number = Math.ceil((length + this._tileStep * 2) / this._tileStep) + 1;
        for (let i: number = 0; i < tileCount; i++) {
            const tile = new GameObjects.Image(scene, 0, 0, SolarFlare.TEXTURE_KEY);
            tile.setDisplaySize(tileWidth, data.thickness);
            this._tiles.push(tile);
            this.add(tile);
        }
        this.layoutTiles();

        // Hidden until the beam snaps on
        this.setAlpha(0).setScale(1, 0.05);
        scene.add.existing(this);

        // Warning zone: the future path of the beam, pulsing, no effect yet
        this._warning = scene.add.rectangle(centerX, centerY,
            horizontal ? length : data.thickness, horizontal ? data.thickness : length, 0xff3300, 0.2);
        this._warning.setStrokeStyle(6, 0xff8800, 1).setDepth(7);
        scene.tweens.add({
            targets: this._warning, alpha: {from: 0.35, to: 1}, duration: 400, yoyo: true, repeat: -1
        });
    }

    destroy(fromScene?: boolean) {
        // Don't leave tweens running on destroyed objects
        this.scene?.tweens?.killTweensOf(this);
        this.scene?.tweens?.killTweensOf(this._warning);
        this._warning?.destroy();

        super.destroy(fromScene);
    }

    preUpdate(_time: number, delta: number) {
        this._elapsed += delta;

        if (this._elapsed < this._data.warningDuration)
            return;

        if (!this._launched)
            this.switchOn();

        // The flames flow along the beam
        this._scroll = (this._scroll + SolarFlare.SCROLL_SPEED * delta / 1000) % this._tileStep;
        this.layoutTiles();

        if (this._armed) {
            this.hitTargets();

            if (this._elapsed >= this._data.warningDuration + this._activeDuration)
                this.switchOff();
        }
    }

    private switchOn() {
        this._launched = true;

        // The warning disappears as the beam snaps on
        this.scene.tweens.killTweensOf(this._warning);
        this.scene.tweens.add({
            targets: this._warning, alpha: 0, duration: SolarFlare.SWITCH_ON_DURATION,
            onComplete: () => this._warning.destroy()
        });

        // The beam opens from a thin line to its full width, and is harmless until it is fully open
        this.scene.tweens.add({
            targets: this, alpha: 1, scaleY: 1, duration: SolarFlare.SWITCH_ON_DURATION, ease: 'Back.easeOut',
            onComplete: () => {
                this._armed = true;
                this.scene.tweens.add({
                    targets: this,
                    scaleY: {from: 1 - SolarFlare.PULSE_AMOUNT, to: 1 + SolarFlare.PULSE_AMOUNT},
                    duration: SolarFlare.PULSE_DURATION,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });

        this.scene.cameras.main.shake(this._activeDuration, SolarFlare.SHAKE_INTENSITY);
    }

    private switchOff() {
        if (this._stopping)
            return;
        this._stopping = true;
        this._armed = false;

        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this, alpha: 0, scaleY: 0.05, duration: SolarFlare.SWITCH_OFF_DURATION,
            onComplete: () => this.destroy()
        });
    }

    // Tiles are spaced by tileStep, shifted by the scroll: the pattern repeats, so it loops seamlessly
    private layoutTiles() {
        for (let i: number = 0; i < this._tiles.length; i++)
            this._tiles[i].x = this._tilesStart + i * this._tileStep + this._scroll;
    }

    private hitTargets() {
        if (this._player.active && this.touches(this._player))
            this._onPlayerHit(this._data.damage);

        for (const child of this._enemies.getChildren()) {
            const enemy = child as Enemy;
            if (!enemy.active || !this.touches(enemy))
                continue;

            const health = enemy.getComponent(Health);
            health?.damage(health.max);
        }
    }

    // The beam covers the whole arena length: only the distance to its axis matters.
    // The hit zone is the beam width shrunk by hitMargin: the wavy edges and sparks are harmless
    private touches(target: Entity): boolean {
        const across: number = this._horizontal ? target.y - this._crossCenter : target.x - this._crossCenter;
        const radius: number = target.arcadeBody.halfWidth;

        return Math.abs(across) <= this._data.thickness / 2 - this._data.hitMargin + radius;
    }
}