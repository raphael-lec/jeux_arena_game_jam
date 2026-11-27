---
layout: chapter
logos: true
topics: game feel, CI et itch.io, git, agent IA
---

# Partie 3
## Polish, publication et agent IA

<!--
Commits 38 à 44 : game feel + CI/publication (pour que le TD puisse être publié).
Puis la présentation « coder avec un agent IA » avec démo live, les élèves regardent. Puis le reste de la semaine = TD.
-->

---
layout: part
label: Partie 3
sub: Ce qui rend un jeu agréable sans qu'on le remarque
---

# Game feel

<!--
Screen shake, flash, explosions, sons, freeze frame… Chaque commit de 38 à 42 ajoute un effet, en quelques lignes.
-->

---
class: commit-slide
---

<div class="commit"><b>38</b><code>2ce4ffc</code><span>Add camera shake effect on player damage</span></div>
<div class="tag live">Guidé</div>

# Secouer la caméra

- `shake(durée, intensité)` quand le joueur est touché
- Plus fort quand on percute un ennemi (0.03)
- Fond agrandi de 512 px : pas de bord noir pendant la secousse

<p class="docs">Docs : <a href="https://docs.phaser.io/phaser/concepts/cameras" target="_blank">Cameras</a></p>

<!--
EntityManager.ts:93 (balle ennemie, 0.01) et :105 (collision avec un ennemi, 0.03). Durée en ms, intensité en fraction de l'écran.
MainGameScene.ts:26-28 : le tileSprite est centré (origine 0.5 par défaut) et dépasse de 256 px de chaque côté.
Montrer la version sans marge : des bandes noires apparaissent pendant le shake.
-->

---
class: commit-slide
---

<div class="commit"><b>39</b><code>30d0030</code><span>Flash enemies white when they are hit</span></div>

# Flash blanc

- `setTintFill` blanc pendant 50 ms à chaque coup
- Body coupé tout de suite, `disable()` après le flash
- Ralenti pendant le flash : `deltaTime * 0.5`

<!--
Enemy.ts:23-40 (le code réel a des lignes vides en plus). Ralenti : Enemy.ts:103-106 (isTinted).
Le listener reste dans init(), comme au commit 29 : un ennemi du pool est réutilisé, init() ne passe qu'une fois.
Dans enable(), chaque réutilisation ajouterait un listener : au 10e retour, 10 flashs et 10 delayedCall par coup.
disableBody() sans arguments : l'ennemi reste visible pour le flash mais ne peut plus être touché ni toucher.
-->

---
class: commit-slide exercise
---

<div class="start">On part du commit <b>39</b> : <code>git go 39</code></div>
<div class="tag exo">Libre</div>

# Invulnérable un instant

<p class="goal">Après un coup, le joueur ne peut plus être touché pendant 50 ms.</p>

- Le joueur écoute déjà le changement de vie de son composant `Health`
- Désactivez son body Arcade, puis réactivez-le plus tard
- Un timer, comme celui qui fait apparaître les ennemis : `this.scene.time.delayedCall`

<p class="docs">Docs : <a href="https://docs.phaser.io/phaser/concepts/time" target="_blank">Time</a>, <a href="https://docs.phaser.io/phaser/concepts/physics/arcade" target="_blank">Arcade Physics</a></p>

<!--
Les élèves codent seuls, environ 10 min, sans regarder la suite.
La solution : arcadeBody.setEnable(false), puis delayedCall(50, ...) qui le réactive. 50 ms est court : faire tester 500 ms pour voir l'effet.
Après la solution, tout le monde repart du commit de la solution.
-->

---
class: commit-slide
---

<div class="commit"><b>40</b><code>bfc1cae</code><span>Make the player invulnerable for 50 ms after a hit</span></div>
<div class="tag sol">Solution</div>

# Invulnérable

- Après un coup, le body du joueur est coupé 50 ms
- Une fenêtre courte pour ne pas enchaîner les dégâts

<p class="next">Pour repartir de la solution : <code>git go 40</code></p>

<!--
Player.ts:47-53. Un overlap est testé à chaque frame : sans cette fenêtre, des balles qui arrivent coup sur coup retirent plusieurs vies d'affilée.
Au commit 41, on ajoute if (this.active) avant de réactiver : un joueur mort reste désactivé.
-->

