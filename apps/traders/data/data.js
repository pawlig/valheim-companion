globalThis.VC_TRADERS_DATA = {
  "traders": [
    {
      "id": "haldor",
      "name": "Haldor",
      "biome": "black-forest",
      "title": "The Traveling Merchant",
      "description": "A cheerful dwarven merchant camping in the Black Forest with his faithful lox, Halstein. Sheltered within a magical rune-inscribed ward where weapons cannot be drawn.",
      "mapIconTip": "His location is revealed with a money bag icon on the map when you wander within 1500 meters of any of his possible spawning clearings.",
      "items": [
        {
          "id": "yule-hat",
          "name": "Yule Hat",
          "quantity": 1,
          "price": 100,
          "description": "Cosmetic headpiece (Uses the Helmet Slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/yule-hat.png",
          "biome": "black-forest"
        },
        {
          "id": "dverger-circlet",
          "name": "Dverger Circlet",
          "quantity": 1,
          "price": 620,
          "description": "Provides light in front of yourself. (Uses the Helmet Slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/dverger-circlet.png",
          "biome": "black-forest"
        },
        {
          "id": "megingjord",
          "name": "Megingjord",
          "quantity": 1,
          "price": 950,
          "description": "Increases inventory carry weight limit by 150. (Uses the Accessory slot)",
          "unlockedBy": null,
          "image": null,
          "biome": "black-forest"
        },
        {
          "id": "ymir-flesh",
          "name": "Ymir Flesh",
          "quantity": 1,
          "price": 120,
          "description": "Crafting material needed for high tier equipment.",
          "unlockedBy": {
            "type": "boss",
            "id": "the-elder",
            "name": "The Elder",
            "biome": "black-forest",
            "text": "Requires defeating The Elder"
          },
          "image": "../smithy/img/items/ymir-flesh.png",
          "biome": "black-forest"
        },
        {
          "id": "fishing-rod",
          "name": "Fishing Rod",
          "quantity": 1,
          "price": 350,
          "description": "Allows you to obtain Fish as a food. (Uses both hands when equipped)",
          "unlockedBy": null,
          "image": null,
          "biome": "black-forest"
        },
        {
          "id": "fishing-bait",
          "name": "Fishing Bait",
          "quantity": 20,
          "price": 10,
          "description": "Required for use with the Fishing Rod. (Currently not craftable)",
          "unlockedBy": null,
          "image": null,
          "biome": "black-forest"
        },
        {
          "id": "thunder-stone",
          "name": "Thunder Stone",
          "quantity": 1,
          "price": 50,
          "description": "Required to build Obliterator.",
          "unlockedBy": {
            "type": "boss",
            "id": "the-elder",
            "name": "The Elder",
            "biome": "black-forest",
            "text": "Requires defeating The Elder"
          },
          "image": null,
          "biome": "black-forest"
        },
        {
          "id": "egg",
          "name": "Egg",
          "quantity": 1,
          "price": 1500,
          "description": "Required to obtain Chickens and Hens.",
          "unlockedBy": {
            "type": "boss",
            "id": "yagluth",
            "name": "Yagluth",
            "biome": "plains",
            "text": "Requires defeating Yagluth"
          },
          "image": "../provisions/img/items/egg.png",
          "biome": "plains"
        },
        {
          "id": "barrel-hoops",
          "name": "Barrel Hoops",
          "quantity": 3,
          "price": 100,
          "description": "Required to build Barrels.",
          "unlockedBy": null,
          "image": null,
          "biome": "black-forest"
        },
        {
          "id": "wider-pockets",
          "name": "Wider Pockets",
          "quantity": 1,
          "price": 1000,
          "description": "Permanently adds a row to the inventory (+8 slots). (Can only be bought once per player)",
          "unlockedBy": {
            "type": "boss",
            "id": "moder",
            "name": "Moder",
            "biome": "mountain",
            "text": "Requires defeating Moder"
          },
          "image": null,
          "biome": "mountain"
        },
        {
          "id": "deeper-pockets",
          "name": "Deeper Pockets",
          "quantity": 1,
          "price": 2000,
          "description": "Permanently adds another row to the inventory (+8 slots). (Can only be bought once per player)",
          "unlockedBy": {
            "type": "boss",
            "id": "the-queen",
            "name": "The Queen",
            "biome": "mistlands",
            "text": "Requires defeating The Queen"
          },
          "image": null,
          "biome": "mistlands"
        }
      ]
    },
    {
      "id": "hildir",
      "name": "Hildir",
      "biome": "meadows",
      "title": "The Wandering Sister",
      "description": "Haldor’s adventurous sister who set up a camp in the peaceful Meadows with her two woolly lox. Her wagon was ambushed and pillaged by three dangerous minibosses; recover her stolen chests to unlock her full wardrobe.",
      "mapIconTip": "Her camp appears on the map as a two-tusked shirt/hanger icon when you approach within 3000 to 5000 meters of her location in the Meadows.",
      "items": [
        {
          "id": "shawl-dress-brown",
          "name": "Shawl dress brown",
          "quantity": 1,
          "price": 450,
          "description": "A brown dress accompanied by a warm shawl. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/shawl-dress-brown.png",
          "biome": "mountain"
        },
        {
          "id": "beaded-dress-brown",
          "name": "Beaded dress brown",
          "quantity": 1,
          "price": 550,
          "description": "A brown dress accompanied by beads and silver. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/beaded-dress-brown.png",
          "biome": "plains"
        },
        {
          "id": "shawl-dress-blue",
          "name": "Shawl dress blue",
          "quantity": 1,
          "price": 450,
          "description": "A blue dress accompanied by a warm shawl. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/shawl-dress-blue.png",
          "biome": "mountain"
        },
        {
          "id": "beaded-dress-blue",
          "name": "Beaded dress blue",
          "quantity": 1,
          "price": 550,
          "description": "A blue dress accompanied by beads and bronze. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/beaded-dress-blue.png",
          "biome": "plains"
        },
        {
          "id": "shawl-dress-yellow",
          "name": "Shawl dress yellow",
          "quantity": 1,
          "price": 450,
          "description": "A yellow dress accompanied by a warm shawl. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/shawl-dress-yellow.png",
          "biome": "mountain"
        },
        {
          "id": "beaded-dress-yellow",
          "name": "Beaded dress yellow",
          "quantity": 1,
          "price": 550,
          "description": "A yellow dress accompanied by beads and silver. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/beaded-dress-yellow.png",
          "biome": "plains"
        },
        {
          "id": "simple-dress-natural",
          "name": "Simple dress natural",
          "quantity": 1,
          "price": 250,
          "description": "A simple dress. (Uses the Shirt Slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/simple-dress-natural.png",
          "biome": "meadows"
        },
        {
          "id": "cape-tunic-blue",
          "name": "Cape tunic blue",
          "quantity": 1,
          "price": 450,
          "description": "A blue tunic accompanied by a cape. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/cape-tunic-blue.png",
          "biome": "mountain"
        },
        {
          "id": "beaded-tunic-blue",
          "name": "Beaded tunic blue",
          "quantity": 1,
          "price": 550,
          "description": "A blue tunic accompanied by beads and silver. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/beaded-tunic-blue.png",
          "biome": "plains"
        },
        {
          "id": "cape-tunic-red",
          "name": "Cape tunic red",
          "quantity": 1,
          "price": 450,
          "description": "A red tunic accompanied by a cape. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/cape-tunic-red.png",
          "biome": "mountain"
        },
        {
          "id": "beaded-tunic-red",
          "name": "Beaded tunic red",
          "quantity": 1,
          "price": 550,
          "description": "A red tunic accompanied by beads and bronze. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/beaded-tunic-red.png",
          "biome": "plains"
        },
        {
          "id": "cape-tunic-yellow",
          "name": "Cape tunic yellow",
          "quantity": 1,
          "price": 450,
          "description": "A yellow tunic accompanied by a cape. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/cape-tunic-yellow.png",
          "biome": "mountain"
        },
        {
          "id": "beaded-tunic-yellow",
          "name": "Beaded tunic yellow",
          "quantity": 1,
          "price": 550,
          "description": "A yellow tunic accompanied by beads and silver. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/beaded-tunic-yellow.png",
          "biome": "plains"
        },
        {
          "id": "simple-tunic-natural",
          "name": "Simple tunic natural",
          "quantity": 1,
          "price": 250,
          "description": "A simple tunic. (Uses the Shirt Slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/simple-tunic-natural.png",
          "biome": "meadows"
        },
        {
          "id": "simple-dress-brown",
          "name": "Simple dress brown",
          "quantity": 1,
          "price": 350,
          "description": "A simple brown dress. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/simple-dress-brown.png",
          "biome": "black-forest"
        },
        {
          "id": "simple-dress-blue",
          "name": "Simple dress blue",
          "quantity": 1,
          "price": 350,
          "description": "A simple blue dress. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/simple-dress-blue.png",
          "biome": "black-forest"
        },
        {
          "id": "simple-dress-yellow",
          "name": "Simple dress yellow",
          "quantity": 1,
          "price": 350,
          "description": "A simple yellow dress. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/simple-dress-yellow.png",
          "biome": "black-forest"
        },
        {
          "id": "simple-tunic-blue",
          "name": "Simple tunic blue",
          "quantity": 1,
          "price": 350,
          "description": "A simple blue tunic. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/simple-tunic-blue.png",
          "biome": "black-forest"
        },
        {
          "id": "simple-tunic-red",
          "name": "Simple tunic red",
          "quantity": 1,
          "price": 350,
          "description": "A simple red tunic. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/simple-tunic-red.png",
          "biome": "black-forest"
        },
        {
          "id": "simple-tunic-yellow",
          "name": "Simple tunic yellow",
          "quantity": 1,
          "price": 350,
          "description": "A simple yellow tunic. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/simple-tunic-yellow.png",
          "biome": "black-forest"
        },
        {
          "id": "harvest-tunic",
          "name": "Harvest tunic",
          "quantity": 1,
          "price": 550,
          "description": "When working the fields, it's important to dress accordingly. A shorter tunic lets in a cool breeze. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/harvest-tunic.png",
          "biome": "black-forest"
        },
        {
          "id": "harvest-dress",
          "name": "Harvest dress",
          "quantity": 1,
          "price": 550,
          "description": "When working the fields, it's important to dress accordingly. This long dress keeps your knees covered while you work. (Uses the Shirt Slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/harvest-dress.png",
          "biome": "black-forest"
        },
        {
          "id": "tied-headscarf-blue",
          "name": "Tied headscarf blue",
          "quantity": 1,
          "price": 200,
          "description": "A blue practical headscarf. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/tied-headscarf-blue.png",
          "biome": "black-forest"
        },
        {
          "id": "twisted-headscarf-green",
          "name": "Twisted headscarf green",
          "quantity": 1,
          "price": 250,
          "description": "A fancy green headscarf. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/twisted-headscarf-green.png",
          "biome": "mountain"
        },
        {
          "id": "fur-cap-brown",
          "name": "Fur cap brown",
          "quantity": 1,
          "price": 200,
          "description": "A warm fur cap, made from the finest leather. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/fur-cap-brown.png",
          "biome": "black-forest"
        },
        {
          "id": "extravagant-cap-green",
          "name": "Extravagant cap green",
          "quantity": 1,
          "price": 250,
          "description": "An extravagant green cap. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/extravagant-cap-green.png",
          "biome": "mountain"
        },
        {
          "id": "simple-cap-red",
          "name": "Simple cap red",
          "quantity": 1,
          "price": 150,
          "description": "A simple yet fashionable red cap. (Uses the Helmet slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/simple-cap-red.png",
          "biome": "meadows"
        },
        {
          "id": "tied-headscarf-yellow",
          "name": "Tied headscarf yellow",
          "quantity": 1,
          "price": 250,
          "description": "A practical yellow headscarf. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "silver",
            "boss": "geirrhafa",
            "bossName": "Geirrhafa",
            "location": "Howling Cavern",
            "biome": "mountain",
            "text": "Requires returning Hildir's silver chest (Geirrhafa)"
          },
          "image": "../smithy/img/armor/tied-headscarf-yellow.png",
          "biome": "mountain"
        },
        {
          "id": "twisted-headscarf-red",
          "name": "Twisted headscarf red",
          "quantity": 1,
          "price": 300,
          "description": "A fancy red headscarf. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/twisted-headscarf-red.png",
          "biome": "plains"
        },
        {
          "id": "fur-cap-grey",
          "name": "Fur cap grey",
          "quantity": 1,
          "price": 300,
          "description": "A warm fur cap, made from the finest wool. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/fur-cap-grey.png",
          "biome": "plains"
        },
        {
          "id": "extravagant-cap-orange",
          "name": "Extravagant cap orange",
          "quantity": 1,
          "price": 300,
          "description": "An extravagant orange cap. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": "../smithy/img/armor/extravagant-cap-orange.png",
          "biome": "plains"
        },
        {
          "id": "simple-cap-purple",
          "name": "Simple cap purple",
          "quantity": 1,
          "price": 150,
          "description": "A simple yet fashionable purple cap. (Uses the Helmet slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/simple-cap-purple.png",
          "biome": "meadows"
        },
        {
          "id": "straw-hat",
          "name": "Straw hat",
          "quantity": 1,
          "price": 300,
          "description": "The perfect way to avoid sunstroke. (Uses the Helmet slot)",
          "unlockedBy": {
            "type": "chest",
            "chest": "brass",
            "boss": "brenna",
            "bossName": "Brenna",
            "location": "Smouldering Tomb",
            "biome": "black-forest",
            "text": "Requires returning Hildir's brass chest (Brenna)"
          },
          "image": "../smithy/img/armor/straw-hat.png",
          "biome": "black-forest"
        },
        {
          "id": "headband",
          "name": "Headband",
          "quantity": 1,
          "price": 175,
          "description": "It feels a bit...moist. (Uses the Helmet slot)",
          "unlockedBy": null,
          "image": "../smithy/img/armor/headband.png",
          "biome": "meadows"
        },
        {
          "id": "basic-fireworks",
          "name": "Basic fireworks",
          "quantity": 1,
          "price": 50,
          "description": "This rocket's blasting off again!",
          "unlockedBy": {
            "type": "chest",
            "chest": "bronze",
            "boss": "zil-thungr",
            "bossName": "Zil & Thungr",
            "location": "Sealed Tower",
            "biome": "plains",
            "text": "Requires returning Hildir's bronze chest (Zil & Thungr)"
          },
          "image": null,
          "biome": "plains"
        },
        {
          "id": "sparkler",
          "name": "Sparkler",
          "quantity": 1,
          "price": 150,
          "description": "It's a stick that sparkles. Pretty! (Uses one hand when equipped)",
          "unlockedBy": null,
          "image": null,
          "biome": "meadows"
        },
        {
          "id": "iron-pit",
          "name": "Iron Pit",
          "quantity": 1,
          "price": 75,
          "description": "An empty vessel waiting to be filled with firewood and kindling",
          "unlockedBy": null,
          "image": "../comfort/img/items/iron-pit.png",
          "biome": "meadows"
        },
        {
          "id": "barber-kit",
          "name": "Barber Kit",
          "quantity": 1,
          "price": 600,
          "description": "A kit fit for the finest of barbers.",
          "unlockedBy": null,
          "image": "../comfort/img/items/barber-kit.png",
          "biome": "meadows"
        }
      ]
    },
    {
      "id": "bog-witch",
      "name": "The Bog Witch",
      "biome": "swamp",
      "title": "The Swampland Alchemist",
      "description": "A mysterious, cackling crone residing inside an enchanted wooden hut deep in the misty Swamps. She concocts esoteric elixirs, potions, and sells rare culinary seasonings for the grandest feasts.",
      "mapIconTip": "Her location is marked on the map with a glowing bubbling cauldron icon when you travel within 1500 meters of her swamp clearing.",
      "items": [
        {
          "id": "candle-wick",
          "name": "Candle Wick",
          "quantity": 50,
          "price": 100,
          "description": "Required for Resin candle.",
          "unlockedBy": null,
          "image": null,
          "biome": "swamp"
        },
        {
          "id": "scythe-handle",
          "name": "Scythe Handle",
          "quantity": 1,
          "price": 200,
          "description": "Required for Scythe.",
          "unlockedBy": {
            "type": "boss",
            "id": "moder",
            "name": "Moder",
            "biome": "mountain",
            "text": "Requires defeating Moder"
          },
          "image": null,
          "biome": "mountain"
        },
        {
          "id": "love-potion",
          "name": "Love Potion",
          "quantity": 5,
          "price": 110,
          "description": "Increases Troll spawning.",
          "unlockedBy": null,
          "image": "../provisions/img/meads/love-potion.png",
          "biome": "swamp"
        },
        {
          "id": "toadstool",
          "name": "Toadstool",
          "quantity": 1,
          "price": 85,
          "description": "Required for Berserkir Mead.",
          "unlockedBy": {
            "type": "boss",
            "id": "moder",
            "name": "Moder",
            "biome": "mountain",
            "text": "Requires defeating Moder"
          },
          "image": "../provisions/img/items/toadstool.png",
          "biome": "mountain"
        },
        {
          "id": "fragrant-bundle",
          "name": "Fragrant Bundle",
          "quantity": 5,
          "price": 140,
          "description": "Required for Anti-Sting Concoction.",
          "unlockedBy": {
            "type": "boss",
            "id": "moder",
            "name": "Moder",
            "biome": "mountain",
            "text": "Requires defeating Moder"
          },
          "image": "../provisions/img/items/fragrant-bundle.png",
          "biome": "mountain"
        },
        {
          "id": "fresh-seaweed",
          "name": "Fresh Seaweed",
          "quantity": 5,
          "price": 75,
          "description": "Required for Draught of Vananidir.",
          "unlockedBy": null,
          "image": "../provisions/img/items/fresh-seaweed.png",
          "biome": "swamp"
        },
        {
          "id": "cured-squirrel-hamstring",
          "name": "Cured Squirrel Hamstring",
          "quantity": 5,
          "price": 80,
          "description": "Required for Tonic of Ratatosk.",
          "unlockedBy": null,
          "image": "../provisions/img/items/cured-squirrel-hamstring.png",
          "biome": "swamp"
        },
        {
          "id": "powdered-dragon-eggshells",
          "name": "Powdered Dragon Eggshells",
          "quantity": 5,
          "price": 120,
          "description": "Required for Mead of Troll Endurance.",
          "unlockedBy": null,
          "image": "../provisions/img/items/powdered-dragon-eggshells.png",
          "biome": "swamp"
        },
        {
          "id": "pungent-pebbles",
          "name": "Pungent Pebbles",
          "quantity": 5,
          "price": 125,
          "description": "Required for Brew of Animal Whispers.",
          "unlockedBy": null,
          "image": "../provisions/img/items/pungent-pebbles.png",
          "biome": "swamp"
        },
        {
          "id": "ivy-seeds",
          "name": "Ivy Seeds",
          "quantity": 3,
          "price": 65,
          "description": "Required to plant Ivy.",
          "unlockedBy": null,
          "image": null,
          "biome": "swamp"
        },
        {
          "id": "serving-tray",
          "name": "Serving Tray",
          "quantity": 1,
          "price": 140,
          "description": "Required to eat Feast.",
          "unlockedBy": null,
          "image": null,
          "biome": "swamp"
        },
        {
          "id": "woodland-herb-blend",
          "name": "Woodland Herb Blend",
          "quantity": 5,
          "price": 120,
          "description": "Required for Whole Roasted Meadow Boar, Black Forest Buffet Platter and Swamp Dweller's Delight feasts.",
          "unlockedBy": {
            "type": "boss",
            "id": "the-elder",
            "name": "The Elder",
            "biome": "black-forest",
            "text": "Requires defeating The Elder"
          },
          "image": "../provisions/img/items/woodland-herb-blend.png",
          "biome": "black-forest"
        },
        {
          "id": "seafarer-s-herbs",
          "name": "Seafarer's Herbs",
          "quantity": 5,
          "price": 130,
          "description": "Required for Sailor's Bounty feast.",
          "unlockedBy": {
            "type": "creature",
            "id": "serpent",
            "name": "Serpent",
            "biome": "ocean",
            "text": "Requires killing a Serpent"
          },
          "image": "../provisions/img/items/seafarer-s-herbs.png",
          "biome": "ocean"
        },
        {
          "id": "mountain-peak-pepper-powder",
          "name": "Mountain Peak Pepper Powder",
          "quantity": 5,
          "price": 140,
          "description": "Required for Hearty Mountain Logger's Stew feast.",
          "unlockedBy": {
            "type": "boss",
            "id": "moder",
            "name": "Moder",
            "biome": "mountain",
            "text": "Requires defeating Moder"
          },
          "image": "../provisions/img/items/mountain-peak-pepper-powder.png",
          "biome": "mountain"
        },
        {
          "id": "grasslands-herbalist-harvest",
          "name": "Grasslands Herbalist Harvest",
          "quantity": 5,
          "price": 160,
          "description": "Required for Plains Pie Picnic feast.",
          "unlockedBy": {
            "type": "boss",
            "id": "yagluth",
            "name": "Yagluth",
            "biome": "plains",
            "text": "Requires defeating Yagluth"
          },
          "image": "../provisions/img/items/grasslands-herbalist-harvest.png",
          "biome": "plains"
        },
        {
          "id": "herbs-of-the-hidden-hills",
          "name": "Herbs of the Hidden Hills",
          "quantity": 5,
          "price": 180,
          "description": "Required for Mushrooms Galore á la Mistlands feast.",
          "unlockedBy": {
            "type": "boss",
            "id": "the-queen",
            "name": "The Queen",
            "biome": "mistlands",
            "text": "Requires defeating The Queen"
          },
          "image": "../provisions/img/items/herbs-of-the-hidden-hills.png",
          "biome": "mistlands"
        },
        {
          "id": "fiery-spice-powder",
          "name": "Fiery Spice Powder",
          "quantity": 5,
          "price": 200,
          "description": "Required for Ashlands Gourmet Bowl feast.",
          "unlockedBy": {
            "type": "boss",
            "id": "fader",
            "name": "Fader",
            "biome": "ashlands",
            "text": "Requires defeating Fader"
          },
          "image": "../provisions/img/items/fiery-spice-powder.png",
          "biome": "ashlands"
        },
        {
          "id": "seasoning-of-the-gourd",
          "name": "Seasoning of the Gourd",
          "quantity": 5,
          "price": 220,
          "description": "Required for Northern Morning Fare feast.",
          "unlockedBy": {
            "type": "boss",
            "id": "kall-fimbulbringer",
            "name": "Kall Fimbulbringer",
            "biome": "deep-north",
            "text": "Requires defeating Kall Fimbulbringer"
          },
          "image": "../provisions/img/items/seasoning-of-the-gourd.png",
          "biome": "deep-north"
        },
        {
          "id": "corked-vial",
          "name": "Corked Vial",
          "quantity": 5,
          "price": 150,
          "description": "Required for Blob Bombs.",
          "unlockedBy": {
            "type": "boss",
            "id": "the-elder",
            "name": "The Elder",
            "biome": "black-forest",
            "text": "Requires defeating The Elder"
          },
          "image": null,
          "biome": "black-forest"
        },
        {
          "id": "crown-of-roots",
          "name": "Crown of Roots",
          "quantity": 1,
          "price": 3000,
          "description": "Gives 1 armor.",
          "unlockedBy": {
            "type": "creature",
            "id": "writhan",
            "name": "Writhan",
            "biome": "swamp",
            "text": "Requires defeating a Writhan"
          },
          "image": "../smithy/img/armor/crown-of-roots.png",
          "biome": "swamp"
        }
      ]
    }
  ],
  "valuables": [
    {
      "id": "amber",
      "name": "Amber",
      "value": 5,
      "description": "Petrified golden tree resin found in crypts, troll caves, and sunken chests. Redeemable for 5 coins.",
      "image": null
    },
    {
      "id": "amber-pearl",
      "name": "Amber Pearl",
      "value": 10,
      "description": "A polished, lustrous amber gemstone discovered in ancient burial sites. Redeemable for 10 coins.",
      "image": "../smithy/img/items/amber-pearl.png"
    },
    {
      "id": "ruby",
      "name": "Ruby",
      "value": 20,
      "description": "A precious brilliant crimson stone found in crypt chests and sunken ruins. Redeemable for 20 coins.",
      "image": null
    },
    {
      "id": "silver-necklace",
      "name": "Silver Necklace",
      "value": 30,
      "description": "An ancient silver trinket buried with long-forgotten Viking nobility. Redeemable for 30 coins.",
      "image": null
    }
  ],
  "biomes": [
    {
      "id": "meadows",
      "order": 1,
      "creatures": {
        "boss": [
          "eikthyr"
        ]
      }
    },
    {
      "id": "black-forest",
      "order": 2,
      "creatures": {
        "boss": [
          "the-elder"
        ]
      }
    },
    {
      "id": "ocean",
      "order": 3,
      "creatures": {
        "boss": []
      }
    },
    {
      "id": "swamp",
      "order": 4,
      "creatures": {
        "boss": [
          "bonemass"
        ]
      }
    },
    {
      "id": "mountain",
      "order": 5,
      "creatures": {
        "boss": [
          "moder"
        ]
      }
    },
    {
      "id": "plains",
      "order": 6,
      "creatures": {
        "boss": [
          "yagluth"
        ]
      }
    },
    {
      "id": "mistlands",
      "order": 7,
      "creatures": {
        "boss": [
          "the-queen"
        ]
      }
    },
    {
      "id": "ashlands",
      "order": 8,
      "creatures": {
        "boss": [
          "fader"
        ]
      }
    },
    {
      "id": "deep-north",
      "order": 9,
      "creatures": {
        "boss": [
          "kall-fimbulbringer"
        ]
      }
    }
  ]
};
