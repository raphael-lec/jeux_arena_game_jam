import {AUTO, Game, Input, Scale, Types} from 'phaser';
import GameOverScene from "./scenes/GameOverScene.ts";
import HomeScene from "./scenes/HomeScene.ts";
import MainGameScene from './scenes/MainGameScene.ts';
import MainUIScene from "./scenes/MainUIScene.ts";
import EntityManager from "./managers/EntityManager.ts";
import DisasterManager from "./managers/DisasterManager.ts";
import BonusManager from "./managers/BonusManager.ts";
import SaveManager from "./managers/SaveManager.ts";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1080,
    height: 1920,
    parent: 'game-container',
    backgroundColor: '#000',
    input: {
        keyboard: {
            capture: [
                Input.Keyboard.KeyCodes.UP, Input.Keyboard.KeyCodes.DOWN,
                Input.Keyboard.KeyCodes.LEFT, Input.Keyboard.KeyCodes.RIGHT,
                Input.Keyboard.KeyCodes.SPACE
            ]
        }
    },
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
        }
    },
    plugins: {
        global: [
            {key: SaveManager.PLUGIN_KEY, plugin: SaveManager, mapping: SaveManager.MAPPING_NAME}
        ],
        scene: [
            {key: EntityManager.PLUGIN_KEY, plugin: EntityManager, mapping: EntityManager.MAPPING_NAME},
            {key: DisasterManager.PLUGIN_KEY, plugin: DisasterManager, mapping: DisasterManager.MAPPING_NAME},
            {key: BonusManager.PLUGIN_KEY, plugin: BonusManager, mapping: BonusManager.MAPPING_NAME}
        ]
    },
    // fps: { forceSetTimeOut: true, target: 120 },
    scene: [
        HomeScene,
        MainGameScene,
        MainUIScene,
        GameOverScene
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    new Game(config);
});