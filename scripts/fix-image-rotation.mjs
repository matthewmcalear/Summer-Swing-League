import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { renameSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function fixImageRotation(filename) {
  const input  = join(__dirname, `../public/${filename}`)
  const tmp    = join(__dirname, `../public/${filename}_fixed.jpeg`)
  
  await sharp(input)
    .rotate()   // auto-rotate based on EXIF orientation
    .toFile(tmp)
  
  renameSync(tmp, input)
  console.log(`Done — ${filename} has been physically rotated and EXIF orientation stripped.`)
}

// Fix both hero and incident images
await fixImageRotation('IMG_1002.jpeg')
await fixImageRotation('IMG_4202.jpeg')