---
class: commit-slide
---

<div class="commit"><b>41</b><code>d7aa67a</code><span>Add explosion when entity dies</span></div>
<div class="tag live">Guidé</div>

# Une explosion

- Une frame `star1` et deux **tweens** : échelle, puis transparence
- <span class="warn">1 s d'attente</span> avant le game over

<p class="docs">Docs : <a href="https://docs.phaser.io/phaser/concepts/tweens" target="_blank">Tweens</a></p>

<!--
Health.ts:50-70 : Health reçoit maintenant son entité (new Health(3, this)). Second tween sur alpha (:62-69), qui détruit l'image à la fin.
MainGameScene.ts:36-40 : sans le délai, endGame change de scène tout de suite et l'explosion du joueur n'est jamais visible.
On cache le joueur (disableBody(true, true)) et on laisse 1 s à l'explosion. Player.ts:50-53 : if (this.active) avant de réactiver le body.
Nouvelle frame star1 : star1.png à star3.png ajoutés dans assets-src/sprites, puis npm run atlas.
-->

---
class: commit-slide
---

<div class="commit"><b>42</b><code>1a3b137</code><span>Add audio fx when shooting</span></div>

# Du son

- Chargés avec le reste, dans `HomeScene`
- `sound.play` à chaque tir, un son par camp

<!--
HomeScene.ts:39-40, Player.ts:93, Enemy.ts:92 (sfx_laser2). Sons Kenney, format .ogg.
Les navigateurs bloquent l'audio avant une interaction : ici l'appui sur ESPACE dans HomeScene suffit, Phaser débloque le contexte audio.
Autres effets déjà dans le repo : shake, flash blanc, explosion en tween, R pour recommencer (MainGameScene).
-->

---
layout: part
label: Partie 3
sub: Une CI qui met le jeu en ligne, et le processus git du TD
---

# Publier

---
class: commit-slide
---

<div class="commit"><b>43</b><code>8b7bd31</code><span>Add github action to build and deploy to itch.io</span></div>

# Build et itch.io

- À chaque push sur `main` : build, déploiement
- <span class="warn">Sur un fork</span> : changez `ITCH_USER`

<!--
.github/workflows/main.yml : job build (:10-35) puis job deploy (:37-55), le dist/ passe de l'un à l'autre en artifact.
build-nolog (:28-29) : pas de ping de télémétrie log.js depuis la CI.
Le secret BUTLER_CREDENTIALS se crée dans Settings > Secrets and variables > Actions du repo. workflow_dispatch permet de relancer à la main.
Démo live si les secrets sont en place. Le commit 44 (f755def, Update docs : COURS.md, EVALUATION.md, README) n'a pas de slide.
-->

---

# Le processus git

- Une branche par feature, des **commits atomiques**, une **PR** avec review
- Jamais de commit sur `main`
- Avant chaque PR : build et playtest manuel

```bash
git switch -c feature/spread-shot
npm run build-nolog
git commit -m "Add spread shot to Weapon"
```

<div class="cp"><b>Pour le TD</b>Une branche feature, des commits atomiques, une PR ouverte en draft.</div>

<!--
Ressource : lien « atomic git commits » dans COURS.md.
L'historique de main qu'on vient de parcourir est l'exemple à suivre : un commit = une idée.
-->

---

# Le TD, le reste de la semaine

- Vous choisissez vos features (liste dans `COURS.md`) : vagues, power-ups, leaderboard, niveaux en JSON, manette…
- **Règle** : avant d'ajouter de nouveaux ennemis, faites l'**évaluation** (`EVALUATION.md`, branche `eval`)
- Agents IA autorisés pendant le TD, avec le workflow qu'on va voir

<div class="cp"><b>Pour le TD</b>Une feature choisie, une issue GitHub, une branche, un plan en 3 lignes.</div>

---
layout: part
label: Partie 3
sub: Comment on fait, à appliquer pendant le TD si vous voulez
---

# Coder avec un agent IA

---

# Pourquoi les skills comptent

