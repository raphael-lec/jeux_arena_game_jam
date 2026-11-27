import GameConstants from "../GameConstants.ts";
import UIButton from "../utils/UIButton.ts";

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super(GameConstants.SceneKeys.SHOP);
    }

    create() {
        const centerX: number = this.scale.width / 2;
        const height: number = this.scale.height;

        this.add.text(centerX, height * 0.15, 'BOUTIQUE',
            {fontSize: '80px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5);

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
