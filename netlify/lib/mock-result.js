// Canned /api/identify responses used when MOCK_IDENTIFY is set.
// Shape matches the real response: { confidence, candidates, info }.
// Each candidate: { scientificName, commonName, score, images: [reference photo URLs] }.

// Info for every mock candidate, so 「就是 X」 works for each one.
export const mockInfo = {
  'Bougainvillea spectabilis': {
    commonName: '九重葛',
    aliases: ['三角梅', '紙花', '葉子花'],
    scientificName: 'Bougainvillea spectabilis',
    family: '紫茉莉科・九重葛屬',
    floweringSeason: '幾乎全年可見，秋冬到春天最盛',
    origin: '南美洲（巴西）',
    howToRecognize:
      '我們看到的鮮豔「花瓣」其實是三片薄薄的苞片，像紙一樣。真正的花在苞片中間，是三朵小小的白色管狀花。枝條上有尖刺，常常爬滿圍牆或棚架。',
    flowerMeaning: '熱情、堅韌，代表努力不懈、越挫越勇的精神。',
    careTips:
      '喜歡大太陽，每天最好曬六小時以上。土乾了再澆水，水太多反而不開花。開花後可以修剪枝條，下一次會開得更多。',
    toxicity:
      '對人和貓狗都只有輕微的刺激性，誤吃可能會肚子不舒服。枝條上的刺會扎手，修剪時請戴手套。',
    whereInTaiwan: '全台灣都很常見，公園、學校、住家圍牆和陽台都看得到，屏東縣還把它選為縣花。',
  },
  'Bougainvillea glabra': {
    commonName: '光葉九重葛',
    aliases: ['小葉九重葛', '寶巾'],
    scientificName: 'Bougainvillea glabra',
    family: '紫茉莉科・九重葛屬',
    floweringSeason: '春天到秋天，天氣溫暖時常常開',
    origin: '南美洲（巴西）',
    howToRecognize:
      '和一般九重葛很像，但葉子比較光滑、顏色比較亮，摸起來沒有毛。苞片多半是紫紅色，刺比較少也比較短。',
    flowerMeaning: '熱情、堅韌。',
    careTips: '喜歡陽光和排水好的土。土乾了再澆水，不要澆太多。',
    toxicity: '對人和貓狗只有輕微刺激性，誤吃可能肚子不舒服。枝條有刺，修剪時請戴手套。',
    whereInTaiwan: '各地的庭院、陽台和公園都有人種。',
  },
  'Bougainvillea × buttiana': {
    commonName: '雜交九重葛',
    aliases: ['巴特九重葛'],
    scientificName: 'Bougainvillea × buttiana',
    family: '紫茉莉科・九重葛屬',
    floweringSeason: '幾乎全年可見',
    origin: '人工雜交培育的品種',
    howToRecognize: '苞片顏色特別多，有橘色、粉紅、黃色等，常常一株就有好幾種顏色。',
    flowerMeaning: '熱情、繽紛。',
    careTips: '和一般九重葛一樣，要多曬太陽、少澆水。',
    toxicity: '對人和貓狗只有輕微刺激性。枝條有刺，修剪時請戴手套。',
    whereInTaiwan: '花市很常見，很多人種在陽台的盆栽裡。',
  },
  'Camellia japonica': {
    commonName: '山茶花',
    aliases: ['茶花', '耐冬'],
    scientificName: 'Camellia japonica',
    family: '山茶科・山茶屬',
    floweringSeason: '冬天到春天，大約 12 月到隔年 3 月',
    origin: '中國、日本、韓國',
    howToRecognize:
      '花朵大而圓，有紅、粉、白色，花瓣厚實、層層疊疊。葉子深綠色、厚厚亮亮的，像上了一層蠟。謝的時候常常整朵花一起掉下來。',
    flowerMeaning: '謙讓、理想的愛。',
    careTips: '喜歡半日照、涼爽和微酸的土。夏天要避開大太陽，土表面乾了再澆水。',
    toxicity: '一般認為對人和貓狗沒有毒，但不建議拿來吃。',
    whereInTaiwan: '陽明山、新竹、南投等比較涼的山區常見，冬天各地的茶花園也很熱鬧。',
  },
  'Camellia sasanqua': {
    commonName: '茶梅',
    aliases: ['小茶花'],
    scientificName: 'Camellia sasanqua',
    family: '山茶科・山茶屬',
    floweringSeason: '秋天到冬天，大約 10 月到 12 月',
    origin: '日本',
    howToRecognize:
      '長得像小一號的山茶花，花瓣比較薄、比較散開，聞起來有淡淡的香味。謝的時候是一片一片花瓣掉下來，不是整朵掉。',
    flowerMeaning: '理想的愛、謙虛。',
    careTips: '比山茶花好照顧，半日照就可以。土乾了再澆水，常常被種成矮籬笆。',
    toxicity: '一般認為對人和貓狗沒有毒，但不建議拿來吃。',
    whereInTaiwan: '公園、學校和社區的矮樹籬常常看得到。',
  },
  'Rosa chinensis': {
    commonName: '月季',
    aliases: ['月月紅', '長春花'],
    scientificName: 'Rosa chinensis',
    family: '薔薇科・薔薇屬',
    floweringSeason: '幾乎全年都會開，春天和秋天最多',
    origin: '中國',
    howToRecognize: '和玫瑰很像，花瓣一層一層的，莖上有刺。葉子是好幾片小葉子排成一組，邊緣有細細的鋸齒。',
    flowerMeaning: '幸福、希望、常開不敗。',
    careTips: '喜歡陽光，每天至少曬四小時。開完的花剪掉，會再長出新的花苞。',
    toxicity: '對人和貓狗沒有毒，但莖上的刺會扎手，修剪時請戴手套。',
    whereInTaiwan: '各地的庭院和花市都很常見。',
  },
};

const candidate = (scientificName, score) => ({
  scientificName,
  commonName: mockInfo[scientificName].commonName,
  score,
  images: [],
});

// MOCK_IDENTIFY=1: a confident match.
export const mockResult = {
  confidence: 0.87,
  candidates: [
    candidate('Bougainvillea spectabilis', 0.87),
    candidate('Bougainvillea glabra', 0.08),
    candidate('Bougainvillea × buttiana', 0.02),
  ],
  info: mockInfo['Bougainvillea spectabilis'],
};

// MOCK_IDENTIFY=low: top score under 50%, so the app shows the 「可能是這幾種」 screen.
export const mockLowResult = {
  confidence: 0.46,
  candidates: [
    candidate('Camellia japonica', 0.46),
    candidate('Camellia sasanqua', 0.31),
    candidate('Rosa chinensis', 0.12),
  ],
  info: mockInfo['Camellia japonica'],
};
