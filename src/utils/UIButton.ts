import {GameObjects, Scene} from "phaser";

// A simple menu button: a rectangle with a label, a hover effect and a click callback
export default class UIButton {
    public static create(scene: Scene, x: number, y: number, label: string, onClick: () => void,
                         width: number = 560, height: number = 120): GameObjects.Container {
        const background = scene.add.rectangle(0, 0, width, height, 0x222244, 0.9)
            .setStrokeStyle(6, 0xffffff);
        const text = scene.add.text(0, 0, label,
            {fontSize: '56px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5);

        const button = scene.add.container(x, y, [background, text]);
        // A container needs a size to get a clickable area (centered on its position)
        button.setSize(width, height);
        button.setInteractive({useHandCursor: true});

        button.on('pointerover', () => {
            background.setFillStyle(0x3a3a7a, 1);
            button.setScale(1.05);
        });
        button.on('pointerout', () => {
            background.setFillStyle(0x222244, 0.9);
            button.setScale(1);
        });
        button.on('pointerup', onClick);

        return button;
    }
}
