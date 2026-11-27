import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";

export default class GameOverScene extends Phaser.Scene {
    // Injected by the SaveManager global plugin (cf. main.ts)
    private saveManager: SaveManager;

    constructor() {
        super(GameConstants.SceneKeys.GAME_OVER);
    }

    create() {
        this.scene.stop(GameConstants.SceneKeys.MAIN_UI);

        const screenCenterX: number = this.scale.width / 2;
        const titleY: number = this.scale.height / 3;
        this.add.text(screenCenterX, titleY, 'GAME OVER',
            {fontSize: '96px', color: '#fff', align: 'center'}).setOrigin(0.5);
        this.add.text(screenCenterX, titleY + 160, "SCORE",
            {fontSize: '48px', align: 'center'}).setOrigin(0.5);

        this.add.text(screenCenterX, titleY + 220, this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString(),
            {fontSize: '32px', color: '#fff', align: 'center'}).setOrigin(0.5);

        // The score of the game has just been added to the coins (cf. MainGameScene)
        const score: number = Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0);
        const coins: number = Number(this.saveManager?.getData(SaveConstants.Keys.PLAYER_COINS) ?? 0);
        this.add.text(screenCenterX, titleY + 320, '+' + score + ' PIÈCES',
            {fontSize: '48px', color: '#ffe066', align: 'center'}).setOrigin(0.5);
        this.add.text(screenCenterX, titleY + 390, 'Total : ' + coins,
            {fontSize: '40px', color: '#fff', align: 'center'}).setOrigin(0.5);

        this.add.text(screenCenterX, this.scale.height - 256, 'Press SPACE to play again',
            {fontSize: '32px', color: '#fff', align: 'center'}).setOrigin(0.5);

        // Ignore the OS key repeat: SPACE is often still held from shooting when the player dies
        this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
            if (event.repeat)
                return;

            this.scene.start(GameConstants.SceneKeys.HOME);
        });

        console.log("GameOverScene created");
    }
}