import {Scene} from 'phaser';
import Health from "../components/Health.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";
import EntityManager from "../managers/EntityManager.ts";
import DisasterManager from "../managers/DisasterManager.ts";
import BonusManager from "../managers/BonusManager.ts";
import GameConstants from "../GameConstants.ts";

export default class MainGameScene extends Scene {
    private saveManager: SaveManager;
    private entityManager: EntityManager;
    private disasterManager: DisasterManager;
    private bonusManager: BonusManager;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_GAME);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        if (!this.saveManager) {
            console.error('SaveManager plugin not found');
        }
        this.saveManager?.load();

        // The world is bigger than the screen: the camera will move inside it
        this.cameras.main.setBounds(0, 0, GameConstants.ARENA_WIDTH, GameConstants.ARENA_HEIGHT);

        this.add.tileSprite(0, 0, GameConstants.ARENA_WIDTH, GameConstants.ARENA_HEIGHT, 'bg')
            .setOrigin(0).setTileScale(2);
        this.add.image(GameConstants.ARENA_WIDTH / 2, GameConstants.ARENA_HEIGHT / 2, 'planet').setScale(1.5);

        if (!this.entityManager) {
            console.error('EntityManager plugin not found');
        }
        if (!this.disasterManager) {
            console.error('DisasterManager plugin not found');
        }
        if (!this.bonusManager) {
            console.error('BonusManager plugin not found');
        }

        const player = this.entityManager.initAndSpawnPlayer();
        player.getComponent(Health)?.once(Health.DEATH_EVENT, () => {
            // Hide the player and let its explosion play before showing the game over screen
            player.disableBody(true, true);
            this.time.delayedCall(1000, this.endGame, [], this);
        }, this);
        this.cameras.main.startFollow(player, true, 0.1, 0.1);

        const enemies = this.entityManager.initEnemies();
        this.entityManager.initGroupCollisions();
        this.disasterManager.initDisasters(player, enemies);
        this.bonusManager.initBonuses(player, enemies);

        if (this.input.keyboard) {
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart());
            // Temporary test keys: B = asteroid belt, N = random time field, S = slow time field,
            // F = fast time field, T = black hole, E = solar flare, C = cryogenic,
            // V = random bonus, K = kill_all, H = heal, A = ammospeed, M = triple_shot
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B)
                .on('down', () => this.disasterManager.startAsteroidBelt());
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N)
                .on('down', () => this.disasterManager.startTimeField());
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
                .on('down', () => this.disasterManager.startTimeField('slow'));
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F)
                .on('down', () => this.disasterManager.startTimeField('fast'));
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T)
                .on('down', () => this.disasterManager.startBlackHole());
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
                .on('down', () => this.disasterManager.startSolarFlare());
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V)
                .on('down', () => this.bonusManager.spawnBonus());
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)
                .on('down', () => this.bonusManager.spawnBonus('kill_all'));
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H)
                .on('down', () => this.bonusManager.spawnBonus('heal'));
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
                .on('down', () => this.bonusManager.spawnBonus('ammospeed'));
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)
                .on('down', () => this.disasterManager.startCryogenic());
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M)
                .on('down', () => this.bonusManager.spawnBonus('triple_shot'));
        } else {
            console.error('No keyboard input');
        }

        this.registry.set(RegistryConstants.Keys.PLAYER_SCORE, 0);

        console.log("MainGameScene created");
    }

    private endGame() {
        const bestScore: number = Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_BEST_SCORE) ?? 0);
        const currentScore: number = Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0);
        if (currentScore > bestScore) {
            this.saveManager.setData(SaveConstants.Keys.PLAYER_BEST_SCORE, currentScore);
            console.log("New Best Score: " + currentScore);
        }

        // The score of the game is added to the coins (saved)
        const coins: number = Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_COINS) ?? 0);
        this.saveManager.setData(SaveConstants.Keys.PLAYER_COINS, coins + currentScore);
        console.log("Coins: " + coins + " + " + currentScore);

        this.scene.start(GameConstants.SceneKeys.GAME_OVER);
    }
}