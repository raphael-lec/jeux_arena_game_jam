<script setup lang="ts">
defineProps<{ frontmatter: Record<string, any> }>()
</script>

<template>
  <div class="slidev-layout layout-part">
    <div class="part-label">{{ frontmatter.label }}</div>
    <slot />
    <p v-if="frontmatter.sub" class="part-sub">{{ frontmatter.sub }}</p>
  </div>
</template>
