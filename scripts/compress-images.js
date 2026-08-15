#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function compressImage(inputPath, outputPath, targetSizeKB = 400, maxWidth = 1920) {
  console.log(`Compressing ${inputPath}...`);
  
  const originalStats = fs.statSync(inputPath);
  console.log(`  Original size: ${(originalStats.size / 1024).toFixed(0)}KB`);
  
  const metadata = await sharp(inputPath).metadata();
  console.log(`  Original dimensions: ${metadata.width}x${metadata.height}`);
  
  // Resize to max width while preserving aspect ratio
  // Apply EXIF rotation BEFORE resize to prevent orientation issues
  const resized = sharp(inputPath)
    .rotate() // Auto-orient from EXIF before resize
    .resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: 'inside',
    });
  
  // Start with quality 75 and adjust down if needed
  let quality = 75;
  let compressed;
  
  while (quality >= 40) {
    compressed = await resized
      .jpeg({
        quality,
        mozjpeg: true,
      })
      .toBuffer();
    
    const sizeKB = compressed.length / 1024;
    console.log(`  Quality ${quality}: ${sizeKB.toFixed(0)}KB`);
    
    if (sizeKB <= targetSizeKB || quality === 40) {
      break;
    }
    
    quality -= 5;
  }
  
  await sharp(compressed).toFile(outputPath);
  
  const finalStats = fs.statSync(outputPath);
  const finalMeta = await sharp(outputPath).metadata();
  console.log(`  Final dimensions: ${finalMeta.width}x${finalMeta.height}`);
  console.log(`  Final size: ${(finalStats.size / 1024).toFixed(0)}KB (${((1 - finalStats.size / originalStats.size) * 100).toFixed(1)}% reduction)`);
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Restore originals from git before compressing
  console.log('Restoring original images from git...\n');
  require('child_process').execSync('git checkout HEAD -- public/IMG_1002.jpeg public/IMG_4202.jpeg', { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit' 
  });
  
  await compressImage(
    path.join(publicDir, 'IMG_1002.jpeg'),
    path.join(publicDir, 'IMG_1002.jpeg'),
    400,
    1400
  );
  
  await compressImage(
    path.join(publicDir, 'IMG_4202.jpeg'),
    path.join(publicDir, 'IMG_4202.jpeg'),
    400,
    1400
  );
  
  console.log('\nCompression complete!');
}

main().catch(console.error);
