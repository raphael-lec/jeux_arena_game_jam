---
layout: chapter
logos: true
topics: entity/component, pooling, rotation, registry, save, managers, scènes, UI
---

# Partie 2
## L'architecture

<!--
Ouvrir la partie en faisant expliquer à voix haute, par deux ou trois élèves, ce qu'un commit de la partie 1 a apporté.
Review rapide de la partie 1 : où en est MainGameScene au commit 21 (≈ 250 lignes, tout dedans).
Partie 2 : commits 22 à 37. On ne code pas l'architecture d'emblée : on la découvre en refactorisant.
-->

---
layout: part
label: Partie 2
sub: Le prototype marche, on le range
---

# Entités et composants

---
class: commit-slide
---

<div class="commit"><b>22</b><code>959dbd7</code><span>Extract Player and Enemy into their own entity classes</span></div>

# Des entités

- `Entity` étend `Physics.Arcade.Sprite` et s'ajoute seule à la scène
- Le joueur lit son input dans `preUpdate`
- `on` devient `once` : fin des balles empilées du 18

<!--
src/entities/Entity.ts:3-16 : add.existing + physics.add.existing une fois pour toutes, allowGravity à false.
Player.ts:36-58 (preUpdate : déplacement, Clamp, tir). Enemy.ts:38-49 (shoot avec once :41), Enemy.preUpdate :51-58.
preUpdate est appelé automatiquement pour les Sprites de la scène, ne pas oublier super.preUpdate (sinon plus d'animation).
Bug du commit 18 corrigé : this.once(ANIMATION_COMPLETE) se retire après un appel, une seule balle par tir.
warmGroupItems devient GroupUtils.populate (src/utils/GroupUtils.ts). MainGameScene passe de 260 à 115 lignes.
-->

---
class: commit-slide exercise
---

<div class="start">On part du commit <b>22</b> : <code>git go 22</code></div>
<div class="tag exo">Libre</div>

# Pooler les ennemis

<p class="goal">Les ennemis sont réutilisés au lieu d'être créés et détruits.</p>

- Comme le pooling des balles : un groupe avec `classType: Enemy`
- `group.get()` pour en obtenir un, `enable` et `disable` à la place de `new` et `destroy`
- Tout ce que l'ennemi garde en mémoire est remis à zéro dans `enable`, son timer de tir compris

<p class="docs">Docs : <a href="https://docs.phaser.io/phaser/concepts/gameobjects/group" target="_blank">Group</a></p>

<!--
Les élèves codent seuls, environ 20 min, sans regarder la suite.
Points à vérifier dans leurs essais : countActive au lieu de getLength pour limiter le nombre d'ennemis, le timer de tir mis en pause dans disable et relancé dans enable.
Après la solution, tout le monde repart du commit de la solution.
-->

---
class: commit-slide
---

<div class="commit"><b>23</b><code>7a48be8</code><span>Pool enemies</span></div>
<div class="tag sol">Solution</div>

# Pooler les ennemis

- `init` une fois à la création, `enable` et `disable` à chaque réutilisation
- `countActive(true)` : `getLength()` compte aussi les inactifs
- <span class="warn">Piège</span> : un objet réutilisé garde son ancien état

<p class="next">Pour repartir de la solution : <code>git go 23</code></p>

<!--
Groupe d'ennemis : MainGameScene.ts:66-73 (classType: Enemy, createCallback qui appelle init).
Enemy.ts:33-45 : enable() réactive le body et relance le timer (reset), disable() coupe l'animation,
retire les listeners ANIMATION_COMPLETE, désactive le body et met le timer en pause.
Le piège : tout ce qu'enable() ne remet pas à zéro survit d'une vie à l'autre (on le verra avec la vie au commit 29).
-->

---
class: commit-slide
---

<div class="commit"><b>24</b><code>04d27ae</code><span>Refactor entity shooting logic with Component pattern</span></div>

# Des composants

- Le comportement vit dans des **composants**, ici `Weapon`
- On compose au lieu d'hériter
- `getComponent` retrouve un composant par son type

<!--
Nouveaux fichiers : src/components/IComponent.ts (enabled: boolean), src/components/Weapon.ts (shoot :18-29).
Entity.ts:19-35 : addComponent, removeComponent, getComponent.
Même changement côté ennemi (Enemy.ts). Le ?. protège si l'entité n'a pas de Weapon.
-->

---
class: commit-slide
---

<div class="commit"><b>25</b><code>51d1db4</code><span>Configure each entity's bullets with BulletData</span></div>

# Des balles configurables

- `BulletData` : taille, couleur, vitesse
- Chaque entité donne les siennes à son `Weapon`
- `shoot` ne prend plus qu'une direction : −1 ou 1

<!--
Type : src/gameData/BulletData.ts. Player.ts:8-13 (balle jaune, 1024 px/s), Enemy.ts:6-11 (balle rouge, 512 px/s).
Weapon.ts:21-33. Appels : Player.ts:59 (shoot(..., -1)), Enemy.ts:59 (shoot(..., 1)).
Prochaine étape : remplacer cette direction verticale par un vrai vecteur.
-->

---
class: commit-slide
---

<div class="commit"><b>26</b><code>3e754a9</code><span>Rotate entities towards their movement direction to shoot forward</span></div>

# Tirer devant soi

- Joueur à −90°, ennemi à 90° : 0° regarde vers la droite
- Devant = `(1, 0)` tourné de `rotation`, puis × vitesse
- La balle part du bord du body (`radius`)
- `velocity.angle()` donne la rotation de la balle
- <span class="warn">La hitbox Arcade ne pivote pas</span> : on l'agrandit à la balle tournée
- `disable` dès qu'elle sort, aussi par la gauche ou la droite

<!--
Weapon.ts:22-46. Le code garde en commentaire la version « maths » (cos et sin de la rotation) : la montrer.
Player.ts:31 (angle = -90), Enemy.ts:18 (angle = 90). Le body devient un cercle : Player.ts:44-45 (rayon lu dans playerShips.json, champ body), Enemy.ts:41.
Atlas regénéré : les vaisseaux et l'ufo de assets-src/sprites sont tournés vers la droite, puis npm run atlas. L'ancien sheet.png/xml est supprimé.
C'est la base du spread shot de l'évaluation : une boucle sur N angles.
Bullet.ts:13-34. Version maths en commentaire : Math.atan2(velocityY, velocityX).
Le body Arcade est toujours un rectangle aligné sur les axes (AABB) : on prend la boîte englobante de la balle tournée.
Activer arcade.debug pour voir la hitbox suivre l'orientation.
update, Bullet.ts:42-51 : la balle peut maintenant partir dans tous les sens, on la recycle si elle sort à gauche, à droite, en haut ou en bas.
La balle du joueur passe de 4×12 à 12×4 : elle est dessinée vers la droite, comme les sprites.
-->

---
class: commit-slide
---

<div class="commit"><b>27</b><code>09410b9</code><span>Add a forward debug line and rotate the player with Shift</span></div>

# Voir la direction

- En debug, une ligne montre le devant de chaque entité
- Shift + ← → fait tourner le vaisseau
- `angle` est en degrés, ici 0.6&nbsp;degré par&nbsp;ms

<!--
Player.ts:51-65. La vitesse de rotation réutilise movementSpeed : 0.6 px/ms devient 0.6 degré/ms.
Ligne de debug : Entity.ts:12-15 (création si arcade.debug), Entity.ts:43-57 (preUpdate : Vector2(64, 0).rotate(rotation)).
Démo : passer arcade.debug à true dans src/main.ts, tourner avec Shift et tirer en diagonale.
-->

---
class: commit-slide
---

<div class="commit"><b>28</b><code>76a0e2a</code><span>Add Movement component to entities</span></div>

# Un composant Movement

- Le déplacement devient un composant réutilisable
- <span class="warn">px/ms</span> : 0.2 pour l'ennemi, soit 200 px/s
- Avant : `setVelocityY(256)`, en px/s, par la physique

<!--
Movement.ts:19-31. Enemy.ts:17 (new Movement(0.2)), :76. Player.ts:30 (new Movement()), :49 (setSpeed avec movementSpeed du JSON), :60 et :66.
Deux unités dans le même jeu : px/ms quand on déplace à la main avec deltaTime, px/s pour les vélocités Arcade.
L'ennemi est un peu plus lent qu'avant (200 px/s au lieu de 256).
-->

---
layout: part
label: Partie 2
sub: Vie, score, registry, localStorage et managers
---

# État et sauvegarde

---
class: commit-slide
---

<div class="commit"><b>29</b><code>c89c2e8</code><span>Add Health component to entities</span></div>

# Points de vie

- `Health` émet `CHANGE_EVENT` et `DEATH_EVENT`
- Listener posé **une fois**, dans `init`


<!--
src/components/Health.ts : étend Phaser.Events.EventEmitter, adjust() émet CHANGE_EVENT puis DEATH_EVENT (:37-50).
Enemy.ts:23-26 : le listener est posé dans init(), qui n'est appelé qu'une fois par ennemi (createCallback du groupe).
Question : et si on l'avait posé dans enable() ? Un ennemi réutilisé 10 fois aurait 10 listeners, et disable() serait appelé 10 fois.
Les listeners s'accumulent : fuite mémoire et effets en double. Règle : on() dans init(), ou off() dans disable().
Enemy.ts:58-60 : heal(max, false) remet la vie au max sans émettre d'événement (un reset, pas un soin).
Collisions : MainGameScene.ts:91-107, les overlaps appellent damage() au lieu de tout détruire. Mort du joueur : once(DEATH_EVENT, endGame) :66.
-->

---
class: commit-slide
---

<div class="commit"><b>30</b><code>d9817fb</code><span>Use Phaser registry to store score and best score</span></div>
<div class="tag live">Guidé</div>

# Le registry

- Données partagées entre scènes, un événement par clé

<p class="docs">Docs : <a href="https://docs.phaser.io/phaser/concepts/data-manager" target="_blank">Data Manager</a></p>

<!--
Le game state = tout ce qui décrit la partie à un instant T. Le registry est un DataManager partagé par toutes les scènes.
src/RegistryConstants.ts : Keys.PLAYER_SCORE et Events.PLAYER_SCORE_CHANGE = Data.Events.CHANGE_DATA_KEY + la clé ('changedata-playerScore').
set :86, écoute :87-89, inc :95 et :105.
-->

---
class: commit-slide
---

<div class="commit"><b>31</b><code>4460ded</code><span>Add SaveManager and save best score in localStorage to persist between sessions</span></div>

# Sauvegarder

- `SaveManager` : un plugin **global** Phaser
- Les données passent par `localStorage`, en JSON


<!--
Plugin global déclaré dans src/main.ts:23-27 (key, plugin, mapping : 'saveManager' devient this.saveManager dans chaque scène).
SaveManager.ts : setData (:26-31, sauve tout de suite), save (:37-48), load (:50-64), clear (:66-71).
MainGameScene.ts:37-40 : load() au create. endGame :124-129, la lecture passe aussi par saveManager.getData.
save() complet : try/catch avec console.error si localStorage est indisponible (navigation privée, quota). La clé est dans src/SaveConstants.ts : l'erreur tsc du commit 30 disparaît.
Montrer la clé phaserSaveData dans DevTools > Application > Local Storage.
-->

---
class: commit-slide
---

<div class="commit"><b>32</b><code>095c65d</code><span>Add EntityManager to extract entities handling logic from MainGameScene</span></div>

# Un EntityManager

- Un manager = une responsabilité, ici les entités
- Plugin **de scène** : un par scène, `this.entityManager`
- La scène ne fait plus qu'assembler

<!--
src/managers/EntityManager.ts : initAndSpawnPlayer :41-53, initEnemies :55-79, initGroupCollisions :81-105, spawnEnemy :107-122.
Il émet PLAYER_SPAWNED_EVENT sur game.events (:50) : servira à l'UI au commit 33. Nouveau src/GameConstants.ts.
Les touches 1, 2, 3 passent dans Player (Player.ts:28-30).
Pourquoi pas de singleton : testabilité et maintenance (COURS.md, section Managers/Services).
-->

---
layout: part
label: Partie 2
sub: Une scène par écran, et une UI qui écoute le jeu
---

# Scènes et UI

---
class: commit-slide
---

<div class="commit"><b>33</b><code>ca42290</code><span>Display Player score and HP in a second scene for the UI</span></div>
<div class="tag live">Guidé</div>

# Une scène d'UI

- La logique **ne connaît pas l'UI** : elle émet, l'UI écoute
- `active: true` : lancée avec le jeu

<p class="docs">Docs : <a href="https://docs.phaser.io/phaser/concepts/scenes" target="_blank">Scenes</a>, <a href="https://docs.phaser.io/phaser/concepts/data-manager" target="_blank">Data Manager</a></p>

<!--
MainUIScene.ts:16-19 (init), :22-30 (create, bringToTop pour passer au-dessus du jeu), :32-42 (handlers).
Deux bus : game.events (global, PLAYER_SPAWNED_EVENT émis par EntityManager) et registry.events (game state).
La scène est ajoutée dans src/main.ts:34-37. Le console.log du score dans MainGameScene disparaît.
-->

---
class: commit-slide
---

<div class="commit"><b>34</b><code>3883063</code><span>Add Home and Game Over scenes</span></div>

# Accueil et game over

- `start` remplace la scène, `launch` en lance une **en parallèle**
- `event.repeat` ignoré


<!--
HomeScene.ts:14-22, GameOverScene.ts (stop MAIN_UI :10, ESPACE :25-31), MainGameScene.ts:68.
Pourquoi event.repeat : on tient ESPACE pour tirer quand le joueur meurt. Sans ce test, la répétition clavier de l'OS
déclenche keydown en boucle et l'écran de game over est passé aussitôt.
Clés de scène dans GameConstants.SceneKeys. MainUIScene n'est plus active: true : HomeScene la lance avec launch.
MainUIScene retire ses listeners au SHUTDOWN (MainUIScene.ts:20-23) : sinon ils s'empilent à chaque partie.
Fond du jeu passé en noir (#000) dans src/main.ts.
-->

---
class: commit-slide
---

<div class="commit"><b>35</b><code>6cd2d39</code><span>Add loading progress bar and preload all assets in HomeScene</span></div>

# Tout charger au début

- Tous les assets passent dans le `preload` de `HomeScene`
- `Loader.Events.PROGRESS` donne une valeur de 0 à 1
- Les autres scènes trouvent tout dans le cache

<!--
HomeScene.ts:9-38. Le preload de MainGameScene est supprimé.
Loader.Events.COMPLETE (:24-29) détruit la barre. En local tout charge trop vite : DevTools > Network > Slow 3G pour la voir.
-->

---
class: commit-slide
---

<div class="commit" style="margin-bottom: 2px"><b>36</b><code>0f4410a</code><span>Add font for main menu title</span></div>
<div class="commit"><b>37</b><code>d0e0cba</code><span>Use BitmapText in MainUIScene</span></div>

# Des polices

- 36 : une police TTF pour le titre, `load.font`
- 37 : `BitmapText` pour le HUD, des glyphes pris dans une image
- Score sur 6 chiffres avec `padStart`

<!--
Commit 36 : HomeScene.ts:36 et :41-42. Un Text classique est rendu dans un canvas puis envoyé en texture à chaque changement.
Commit 37 : MainUIScene.ts:27-38. BitmapText : chaque lettre est une frame d'une image (kenvector_future.png + .xml), rien à re-rendre. L'icône de vie : playerLife1_blue.png ajouté dans assets-src/sprites, puis npm run atlas.
Chargement : HomeScene.ts:36 (bitmapFont 'future-bmp'). MAX_SCORE_DIGITS = 6 dans GameConstants. Vies affichées « x3 » à côté d'une icône.
-->

---

# Bilan de la partie 2

- Une architecture proche du repo final : scènes, Entity + composants, managers, registry, sauvegarde
- La suite repart du commit 37
- Ensuite : game feel, publication, et comment coder avec un agent IA

<!--
Aperçu de la partie 3 : commits 38 à 44, puis la démo agent IA.
-->
