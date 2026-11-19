/**
 * 生成提醒音效（WAV，16-bit PCM 单声道）。
 * 产物：assets/audio/alert.wav，用于验证 WebView 自动播放策略。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(appRoot, 'assets/audio/alert.wav')

const sampleRate = 22050
const durationSeconds = 0.95
const totalSamples = Math.floor(sampleRate * durationSeconds)
const samples = new Float64Array(totalSamples)

function addTone(startSeconds, lengthSeconds, frequency, gain) {
  const start = Math.floor(startSeconds * sampleRate)
  const count = Math.floor(lengthSeconds * sampleRate)

  for (let index = 0; index < count && start + index < totalSamples; index += 1) {
    const time = index / sampleRate
    const attack = Math.min(1, time / 0.008)
    const decay = Math.exp(-3.2 * (time / lengthSeconds))
    const wave =
      Math.sin(2 * Math.PI * frequency * time) * 0.85 +
      Math.sin(4 * Math.PI * frequency * time) * 0.15

    samples[start + index] += wave * attack * decay * gain
  }
}

addTone(0, 0.28, 880, 0.32)
addTone(0.26, 0.5, 1174.66, 0.3)
addTone(0.56, 0.34, 880, 0.18)

// 尾部淡出，避免爆音
const fadeSamples = Math.floor(sampleRate * 0.05)
for (let index = 0; index < fadeSamples; index += 1) {
  const position = totalSamples - fadeSamples + index
  if (position >= 0) samples[position] *= 1 - index / fadeSamples
}

const dataSize = totalSamples * 2
const buffer = Buffer.alloc(44 + dataSize)

buffer.write('RIFF', 0)
buffer.writeUInt32LE(36 + dataSize, 4)
buffer.write('WAVE', 8)
buffer.write('fmt ', 12)
buffer.writeUInt32LE(16, 16)
buffer.writeUInt16LE(1, 20) // PCM
buffer.writeUInt16LE(1, 22) // mono
buffer.writeUInt32LE(sampleRate, 24)
buffer.writeUInt32LE(sampleRate * 2, 28) // byte rate
buffer.writeUInt16LE(2, 32) // block align
buffer.writeUInt16LE(16, 34) // bits per sample
buffer.write('data', 36)
buffer.writeUInt32LE(dataSize, 40)

for (let index = 0; index < totalSamples; index += 1) {
  const clamped = Math.max(-1, Math.min(1, samples[index]))
  buffer.writeInt16LE(Math.round(clamped * 32767), 44 + index * 2)
}

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, buffer)
console.log(`[audio] 已生成 ${outputPath}（${(buffer.length / 1024).toFixed(1)} KB）`)