- Un agent suit des **règles écrites** : les skills de l'outil (`SKILL.md`) et la doc du repo
- La qualité du code généré dépend de la qualité des skills et de la doc
- On ne « prompte » pas mieux : on **documente** mieux le projet

<!--
Démo : montrer un SKILL.md et la doc du repo.
Une bonne doc = un agent qui respecte Entity/Component, le pooling, la séparation UI.
-->

---

# D'abord un tech plan, ensuite le code

- On demande un plan **sans code** : approche, fichiers touchés, étapes de commit, vérification, risques, questions
- On relit, on répond aux questions, on fait corriger le plan
- Seulement quand il est bon : « implémente ce plan, une étape à la fois »

```text
Lis README.md, COURS.md et src/. Je veux un power-up « soin +1 PV »,
lâché par 1 ennemi sur 5. N'écris pas encore de code : propose un
tech plan (approche, fichiers, étapes de commit, vérification, risques).
```

<p class="note">Astuce : pour un changement complexe, demandez aussi un schéma du flux (logique, données) en Mermaid pour comprendre ce que l'agent propose.</p>

<!--
Corriger un plan de 40 lignes prend quelques minutes, corriger 300 lignes de code partis dans la mauvaise direction prend l'après-midi.
Le plan oblige l'agent à lire le code avant d'écrire, rend visibles ses choix (ce qu'il réutilise, ce qu'il invente) et fait remonter
les questions qu'il trancherait sinon tout seul. Le plan validé devient le découpage en commits et la description de la PR.
-->

---
layout: split
---

# Un tech plan, en vrai

- Il cite le code existant à réutiliser
- Il découpe en commits testables
- Il pose ses questions au lieu de deviner

::right::

<div class="file">tech plan (extrait)</div>

```md
## Approche
1. Données : powerUps.json + type PowerUpData,
   chargé dans HomeScene.preload
2. Entité PowerUp (Entity + Movement), poolée,
   listeners posés dans init()
3. EntityManager : spawn à la mort d'un ennemi,
   overlap joueur → Health.heal(amount)

## Étapes (un commit chacune)
1. Sprite + données
2. Entité et pool
3. Chance de drop et soin

## Questions
- Le soin peut-il dépasser 3 PV ? Je propose non.
```

<!--
Ce que l'humain vérifie avant de dire « implémente » : les patterns du cours sont respectés (Entity/composants, pooling avec reset,
JSON typé, UI découplée), rien de réinventé (Health.heal existe, l'UI écoute déjà la vie), étapes petites et testables,
questions ouvertes tranchées. Ce qui est faux ou manque : on le dit à l'agent, il met le plan à jour, on relit encore.
-->

---

# La boucle de vérification

- L'agent peut **se vérifier lui-même** : build, lancer le jeu, prendre une capture, jouer
- prompt → agent → build et playtest → correction → on recommence
- L'humain vérifie toujours à la fin

```bash
npm run build-nolog && npm run dev-nolog
```

<!--
Démo live : l'agent lance le dev server, ouvre le jeu dans un navigateur, voit un bug visuel, corrige, relance.
-->

---

# Draft PR, review, affiner

- La PR s'ouvre en **draft** : un humain la relit
- Si le code ne va pas : on **améliore les skills et la doc**, puis on relance l'agent
- Jamais de merge sans review ni tests

<!--
Démo : PR draft, commentaires de review, on met à jour SKILL.md ou la doc du repo dans la branche,
on relance l'agent, nouvelle itération, la PR sort de draft quand la review est OK.
-->

---

# Si vous l'utilisez pendant le TD

- Facultatif, n'importe quel agent
- Une branche feature dédiée, jamais `main`, pas de secrets dans les prompts
- Tech plan d'abord, PR en draft, review humaine avant de merger
- Le code généré reste **votre** responsabilité


---

# Bilan

- Le cours : boucle de jeu, scènes, 3C, assets et JSON, pooling, Entity/Component, registry et sauvegarde, UI, game feel, CI, git, agent IA
- TD : vos features, publiées sur itch.io
- **Évaluation** : branche `eval` depuis `main`, rendu en PR avec votre tech plan, consignes dans `EVALUATION.md`

<!--
Évaluation : nouvel ennemi sinusoïdal + spread shot + config JSON + visuel différent (setTint).
-->
