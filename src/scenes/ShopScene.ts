import GameConstants from "../GameConstants.ts";
import UIButton from "../utils/UIButton.ts";
import SaveManager from "../managers/SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";

export default class ShopScene extends Phaser.Scene {
    // Injected by the SaveManager global plugin (cf. main.ts)
    private saveManager: SaveManager;

    constructor() {
        super(GameConstants.SceneKeys.SHOP);
    }

    create() {
        const centerX: number = this.scale.width / 2;
        const height: number = this.scale.height;

        this.add.text(centerX, height * 0.15, 'BOUTIQUE',
            {fontSize: '80px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5);

        this.saveManager?.load();
        const coins: number = Number(this.saveManager?.getData(SaveConstants.Keys.PLAYER_COINS) ?? 0);
        this.add.text(centerX, height * 0.15 + 100, 'PIÈCES : ' + coins,
            {fontSize: '48px', color: '#ffe066'}).setOrigin(0.5);

        // Placeholder: the items will go here
        this.add.text(centerX, height / 2, 'Bientôt disponible',
            {fontSize: '48px', color: '#aaaaaa', align: 'center'}).setOrigin(0.5);

        UIButton.create(this, centerX, height - 300, 'RETOUR', () => this.backToHome());
        this.input.keyboard?.on('keydown-ESC', () => this.backToHome());

        console.log("ShopScene created");
    }

    private backToHome() {
        this.scene.start(GameConstants.SceneKeys.HOME);
    }
}