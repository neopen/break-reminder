<template>
  <svg class="brand-logo" viewBox="0 0 32 32" role="img" aria-label="别坐了 Breakly">
    <defs>
      <linearGradient id="brand-logo-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#8b7cff" />
        <stop offset="100%" stop-color="#38bdf8" />
      </linearGradient>
    </defs>

    <rect width="32" height="32" rx="9.5" fill="url(#brand-logo-gradient)" />

    <!-- 有缺口的时间环：提醒到点、打破久坐循环 -->
    <circle
      cx="16"
      cy="16"
      r="10.4"
      fill="none"
      stroke="rgba(255, 255, 255, 0.42)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-dasharray="52 13"
      transform="rotate(-90 16 16)"
    />

    <!-- 起身伸展的小人 -->
    <circle cx="16" cy="10.1" r="2.2" fill="#fff" />
    <path d="M16 12.8v5.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round" />
    <path
      d="M16 14.1 11.6 11.2M16 14.1l4.4-2.9"
      stroke="#fff"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M16 18.2 13.4 22.7M16 18.2l2.6 4.5"
      stroke="#fff"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.brand-logo {
  flex: none;
  width: 24px;
  height: 24px;
  filter: drop-shadow(0 0 10px rgba(124, 92, 255, 0.55));
}
</style>
