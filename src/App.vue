<script setup lang="ts">
import InlineAlert from '@/components/InlineAlert.vue'
import KeyboardCard from '@/components/features/KeyboardCard.vue'
import LockTestCard from '@/components/features/LockTestCard.vue'
import SystemIntegrationCard from '@/components/features/SystemIntegrationCard.vue'
import UpdateCard from '@/components/features/UpdateCard.vue'
import StatusPill from '@/components/StatusPill.vue'
import { useRuntimeStatus } from '@/composables/useRuntimeStatus'

const { desktop, version, platformLabel } = useRuntimeStatus()
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <p class="hero__eyebrow">Tauri 2 · Vue 3 · TypeScript</p>
      <h1 class="hero__title">别坐了</h1>
      <p class="hero__subtitle">健康提醒桌面应用 · Tauri 2 技术底座</p>
      <div class="hero__meta">
        <StatusPill
          :tone="desktop ? 'ok' : 'warn'"
          :label="desktop ? '桌面运行时' : '浏览器预览'"
        />
        <span class="hero__version">v{{ version }} · {{ platformLabel }}</span>
      </div>
    </header>

    <InlineAlert
      v-if="!desktop"
      tone="warn"
      message="当前在普通浏览器中运行，原生能力已禁用。请使用 npm run tauri dev 启动 Tauri。"
    />

    <section class="grid">
      <LockTestCard />
      <KeyboardCard />
      <SystemIntegrationCard />
      <UpdateCard />
    </section>

    <footer class="footer">
      <p>核心能力：托盘 · 单实例 · 全屏置顶遮罩 · 全局键盘拦截 · 自动更新</p>
      <p class="hc-muted">
        Ctrl+Alt+Del、Win+L 属于系统安全序列，任何桌面框架都无法拦截；锁屏遮罩定位为习惯养成工具。
      </p>
    </footer>
  </main>
</template>

<style scoped>
.app-shell {
  width: min(960px, 100%);
  margin: 0 auto;
  padding: var(--hc-space-6) var(--hc-space-5) var(--hc-space-7);
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-5);
}

.hero {
  position: relative;
  overflow: hidden;
  padding: var(--hc-space-6);
  color: #fff;
  background: var(--hc-gradient-brand);
  border-radius: var(--hc-radius-xl);
  box-shadow: var(--hc-shadow-card);
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto -60px -120px auto;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
}

.hero__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.82;
}

.hero__title {
  margin-top: var(--hc-space-2);
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.hero__subtitle {
  margin-top: var(--hc-space-1);
  font-size: 14px;
  opacity: 0.9;
}

.hero__meta {
  display: flex;
  align-items: center;
  gap: var(--hc-space-3);
  margin-top: var(--hc-space-4);
}

.hero__version {
  font-size: 13px;
  opacity: 0.85;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--hc-space-4);
}

.footer {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-1);
  padding-top: var(--hc-space-2);
  font-size: 12px;
  color: var(--hc-color-text-muted);
  text-align: center;
}
</style>
