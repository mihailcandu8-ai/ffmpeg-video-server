const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));

app.post('/render', async (req, res) => {
  const { images, audio_url, output_name } = req.body;
  const tmpDir = `/tmp/${Date.now()}`;
  fs.mkdirSync(tmpDir);

  try {
    // Scarica audio
    execSync(`curl -L -o ${tmpDir}/audio.mp3 "${audio_url}"`);

    // Salva immagini da base64
    let fileList = '';
    for (let i = 0; i < images.length; i++) {
      const imgPath = `${tmpDir}/img_${i}.jpg`;
      const base64Data = images[i].base64.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
      fileList += `file '${imgPath}'\nduration ${images[i].duration}\n`;
    }
    fs.writeFileSync(`${tmpDir}/list.txt`, fileList);

    // Assembla video
    const outputPath = `${tmpDir}/output.mp4`;
    execSync(`ffmpeg -f concat -safe 0 -i ${tmpDir}/list.txt -i ${tmpDir}/audio.mp3 -c:v libx264 -c:a aac -shortest -y ${outputPath}`);

    res.download(outputPath, `${output_name}.mp4`, () => {
      fs.rmSync(tmpDir, { recursive: true });
    });
  } catch (err) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('FFmpeg server pronto'));
