import { openUrl } from '@tauri-apps/plugin-opener'

import { isDesktopRuntime } from '@/services/desktop'

/**
 * 打开外部链接。
 *
 * 桌面端交给系统默认处理器（http/https/mailto 等），
 * 浏览器预览环境退化为在新标签页中打开。
 *
 * @param url 需要打开的目标地址
 * @throws 桌面端打开失败时向上抛出，由调用方决定如何提示用户
 */
export async function openExternalLink(url: string): Promise<void> {
  if (isDesktopRuntime()) {
    await openUrl(url)
    return
  }

  window.open(url, '_blank', 'noopener')
}
