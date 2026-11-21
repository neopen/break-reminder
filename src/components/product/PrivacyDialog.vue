<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import GlassDialog from '@/components/ui/GlassDialog.vue'
import { useToast } from '@/composables/useToast'
import { describeError } from '@/utils/error'
import { openExternalLink } from '@/utils/openExternal'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const { show } = useToast()

const EFFECTIVE_DATE = '2026-11-21'
const CONTACT_EMAIL = 'helpenx@gmail.com'

async function openContact(): Promise<void> {
  try {
    await openExternalLink(`mailto:${CONTACT_EMAIL}`)
  } catch (cause) {
    show(`打开邮件客户端失败：${describeError(cause)}`, 'danger')
  }
}
</script>

<template>
  <GlassDialog
    :open="open"
    title="隐私政策"
    subtitle="Breakly · 别坐了"
    icon="🔐"
    wide
    @update:open="emit('update:open', $event)"
  >
    <article class="policy">
      <p class="policy__lead">
        感谢使用 Breakly（别坐了）。本政策说明应用在你使用过程中如何处理信息。核心原则很简单：
        <strong>你的设置和打卡数据只保存在本机，我们不会收集或上传。</strong>
      </p>

      <section>
        <h3>1. 我们处理的信息</h3>
        <p>应用仅在本机处理以下数据，用于提供提醒与统计功能：</p>
        <ul>
          <li>提醒设置：提醒间隔、休息时长、工作时段、免打扰时段、提醒方式、声音开关等；</li>
          <li>活动统计：每日与每周的活动次数、连续打卡天数；</li>
          <li>系统偏好：开机启动、自启动提醒、系统锁屏等开关状态。</li>
        </ul>
        <p>
          我们<strong>不收集</strong>姓名、账号、手机号、位置、通讯录、剪贴板、设备标识、使用行为分析或任何可识别个人身份的信息，也不包含广告或第三方统计
          SDK。
        </p>
      </section>

      <section>
        <h3>2. 数据存储与删除</h3>
        <p>
          上述数据保存在你电脑的本地应用数据目录（<code>config.json</code> 与
          <code>stats.json</code
          >），不会同步到云端。卸载应用或手动清除应用数据后，相关记录即被删除。
        </p>
      </section>

      <section>
        <h3>3. 网络访问</h3>
        <p>应用仅在以下场景访问网络，且不会附带你的设置或打卡数据：</p>
        <ul>
          <li>检查更新：访问 GitHub Releases 获取版本信息；</li>
          <li>在线反馈、关于我们、在线工具：通过系统默认浏览器打开对应网页；</li>
          <li>发送邮件：调用系统默认邮件客户端，邮件内容由你自行决定。</li>
        </ul>
      </section>

      <section>
        <h3>4. 系统权限</h3>
        <ul>
          <li>通知：仅在桌面通知模式下请求，用于弹出休息提醒；</li>
          <li>开机启动：可在「系统与统计」中随时关闭；</li>
          <li>全局键盘拦截：仅在锁屏休息窗口期间启用，用于防止跳过强制休息；</li>
          <li>系统锁屏：仅在你开启「系统锁屏」后，于休息结束时调用系统锁屏。</li>
        </ul>
        <p>所有权限均只在对应功能启用时使用。</p>
      </section>

      <section>
        <h3>5. 第三方服务</h3>
        <p>
          应用可能通过 GitHub
          提供版本更新与问题反馈，通过系统通知服务展示提醒，通过系统邮件客户端发送反馈。这些服务由相应提供方运营，适用其各自的隐私政策。
        </p>
      </section>

      <section>
        <h3>6. 数据安全</h3>
        <p>
          数据保存在本机，应用不会建立云端账户。请妥善保护你的系统账户与设备安全；共享电脑上的本地数据可能被其他使用者看到。
        </p>
      </section>

      <section>
        <h3>7. 未成年人</h3>
        <p>本应用不面向未成年人单独收集个人信息，也不会主动收集任何个人身份信息。</p>
      </section>

      <section>
        <h3>8. 政策更新</h3>
        <p>
          隐私政策可能随功能更新而调整。重大变更会通过应用版本说明或在应用内提示。继续使用即表示你接受更新后的政策。
        </p>
      </section>

      <section>
        <h3>9. 联系我们</h3>
        <p>
          如对本政策有任何疑问，可通过邮件
          <button type="button" class="policy__link" @click="openContact">
            {{ CONTACT_EMAIL }}
          </button>
          或应用底部「功能反馈」与我们联系。
        </p>
      </section>

      <p class="policy__date">生效日期：{{ EFFECTIVE_DATE }}</p>
    </article>

    <template #footer>
      <AppButton variant="secondary" block @click="emit('update:open', false)">
        我知道了
      </AppButton>
    </template>
  </GlassDialog>
</template>

<style scoped>
.policy {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-4);
  font-size: 12px;
  line-height: 1.75;
  color: #a9b0d4;
}

.policy__lead {
  padding-bottom: var(--hc-space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #c7cdf0;
}

.policy strong {
  color: #eef2ff;
  font-weight: 600;
}

.policy h3 {
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #eef2ff;
}

.policy p + p {
  margin-top: 6px;
}

.policy ul {
  margin: 4px 0 0;
  padding-left: 18px;
}

.policy li {
  margin-top: 2px;
}

.policy li::marker {
  color: #8b7cff;
}

.policy__link {
  padding: 0;
  font-size: inherit;
  color: #c4b5fd;
  background: none;
  border: none;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.policy__link:hover {
  color: #e9d5ff;
}

.policy code {
  padding: 1px 5px;
  font-size: 11px;
  color: #c4b5fd;
  background: rgba(124, 92, 255, 0.14);
  border-radius: 5px;
}

.policy__date {
  padding-top: var(--hc-space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: #8d94bd;
}
</style>
