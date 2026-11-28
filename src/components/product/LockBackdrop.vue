<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import lockEyeBg from '../../../assets/images/lock/lock-eye.jpg'
import lockGazeBg from '../../../assets/images/lock/lock-gaze.jpg'
import lockNeckBg from '../../../assets/images/lock/lock-neck.jpg'
import lockStretchBg from '../../../assets/images/lock/lock-stretch.jpg'
import lockTwistBg from '../../../assets/images/lock/lock-twist.jpg'
import lockWalkBg from '../../../assets/images/lock/lock-walk.jpg'

/** 锁屏线稿场景：远眺 / 伸懒腰 / 肩颈拉伸 / 眼保健操 / 走动 / 侧弯腰 */
const SCENES = [lockGazeBg, lockStretchBg, lockNeckBg, lockEyeBg, lockWalkBg, lockTwistBg]
const STORAGE_KEY = 'breakly:lock-bg-index'
/** 场景切换间隔，配合 CSS 的长交叉淡入，避免频繁跳动 */
const ROTATE_MS = 14_000

const index = ref(0)
const leftScene = computed(() => SCENES[(index.value + 1) % SCENES.length])
const rightScene = computed(() => SCENES[index.value])

let timer: number | undefined

/** 每次打开锁屏页顺延一个场景，避免连续提醒总是同一张。 */
function nextSceneIndex(): number {
  try {
    const stored = Number.parseInt(window.localStorage.getItem(STORAGE_KEY) ?? '0', 10)
    const current = Number.isFinite(stored) && stored >= 0 ? stored : 0
    window.localStorage.setItem(STORAGE_KEY, String((current + 1) % SCENES.length))
    return current % SCENES.length
  } catch {
    return 0
  }
}

onMounted(() => {
  index.value = nextSceneIndex()
  timer = window.setInterval(() => {
    index.value = (index.value + 1) % SCENES.length
  }, ROTATE_MS)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  timer = undefined
})
</script>

<template>
  <div class="lock-backdrop lock-backdrop--left" aria-hidden="true">
    <Transition name="lock-flow">
      <div :key="leftScene" class="lock-scene">
        <div class="lock-backdrop-art" :style="{ backgroundImage: `url(${leftScene})` }" />
      </div>
    </Transition>
  </div>
  <div class="lock-backdrop lock-backdrop--right" aria-hidden="true">
    <Transition name="lock-flow">
      <div :key="rightScene" class="lock-scene">
        <div class="lock-backdrop-art" :style="{ backgroundImage: `url(${rightScene})` }" />
      </div>
    </Transition>
  </div>
</template>
