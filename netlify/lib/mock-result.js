// Canned /api/identify response used when MOCK_IDENTIFY is set.
// Shape matches the real response: { confidence, candidates, info }.

export const mockResult = {
  confidence: 0.87,
  candidates: [
    {
      scientificName: 'Bougainvillea spectabilis',
      score: 0.87,
      images: [],
    },
    {
      scientificName: 'Bougainvillea glabra',
      score: 0.08,
      images: [],
    },
    {
      scientificName: 'Bougainvillea × buttiana',
      score: 0.02,
      images: [],
    },
  ],
  info: {
    commonName: '九重葛',
    aliases: ['三角梅', '紙花', '葉子花'],
    scientificName: 'Bougainvillea spectabilis',
    family: '紫茉莉科・九重葛屬',
    floweringSeason: '天氣溫暖時幾乎一年四季都會開，冬天到春天開得最熱鬧。',
    origin: '老家在南美洲的巴西，很早就被帶到台灣種植。',
    howToRecognize:
      '我們看到的鮮豔「花瓣」其實是三片薄薄的苞片，像紙一樣。真正的花在苞片中間，是三朵小小的白色管狀花。枝條上有尖刺，常常爬滿圍牆或棚架。',
    flowerMeaning: '熱情、堅韌，代表努力不懈、越挫越勇的精神。',
    careTips:
      '喜歡大太陽，每天最好曬六小時以上。土乾了再澆水，水太多反而不開花。開花後可以修剪枝條，下一次會開得更多。',
    toxicity:
      '對人和貓狗都只有輕微的刺激性，誤吃可能會肚子不舒服。枝條上的刺會扎手，修剪時請戴手套。',
    whereInTaiwan: '全台灣都很常見，公園、學校、住家圍牆和陽台都看得到，屏東縣還把它選為縣花。',
  },
};
