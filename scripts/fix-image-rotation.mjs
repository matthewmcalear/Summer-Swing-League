import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { renameSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const input  = join(__dirname, '../public/IMG_1002.jpeg')
const tmp    = join(__dirname, '../public/IMG_1002_fixed.jpeg')

await sharp(input)
  .rotate()   // auto-rotate based on EXIF orientation
  .toFile(tmp)

renameSync(tmp, input)
console.log('Done — IMG_1002.jpeg has been physically rotated and EXIF orientation stripped.')
