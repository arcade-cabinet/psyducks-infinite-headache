import fs from 'node:fs';

async function generateIcon(size, filename) {
  try {
    const { createCanvas } = await import('canvas');
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#4A148C';
    ctx.fillRect(0, 0, size, size);
    
    // Psyduck body (simplified)
    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.36, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size*0.4, size*0.42, size*0.06, 0, Math.PI * 2);
    ctx.arc(size*0.6, size*0.42, size*0.06, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(size*0.4, size*0.42, size*0.025, 0, Math.PI * 2);
    ctx.arc(size*0.6, size*0.42, size*0.025, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = '#FFE082';
    ctx.beginPath();
    ctx.ellipse(size/2, size*0.56, size*0.12, size*0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
  } catch (error) {
    console.error('Error generating icons:', error.message);
    console.log('Canvas module not available. Using SVG placeholders instead.');
  }
}

try {
  await generateIcon(192, 'icon-192x192.png');
  await generateIcon(512, 'icon-512x512.png');
  console.log('Icons generated successfully!');
} catch (error) {
  console.error('Failed to generate icons:', error);
}
