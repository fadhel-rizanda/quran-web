const fs = require('fs');
const path = require('path');
const https = require('https');

const publicFontsDir = path.join(__dirname, '..', 'public', 'fonts');
const srcConstantsDir = path.join(__dirname, '..', 'src', 'constants');

if (!fs.existsSync(publicFontsDir)) {
  fs.mkdirSync(publicFontsDir, { recursive: true });
}
if (!fs.existsSync(srcConstantsDir)) {
  fs.mkdirSync(srcConstantsDir, { recursive: true });
}

const fonts = [
  {
    name: 'ScheherazadeNew-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/scheherazadenew/ScheherazadeNew-Regular.ttf'
  },
  {
    name: 'ScheherazadeNew-Bold.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/scheherazadenew/ScheherazadeNew-Bold.ttf'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function fetchSurahs() {
  return new Promise((resolve, reject) => {
    https.get('https://api.alquran.cloud/v1/surah', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code === 200 && parsed.status === 'OK') {
            resolve(parsed.data);
          } else {
            reject(new Error(`API responded with code ${parsed.code}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading fonts to public/fonts...');
  for (const font of fonts) {
    const dest = path.join(publicFontsDir, font.name);
    console.log(`Downloading ${font.name}...`);
    try {
      await downloadFile(font.url, dest);
      console.log(`Successfully downloaded ${font.name}`);
    } catch (err) {
      console.error(`Error downloading ${font.name}:`, err.message);
    }
  }

  console.log('Fetching surah list from Al-Quran Cloud...');
  const targetSurahPath = path.join(srcConstantsDir, 'surahList.ts');
  try {
    const surahs = await fetchSurahs();
    console.log(`Fetched ${surahs.length} surahs. Generating ${targetSurahPath}...`);
    const code = `// This file is auto-generated. Do not edit manually.
export interface SurahMetadata {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export const SURAH_LIST: SurahMetadata[] = ${JSON.stringify(surahs, null, 2)};
`;
    fs.writeFileSync(targetSurahPath, code, 'utf8');
    console.log('Successfully generated surah list!');
  } catch (error) {
    console.error('Error fetching surahs:', error.message);
  }
  console.log('Setup assets complete!');
}

run();
