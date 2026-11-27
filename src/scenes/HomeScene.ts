import {Loader} from "phaser";
import GameConstants from "../GameConstants.ts";
import BlackHole from "../entities/BlackHole.ts";
import SolarFlare from "../entities/SolarFlare.ts";
import UIButton from "../utils/UIButton.ts";

export default class HomeScene extends Phaser.Scene {
    // Avoids launching the game twice (SPACE and a click in the same frame)
    private _starting: boolean = false;

    constructor() {
        super(GameConstants.SceneKeys.HOME);
    }

    preload() {
        const width: number = this.scale.width;
        const y: number = this.scale.height / 2;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(0, y, width, 64);
        this.load.on(Loader.Events.PROGRESS, function (value: number) { // 0-1
            console.log("Loading : " + value);

            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(0, y, width * value, 64);
        });
        this.load.on(Loader.Events.COMPLETE, function () {
            console.log("Loading complete");

            progressBar.destroy();
            progressBox.destroy();
        });

        this.load.setPath('assets');

        this.load.image('bg', 'Backgrounds/darkPurple.png');
        this.load.image('planet', 'Planets/planet00.png');
        this.load.atlas('sprites', 'Spritesheet/gameSprites.png', 'Spritesheet/gameSprites.json');
        // Player ships atlas: ship0 ... ship26 (cf. playerShips.json)
        this.load.atlas('ships', 'Spritesheet/vaisseau.png', 'Spritesheet/vaisseau.json');
        // Base enemies atlas: baseEnemy0 ... baseEnemy2 (cf. EnemyTypes)
        this.load.atlas('baseenemies', 'Spritesheet/baseenemi.png', 'Spritesheet/baseenemi.json');
        // Enemies atlas: enemy0 ... enemy9 (cf. EnemyTypes)
        this.load.atlas('enemies', 'Spritesheet/enemysprite.png', 'Spritesheet/enemies.json');
        for (let i: number = 0; i < GameConstants.ASTEROID_TEXTURE_COUNT; i++) {
            const key: string = GameConstants.ASTEROID_TEXTURE_PREFIX + i;
            this.load.image(key, 'Asteroids/' + key + '.png');
        }
        for (const type of ['slow', 'fast']) {
            this.load.image('timefield_' + type, 'TimeFields/timefield_' + type + '.png');
            this.load.image('timefield_icon_' + type, 'TimeFields/timefield_icon_' + type + '.png');
        }
        // Bonuses: texture key is 'bonus_' + type (cf. BonusManager)
        this.load.image('bonus_kill_all', 'Bonus/kill_all.png');
        this.load.image('bonus_heal', 'Bonus/heal.png');
        this.load.image('bonus_ammospeed', 'Bonus/ammospeed.png');
        this.load.image('bonus_triple_shot', 'Bonus/triple_shot.png');
        // Black hole: 3 growth stages, texture key is 'blackhole_' + stage (cf. BlackHole)
        for (let i: number = 0; i < BlackHole.TEXTURE_COUNT; i++) {
            const key: string = BlackHole.TEXTURE_PREFIX + i;
            this.load.image(key, 'BlackHoles/' + key + '.png');
        }
        // Solar flare: texture key is SolarFlare.TEXTURE_KEY (cf. SolarFlare)
        this.load.image(SolarFlare.TEXTURE_KEY, 'SolarFlares/eruptionsolaire.png');
        this.load.bitmapFont('future-bmp', 'Fonts/kenvector_future.png', 'Fonts/kenvector_future.xml');
        this.load.font('future', 'Fonts/kenvector_future.ttf');
        this.load.json('playerShips', 'Data/playerShips.json');
        this.load.audio('sfx_laser1', 'Sounds/sfx_laser1.ogg');
        this.load.audio('sfx_laser2', 'Sounds/sfx_laser2.ogg');
    }

    create() {
        this._starting = false;

        const centerX: number = this.scale.width / 2;
        const height: number = this.scale.height;

        this.add.text(centerX, height * 0.28, 'CODA SHMUP',
            {fontSize: '96px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5);

        UIButton.create(this, centerX, height * 0.5, 'JOUER', () => this.startGame());
        UIButton.create(this, centerX, height * 0.5 + 180, 'BOUTIQUE',
            () => this.scene.start(GameConstants.SceneKeys.SHOP));

        this.add.text(centerX, height * 0.5 + 400, 'ESPACE pour jouer',
            {fontSize: '32px', color: '#aaaaaa'}).setOrigin(0.5);

        // Ignore the OS key repeat: SPACE may still be held from the previous game
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
            if (event.repeat)
                return;

            this.startGame();
        });

        console.log("HomeScene created");
    }

    private startGame() {
        if (this._starting)
            return;
        this._starting = true;

        this.scene.launch(GameConstants.SceneKeys.MAIN_UI);
        this.scene.start(GameConstants.SceneKeys.MAIN_GAME);
    }
}