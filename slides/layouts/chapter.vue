<script setup lang="ts">
defineProps<{ frontmatter: Record<string, any> }>()
</script>

<template>
  <div class="slidev-layout layout-chapter">
    <div v-if="frontmatter.logos" class="chapter-logos">
      <img src="/img/phaser.png" alt="Phaser" class="logo-phaser" />
      <img src="/img/typescript.svg" alt="TypeScript" class="logo-ts" />
    </div>
    <div class="chapter-label">coda-shmup</div>
    <slot />
    <div v-if="frontmatter.topics" class="chapter-topics">{{ frontmatter.topics }}</div>
  </div>
</template>
