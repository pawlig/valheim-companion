window.VCO_DATA = {
  "categories": [
    {
      "id": "fire",
      "name": "Fire",
      "notes": "Fires do not stack with each other.\nOnly provides comfort when lit.\nHearth provides more comfort.\nHearth provides the Fire effect at a range of 12m while an extra 1 comfort at a range of 8m."
    },
    {
      "id": "rug",
      "name": "Rug",
      "notes": "Rugs do not stack with each other, only one rug will provide a bonus."
    },
    {
      "id": "table",
      "name": "Table",
      "notes": "Tables do not stack with each other.\nDarkwood provides the most comfort."
    },
    {
      "id": "chair",
      "name": "Chair",
      "notes": "Chairs do not stack with each other.\nAny \"throne\" provides the most comfort."
    },
    {
      "id": "bed",
      "name": "Bed",
      "notes": "Beds do not stack with each other.\nDragon bed provides more comfort."
    },
    {
      "id": "banner",
      "name": "Banner",
      "notes": "Banners do not stack with each other.\nJute Curtains do not stack with Banners or each other"
    },
    {
      "id": "plants",
      "name": "Plants",
      "notes": "Plants do not stack with each other.\nMistletoe, Yule garland, and Yule wreath can only be built during Yule events or with debug mode."
    },
    {
      "id": "stands",
      "name": "Stands",
      "notes": "Stands do not stack with each other.\nDoes not need to be displaying an item."
    },
    {
      "id": "bathroom",
      "name": "Bathroom",
      "notes": "Bathroom items do not stack with each other.\nHot tub only provides comfort when heated."
    },
    {
      "id": "lights",
      "name": "Lights",
      "notes": "Lights do not stack with each other.\nJack-o-turnip can only be built during Halloween or with debug mode.\nSnow lantern rapidly loses durability and breaks in any biomes except the Mountain and Deep North."
    },
    {
      "id": "ashlands",
      "name": "Ashlands",
      "notes": "Ashlands items do not stack with each other"
    }
  ],
  "pieces": [
    {
      "id": "antler-throne",
      "name": "Antler Throne",
      "category": "chair",
      "comfort": 3,
      "names": {},
      "image": "img/pieces/antler-throne.png",
      "materials": [
        {
          "item": "timberwood",
          "amount": 15
        },
        {
          "item": "moose-trophy",
          "amount": 1
        },
        {
          "item": "moose-hide",
          "amount": 5
        }
      ],
      "station": "workbench",
      "biome": "deep-north",
      "tier": 9,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_moose_throne",
      "wiki": "https://valheim.weirdgloop.org/w/Antler_Throne"
    },
    {
      "id": "armor-stand",
      "name": "Armor Stand",
      "category": "stands",
      "comfort": 1,
      "names": {
        "cs": "Stojan na brnění",
        "ru": "Стойка для брони"
      },
      "image": null,
      "materials": [
        {
          "item": "finewood",
          "amount": 8
        },
        {
          "item": "iron-nails",
          "amount": 4
        },
        {
          "item": "leather-scraps",
          "amount": 2
        }
      ],
      "station": "workbench",
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "ArmorStand",
      "wiki": "https://valheim.weirdgloop.org/w/Armor_Stand"
    },
    {
      "id": "ashwood-bed",
      "name": "Ashwood Bed",
      "category": "bed",
      "comfort": 1,
      "names": {
        "cs": "Postel z popelavého dřeva",
        "ru": "Кровать из пепельного дерева"
      },
      "image": "img/pieces/ashwood-bed.png",
      "materials": [
        {
          "item": "ashwood",
          "amount": 8
        },
        {
          "item": "lox-pelt",
          "amount": 2
        },
        {
          "item": "asksvin-hide",
          "amount": 2
        }
      ],
      "station": "workbench",
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "ashwood_bed",
      "wiki": "https://valheim.weirdgloop.org/w/Ashwood_Bed"
    },
    {
      "id": "ashwood-bench",
      "name": "Ashwood Bench",
      "category": "chair",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/ashwood-bench.png",
      "materials": [
        {
          "item": "ashwood",
          "amount": 6
        }
      ],
      "station": "workbench",
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_blackwood_bench01",
      "wiki": "https://valheim.weirdgloop.org/w/Ashwood_Bench"
    },
    {
      "id": "asksvin-rug",
      "name": "Asksvin Rug",
      "category": "rug",
      "comfort": 1,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/asksvin-rug.png",
      "materials": [
        {
          "item": "asksvin-hide",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_asksvin",
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Rug"
    },
    {
      "id": "asksvin-skeleton",
      "name": "Asksvin Skeleton",
      "category": "ashlands",
      "comfort": 1,
      "names": {
        "ru": "Скелет пеплозавра"
      },
      "image": "img/pieces/asksvin-skeleton.png",
      "materials": [
        {
          "item": "bone-fragments",
          "amount": 50
        },
        {
          "item": "asksvin-neck",
          "amount": 1
        },
        {
          "item": "asksvin-pelvis",
          "amount": 1
        },
        {
          "item": "asksvin-ribcage",
          "amount": 1
        },
        {
          "item": "asksvin-skull",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_asksvinskeleton",
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Skeleton"
    },
    {
      "id": "barber-station",
      "name": "Barber Station",
      "category": "bathroom",
      "comfort": 1,
      "names": {
        "ru": "Цирюльня"
      },
      "image": "img/pieces/barber-station.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 10
        },
        {
          "item": "barber-kit",
          "amount": 1
        },
        {
          "item": "bronze-nails",
          "amount": 5
        },
        {
          "item": "troll-hide",
          "amount": 5
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_barber",
      "wiki": "https://valheim.weirdgloop.org/w/Barber_Station"
    },
    {
      "id": "bearskin-rug",
      "name": "Bearskin Rug",
      "category": "rug",
      "comfort": 2,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/bearskin-rug.png",
      "materials": [
        {
          "item": "bear-hide",
          "amount": 1
        },
        {
          "item": "bear-paw",
          "amount": 2
        },
        {
          "item": "bear-trophy",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_Bjorn",
      "wiki": "https://valheim.weirdgloop.org/w/Bearskin_Rug"
    },
    {
      "id": "bed",
      "name": "Bed",
      "category": "bed",
      "comfort": 1,
      "names": {
        "cs": "Postel",
        "fr": "Lit",
        "ru": "Кровать"
      },
      "image": "img/pieces/bed.png",
      "materials": [
        {
          "item": "wood",
          "amount": 8
        }
      ],
      "station": "workbench",
      "biome": "meadows",
      "tier": 1,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "bed",
      "wiki": "https://valheim.weirdgloop.org/w/Bed"
    },
    {
      "id": "bench",
      "name": "Bench",
      "category": "chair",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/bench.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 6
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_bench01",
      "wiki": "https://valheim.weirdgloop.org/w/Bench"
    },
    {
      "id": "black-banner",
      "name": "Black banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/black-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "coal",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner01",
      "wiki": "https://valheim.weirdgloop.org/w/Black_banner"
    },
    {
      "id": "black-marble-bench",
      "name": "Black Marble Bench",
      "category": "chair",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/black-marble-bench.png",
      "materials": [
        {
          "item": "black-marble",
          "amount": 6
        },
        {
          "item": "copper",
          "amount": 3
        }
      ],
      "station": "stonecutter",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_blackmarble_bench",
      "wiki": "https://valheim.weirdgloop.org/w/Black_Marble_Bench"
    },
    {
      "id": "black-marble-table",
      "name": "Black Marble Table",
      "category": "table",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/black-marble-table.png",
      "materials": [
        {
          "item": "black-marble",
          "amount": 6
        },
        {
          "item": "copper",
          "amount": 3
        }
      ],
      "station": "stonecutter",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_blackmarble_table",
      "wiki": "https://valheim.weirdgloop.org/w/Black_Marble_Table"
    },
    {
      "id": "black-marble-throne",
      "name": "Black Marble Throne",
      "category": "chair",
      "comfort": 3,
      "names": {},
      "image": "img/pieces/black-marble-throne.png",
      "materials": [
        {
          "item": "black-marble",
          "amount": 20
        },
        {
          "item": "scale-hide",
          "amount": 4
        },
        {
          "item": "deer-hide",
          "amount": 2
        },
        {
          "item": "copper",
          "amount": 5
        }
      ],
      "station": "stonecutter",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_blackmarble_throne",
      "wiki": "https://valheim.weirdgloop.org/w/Black_Marble_Throne"
    },
    {
      "id": "blue-banner",
      "name": "Blue banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/blue-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "blueberries",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner02",
      "wiki": "https://valheim.weirdgloop.org/w/Blue_banner"
    },
    {
      "id": "blue-jute-carpet",
      "name": "Blue Jute Carpet",
      "category": "rug",
      "comfort": 1,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/blue-jute-carpet.png",
      "materials": [
        {
          "item": "blue-jute",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "jute_carpet_blue",
      "wiki": "https://valheim.weirdgloop.org/w/Blue_Jute_Carpet"
    },
    {
      "id": "blue-jute-curtain",
      "name": "Blue Jute Curtain",
      "category": "banner",
      "comfort": 2,
      "names": {
        "ru": "Занавеска из голубого джута"
      },
      "image": "img/pieces/blue-jute-curtain.png",
      "materials": [
        {
          "item": "blue-jute",
          "amount": 4
        },
        {
          "item": "finewood",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_cloth_hanging_door_blue2",
      "wiki": "https://valheim.weirdgloop.org/w/Blue_Jute_Curtain"
    },
    {
      "id": "blue-jute-drapes",
      "name": "Blue Jute Drapes",
      "category": "banner",
      "comfort": 2,
      "names": {
        "ru": "Портьеры из голубого джута"
      },
      "image": "img/pieces/blue-jute-drapes.png",
      "materials": [
        {
          "item": "blue-jute",
          "amount": 4
        },
        {
          "item": "finewood",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_cloth_hanging_door_blue",
      "wiki": "https://valheim.weirdgloop.org/w/Blue_Jute_Drapes"
    },
    {
      "id": "blue-red-and-white-banner",
      "name": "Blue, red and white banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/blue-red-and-white-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "blueberries",
          "amount": 2
        },
        {
          "item": "raspberries",
          "amount": 2
        },
        {
          "item": "cloudberries",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner06",
      "wiki": "https://valheim.weirdgloop.org/w/Blue%2C_red_and_white_banner"
    },
    {
      "id": "blue-standing-brazier",
      "name": "Blue Standing Brazier",
      "category": "fire",
      "comfort": 1,
      "names": {
        "ru": "Жаровня с синим пламенем"
      },
      "image": "img/pieces/blue-standing-brazier.png",
      "materials": [
        {
          "item": "bronze",
          "amount": 5
        },
        {
          "item": "greydwarf-eye",
          "amount": 5
        },
        {
          "item": "fenris-claw",
          "amount": 3
        }
      ],
      "station": "forge",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_brazierfloor02",
      "wiki": "https://valheim.weirdgloop.org/w/Blue_Standing_Brazier"
    },
    {
      "id": "bone-throne",
      "name": "Bone Throne",
      "category": "chair",
      "comfort": 3,
      "names": {},
      "image": "img/pieces/bone-throne.png",
      "materials": [
        {
          "item": "charred-bone",
          "amount": 15
        },
        {
          "item": "flametal",
          "amount": 4
        },
        {
          "item": "grausten",
          "amount": 20
        },
        {
          "item": "charred-skull",
          "amount": 3
        }
      ],
      "station": "stonecutter",
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_bone_throne",
      "wiki": "https://valheim.weirdgloop.org/w/Bone_Throne"
    },
    {
      "id": "bonfire",
      "name": "Bonfire",
      "category": "fire",
      "comfort": 1,
      "names": {
        "cs": "Velký táborák",
        "ru": "Большой костер"
      },
      "image": "img/pieces/bonfire.png",
      "materials": [
        {
          "item": "surtling-core",
          "amount": 1
        },
        {
          "item": "ancient-bark",
          "amount": 5
        },
        {
          "item": "finewood",
          "amount": 5
        },
        {
          "item": "corewood",
          "amount": 5
        }
      ],
      "station": null,
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "bonfire",
      "wiki": "https://valheim.weirdgloop.org/w/Bonfire"
    },
    {
      "id": "campfire",
      "name": "Campfire",
      "category": "fire",
      "comfort": 1,
      "names": {
        "cs": "Malý táborák",
        "ru": "Костер"
      },
      "image": "img/pieces/campfire.png",
      "materials": [
        {
          "item": "stone",
          "amount": 5
        },
        {
          "item": "wood",
          "amount": 2
        }
      ],
      "station": null,
      "biome": "meadows",
      "tier": 1,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "fire_pit",
      "wiki": "https://valheim.weirdgloop.org/w/Campfire"
    },
    {
      "id": "carved-bench",
      "name": "Carved Bench",
      "category": "chair",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/carved-bench.png",
      "materials": [
        {
          "item": "timberwood",
          "amount": 6
        },
        {
          "item": "moose-hide",
          "amount": 6
        }
      ],
      "station": "workbench",
      "biome": "deep-north",
      "tier": 9,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_bench_runed",
      "wiki": "https://valheim.weirdgloop.org/w/Carved_Bench"
    },
    {
      "id": "carved-chair",
      "name": "Carved Chair",
      "category": "chair",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/carved-chair.png",
      "materials": [],
      "station": null,
      "biome": null,
      "tier": null,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": null,
      "wiki": "https://valheim.weirdgloop.org/w/Carved_Chair"
    },
    {
      "id": "chair",
      "name": "Chair",
      "category": "chair",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/chair.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_chair02",
      "wiki": "https://valheim.weirdgloop.org/w/Chair"
    },
    {
      "id": "darkwood-chair",
      "name": "Darkwood Chair",
      "category": "chair",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/darkwood-chair.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 4
        },
        {
          "item": "tar",
          "amount": 1
        },
        {
          "item": "iron-nails",
          "amount": 5
        },
        {
          "item": "deer-hide",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_chair03",
      "wiki": "https://valheim.weirdgloop.org/w/Darkwood_Chair"
    },
    {
      "id": "deer-rug",
      "name": "Deer Rug",
      "category": "rug",
      "comfort": 1,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/deer-rug.png",
      "materials": [
        {
          "item": "deer-hide",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "meadows",
      "tier": 1,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_deer",
      "wiki": "https://valheim.weirdgloop.org/w/Deer_Rug"
    },
    {
      "id": "dragon-bed",
      "name": "Dragon Bed",
      "category": "bed",
      "comfort": 2,
      "names": {
        "cs": "Dračí postel",
        "ru": "Драконья кровать"
      },
      "image": "img/pieces/dragon-bed.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 40
        },
        {
          "item": "deer-hide",
          "amount": 7
        },
        {
          "item": "wolf-pelt",
          "amount": 4
        },
        {
          "item": "feathers",
          "amount": 10
        },
        {
          "item": "iron-nails",
          "amount": 15
        }
      ],
      "station": "workbench",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_bed02",
      "wiki": "https://valheim.weirdgloop.org/w/Dragon_Bed"
    },
    {
      "id": "dvergr-lantern-pole",
      "name": "Dvergr Lantern Pole",
      "category": "lights",
      "comfort": 1,
      "names": {
        "cs": "Dvergská lucerna na sloupu",
        "ru": "Фонарный столб двергов"
      },
      "image": "img/pieces/dvergr-lantern-pole.png",
      "materials": [
        {
          "item": "copper",
          "amount": 3
        },
        {
          "item": "dvergr-lantern",
          "amount": 1
        },
        {
          "item": "chain",
          "amount": 1
        }
      ],
      "station": "black-forge",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_dvergr_lantern_pole",
      "wiki": "https://valheim.weirdgloop.org/w/Dvergr_Lantern_Pole"
    },
    {
      "id": "dvergr-wall-lantern",
      "name": "Dvergr Wall Lantern",
      "category": "lights",
      "comfort": 1,
      "names": {
        "cs": "Dvergská nástěnná lucerna",
        "ru": "Настенный светильник двергов"
      },
      "image": "img/pieces/dvergr-wall-lantern.png",
      "materials": [
        {
          "item": "copper",
          "amount": 2
        },
        {
          "item": "dvergr-lantern",
          "amount": 1
        },
        {
          "item": "chain",
          "amount": 1
        }
      ],
      "station": "black-forge",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_dvergr_lantern",
      "wiki": "https://valheim.weirdgloop.org/w/Dvergr_Wall_Lantern"
    },
    {
      "id": "fey-lights",
      "name": "Fey Lights",
      "category": "plants",
      "comfort": 1,
      "names": {
        "ru": "Волшебные огни"
      },
      "image": "img/pieces/fey-lights.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "thistle",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_FairylightGarland",
      "wiki": "https://valheim.weirdgloop.org/w/Fey_Lights"
    },
    {
      "id": "flower-garland",
      "name": "Flower Garland",
      "category": "plants",
      "comfort": 1,
      "names": {
        "ru": "Цветочная гирлянда"
      },
      "image": "img/pieces/flower-garland.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "dandelion",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_CelebrationGarland",
      "wiki": "https://valheim.weirdgloop.org/w/Flower_Garland"
    },
    {
      "id": "green-banner",
      "name": "Green banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/green-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "guck",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner05",
      "wiki": "https://valheim.weirdgloop.org/w/Green_banner"
    },
    {
      "id": "hanging-brazier",
      "name": "Hanging Brazier",
      "category": "fire",
      "comfort": 1,
      "names": {
        "cs": "Závěsná pánev",
        "ru": "Подвесной мангал"
      },
      "image": "img/pieces/hanging-brazier.png",
      "materials": [
        {
          "item": "bronze",
          "amount": 5
        },
        {
          "item": "coal",
          "amount": 2
        },
        {
          "item": "chain",
          "amount": 1
        }
      ],
      "station": "forge",
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_brazierceiling01",
      "wiki": "https://valheim.weirdgloop.org/w/Hanging_Brazier"
    },
    {
      "id": "hare-rug",
      "name": "Hare Rug",
      "category": "rug",
      "comfort": 1,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/hare-rug.png",
      "materials": [
        {
          "item": "scale-hide",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "mistlands",
      "tier": 7,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_hare",
      "wiki": "https://valheim.weirdgloop.org/w/Hare_Rug"
    },
    {
      "id": "hearth",
      "name": "Hearth",
      "category": "fire",
      "comfort": 2,
      "names": {
        "cs": "Krb",
        "ru": "Очаг"
      },
      "image": "img/pieces/hearth.png",
      "materials": [
        {
          "item": "stone",
          "amount": 15
        }
      ],
      "station": "stonecutter",
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": true
      },
      "gameId": "hearth",
      "wiki": "https://valheim.weirdgloop.org/w/Hearth"
    },
    {
      "id": "hot-tub",
      "name": "Hot Tub",
      "category": "bathroom",
      "comfort": 2,
      "names": {
        "cs": "Vířivka",
        "ru": "Ванна"
      },
      "image": "img/pieces/hot-tub.png",
      "materials": [
        {
          "item": "wood",
          "amount": 20
        },
        {
          "item": "tar",
          "amount": 6
        },
        {
          "item": "iron",
          "amount": 10
        },
        {
          "item": "stone",
          "amount": 8
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": true,
        "hearthRange8m": false
      },
      "gameId": "piece_bathtub",
      "wiki": "https://valheim.weirdgloop.org/w/Hot_Tub"
    },
    {
      "id": "iron-fire-pit",
      "name": "Iron Fire Pit",
      "category": "fire",
      "comfort": 1,
      "names": {
        "ru": "Железная костровая чаша"
      },
      "image": "img/pieces/iron-fire-pit.png",
      "materials": [
        {
          "item": "iron-pit",
          "amount": 1
        },
        {
          "item": "wood",
          "amount": 1
        }
      ],
      "station": null,
      "biome": "meadows",
      "tier": 1,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "fire_pit_iron",
      "wiki": "https://valheim.weirdgloop.org/w/Iron_Fire_Pit"
    },
    {
      "id": "item-stand-horizontal",
      "name": "Item Stand (horizontal)",
      "category": "stands",
      "comfort": 1,
      "names": {
        "cs": "Stojan na předměty",
        "ru": "Стойка для предмета"
      },
      "image": "img/pieces/item-stand-horizontal.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 4
        },
        {
          "item": "bronze-nails",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": null,
      "wiki": "https://valheim.weirdgloop.org/w/Item_Stand_(horizontal)"
    },
    {
      "id": "item-stand-vertical",
      "name": "Item Stand (vertical)",
      "category": "stands",
      "comfort": 1,
      "names": {
        "cs": "Stojan na předměty",
        "ru": "Стойка для предмета"
      },
      "image": "img/pieces/item-stand-vertical.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 4
        },
        {
          "item": "bronze-nails",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": null,
      "wiki": "https://valheim.weirdgloop.org/w/Item_Stand_(vertical)"
    },
    {
      "id": "jack-o-turnip",
      "name": "Jack-O-Turnip",
      "category": "lights",
      "comfort": 2,
      "names": {
        "cs": "Jack-o-turnip",
        "ru": "Фонарь из репы"
      },
      "image": "img/pieces/jack-o-turnip.png",
      "materials": [
        {
          "item": "turnip",
          "amount": 4
        },
        {
          "item": "resin",
          "amount": 2
        }
      ],
      "station": "workbench",
      "biome": "swamp",
      "tier": 4,
      "seasonal": true,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_jackoturnip",
      "wiki": "https://valheim.weirdgloop.org/w/Jack-O-Turnip"
    },
    {
      "id": "large-green-pot",
      "name": "Large green pot",
      "category": "ashlands",
      "comfort": 1,
      "names": {
        "ru": "Горшки"
      },
      "image": "img/pieces/large-green-pot.png",
      "materials": [
        {
          "item": "pot-shard",
          "amount": 5
        },
        {
          "item": "charcoal-resin",
          "amount": 1
        }
      ],
      "station": null,
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_pot2",
      "wiki": "https://valheim.weirdgloop.org/w/Large_green_pot"
    },
    {
      "id": "lava-lantern",
      "name": "Lava Lantern",
      "category": "lights",
      "comfort": 2,
      "names": {
        "ru": "Лавовый светильник"
      },
      "image": "img/pieces/lava-lantern.png",
      "materials": [
        {
          "item": "flametal",
          "amount": 1
        },
        {
          "item": "proustite-powder",
          "amount": 1
        },
        {
          "item": "sulfur",
          "amount": 1
        }
      ],
      "station": "black-forge",
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_Lavalantern",
      "wiki": "https://valheim.weirdgloop.org/w/Lava_Lantern"
    },
    {
      "id": "long-carved-table",
      "name": "Long Carved Table",
      "category": "table",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/long-carved-table.png",
      "materials": [
        {
          "item": "timberwood",
          "amount": 20
        },
        {
          "item": "tar",
          "amount": 2
        },
        {
          "item": "iron-nails",
          "amount": 20
        }
      ],
      "station": "workbench",
      "biome": "deep-north",
      "tier": 9,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_table_runed",
      "wiki": "https://valheim.weirdgloop.org/w/Long_Carved_Table"
    },
    {
      "id": "long-heavy-table",
      "name": "Long Heavy Table",
      "category": "table",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/long-heavy-table.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 20
        },
        {
          "item": "tar",
          "amount": 2
        },
        {
          "item": "iron-nails",
          "amount": 20
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_table_oak",
      "wiki": "https://valheim.weirdgloop.org/w/Long_Heavy_Table"
    },
    {
      "id": "lox-rug",
      "name": "Lox Rug",
      "category": "rug",
      "comfort": 2,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/lox-rug.png",
      "materials": [
        {
          "item": "lox-pelt",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_fur",
      "wiki": "https://valheim.weirdgloop.org/w/Lox_Rug"
    },
    {
      "id": "maypole",
      "name": "Maypole",
      "category": null,
      "comfort": 1,
      "names": {
        "cs": "Máje",
        "ru": "Майское дерево"
      },
      "image": "img/pieces/maypole.png",
      "materials": [
        {
          "item": "wood",
          "amount": 10
        },
        {
          "item": "dandelion",
          "amount": 4
        },
        {
          "item": "thistle",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": true,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_maypole",
      "wiki": "https://valheim.weirdgloop.org/w/Maypole"
    },
    {
      "id": "medium-green-pot",
      "name": "Medium green pot",
      "category": "ashlands",
      "comfort": 1,
      "names": {
        "ru": "Горшки"
      },
      "image": "img/pieces/medium-green-pot.png",
      "materials": [
        {
          "item": "pot-shard",
          "amount": 4
        },
        {
          "item": "charcoal-resin",
          "amount": 1
        }
      ],
      "station": null,
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_pot1",
      "wiki": "https://valheim.weirdgloop.org/w/Medium_green_pot"
    },
    {
      "id": "mistletoe",
      "name": "Mistletoe",
      "category": "plants",
      "comfort": 1,
      "names": {
        "cs": "Jmelí",
        "ru": "Омела"
      },
      "image": "img/pieces/mistletoe.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 1
        },
        {
          "item": "red-jute",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "mountain",
      "tier": 5,
      "seasonal": true,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_mistletoe",
      "wiki": "https://valheim.weirdgloop.org/w/Mistletoe"
    },
    {
      "id": "moose-hide-carpet",
      "name": "Moose Hide Carpet",
      "category": "rug",
      "comfort": 2,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/moose-hide-carpet.png",
      "materials": [],
      "station": null,
      "biome": null,
      "tier": null,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": null,
      "wiki": "https://valheim.weirdgloop.org/w/Moose_Hide_Carpet"
    },
    {
      "id": "orange-banner",
      "name": "Orange banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/orange-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "carrot",
          "amount": 2
        },
        {
          "item": "cloudberries",
          "amount": 3
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner10",
      "wiki": "https://valheim.weirdgloop.org/w/Orange_banner"
    },
    {
      "id": "purple-banner",
      "name": "Purple banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/purple-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "blueberries",
          "amount": 2
        },
        {
          "item": "raspberries",
          "amount": 3
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner09",
      "wiki": "https://valheim.weirdgloop.org/w/Purple_banner"
    },
    {
      "id": "raven-throne",
      "name": "Raven Throne",
      "category": "chair",
      "comfort": 3,
      "names": {},
      "image": "img/pieces/raven-throne.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 20
        },
        {
          "item": "iron-nails",
          "amount": 10
        }
      ],
      "station": "workbench",
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_throne01",
      "wiki": "https://valheim.weirdgloop.org/w/Raven_Throne"
    },
    {
      "id": "red-banner",
      "name": "Red banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/red-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "bloodbag",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "swamp",
      "tier": 4,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner04",
      "wiki": "https://valheim.weirdgloop.org/w/Red_banner"
    },
    {
      "id": "red-jute-carpet",
      "name": "Red Jute Carpet",
      "category": "rug",
      "comfort": 1,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/red-jute-carpet.png",
      "materials": [
        {
          "item": "red-jute",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "jute_carpet",
      "wiki": "https://valheim.weirdgloop.org/w/Red_Jute_Carpet"
    },
    {
      "id": "red-jute-curtain",
      "name": "Red Jute Curtain",
      "category": "banner",
      "comfort": 2,
      "names": {
        "ru": "Штора из красного джута"
      },
      "image": "img/pieces/red-jute-curtain.png",
      "materials": [
        {
          "item": "red-jute",
          "amount": 4
        },
        {
          "item": "finewood",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_cloth_hanging_door",
      "wiki": "https://valheim.weirdgloop.org/w/Red_Jute_Curtain"
    },
    {
      "id": "round-table",
      "name": "Round Table",
      "category": "table",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/round-table.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 10
        },
        {
          "item": "tar",
          "amount": 2
        },
        {
          "item": "iron-nails",
          "amount": 20
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_table_round",
      "wiki": "https://valheim.weirdgloop.org/w/Round_Table"
    },
    {
      "id": "sealskin-rug",
      "name": "Sealskin Rug",
      "category": "rug",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/sealskin-rug.png",
      "materials": [
        {
          "item": "seal-pelt",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "deep-north",
      "tier": 9,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_seal",
      "wiki": "https://valheim.weirdgloop.org/w/Sealskin_Rug"
    },
    {
      "id": "sitting-log",
      "name": "Sitting Log",
      "category": "chair",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/sitting-log.png",
      "materials": [
        {
          "item": "corewood",
          "amount": 2
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_logbench01",
      "wiki": "https://valheim.weirdgloop.org/w/Sitting_Log"
    },
    {
      "id": "small-green-pot",
      "name": "Small green pot",
      "category": "ashlands",
      "comfort": 1,
      "names": {
        "ru": "Горшки"
      },
      "image": "img/pieces/small-green-pot.png",
      "materials": [
        {
          "item": "pot-shard",
          "amount": 3
        },
        {
          "item": "charcoal-resin",
          "amount": 1
        }
      ],
      "station": null,
      "biome": "ashlands",
      "tier": 8,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_pot3",
      "wiki": "https://valheim.weirdgloop.org/w/Small_green_pot"
    },
    {
      "id": "snow-lantern",
      "name": "Snow Lantern",
      "category": "lights",
      "comfort": 2,
      "names": {},
      "image": "img/pieces/snow-lantern.png",
      "materials": [
        {
          "item": "snowball",
          "amount": 8
        }
      ],
      "station": "workbench",
      "biome": "deep-north",
      "tier": 9,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_snowlantern",
      "wiki": "https://valheim.weirdgloop.org/w/Snow_Lantern"
    },
    {
      "id": "square-carved-table",
      "name": "Square Carved Table",
      "category": "table",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/square-carved-table.png",
      "materials": [
        {
          "item": "timberwood",
          "amount": 6
        },
        {
          "item": "tar",
          "amount": 1
        },
        {
          "item": "iron-nails",
          "amount": 6
        }
      ],
      "station": "workbench",
      "biome": "deep-north",
      "tier": 9,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_table_runed_small",
      "wiki": "https://valheim.weirdgloop.org/w/Square_Carved_Table"
    },
    {
      "id": "standing-brazier",
      "name": "Standing Brazier",
      "category": "fire",
      "comfort": 1,
      "names": {
        "cs": "Stojící uhelné ohniště",
        "ru": "Жаровня"
      },
      "image": "img/pieces/standing-brazier.png",
      "materials": [
        {
          "item": "bronze",
          "amount": 5
        },
        {
          "item": "coal",
          "amount": 2
        },
        {
          "item": "fenris-claw",
          "amount": 3
        }
      ],
      "station": "forge",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": true,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_brazierfloor01",
      "wiki": "https://valheim.weirdgloop.org/w/Standing_Brazier"
    },
    {
      "id": "stone-throne",
      "name": "Stone Throne",
      "category": "chair",
      "comfort": 3,
      "names": {},
      "image": "img/pieces/stone-throne.png",
      "materials": [
        {
          "item": "stone",
          "amount": 20
        },
        {
          "item": "deer-hide",
          "amount": 2
        },
        {
          "item": "wolf-pelt",
          "amount": 2
        }
      ],
      "station": "stonecutter",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_throne02",
      "wiki": "https://valheim.weirdgloop.org/w/Stone_Throne"
    },
    {
      "id": "stool",
      "name": "Stool",
      "category": "chair",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/stool.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_chair",
      "wiki": "https://valheim.weirdgloop.org/w/Stool"
    },
    {
      "id": "straw",
      "name": "Straw",
      "category": "rug",
      "comfort": 1,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/straw.png",
      "materials": [
        {
          "item": "barley",
          "amount": 1
        },
        {
          "item": "flax",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_straw",
      "wiki": "https://valheim.weirdgloop.org/w/Straw"
    },
    {
      "id": "table",
      "name": "Table",
      "category": "table",
      "comfort": 1,
      "names": {},
      "image": "img/pieces/table.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 6
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_table",
      "wiki": "https://valheim.weirdgloop.org/w/Table"
    },
    {
      "id": "white-and-blue-striped-banner",
      "name": "White and blue striped banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/white-and-blue-striped-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "blueberries",
          "amount": 2
        },
        {
          "item": "cloudberries",
          "amount": 3
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner07",
      "wiki": "https://valheim.weirdgloop.org/w/White_and_blue_striped_banner"
    },
    {
      "id": "white-and-red-striped-banner",
      "name": "White and red striped banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/white-and-red-striped-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "raspberries",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner03",
      "wiki": "https://valheim.weirdgloop.org/w/White_and_red_striped_banner"
    },
    {
      "id": "white-banner",
      "name": "White banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/white-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "coal",
          "amount": 2
        },
        {
          "item": "cloudberries",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "plains",
      "tier": 6,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner11",
      "wiki": "https://valheim.weirdgloop.org/w/White_banner"
    },
    {
      "id": "wolf-rug",
      "name": "Wolf Rug",
      "category": "rug",
      "comfort": 2,
      "names": {
        "ru": "Коврики"
      },
      "image": "img/pieces/wolf-rug.png",
      "materials": [
        {
          "item": "wolf-pelt",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "mountain",
      "tier": 5,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "rug_wolf",
      "wiki": "https://valheim.weirdgloop.org/w/Wolf_Rug"
    },
    {
      "id": "yellow-banner",
      "name": "Yellow banner",
      "category": "banner",
      "comfort": 1,
      "names": {
        "ru": "Флаги"
      },
      "image": "img/pieces/yellow-banner.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "leather-scraps",
          "amount": 6
        },
        {
          "item": "coal",
          "amount": 2
        },
        {
          "item": "dandelion",
          "amount": 4
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": false,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_banner08",
      "wiki": "https://valheim.weirdgloop.org/w/Yellow_banner"
    },
    {
      "id": "yule-garland",
      "name": "Yule garland",
      "category": "plants",
      "comfort": 1,
      "names": {
        "cs": "Yule Girlanda",
        "ru": "Йольская гирлянда"
      },
      "image": "img/pieces/yule-garland.png",
      "materials": [
        {
          "item": "finewood",
          "amount": 2
        },
        {
          "item": "pine-cone",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": true,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_xmasgarland",
      "wiki": "https://valheim.weirdgloop.org/w/Yule_garland"
    },
    {
      "id": "yule-tree",
      "name": "Yule Tree",
      "category": null,
      "comfort": 1,
      "names": {
        "cs": "Vánoční stromek",
        "ru": "Йольское дерево"
      },
      "image": "img/pieces/yule-tree.png",
      "materials": [
        {
          "item": "wood",
          "amount": 10
        },
        {
          "item": "fir-cone",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "black-forest",
      "tier": 2,
      "seasonal": true,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_xmastree",
      "wiki": "https://valheim.weirdgloop.org/w/Yule_Tree"
    },
    {
      "id": "yule-wreath",
      "name": "Yule wreath",
      "category": "plants",
      "comfort": 1,
      "names": {
        "cs": "Yule Věnec",
        "ru": "Йольский венок"
      },
      "image": "img/pieces/yule-wreath.png",
      "materials": [
        {
          "item": "pine-cone",
          "amount": 4
        },
        {
          "item": "red-jute",
          "amount": 1
        },
        {
          "item": "finewood",
          "amount": 1
        }
      ],
      "station": "workbench",
      "biome": "mountain",
      "tier": 5,
      "seasonal": true,
      "conditions": {
        "lit": false,
        "heated": false,
        "hearthRange8m": false
      },
      "gameId": "piece_xmascrown",
      "wiki": "https://valheim.weirdgloop.org/w/Yule_wreath"
    }
  ],
  "wikiMaxByBiome": {
    "meadows": 5,
    "black-forest": 13,
    "swamp": 15,
    "mountain": 17,
    "plains": 19,
    "mistlands": 20,
    "ashlands": 22,
    "deep-north": 22,
    "ocean": 13
  },
  "rules": {
    "base": 1,
    "shelter": 1,
    "unshelteredCap": 1,
    "restedBaseMinutes": 7,
    "rangeMeters": 10,
    "restedEffects": {
      "healthRegenPercent": 50,
      "staminaRegenPercent": 100,
      "eitrRegenPercent": 100,
      "xpPercent": 50
    }
  },
  "biomes": [
    {
      "id": "meadows",
      "name": "Meadows",
      "order": 1,
      "tier": 1,
      "image": "img/biomes/meadows.png",
      "wiki": "https://valheim.weirdgloop.org/w/Meadows",
      "creatures": {
        "boss": [
          "eikthyr"
        ],
        "miniboss": [],
        "hostile": [
          "boar",
          "greyling",
          "neck"
        ],
        "passive": [
          "deer",
          "gull"
        ],
        "fish": [
          "perch",
          "pike"
        ]
      },
      "names": {
        "cs": "Louky",
        "de": "Grasland",
        "fr": "Prairies",
        "pt": "Prados",
        "ru": "Луга",
        "zh": "草原"
      }
    },
    {
      "id": "black-forest",
      "name": "Black Forest",
      "order": 2,
      "tier": 2,
      "image": "img/biomes/black-forest.png",
      "wiki": "https://valheim.weirdgloop.org/w/Black_Forest",
      "creatures": {
        "boss": [
          "the-elder"
        ],
        "miniboss": [
          "brenna"
        ],
        "hostile": [
          "bear",
          "ghost",
          "greydwarf",
          "greydwarf-brute",
          "greydwarf-shaman",
          "rancid-remains",
          "skeleton",
          "troll"
        ],
        "passive": [
          "crow",
          "deer",
          "gull"
        ],
        "fish": [
          "perch",
          "pike",
          "trollfish"
        ]
      },
      "names": {
        "cs": "Černý Les",
        "de": "Düsterwald",
        "fr": "Forêt noire",
        "ru": "Черный лес"
      }
    },
    {
      "id": "ocean",
      "name": "Ocean",
      "order": 3,
      "tier": 3,
      "image": "img/biomes/ocean.png",
      "wiki": "https://valheim.weirdgloop.org/w/Ocean",
      "creatures": {
        "boss": [],
        "miniboss": [],
        "hostile": [
          "serpent"
        ],
        "passive": [
          "gull",
          "leviathan"
        ],
        "fish": [
          "coral-cod",
          "pufferfish",
          "tuna"
        ]
      },
      "names": {
        "cs": "Oceán",
        "de": "Ozean",
        "fr": "Océan",
        "ru": "Океан",
        "zh": "海洋"
      }
    },
    {
      "id": "swamp",
      "name": "Swamp",
      "order": 4,
      "tier": 4,
      "image": "img/biomes/swamp.png",
      "wiki": "https://valheim.weirdgloop.org/w/Swamp",
      "creatures": {
        "boss": [
          "bonemass"
        ],
        "miniboss": [],
        "hostile": [
          "abomination",
          "blob",
          "draugr",
          "draugr-elite",
          "kvastur",
          "leech",
          "oozer",
          "skeleton",
          "surtling",
          "wraith",
          "writhan"
        ],
        "passive": [],
        "fish": [
          "giant-herring"
        ]
      },
      "names": {
        "cs": "Bažiny",
        "de": "Sumpf",
        "fr": "Marécages",
        "ru": "Болото",
        "zh": "沼澤"
      }
    },
    {
      "id": "mountain",
      "name": "Mountain",
      "order": 5,
      "tier": 5,
      "image": "img/biomes/mountain.png",
      "wiki": "https://valheim.weirdgloop.org/w/Mountain",
      "creatures": {
        "boss": [
          "moder"
        ],
        "miniboss": [
          "geirrhafa"
        ],
        "hostile": [
          "bat",
          "cultist",
          "drake",
          "draugr",
          "fenring",
          "skeleton",
          "stone-golem",
          "ulv",
          "wolf"
        ],
        "passive": [],
        "fish": [
          "tetra"
        ]
      },
      "names": {
        "cs": "Hory",
        "fr": "Montagne",
        "ru": "Гора",
        "zh": "雪山"
      }
    },
    {
      "id": "plains",
      "name": "Plains",
      "order": 6,
      "tier": 6,
      "image": "img/biomes/plains.png",
      "wiki": "https://valheim.weirdgloop.org/w/Plains",
      "creatures": {
        "boss": [
          "yagluth"
        ],
        "miniboss": [
          "zil-thungr"
        ],
        "hostile": [
          "deathsquito",
          "fuling",
          "fuling-berserker",
          "fuling-shaman",
          "growth",
          "lox",
          "vile"
        ],
        "passive": [
          "chicken",
          "gull",
          "hen"
        ],
        "fish": [
          "grouper"
        ]
      },
      "names": {
        "cs": "Planiny",
        "fr": "Plaines",
        "ru": "Равнины",
        "zh": "平原"
      }
    },
    {
      "id": "mistlands",
      "name": "Mistlands",
      "order": 7,
      "tier": 7,
      "image": "img/biomes/mistlands.png",
      "wiki": "https://valheim.weirdgloop.org/w/Mistlands",
      "creatures": {
        "boss": [
          "the-queen"
        ],
        "miniboss": [],
        "hostile": [
          "gjall",
          "mistile",
          "seeker",
          "seeker-brood",
          "seeker-soldier",
          "tick"
        ],
        "passive": [
          "dvergr-mage",
          "dvergr-rogue",
          "hare"
        ],
        "fish": [
          "anglerfish",
          "pufferfish"
        ]
      },
      "names": {
        "cs": "Mlžné krajiny",
        "ru": "Туманные земли"
      }
    },
    {
      "id": "ashlands",
      "name": "Ashlands",
      "order": 8,
      "tier": 8,
      "image": "img/biomes/ashlands.png",
      "wiki": "https://valheim.weirdgloop.org/w/Ashlands",
      "creatures": {
        "boss": [
          "fader"
        ],
        "miniboss": [
          "lord-reto"
        ],
        "hostile": [
          "asksvin",
          "bonemaw",
          "charred-marksman",
          "charred-twitcher",
          "charred-warlock",
          "charred-warrior",
          "fallen-valkyrie",
          "lava-blob",
          "morgen",
          "skugg",
          "volture"
        ],
        "passive": [
          "ash-crow",
          "ashlands-dvergr"
        ],
        "fish": [
          "magmafish"
        ]
      },
      "names": {
        "cs": "Prašné končiny",
        "ru": "Пепельные земли"
      }
    },
    {
      "id": "deep-north",
      "name": "Deep North",
      "order": 9,
      "tier": 9,
      "image": "img/biomes/deep-north.png",
      "wiki": "https://valheim.weirdgloop.org/w/Deep_North",
      "creatures": {
        "boss": [
          "kall-fimbulbringer"
        ],
        "miniboss": [],
        "hostile": [
          "barka",
          "captive-fuling",
          "elaking",
          "eyeless-one",
          "fallen-warrior",
          "frysling",
          "gammeltroll",
          "greydwarf-deep-north",
          "greydwarf-shaman-deep-north",
          "hexen",
          "imprisoned-dvergr",
          "krigen",
          "moose",
          "moose-calf",
          "shapeless-pulp",
          "skeleton",
          "tiny-pulp"
        ],
        "passive": [
          "seal",
          "shadow"
        ],
        "fish": [
          "northern-salmon"
        ]
      },
      "names": {
        "cs": "Daleký sever",
        "ru": "Дальний север"
      }
    }
  ],
  "items": {
    "ancient-bark": {
      "id": "ancient-bark",
      "name": "Ancient Bark",
      "image": "../smithy/img/items/ancient-bark.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Ancient Tree in Swamp biomes",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Ancient_Bark",
      "names": {
        "cs": "Starověká kůra",
        "de": "Alte Rinde",
        "fr": "Écorce ancienne",
        "ru": "Древняя кора"
      },
      "teleportable": true
    },
    "ashwood": {
      "id": "ashwood",
      "name": "Ashwood",
      "image": "../smithy/img/items/ashwood.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Scorched Tree",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Ashwood",
      "names": {
        "ru": "Пепельная древесина"
      },
      "teleportable": true
    },
    "asksvin-hide": {
      "id": "asksvin-hide",
      "name": "Asksvin Hide",
      "image": "../smithy/img/items/asksvin-hide.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Asksvin",
          "kind": "creature",
          "creatureId": "asksvin",
          "biomes": [
            "ashlands"
          ]
        },
        {
          "text": "Asksvin Hatchling",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Hide",
      "names": {
        "ru": "Шкура пеплозавра"
      },
      "teleportable": true
    },
    "asksvin-neck": {
      "id": "asksvin-neck",
      "name": "Asksvin Neck",
      "comfort": true,
      "names": {
        "ru": "Шея пеплозавра"
      },
      "image": "img/items/asksvin-neck.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Found in the Ashlands",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Neck"
    },
    "asksvin-pelvis": {
      "id": "asksvin-pelvis",
      "name": "Asksvin Pelvis",
      "comfort": true,
      "names": {
        "ru": "Таз пеплозавра"
      },
      "image": "img/items/asksvin-pelvis.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Found in the Ashlands",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Pelvis"
    },
    "asksvin-ribcage": {
      "id": "asksvin-ribcage",
      "name": "Asksvin Ribcage",
      "comfort": true,
      "names": {
        "ru": "Ребра пеплозавра"
      },
      "image": "img/items/asksvin-ribcage.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Found in the Ashlands",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Ribcage"
    },
    "asksvin-skull": {
      "id": "asksvin-skull",
      "name": "Asksvin Skull",
      "comfort": true,
      "names": {
        "ru": "Череп пеплозавра"
      },
      "image": "img/items/asksvin-skull.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Found in the Ashlands",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Asksvin_Skull"
    },
    "barber-kit": {
      "id": "barber-kit",
      "name": "Barber Kit",
      "comfort": true,
      "names": {
        "ru": "Набор цирюльника"
      },
      "image": "img/items/barber-kit.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Hildir",
          "kind": "npc"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Barber_Kit"
    },
    "barley": {
      "id": "barley",
      "name": "Barley",
      "provisions": true,
      "image": "../provisions/img/items/barley.png",
      "biome": "plains",
      "tier": 6,
      "sources": [
        {
          "text": "Fuling Villages in the Plains biome.",
          "kind": "location"
        },
        {
          "text": "Abandoned Village Barrels.",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Barley",
      "names": {
        "cs": "Ječmen",
        "de": "Gerste",
        "fr": "Orge",
        "ru": "Ячмень"
      },
      "teleportable": true
    },
    "bear-hide": {
      "id": "bear-hide",
      "name": "Bear Hide",
      "image": "../smithy/img/items/bear-hide.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Bear",
          "kind": "creature",
          "creatureId": "bear",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Vile",
          "kind": "creature",
          "creatureId": "vile",
          "biomes": [
            "plains"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Bear_Hide",
      "names": {
        "ru": "Медвежья шкура"
      },
      "teleportable": true
    },
    "bear-paw": {
      "id": "bear-paw",
      "name": "Bear Paw",
      "image": "../smithy/img/items/bear-paw.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Bear",
          "kind": "creature",
          "creatureId": "bear",
          "biomes": [
            "black-forest"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Bear_Paw",
      "names": {
        "ru": "Медвежья лапа"
      },
      "teleportable": true
    },
    "bear-trophy": {
      "id": "bear-trophy",
      "name": "Bear Trophy",
      "image": "../smithy/img/items/bear-trophy.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Bear",
          "kind": "creature",
          "creatureId": "bear",
          "biomes": [
            "black-forest"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Bear_Trophy",
      "names": {
        "cs": "Trofeje",
        "ru": "Категория:Трофеи"
      },
      "teleportable": true
    },
    "black-core": {
      "id": "black-core",
      "name": "Black Core",
      "comfort": true,
      "names": {
        "cs": "Černé Jádro",
        "ru": "Черное ядро"
      },
      "image": "img/items/black-core.png",
      "biome": "mistlands",
      "tier": 7,
      "sources": [
        {
          "text": "Dungeons",
          "kind": "other"
        },
        {
          "text": "random chests",
          "kind": "location"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Black_Core"
    },
    "black-marble": {
      "id": "black-marble",
      "name": "Black Marble",
      "provisions": true,
      "image": "../provisions/img/items/black-marble.png",
      "biome": "mistlands",
      "tier": 7,
      "sources": [
        {
          "text": "Giant Remains and various structures in the Mistlands biome",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/black_marble",
      "names": {
        "cs": "Černý mramor",
        "ru": "Черный мрамор"
      },
      "teleportable": true
    },
    "bloodbag": {
      "id": "bloodbag",
      "name": "Bloodbag",
      "provisions": true,
      "image": "../provisions/img/items/bloodbag.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Leeches",
          "kind": "creature",
          "creatureId": "leech",
          "biomes": [
            "swamp"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Bloodbag",
      "names": {
        "cs": "Vak s krví",
        "de": "Blutsack",
        "fr": "Poche de sang",
        "ru": "Туша"
      },
      "teleportable": true
    },
    "blue-jute": {
      "id": "blue-jute",
      "name": "Blue Jute",
      "comfort": true,
      "names": {
        "cs": "Modrá juta",
        "de": "Blaue Jute",
        "fr": "Jute bleue",
        "ru": "Голубой джут"
      },
      "image": "img/items/blue-jute.png",
      "biome": "mistlands",
      "tier": 7,
      "sources": [
        {
          "text": "Mistlands",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Blue_Jute"
    },
    "blueberries": {
      "id": "blueberries",
      "name": "Blueberries",
      "image": "../smithy/img/items/blueberries.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Blueberry bushes in the Black Forest biome",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Blueberries",
      "names": {
        "cs": "Borůvky",
        "de": "Blaubeeren",
        "fr": "Myrtilles",
        "ru": "Черника"
      },
      "teleportable": true
    },
    "bone-fragments": {
      "id": "bone-fragments",
      "name": "Bone Fragments",
      "image": "../smithy/img/items/bone-fragments.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Skeleton",
          "kind": "creature",
          "creatureId": "skeleton",
          "biomes": [
            "black-forest",
            "swamp",
            "mountain",
            "deep-north"
          ]
        },
        {
          "text": "Rancid Remains",
          "kind": "creature",
          "creatureId": "rancid-remains",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Skugg",
          "kind": "creature",
          "creatureId": "skugg",
          "biomes": [
            "ashlands"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Bone_Fragments",
      "names": {
        "cs": "Fragmenty kostí",
        "de": "Knochenfragmente",
        "fr": "Fragments d'os",
        "ru": "Обломки костей"
      },
      "teleportable": true
    },
    "bronze": {
      "id": "bronze",
      "name": "Bronze",
      "image": "../smithy/img/items/bronze.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Forge",
          "kind": "station"
        },
        {
          "text": "Smelter",
          "kind": "station"
        }
      ],
      "recipe": {
        "station": "Forge",
        "materials": [
          {
            "item": "copper",
            "amount": 2
          },
          {
            "item": "tin",
            "amount": 1
          }
        ],
        "yields": 1
      },
      "wiki": "https://valheim.weirdgloop.org/w/Bronze",
      "teleportable": false,
      "names": {
        "cs": "Bronz",
        "de": "Bronze",
        "fr": "Bronze",
        "ru": "Бронза"
      }
    },
    "bronze-nails": {
      "id": "bronze-nails",
      "name": "Bronze Nails",
      "comfort": true,
      "names": {
        "cs": "Bronzové hřebíky",
        "fr": "Clous en bronze",
        "ru": "Бронзовые гвозди"
      },
      "image": "img/items/bronze-nails.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Forge",
          "kind": "station"
        }
      ],
      "recipe": {
        "station": "Forge",
        "materials": [
          {
            "item": "bronze",
            "amount": 1
          }
        ],
        "yields": 20
      },
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Bronze_Nails"
    },
    "carrot": {
      "id": "carrot",
      "name": "Carrot",
      "provisions": true,
      "image": "../provisions/img/items/carrot.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Farming Carrot Seeds",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Carrot",
      "names": {
        "cs": "Mrkev",
        "de": "Karotte",
        "fr": "Carotte",
        "ru": "Морковь"
      },
      "teleportable": true
    },
    "chain": {
      "id": "chain",
      "name": "Chain",
      "image": "../smithy/img/items/chain.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Wraith",
          "kind": "creature",
          "creatureId": "wraith",
          "biomes": [
            "swamp"
          ]
        },
        {
          "text": "Sunken Crypts",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Chain",
      "names": {
        "cs": "Řetěz",
        "fr": "Chaîne",
        "ru": "Цепь"
      },
      "teleportable": true
    },
    "charcoal-resin": {
      "id": "charcoal-resin",
      "name": "Charcoal Resin",
      "comfort": true,
      "names": {
        "cs": "Uhelná pryskyřice",
        "de": "Holzkohleharz",
        "fr": "Résine de charbon",
        "ru": "Угольная смола"
      },
      "image": "img/items/charcoal-resin.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Scorched Trees",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Charcoal_Resin"
    },
    "charred-bone": {
      "id": "charred-bone",
      "name": "Charred Bone",
      "image": "../smithy/img/items/charred-bone.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Charred Warrior",
          "kind": "creature",
          "creatureId": "charred-warrior",
          "biomes": [
            "ashlands"
          ]
        },
        {
          "text": "Charred Marksman",
          "kind": "creature",
          "creatureId": "charred-marksman",
          "biomes": [
            "ashlands"
          ]
        },
        {
          "text": "Charred Warlock",
          "kind": "creature",
          "creatureId": "charred-warlock",
          "biomes": [
            "ashlands"
          ]
        },
        {
          "text": "Charred Twitcher",
          "kind": "creature",
          "creatureId": "charred-twitcher",
          "biomes": [
            "ashlands"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Charred_Bone",
      "names": {
        "ru": "Обугленная кость"
      },
      "teleportable": true
    },
    "charred-skull": {
      "id": "charred-skull",
      "name": "Charred Skull",
      "comfort": true,
      "names": {
        "ru": "Обугленный череп"
      },
      "image": "img/items/charred-skull.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Ashlands",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Charred_Skull"
    },
    "cloudberries": {
      "id": "cloudberries",
      "name": "Cloudberries",
      "provisions": true,
      "image": "../provisions/img/items/cloudberries.png",
      "biome": "plains",
      "tier": 6,
      "sources": [
        {
          "text": "Plains biome",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Cloudberries",
      "names": {
        "cs": "Morušky",
        "de": "Moltebeeren",
        "fr": "Plaquebières",
        "ru": "Морошка"
      },
      "teleportable": true
    },
    "coal": {
      "id": "coal",
      "name": "Coal",
      "image": "../smithy/img/items/coal.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Overcook meat at a Cooking Station",
          "kind": "station"
        },
        {
          "text": "Surtling",
          "kind": "creature",
          "creatureId": "surtling",
          "biomes": [
            "swamp"
          ]
        },
        {
          "text": "Burning Meat",
          "kind": "other"
        },
        {
          "text": "Charcoal Kiln",
          "kind": "station"
        },
        {
          "text": "Obliterator",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Coal",
      "names": {
        "cs": "Uhlí",
        "de": "Kohle",
        "fr": "Charbon",
        "ru": "Уголь"
      },
      "teleportable": true
    },
    "copper": {
      "id": "copper",
      "name": "Copper",
      "image": "../smithy/img/items/copper.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Smelter",
          "kind": "station"
        },
        {
          "text": "Dvergr metal wall",
          "kind": "other"
        }
      ],
      "recipe": {
        "station": "Smelter",
        "materials": [
          {
            "item": "copper-ore",
            "amount": 1
          }
        ],
        "yields": 1
      },
      "wiki": "https://valheim.weirdgloop.org/w/Copper",
      "teleportable": false,
      "names": {
        "cs": "Měď",
        "de": "Kupfer",
        "fr": "Cuivre",
        "ru": "Медь"
      }
    },
    "copper-ore": {
      "id": "copper-ore",
      "name": "Copper Ore",
      "image": "../smithy/img/items/copper-ore.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Copper Deposit",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Copper_Ore",
      "teleportable": false,
      "names": {
        "cs": "Měděná ruda",
        "de": "Kupfererz",
        "fr": "Minerai de cuivre",
        "ru": "Медная руда"
      }
    },
    "corewood": {
      "id": "corewood",
      "name": "Corewood",
      "image": "../smithy/img/items/corewood.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Pine",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Corewood",
      "names": {
        "cs": "Jádrové dřevo",
        "de": "Kernholz",
        "fr": "Bois robuste",
        "ru": "Цельная древесина"
      },
      "teleportable": true
    },
    "crystal": {
      "id": "crystal",
      "name": "Crystal",
      "image": "../smithy/img/items/crystal.png",
      "biome": "mountain",
      "tier": 5,
      "sources": [
        {
          "text": "Frost Blob",
          "kind": "other"
        },
        {
          "text": "Stone Golem",
          "kind": "creature",
          "creatureId": "stone-golem",
          "biomes": [
            "mountain"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Crystal",
      "names": {
        "cs": "Krystal",
        "ru": "Кристалл"
      },
      "teleportable": true
    },
    "dandelion": {
      "id": "dandelion",
      "name": "Dandelion",
      "image": "../smithy/img/items/dandelion.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Meadows biome",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Dandelion",
      "names": {
        "cs": "Pampeliška",
        "de": "Löwenzahn",
        "fr": "Pissenlit",
        "ru": "Одуванчик"
      },
      "teleportable": true
    },
    "deer-hide": {
      "id": "deer-hide",
      "name": "Deer Hide",
      "image": "../smithy/img/items/deer-hide.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Deer",
          "kind": "creature",
          "creatureId": "deer",
          "biomes": [
            "meadows",
            "black-forest"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Deer_Hide",
      "names": {
        "cs": "Jelení kůže",
        "de": "Hirschfell",
        "fr": "Peau de cerf",
        "ru": "Шкура оленя"
      },
      "teleportable": true
    },
    "dragon-tear": {
      "id": "dragon-tear",
      "name": "Dragon Tear",
      "comfort": true,
      "names": {
        "cs": "Dračí slza",
        "ru": "Драконья слеза"
      },
      "image": "img/items/dragon-tear.png",
      "biome": "mountain",
      "tier": 5,
      "sources": [
        {
          "text": "Moder",
          "kind": "creature",
          "creatureId": "moder",
          "biomes": [
            "mountain"
          ]
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Dragon_Tear"
    },
    "dvergr-lantern": {
      "id": "dvergr-lantern",
      "name": "Dvergr Lantern",
      "comfort": true,
      "names": {
        "cs": "Dvergská lucerna",
        "ru": "Светильник двергов"
      },
      "image": "img/items/dvergr-lantern.png",
      "biome": "mountain",
      "tier": 5,
      "sources": [
        {
          "text": "Black Forge",
          "kind": "station"
        },
        {
          "text": "Dvergr Buildings",
          "kind": "other"
        }
      ],
      "recipe": {
        "station": "Black Forge, Dvergr Buildings",
        "materials": [
          {
            "item": "bronze",
            "amount": 2
          },
          {
            "item": "surtling-core",
            "amount": 1
          },
          {
            "item": "crystal",
            "amount": 1
          }
        ],
        "yields": 1
      },
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Dvergr_Lantern"
    },
    "feathers": {
      "id": "feathers",
      "name": "Feathers",
      "image": "../smithy/img/items/feathers.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Birds",
          "kind": "other"
        },
        {
          "text": "Chests",
          "kind": "location"
        },
        {
          "text": "Felled trees",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Feathers",
      "names": {
        "cs": "Peří",
        "ru": "Перья"
      },
      "teleportable": true
    },
    "fenris-claw": {
      "id": "fenris-claw",
      "name": "Fenris Claw",
      "image": "../smithy/img/items/fenris-claw.png",
      "biome": "mountain",
      "tier": 5,
      "sources": [
        {
          "text": "Frost Caves",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Fenris_Claw",
      "names": {
        "cs": "Fenridův dráp",
        "ru": "Коготь Фенриса"
      },
      "teleportable": true
    },
    "finewood": {
      "id": "finewood",
      "name": "Finewood",
      "image": "../smithy/img/items/finewood.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Birch",
          "kind": "other"
        },
        {
          "text": "Oak",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Finewood",
      "names": {
        "cs": "Jemné dřevo",
        "de": "Edelholz",
        "fr": "Bois précieux",
        "ru": "Качественная древесина"
      },
      "teleportable": true
    },
    "fir-cone": {
      "id": "fir-cone",
      "name": "Fir Cone",
      "comfort": true,
      "names": {
        "cs": "Šiška z jedle",
        "de": "Tannenzapfen",
        "fr": "Cône de sapin",
        "ru": "Пихтовая шишка"
      },
      "image": "img/items/fir-cone.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Fir trees",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Fir_Cone"
    },
    "flametal": {
      "id": "flametal",
      "name": "Flametal",
      "image": "../smithy/img/items/flametal.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Blast Furnace",
          "kind": "station"
        }
      ],
      "recipe": {
        "station": "Blast Furnace",
        "materials": [
          {
            "item": "flametal-ore",
            "amount": 1
          }
        ],
        "yields": 1
      },
      "wiki": "https://valheim.weirdgloop.org/w/Flametal",
      "teleportable": false,
      "names": {
        "cs": "Plamenný kov",
        "de": "Flammenkern",
        "fr": "Flametal",
        "ru": "Огнеметалл"
      }
    },
    "flametal-ore": {
      "id": "flametal-ore",
      "name": "Flametal Ore",
      "image": "../smithy/img/items/flametal-ore.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Flametal Ore Vein in the Ashlands biome",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Flametal_Ore",
      "teleportable": false,
      "names": {
        "cs": "Plamenná kovová ruda",
        "de": "Flammenkernerz",
        "fr": "Minerai de flametal",
        "ru": "Огнеметаллическая руда"
      }
    },
    "flax": {
      "id": "flax",
      "name": "Flax",
      "image": "../smithy/img/items/flax.png",
      "biome": "plains",
      "tier": 6,
      "sources": [
        {
          "text": "Fuling Village in the Plains biome.",
          "kind": "location"
        },
        {
          "text": "Abandoned Village Barrels.",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Flax",
      "names": {
        "cs": "Len",
        "de": "Flachs",
        "fr": "Lin",
        "ru": "Лен"
      },
      "teleportable": true
    },
    "grausten": {
      "id": "grausten",
      "name": "Grausten",
      "comfort": true,
      "names": {
        "ru": "Серокамень"
      },
      "image": "img/items/grausten.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Building ruins and rock formations in Ashlands",
          "kind": "location"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Grausten"
    },
    "greydwarf-eye": {
      "id": "greydwarf-eye",
      "name": "Greydwarf Eye",
      "image": "../smithy/img/items/greydwarf-eye.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Greydwarf",
          "kind": "creature",
          "creatureId": "greydwarf",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Greydwarf Brute",
          "kind": "creature",
          "creatureId": "greydwarf-brute",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "and Greydwarf Shaman",
          "kind": "creature",
          "creatureId": "greydwarf-shaman",
          "biomes": [
            "black-forest"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Greydwarf_Eye",
      "names": {
        "cs": "Oko šedého trpaslíka",
        "de": "Grauzwergen-Auge",
        "fr": "Œil de Naingris",
        "ru": "Глаз грейдворфа"
      },
      "teleportable": true
    },
    "guck": {
      "id": "guck",
      "name": "Guck",
      "image": "../smithy/img/items/guck.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Abomination",
          "kind": "creature",
          "creatureId": "abomination",
          "biomes": [
            "swamp"
          ]
        },
        {
          "text": "Gucksack",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Guck",
      "names": {
        "cs": "Sliz",
        "de": "Glibber",
        "fr": "Viscosité",
        "ru": "Слизь"
      },
      "teleportable": true
    },
    "ice": {
      "id": "ice",
      "name": "Ice",
      "image": "../smithy/img/items/ice.png",
      "biome": "deep-north",
      "tier": 9,
      "sources": [
        {
          "text": "Ice Sheet",
          "kind": "other"
        },
        {
          "text": "Ice Pond",
          "kind": "other"
        },
        {
          "text": "Greydwarf",
          "kind": "creature",
          "creatureId": "greydwarf-deep-north",
          "biomes": [
            "deep-north"
          ]
        },
        {
          "text": "Greydwarf Shaman",
          "kind": "creature",
          "creatureId": "greydwarf-shaman-deep-north",
          "biomes": [
            "deep-north"
          ]
        },
        {
          "text": "Skeleton",
          "kind": "creature",
          "creatureId": "skeleton",
          "biomes": [
            "black-forest",
            "swamp",
            "mountain",
            "deep-north"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Ice",
      "names": {},
      "teleportable": true
    },
    "iron": {
      "id": "iron",
      "name": "Iron",
      "image": "../smithy/img/items/iron.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Smelter",
          "kind": "station"
        }
      ],
      "recipe": {
        "station": "Smelter",
        "materials": [
          {
            "item": "scrap-iron",
            "amount": 1
          }
        ],
        "yields": 1
      },
      "wiki": "https://valheim.weirdgloop.org/w/Iron",
      "teleportable": false,
      "names": {
        "cs": "Železo",
        "de": "Eisen",
        "fr": "Fer",
        "ru": "Железо"
      }
    },
    "iron-nails": {
      "id": "iron-nails",
      "name": "Iron Nails",
      "comfort": true,
      "names": {
        "cs": "Železné hřebíky",
        "fr": "Clous en fer",
        "ru": "Железные гвозди"
      },
      "image": "img/items/iron-nails.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Forge",
          "kind": "station"
        }
      ],
      "recipe": {
        "station": "Forge",
        "materials": [
          {
            "item": "iron",
            "amount": 1
          }
        ],
        "yields": 10
      },
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Iron_Nails"
    },
    "iron-pit": {
      "id": "iron-pit",
      "name": "Iron Pit",
      "comfort": true,
      "names": {
        "ru": "Железная чаша"
      },
      "image": "img/items/iron-pit.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Hildir",
          "kind": "npc"
        }
      ],
      "recipe": null,
      "teleportable": false,
      "wiki": "https://valheim.weirdgloop.org/w/Iron_Pit"
    },
    "leather-scraps": {
      "id": "leather-scraps",
      "name": "Leather Scraps",
      "image": "../smithy/img/items/leather-scraps.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Boar",
          "kind": "creature",
          "creatureId": "boar",
          "biomes": [
            "meadows"
          ]
        },
        {
          "text": "Bat",
          "kind": "creature",
          "creatureId": "bat",
          "biomes": [
            "mountain"
          ]
        },
        {
          "text": "Muddy Scrap Piles",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Leather_Scraps",
      "names": {
        "cs": "Zbytky z kůže",
        "de": "Lederreste",
        "fr": "Bouts de cuir",
        "ru": "Кожаные обрывки"
      },
      "teleportable": true
    },
    "lox-pelt": {
      "id": "lox-pelt",
      "name": "Lox Pelt",
      "image": "../smithy/img/items/lox-pelt.png",
      "biome": "plains",
      "tier": 6,
      "sources": [
        {
          "text": "Lox",
          "kind": "creature",
          "creatureId": "lox",
          "biomes": [
            "plains"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Lox_Pelt",
      "names": {
        "cs": "Kůže z Loxe",
        "de": "Lox-Pelz",
        "fr": "Peau de Lox",
        "ru": "Шкура быкоящера"
      },
      "teleportable": true
    },
    "moose-hide": {
      "id": "moose-hide",
      "name": "Moose Hide",
      "image": "../smithy/img/items/moose-hide.png",
      "biome": "deep-north",
      "tier": 9,
      "sources": [
        {
          "text": "Moose",
          "kind": "creature",
          "creatureId": "moose",
          "biomes": [
            "deep-north"
          ]
        },
        {
          "text": "Bedrolls in Mörkhalla.",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Moose_Hide",
      "names": {},
      "teleportable": true
    },
    "moose-trophy": {
      "id": "moose-trophy",
      "name": "Moose Trophy",
      "image": "../smithy/img/items/moose-trophy.png",
      "biome": "deep-north",
      "tier": 9,
      "sources": [
        {
          "text": "Moose",
          "kind": "creature",
          "creatureId": "moose",
          "biomes": [
            "deep-north"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Moose_Trophy",
      "names": {
        "cs": "Trofeje",
        "ru": "Категория:Трофеи"
      },
      "teleportable": true
    },
    "pine-cone": {
      "id": "pine-cone",
      "name": "Pine Cone",
      "comfort": true,
      "names": {
        "cs": "Šiška z borovice",
        "de": "Kieferzapfen",
        "fr": "Cône de pin",
        "ru": "Сосновая шишка"
      },
      "image": "img/items/pine-cone.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Pine",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Pine_Cone"
    },
    "pot-shard": {
      "id": "pot-shard",
      "name": "Pot Shard",
      "comfort": true,
      "names": {
        "ru": "Осколок горшка"
      },
      "image": "img/items/pot-shard.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Ancient Pot",
          "kind": "other"
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Pot_Shard"
    },
    "proustite-powder": {
      "id": "proustite-powder",
      "name": "Proustite Powder",
      "image": "../smithy/img/items/proustite-powder.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Lava Blob",
          "kind": "creature",
          "creatureId": "lava-blob",
          "biomes": [
            "ashlands"
          ]
        },
        {
          "text": "Unstable Lava Rock",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Proustite_Powder",
      "names": {
        "ru": "Пруститовый порошок"
      },
      "teleportable": true
    },
    "raspberries": {
      "id": "raspberries",
      "name": "Raspberries",
      "provisions": true,
      "image": "../provisions/img/items/raspberries.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Raspberry bushes in Meadows",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Raspberries",
      "names": {
        "cs": "Maliny",
        "de": "Himbeeren",
        "fr": "Framboises",
        "ru": "Малина"
      },
      "teleportable": true
    },
    "red-jute": {
      "id": "red-jute",
      "name": "Red Jute",
      "comfort": true,
      "names": {
        "cs": "Červená juta",
        "de": "Rote Jute",
        "fr": "Jute rouge",
        "ru": "Красный джут"
      },
      "image": "img/items/red-jute.png",
      "biome": "mountain",
      "tier": 5,
      "sources": [
        {
          "text": "Cultist",
          "kind": "creature",
          "creatureId": "cultist",
          "biomes": [
            "mountain"
          ]
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Red_Jute"
    },
    "resin": {
      "id": "resin",
      "name": "Resin",
      "image": "../smithy/img/items/resin.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "*Birch Trees",
          "kind": "other"
        },
        {
          "text": "*Beech Trees",
          "kind": "other"
        },
        {
          "text": "*Fir Trees",
          "kind": "other"
        },
        {
          "text": "*Pine Trees",
          "kind": "other"
        },
        {
          "text": "*Oak Trees",
          "kind": "other"
        },
        {
          "text": "*Yggdrasil Shoots",
          "kind": "other"
        },
        {
          "text": "*Greyling",
          "kind": "creature",
          "creatureId": "greyling",
          "biomes": [
            "meadows"
          ]
        },
        {
          "text": "*Greydwarf",
          "kind": "creature",
          "creatureId": "greydwarf",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "*Greydwarf Shaman",
          "kind": "creature",
          "creatureId": "greydwarf-shaman",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "*Greydwarf Brute",
          "kind": "creature",
          "creatureId": "greydwarf-brute",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "*Kvastur",
          "kind": "creature",
          "creatureId": "kvastur",
          "biomes": [
            "swamp"
          ]
        },
        {
          "text": "*Chest in Meadows",
          "kind": "location"
        },
        {
          "text": "*Barrel next to Greydwarf building spawns in Black Forest",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Resin",
      "names": {
        "cs": "Pryskyřice",
        "de": "Harz",
        "fr": "Résine",
        "ru": "Смола"
      },
      "teleportable": true
    },
    "scale-hide": {
      "id": "scale-hide",
      "name": "Scale Hide",
      "image": "../smithy/img/items/scale-hide.png",
      "biome": "mistlands",
      "tier": 7,
      "sources": [
        {
          "text": "Hare",
          "kind": "creature",
          "creatureId": "hare",
          "biomes": [
            "mistlands"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Scale_Hide",
      "names": {
        "cs": "Šupinatá kožešina",
        "de": "Schuppenhaut",
        "fr": "Peau écailleuse",
        "ru": "Чешуйчатая шкура"
      },
      "teleportable": true
    },
    "scrap-iron": {
      "id": "scrap-iron",
      "name": "Scrap Iron",
      "image": "../smithy/img/items/scrap-iron.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Muddy Scrap Pile",
          "kind": "location"
        },
        {
          "text": "Sunken Crypts Chests",
          "kind": "location"
        },
        {
          "text": "Oozers",
          "kind": "creature",
          "creatureId": "oozer",
          "biomes": [
            "swamp"
          ]
        },
        {
          "text": "Ancient Sword",
          "kind": "other"
        },
        {
          "text": "Ancient Armor",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Scrap_Iron",
      "teleportable": false,
      "names": {
        "cs": "Železný šrot",
        "de": "Eisenschrott",
        "fr": "Ferraille",
        "ru": "Металлолом"
      }
    },
    "seal-pelt": {
      "id": "seal-pelt",
      "name": "Seal Pelt",
      "image": "../smithy/img/items/seal-pelt.png",
      "biome": "deep-north",
      "tier": 9,
      "sources": [
        {
          "text": "Seal",
          "kind": "creature",
          "creatureId": "seal",
          "biomes": [
            "deep-north"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Seal_Pelt",
      "names": {},
      "teleportable": true
    },
    "snowball": {
      "id": "snowball",
      "name": "Snowball",
      "comfort": true,
      "names": {},
      "image": "img/items/snowball.png",
      "biome": "deep-north",
      "tier": 9,
      "sources": [
        {
          "text": "Crafted by hand",
          "kind": "other"
        },
        {
          "text": "Deep North.",
          "kind": "other"
        }
      ],
      "recipe": {
        "station": "Crafted by hand, Deep North.",
        "materials": [
          {
            "item": "ice",
            "amount": 5
          }
        ],
        "yields": 10
      },
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Snowball"
    },
    "stone": {
      "id": "stone",
      "name": "Stone",
      "image": "../smithy/img/items/stone.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Stones",
          "kind": "other"
        },
        {
          "text": "Greydwarf",
          "kind": "creature",
          "creatureId": "greydwarf",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Greydwarf Brute",
          "kind": "creature",
          "creatureId": "greydwarf-brute",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Stone Golem",
          "kind": "creature",
          "creatureId": "stone-golem",
          "biomes": [
            "mountain"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Stone",
      "names": {
        "cs": "Kámen",
        "de": "Stein",
        "fr": "Pierre",
        "ru": "Камень"
      },
      "teleportable": true
    },
    "sulfur": {
      "id": "sulfur",
      "name": "Sulfur",
      "image": "../smithy/img/items/sulfur.png",
      "biome": "ashlands",
      "tier": 8,
      "sources": [
        {
          "text": "Lava Blob",
          "kind": "creature",
          "creatureId": "lava-blob",
          "biomes": [
            "ashlands"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Sulfur",
      "names": {
        "ru": "Сера"
      },
      "teleportable": true
    },
    "surtling-core": {
      "id": "surtling-core",
      "name": "Surtling Core",
      "image": "../smithy/img/items/surtling-core.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Surtlings",
          "kind": "creature",
          "creatureId": "surtling",
          "biomes": [
            "swamp"
          ]
        },
        {
          "text": "Burial Chambers",
          "kind": "location"
        },
        {
          "text": "Bonfires",
          "kind": "other"
        },
        {
          "text": "Dvergr Lanterns",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Surtling_Core",
      "names": {
        "cs": "Jádro Surtlinga",
        "ru": "Ядро суртлинга"
      },
      "teleportable": true
    },
    "tar": {
      "id": "tar",
      "name": "Tar",
      "comfort": true,
      "names": {
        "cs": "Dehet",
        "ru": "Деготь"
      },
      "image": "img/items/tar.png",
      "biome": "plains",
      "tier": 6,
      "sources": [
        {
          "text": "Growth",
          "kind": "creature",
          "creatureId": "growth",
          "biomes": [
            "plains"
          ]
        }
      ],
      "recipe": null,
      "teleportable": true,
      "wiki": "https://valheim.weirdgloop.org/w/Tar"
    },
    "thistle": {
      "id": "thistle",
      "name": "Thistle",
      "provisions": true,
      "image": "../provisions/img/items/thistle.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Gathered in the Black Forest and Swamp",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Thistle",
      "names": {
        "cs": "Bodlák",
        "de": "Distel",
        "fr": "Chardon",
        "ru": "Чертополох"
      },
      "teleportable": true
    },
    "timberwood": {
      "id": "timberwood",
      "name": "Timberwood",
      "image": "../smithy/img/items/timberwood.png",
      "biome": "deep-north",
      "tier": 9,
      "sources": [
        {
          "text": "Trees in the Deep North",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Timberwood",
      "names": {},
      "teleportable": true
    },
    "tin": {
      "id": "tin",
      "name": "Tin",
      "image": "../smithy/img/items/tin.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Smelter",
          "kind": "station"
        }
      ],
      "recipe": {
        "station": "Smelter",
        "materials": [
          {
            "item": "tin-ore",
            "amount": 1
          }
        ],
        "yields": 1
      },
      "wiki": "https://valheim.weirdgloop.org/w/Tin",
      "teleportable": false,
      "names": {
        "cs": "Cín",
        "de": "Zinn",
        "fr": "Étain",
        "ru": "Олово"
      }
    },
    "tin-ore": {
      "id": "tin-ore",
      "name": "Tin Ore",
      "image": "../smithy/img/items/tin-ore.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Tin Deposit",
          "kind": "location"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Tin_Ore",
      "teleportable": false,
      "names": {
        "cs": "Cínová ruda",
        "de": "Zinnerz",
        "fr": "Minerai d'étain",
        "ru": "Оловянная руда"
      }
    },
    "troll-hide": {
      "id": "troll-hide",
      "name": "Troll Hide",
      "image": "../smithy/img/items/troll-hide.png",
      "biome": "black-forest",
      "tier": 2,
      "sources": [
        {
          "text": "Troll",
          "kind": "creature",
          "creatureId": "troll",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Trollfish bonus drop",
          "kind": "creature",
          "creatureId": "trollfish",
          "biomes": [
            "black-forest"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Troll_Hide",
      "names": {
        "cs": "Trollí kůže",
        "de": "Trollleder",
        "fr": "Peau de troll",
        "ru": "Шкура тролля"
      },
      "teleportable": true
    },
    "turnip": {
      "id": "turnip",
      "name": "Turnip",
      "provisions": true,
      "image": "../provisions/img/items/turnip.png",
      "biome": "swamp",
      "tier": 4,
      "sources": [
        {
          "text": "Turnip Seeds",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Turnip",
      "names": {
        "cs": "Tuřín",
        "ru": "Репа"
      },
      "teleportable": true
    },
    "wolf-pelt": {
      "id": "wolf-pelt",
      "name": "Wolf Pelt",
      "image": "../smithy/img/items/wolf-pelt.png",
      "biome": "mountain",
      "tier": 5,
      "sources": [
        {
          "text": "Wolf",
          "kind": "creature",
          "creatureId": "wolf",
          "biomes": [
            "mountain"
          ]
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Wolf_Pelt",
      "names": {
        "cs": "Vlčí kůže",
        "de": "Wolfspelz",
        "fr": "Peau de loup",
        "ru": "Шкура волка"
      },
      "teleportable": true
    },
    "wood": {
      "id": "wood",
      "name": "Wood",
      "image": "../smithy/img/items/wood.png",
      "biome": "meadows",
      "tier": 1,
      "sources": [
        {
          "text": "Bushes",
          "kind": "other"
        },
        {
          "text": "Greydwarfs",
          "kind": "creature",
          "creatureId": "greydwarf",
          "biomes": [
            "black-forest"
          ]
        },
        {
          "text": "Trees",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Wood",
      "names": {
        "cs": "Dřevo",
        "de": "Holz",
        "fr": "Bois",
        "ru": "Древесина"
      },
      "teleportable": true
    },
    "yggdrasil-wood": {
      "id": "yggdrasil-wood",
      "name": "Yggdrasil Wood",
      "image": "../smithy/img/items/yggdrasil-wood.png",
      "biome": "mistlands",
      "tier": 7,
      "sources": [
        {
          "text": "Yggdrasil Shoot in Mistlands biomes",
          "kind": "other"
        }
      ],
      "recipe": null,
      "wiki": "https://valheim.weirdgloop.org/w/Yggdrasil_Wood",
      "names": {
        "cs": "Dřevo Yggdrasilu",
        "de": "Yggdrasil-Holz",
        "fr": "Bois d'Yggdrasil",
        "ru": "Древесина Иггдрасиля"
      },
      "teleportable": true
    }
  },
  "stations": [
    {
      "id": "artisan-table",
      "name": "Artisan Table",
      "names": {
        "cs": "Řemeslnický stůl",
        "fr": "Table d'artisan",
        "ru": "Стол ремесленника"
      },
      "wiki": "https://valheim.weirdgloop.org/w/Artisan_Table",
      "type": "crafting",
      "materials": [
        {
          "item": "dragon-tear",
          "amount": 2
        },
        {
          "item": "wood",
          "amount": 10
        }
      ],
      "unlock": {
        "station": null,
        "materials": [
          "dragon-tear",
          "wood"
        ]
      },
      "biome": "mountain",
      "tier": 5,
      "maxLevel": 2,
      "levels": [
        {
          "level": 1,
          "upgrade": null,
          "biome": "mountain",
          "tier": 5
        },
        {
          "level": 2,
          "upgrade": "artisan-press",
          "biome": "mistlands",
          "tier": 7
        }
      ]
    },
    {
      "id": "black-forge",
      "name": "Black Forge",
      "names": {
        "cs": "Černá Kovárna",
        "ru": "Черная кузница"
      },
      "wiki": "https://valheim.weirdgloop.org/w/Black_Forge",
      "type": "crafting",
      "materials": [
        {
          "item": "black-marble",
          "amount": 10
        },
        {
          "item": "yggdrasil-wood",
          "amount": 10
        },
        {
          "item": "black-core",
          "amount": 5
        }
      ],
      "unlock": {
        "station": "workbench",
        "materials": [
          "black-marble",
          "yggdrasil-wood",
          "black-core"
        ]
      },
      "biome": "mistlands",
      "tier": 7,
      "maxLevel": 6,
      "levels": [
        {
          "level": 1,
          "upgrade": null,
          "biome": "mistlands",
          "tier": 7
        },
        {
          "level": 2,
          "upgrade": "black-forge-cooler",
          "biome": "mistlands",
          "tier": 7
        },
        {
          "level": 3,
          "upgrade": "vice",
          "biome": "mistlands",
          "tier": 7
        },
        {
          "level": 4,
          "upgrade": "metal-cutter",
          "biome": "ashlands",
          "tier": 8
        },
        {
          "level": 5,
          "upgrade": "gem-cutter",
          "biome": "ashlands",
          "tier": 8
        },
        {
          "level": 6,
          "upgrade": "smith-s-aprons",
          "biome": "deep-north",
          "tier": 9
        }
      ]
    },
    {
      "id": "forge",
      "name": "Forge",
      "names": {
        "cs": "Kovárna",
        "fr": "Forge",
        "ru": "Кузница"
      },
      "wiki": "https://valheim.weirdgloop.org/w/Forge",
      "type": "crafting",
      "materials": [
        {
          "item": "stone",
          "amount": 4
        },
        {
          "item": "coal",
          "amount": 4
        },
        {
          "item": "wood",
          "amount": 10
        },
        {
          "item": "copper",
          "amount": 6
        }
      ],
      "unlock": {
        "station": "workbench",
        "materials": [
          "stone",
          "coal",
          "wood",
          "copper"
        ]
      },
      "biome": "black-forest",
      "tier": 2,
      "maxLevel": 7,
      "levels": [
        {
          "level": 1,
          "upgrade": null,
          "biome": "black-forest",
          "tier": 2
        },
        {
          "level": 2,
          "upgrade": "forge-cooler",
          "biome": "black-forest",
          "tier": 2
        },
        {
          "level": 3,
          "upgrade": "anvils",
          "biome": "black-forest",
          "tier": 2
        },
        {
          "level": 4,
          "upgrade": "smith-s-anvil",
          "biome": "swamp",
          "tier": 4
        },
        {
          "level": 5,
          "upgrade": "forge-toolrack",
          "biome": "swamp",
          "tier": 4
        },
        {
          "level": 6,
          "upgrade": "forge-bellows",
          "biome": "swamp",
          "tier": 4
        },
        {
          "level": 7,
          "upgrade": "grinding-wheel",
          "biome": "swamp",
          "tier": 4
        }
      ]
    },
    {
      "id": "stonecutter",
      "name": "Stonecutter",
      "names": {
        "cs": "Lamač kamene",
        "fr": "Tailleur de pierre",
        "ru": "Камнерез"
      },
      "wiki": "https://valheim.weirdgloop.org/w/Stonecutter",
      "type": "crafting",
      "materials": [
        {
          "item": "wood",
          "amount": 10
        },
        {
          "item": "iron",
          "amount": 2
        },
        {
          "item": "stone",
          "amount": 4
        }
      ],
      "unlock": {
        "station": "workbench",
        "materials": [
          "wood",
          "iron",
          "stone"
        ]
      },
      "biome": "swamp",
      "tier": 4,
      "maxLevel": 1,
      "levels": [
        {
          "level": 1,
          "upgrade": null,
          "biome": "swamp",
          "tier": 4
        }
      ]
    },
    {
      "id": "workbench",
      "name": "Workbench",
      "names": {
        "cs": "Pracovní stůl",
        "de": "Werkbank",
        "fr": "Table de fabrication",
        "ru": "Верстак"
      },
      "wiki": "https://valheim.weirdgloop.org/w/Workbench",
      "type": "crafting",
      "materials": [
        {
          "item": "wood",
          "amount": 10
        }
      ],
      "unlock": {
        "station": null,
        "materials": [
          "wood"
        ]
      },
      "biome": "meadows",
      "tier": 1,
      "maxLevel": 5,
      "levels": [
        {
          "level": 1,
          "upgrade": null,
          "biome": "meadows",
          "tier": 1
        },
        {
          "level": 2,
          "upgrade": "chopping-block",
          "biome": "meadows",
          "tier": 1
        },
        {
          "level": 3,
          "upgrade": "tanning-rack",
          "biome": "meadows",
          "tier": 1
        },
        {
          "level": 4,
          "upgrade": "adze",
          "biome": "black-forest",
          "tier": 2
        },
        {
          "level": 5,
          "upgrade": "tool-shelf",
          "biome": "mountain",
          "tier": 5
        }
      ]
    }
  ],
  "tips": [
    {
      "id": "range",
      "text": "Keep furniture within {count} meters of your character.",
      "count": 10,
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Comfort"
    },
    {
      "id": "shelter",
      "text": "Without shelter, sitting near a fire caps comfort at {count}.",
      "count": 1,
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Comfort"
    },
    {
      "id": "hearth",
      "text": "Hearth gives its extra comfort only within {count} meters.",
      "count": 8,
      "biome": "swamp",
      "source": "https://valheim.weirdgloop.org/w/Comfort"
    },
    {
      "id": "fire",
      "text": "Fires must be lit to provide comfort.",
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Comfort"
    },
    {
      "id": "tub",
      "text": "Hot Tub provides comfort only when fueled and heated.",
      "biome": "plains",
      "source": "https://valheim.weirdgloop.org/w/Hot_Tub"
    },
    {
      "id": "categories",
      "text": "Only the highest comfort piece in each category counts.",
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Comfort"
    },
    {
      "id": "dungeon",
      "text": "A Campfire in a dungeon entrance can restore a {count}-minute Rested effect.",
      "count": 10,
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Rested"
    },
    {
      "id": "wet",
      "text": "Wet prevents Resting, except while sitting in a Hot Tub.",
      "biome": "plains",
      "source": "https://valheim.weirdgloop.org/w/Resting"
    },
    {
      "id": "rested",
      "text": "Rested lasts {count} minutes plus your comfort level.",
      "count": 7,
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Resting"
    },
    {
      "id": "wait",
      "text": "Rest for {count} uninterrupted seconds, away from hostile creatures, to gain Rested.",
      "count": 20,
      "biome": "meadows",
      "source": "https://valheim.weirdgloop.org/w/Resting"
    }
  ]
};
