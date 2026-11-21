<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import AboutBar from '@/components/product/AboutBar.vue'
import MainOrb from '@/components/product/MainOrb.vue'
import StatusPill from '@/components/StatusPill.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ParameterSheet from '@/components/ui/ParameterSheet.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useAppStore } from '@/stores/app'
import type { ParameterKind } from '@/types/ui'

const store = useAppStore()
const { scheduler, stats, statusLabel } = storeToRefs(store)

const activeSheet = ref<ParameterKind | null>(null)

function openSheet(kind: ParameterKind): void {
  activeSheet.value = kind
}

onMounted(() => {
  void store.init()
})
</script>

<template>
  <main class="app-shell">
    <div class="aurora" aria-hidden="true">
      <span class="aurora__blob aurora__blob--violet" />
      <span class="aurora__blob aurora__blob--blue" />
      <span class="aurora__blob aurora__blob--green" />
    </div>

    <div class="app-content">
      <header class="topbar">
        <div class="topbar__brand">
          <span class="topbar__logo" aria-hidden="true" />
          <span class="topbar__name">Breakly</span>
          <StatusPill
            :tone="scheduler.running ? 'ok' : 'off'"
            :label="statusLabel"
            :pulse="scheduler.running"
          />
          <span
            v-if="!store.desktop"
            class="topbar__preview"
            title="浏览器预览，数据仅保存在内存中"
          >
            预览
          </span>
        </div>

        <div class="topbar__meta">
          <button type="button" class="metric" @click="openSheet('system')">
            <span>今日</span>
            <strong
              >{{ stats.todayCount }}<small>/{{ stats.dailyTarget }}</small></strong
            >
          </button>
          <button type="button" class="metric" @click="openSheet('system')">
            <span>连续</span>
            <strong>{{ stats.continuousDays }}<small>天</small></strong>
          </button>
          <button
            type="button"
            class="gear"
            aria-label="系统与统计"
            title="系统与统计"
            @click="openSheet('system')"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3.1" />
              <path
                d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"
              />
            </svg>
          </button>
        </div>
      </header>

      <MainOrb @open-settings="openSheet" />

      <AboutBar />
    </div>
  </main>

  <ParameterSheet :kind="activeSheet" @close="activeSheet = null" />
  <ConfirmDialog />
  <ToastHost />
</template>

<style scoped>
.app-shell {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 18px 20px 14px;
  overflow: hidden;
  color: #eef2ff;
  background: #0a0d1b;

  /* 主界面统一深色令牌，供页脚等子组件复用 */
  --hc-color-text: #eef2ff;
  --hc-color-text-muted: #c7cdf0;
  --hc-color-text-faint: #8d94bd;
  --hc-color-surface: #161a30;
  --hc-color-surface-soft: rgba(255, 255, 255, 0.06);
  --hc-color-border: rgba(255, 255, 255, 0.1);
  --hc-color-brand-deep: #c4b5fd;
}

.app-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-3);
  width: 100%;
  max-width: 600px;
  min-height: calc(100vh - 32px);
  margin: 0 auto;
}

/* ---------- 背景极光 ---------- */
.aurora {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 18%, rgba(124, 92, 255, 0.12), transparent 46%),
    radial-gradient(circle at 80% 100%, rgba(56, 189, 248, 0.08), transparent 42%),
    linear-gradient(160deg, #0b0e1f 0%, #080b16 55%, #0b0f1e 100%);
}

.aurora::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, transparent 42%, rgba(2, 4, 10, 0.55) 100%);
}

.aurora__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.6;
  animation: aurora-drift 20s ease-in-out infinite alternate;
}

.aurora__blob--violet {
  top: -140px;
  left: -90px;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(124, 92, 255, 0.6), transparent 70%);
}

.aurora__blob--blue {
  top: 24%;
  right: -160px;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.35), transparent 70%);
  animation-delay: -7s;
}

.aurora__blob--green {
  bottom: -180px;
  left: 16%;
  width: 440px;
  height: 440px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.2), transparent 70%);
  animation-delay: -13s;
}

@keyframes aurora-drift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(18px, -22px, 0) scale(1.06);
  }
  100% {
    transform: translate3d(-14px, 16px, 0) scale(0.97);
  }
}

/* ---------- 顶部栏 ---------- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
  padding: 2px 2px 0;
}

.topbar__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.topbar__logo {
  flex: none;
  width: 22px;
  height: 22px;
  background:
    radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.9), transparent 32%),
    var(--hc-gradient-brand);
  border-radius: 8px;
  box-shadow: 0 0 18px rgba(124, 92, 255, 0.55);
}

.topbar__name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.topbar__preview {
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.24);
  border-radius: var(--hc-radius-pill);
}

.topbar :deep(.status-pill) {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 500;
}

.topbar :deep(.status-pill--ok) {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.14);
}

.topbar :deep(.status-pill--off) {
  color: #a5b4fc;
  background: rgba(129, 140, 248, 0.14);
}

.topbar__meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 9px;
  font-size: 10px;
  color: var(--hc-color-text-faint);
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: var(--hc-radius-pill);
  transition:
    background var(--hc-duration-fast) var(--hc-ease),
    border-color var(--hc-duration-fast) var(--hc-ease);
}

.metric:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(167, 139, 250, 0.4);
}

.metric strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--hc-color-text);
  font-variant-numeric: tabular-nums;
}

.metric small {
  font-size: 9px;
  font-weight: 500;
  color: var(--hc-color-text-faint);
}

.gear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-left: 2px;
  color: var(--hc-color-text-faint);
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
  transition:
    color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease),
    transform var(--hc-duration-normal) var(--hc-ease);
}

.gear:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.09);
  transform: rotate(45deg);
}

@media (max-width: 580px) {
  .app-shell {
    padding: 16px 16px 12px;
  }

  .topbar {
    flex-wrap: wrap;
  }
}
</style>
