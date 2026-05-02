const express = require('express');
const { spawnSync } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json({ limit: '500mb' }));

app.post('/render', (req, res) => {
  const { images, audio_url, output_name } = req.body;
  const tmpDir = `/tmp/${Date.now()}`;
  fs.mkdirSync(tmpDir);

  try {
    // Scarica audio
    const audioPath = `${tmpDir}/audio.mp3`;
    spawnSync('curl', ['-L', '-o', audioPath, audio_url]);

    // Salva immagini da base64
    let fileList = '';
    for (let i = 0; i < images.length; i++) {
      const imgPath = `${tmpDir}/img_${i}.jpg`;
      const base64 = images[i].base64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(imgPath, Buffer.from(base64, 'base64'));
      fileList += `file '${imgPath}'\nduration ${images[i].duration}\n`;
    }
    
    const listPath = `${tmpDir}/list.txt`;
    fs.writeFileSync(listPath, fileList);

    const outputPath = `${tmpDir}/output.mp4`;
    
    const ffmpeg = spawnSync('ffmpeg', [
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-shortest',
      '-y',
      outputPath
    ]);

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ 
        error: ffmpeg.stderr.toString() 
      });
    }

    res.download(outputPath, `${output_name}.mp4`, () => {
      fs.rmSync(tmpDir, { recursive: true });
    });

  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('FFmpeg server pronto'));
