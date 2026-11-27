<script setup lang="ts">
import { useNav } from '@slidev/client'

const { currentPage, total } = useNav()
</script>

<template>
  <div v-if="currentPage > 1" class="deck-footer">
    <span>coda-shmup</span>
    <a href="https://docs.phaser.io/api-documentation/api-documentation" target="_blank">docs.phaser.io</a>
    <span>{{ currentPage }} / {{ total }}</span>
  </div>
</template>
