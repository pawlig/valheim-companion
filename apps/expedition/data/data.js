window.VCX_DATA = {
  "events": [
    {
      "id": "army_eikthyr",
      "startMessage": "Eikthyr rallies the creatures of the forest.",
      "endMessage": "The creatures are calming down.",
      "creatures": [
        "boar",
        "neck"
      ],
      "creatureDetails": [
        {
          "id": "boar",
          "name": "Boar",
          "biomes": [
            "meadows"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        },
        {
          "id": "neck",
          "name": "Neck",
          "biomes": [
            "meadows"
          ],
          "modifiers": {
            "fire": "weak",
            "poison": "resistant",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "start",
        "ids": []
      },
      "conditions": [],
      "disabledBy": [
        "eikthyr"
      ],
      "biomes": [
        "meadows",
        "black-forest"
      ],
      "durationSeconds": 90,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_theelder",
      "startMessage": "The forest is moving...",
      "endMessage": "The forest rests again.",
      "creatures": [
        "greydwarf",
        "greydwarf-brute",
        "greydwarf-shaman"
      ],
      "creatureDetails": [
        {
          "id": "greydwarf",
          "name": "Greydwarf",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "fire": "veryweak",
            "poison": "resistant",
            "spirit": "immune"
          }
        },
        {
          "id": "greydwarf-brute",
          "name": "Greydwarf Brute",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "fire": "veryweak",
            "poison": "resistant",
            "spirit": "immune"
          }
        },
        {
          "id": "greydwarf-shaman",
          "name": "Greydwarf Shaman",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "fire": "veryweak",
            "poison": "resistant",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "eikthyr"
        ]
      },
      "conditions": [
        {
          "id": "eikthyr",
          "name": "Eikthyr",
          "biomes": [
            "meadows"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "the-elder"
      ],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "plains"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_bonemass",
      "startMessage": "A foul smell from the swamp...",
      "endMessage": "The smell is gone.",
      "creatures": [
        "draugr",
        "skeleton"
      ],
      "creatureDetails": [
        {
          "id": "draugr",
          "name": "Draugr",
          "biomes": [
            "swamp",
            "mountain"
          ],
          "modifiers": {
            "fire": "resistant",
            "poison": "immune"
          }
        },
        {
          "id": "skeleton",
          "name": "Skeleton",
          "biomes": [
            "black-forest",
            "swamp",
            "mountain",
            "deep-north"
          ],
          "modifiers": {
            "blunt": "weak",
            "fire": "weak",
            "pierce": "resistant",
            "frost": "resistant",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "the-elder"
        ]
      },
      "conditions": [
        {
          "id": "the-elder",
          "name": "The Elder",
          "biomes": [
            "black-forest"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "bonemass"
      ],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "mountain",
        "plains"
      ],
      "durationSeconds": 150,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_moder",
      "startMessage": "A cold wind blows from the mountains.",
      "endMessage": "The cold wind is gone.",
      "creatures": [
        "drake"
      ],
      "creatureDetails": [
        {
          "id": "drake",
          "name": "Drake",
          "biomes": [
            "mountain"
          ],
          "modifiers": {
            "fire": "weak",
            "frost": "immune",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "moder"
      ],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "mountain",
        "plains"
      ],
      "durationSeconds": 150,
      "notes": [
        "(Also applies Freezing on the area)"
      ],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_goblin",
      "startMessage": "The horde is attacking!",
      "endMessage": "The horde is retreating.",
      "creatures": [
        "fuling",
        "fuling-berserker",
        "fuling-shaman"
      ],
      "creatureDetails": [
        {
          "id": "fuling",
          "name": "Fuling",
          "biomes": [
            "plains"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        },
        {
          "id": "fuling-berserker",
          "name": "Fuling Berserker",
          "biomes": [
            "plains"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        },
        {
          "id": "fuling-shaman",
          "name": "Fuling Shaman",
          "biomes": [
            "plains"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "moder"
        ]
      },
      "conditions": [
        {
          "id": "moder",
          "name": "Moder",
          "biomes": [
            "mountain"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "yagluth"
      ],
      "biomes": [
        "meadows",
        "black-forest",
        "plains"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_gjall",
      "startMessage": "What's up, Gjall?!",
      "endMessage": "Good bye Gjall.",
      "creatures": [
        "gjall",
        "tick"
      ],
      "creatureDetails": [
        {
          "id": "gjall",
          "name": "Gjall",
          "biomes": [
            "mistlands"
          ],
          "modifiers": {
            "spirit": "immune",
            "fire": "resistant"
          }
        },
        {
          "id": "tick",
          "name": "Tick",
          "biomes": [
            "mistlands"
          ],
          "modifiers": {
            "pierce": "weak",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "yagluth"
        ]
      },
      "conditions": [
        {
          "id": "yagluth",
          "name": "Yagluth",
          "biomes": [
            "plains"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "the-queen"
      ],
      "biomes": [
        "mistlands"
      ],
      "durationSeconds": 90,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_seekers",
      "startMessage": "They sought you out.",
      "endMessage": "The search is over.",
      "creatures": [
        "seeker",
        "seeker-brood",
        "seeker-soldier"
      ],
      "creatureDetails": [
        {
          "id": "seeker",
          "name": "Seeker",
          "biomes": [
            "mistlands"
          ],
          "modifiers": {
            "blunt": "resistant",
            "pierce": "resistant",
            "slash": "resistant",
            "spirit": "immune"
          }
        },
        {
          "id": "seeker-brood",
          "name": "Seeker Brood",
          "biomes": [
            "mistlands"
          ],
          "modifiers": {
            "blunt": "resistant",
            "pierce": "resistant",
            "slash": "resistant",
            "spirit": "immune"
          }
        },
        {
          "id": "seeker-soldier",
          "name": "Seeker Soldier",
          "biomes": [
            "mistlands"
          ],
          "modifiers": {
            "blunt": "resistant",
            "pierce": "resistant",
            "slash": "resistant",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "yagluth"
        ]
      },
      "conditions": [
        {
          "id": "yagluth",
          "name": "Yagluth",
          "biomes": [
            "plains"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "the-queen"
      ],
      "biomes": [
        "black-forest",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_charred",
      "startMessage": "The undead army marches.",
      "endMessage": "The army retreats.",
      "creatures": [
        "charred-twitcher",
        "charred-marksman",
        "charred-warrior"
      ],
      "creatureDetails": [
        {
          "id": "charred-twitcher",
          "name": "Charred Twitcher",
          "biomes": [
            "ashlands"
          ],
          "modifiers": {
            "spirit": "weak",
            "pierce": "resistant",
            "fire": "veryresistant",
            "poison": "immune"
          }
        },
        {
          "id": "charred-marksman",
          "name": "Charred Marksman",
          "biomes": [
            "ashlands"
          ],
          "modifiers": {
            "spirit": "weak",
            "pierce": "resistant",
            "fire": "veryresistant",
            "poison": "immune"
          }
        },
        {
          "id": "charred-warrior",
          "name": "Charred Warrior",
          "biomes": [
            "ashlands"
          ],
          "modifiers": {
            "spirit": "weak",
            "pierce": "resistant",
            "fire": "veryresistant",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "the-queen"
        ]
      },
      "conditions": [
        {
          "id": "the-queen",
          "name": "The Queen",
          "biomes": [
            "mistlands"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "fader"
      ],
      "biomes": [
        "black-forest",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_charredspawners",
      "startMessage": "The dead have been summoned.",
      "endMessage": "The dead lie still once more.",
      "creatures": [],
      "creatureDetails": [],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "the-queen"
        ]
      },
      "conditions": [
        {
          "id": "the-queen",
          "name": "The Queen",
          "biomes": [
            "mistlands"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "fader"
      ],
      "biomes": [
        "black-forest",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [
        "Monument of Torments (won't despawn even after the raid is over)",
        "(won't despawn even after the raid is over)"
      ],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_jotuns",
      "startMessage": "The Jotun have found you.",
      "endMessage": "The Jotun withdraw.",
      "creatures": [
        "krigen",
        "elaking"
      ],
      "creatureDetails": [
        {
          "id": "krigen",
          "name": "Krigen",
          "biomes": [
            "deep-north"
          ],
          "modifiers": {
            "pierce": "resistant",
            "frost": "veryresistant",
            "poison": "immune",
            "spirit": "immune"
          }
        },
        {
          "id": "elaking",
          "name": "Elaking",
          "biomes": [
            "deep-north"
          ],
          "modifiers": {
            "fire": "weak",
            "frost": "resistant",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "any",
        "ids": [
          "krigen",
          "hexen"
        ]
      },
      "conditions": [
        {
          "id": "krigen",
          "name": "Krigen",
          "biomes": [
            "deep-north"
          ],
          "boss": false,
          "miniboss": false
        },
        {
          "id": "hexen",
          "name": "Hexen",
          "biomes": [
            "deep-north"
          ],
          "boss": false,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "kall-fimbulbringer"
      ],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "mountain",
        "plains",
        "mistlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "army_elakingar",
      "startMessage": "They emerge from below...",
      "endMessage": "They return to their burrows...",
      "creatures": [
        "elaking",
        "eyeless-one"
      ],
      "creatureDetails": [
        {
          "id": "elaking",
          "name": "Elaking",
          "biomes": [
            "deep-north"
          ],
          "modifiers": {
            "fire": "weak",
            "frost": "resistant",
            "spirit": "immune"
          }
        },
        {
          "id": "eyeless-one",
          "name": "Eyeless One",
          "biomes": [
            "deep-north"
          ],
          "modifiers": {
            "frost": "resistant",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "eyeless-one"
        ]
      },
      "conditions": [
        {
          "id": "eyeless-one",
          "name": "Eyeless One",
          "biomes": [
            "deep-north"
          ],
          "boss": false,
          "miniboss": false
        }
      ],
      "disabledBy": [
        "kall-fimbulbringer"
      ],
      "biomes": [
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "foresttrolls",
      "startMessage": "The ground is shaking.",
      "endMessage": "The shakes starts to fade.",
      "creatures": [
        "troll"
      ],
      "creatureDetails": [
        {
          "id": "troll",
          "name": "Troll",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "pierce": "weak",
            "blunt": "resistant",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "troll",
          "the-elder"
        ]
      },
      "conditions": [
        {
          "id": "troll",
          "name": "Troll",
          "biomes": [
            "black-forest"
          ],
          "boss": false,
          "miniboss": false
        },
        {
          "id": "the-elder",
          "name": "The Elder",
          "biomes": [
            "black-forest"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "plains"
      ],
      "durationSeconds": 80,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "blobs",
      "startMessage": "A foul smell from the swamp...",
      "endMessage": "The smell is gone.",
      "creatures": [
        "blob",
        "oozer"
      ],
      "creatureDetails": [
        {
          "id": "blob",
          "name": "Blob",
          "biomes": [
            "swamp"
          ],
          "modifiers": {
            "blunt": "weak",
            "frost": "weak",
            "lightning": "weak",
            "fire": "resistant",
            "pierce": "resistant",
            "slash": "resistant",
            "poison": "immune"
          }
        },
        {
          "id": "oozer",
          "name": "Oozer",
          "biomes": [
            "swamp"
          ],
          "modifiers": {
            "blunt": "weak",
            "frost": "weak",
            "lightning": "weak",
            "fire": "resistant",
            "pierce": "resistant",
            "slash": "resistant",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "plains"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "ghosts",
      "startMessage": "You feel a chill down your spine...",
      "endMessage": "They have been banished, for now...",
      "creatures": [
        "ghost",
        "wraith"
      ],
      "creatureDetails": [
        {
          "id": "ghost",
          "name": "Ghost",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "spirit": "weak",
            "blunt": "resistant",
            "slash": "resistant",
            "pierce": "resistant",
            "poison": "immune"
          }
        },
        {
          "id": "wraith",
          "name": "Wraith",
          "biomes": [
            "swamp"
          ],
          "modifiers": {
            "fire": "weak",
            "spirit": "weak",
            "blunt": "resistant",
            "pierce": "resistant",
            "slash": "resistant",
            "frost": "immune",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "mountain",
        "plains"
      ],
      "durationSeconds": 150,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "skeletons",
      "startMessage": "A skeleton surprise!",
      "endMessage": "Skeletons are tired of fighting.",
      "creatures": [
        "skeleton",
        "rancid-remains"
      ],
      "creatureDetails": [
        {
          "id": "skeleton",
          "name": "Skeleton",
          "biomes": [
            "black-forest",
            "swamp",
            "mountain",
            "deep-north"
          ],
          "modifiers": {
            "blunt": "weak",
            "fire": "weak",
            "pierce": "resistant",
            "frost": "resistant",
            "poison": "immune"
          }
        },
        {
          "id": "rancid-remains",
          "name": "Rancid Remains",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "blunt": "weak",
            "fire": "weak",
            "pierce": "resistant",
            "frost": "resistant",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "mountain",
        "plains",
        "mistlands"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "surtlings",
      "startMessage": "There's a smell of sulfur in the air...",
      "endMessage": "The smell is fading.",
      "creatures": [
        "surtling"
      ],
      "creatureDetails": [
        {
          "id": "surtling",
          "name": "Surtling",
          "biomes": [
            "swamp"
          ],
          "modifiers": {
            "frost": "weak",
            "fire": "immune",
            "poison": "immune",
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "surtling",
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "surtling",
          "name": "Surtling",
          "biomes": [
            "swamp"
          ],
          "boss": false,
          "miniboss": false
        },
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "swamp",
        "plains"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "wolves",
      "startMessage": "You are being hunted...",
      "endMessage": "The hunt is over.",
      "creatures": [
        "wolf"
      ],
      "creatureDetails": [
        {
          "id": "wolf",
          "name": "Wolf",
          "biomes": [
            "mountain"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "mountain",
        "plains"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "bats",
      "startMessage": "You stirred the cauldron.",
      "endMessage": "The cauldron calms.",
      "creatures": [
        "bat"
      ],
      "creatureDetails": [
        {
          "id": "bat",
          "name": "Bat",
          "biomes": [
            "mountain"
          ],
          "modifiers": {
            "fire": "weak",
            "spirit": "weak",
            "blunt": "resistant",
            "slash": "resistant",
            "pierce": "resistant",
            "frost": "immune",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "bat",
          "bonemass"
        ]
      },
      "conditions": [
        {
          "id": "bat",
          "name": "Bat",
          "biomes": [
            "mountain"
          ],
          "boss": false,
          "miniboss": false
        },
        {
          "id": "bonemass",
          "name": "Bonemass",
          "biomes": [
            "swamp"
          ],
          "boss": true,
          "miniboss": false
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "ocean",
        "swamp",
        "mountain",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 120,
      "notes": [],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "hildirboss1",
      "startMessage": "She's hot on your tail!",
      "endMessage": "She got burnt.",
      "creatures": [
        "brenna",
        "skeleton",
        "rancid-remains"
      ],
      "creatureDetails": [
        {
          "id": "brenna",
          "name": "Brenna",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "pierce": "resistant",
            "blunt": "weak",
            "frost": "weak",
            "fire": "immune",
            "poison": "immune"
          }
        },
        {
          "id": "skeleton",
          "name": "Skeleton",
          "biomes": [
            "black-forest",
            "swamp",
            "mountain",
            "deep-north"
          ],
          "modifiers": {
            "blunt": "weak",
            "fire": "weak",
            "pierce": "resistant",
            "frost": "resistant",
            "poison": "immune"
          }
        },
        {
          "id": "rancid-remains",
          "name": "Rancid Remains",
          "biomes": [
            "black-forest"
          ],
          "modifiers": {
            "blunt": "weak",
            "fire": "weak",
            "pierce": "resistant",
            "frost": "resistant",
            "poison": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "brenna"
        ]
      },
      "conditions": [
        {
          "id": "brenna",
          "name": "Brenna",
          "biomes": [
            "black-forest"
          ],
          "boss": false,
          "miniboss": true
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "ocean",
        "swamp",
        "mountain",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [
        "Brass Chest returned to Hildir"
      ],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "hildirboss2",
      "startMessage": "You get the chills...",
      "endMessage": "You can chill out.",
      "creatures": [
        "geirrhafa",
        "fenring",
        "cultist"
      ],
      "creatureDetails": [
        {
          "id": "geirrhafa",
          "name": "Geirrhafa",
          "biomes": [
            "mountain"
          ],
          "modifiers": {
            "fire": "weak",
            "frost": "immune"
          }
        },
        {
          "id": "fenring",
          "name": "Fenring",
          "biomes": [
            "mountain"
          ],
          "modifiers": {
            "fire": "weak",
            "poison": "resistant"
          }
        },
        {
          "id": "cultist",
          "name": "Cultist",
          "biomes": [
            "mountain"
          ],
          "modifiers": {
            "poison": "weak",
            "fire": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "geirrhafa"
        ]
      },
      "conditions": [
        {
          "id": "geirrhafa",
          "name": "Geirrhafa",
          "biomes": [
            "mountain"
          ],
          "boss": false,
          "miniboss": true
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "ocean",
        "swamp",
        "mountain",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [
        "Silver Chest returned to Hildir"
      ],
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "hildirboss3",
      "startMessage": "They were bros, man.",
      "endMessage": "You broke the code... again.",
      "creatures": [
        "zil-thungr",
        "fuling",
        "fuling-berserker"
      ],
      "creatureDetails": [
        {
          "id": "zil-thungr",
          "name": "Zil & Thungr",
          "biomes": [
            "plains"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        },
        {
          "id": "fuling",
          "name": "Fuling",
          "biomes": [
            "plains"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        },
        {
          "id": "fuling-berserker",
          "name": "Fuling Berserker",
          "biomes": [
            "plains"
          ],
          "modifiers": {
            "spirit": "immune"
          }
        }
      ],
      "enabledBy": {
        "mode": "all",
        "ids": [
          "zil-thungr"
        ]
      },
      "conditions": [
        {
          "id": "zil-thungr",
          "name": "Zil & Thungr",
          "biomes": [
            "plains"
          ],
          "boss": false,
          "miniboss": true
        }
      ],
      "disabledBy": [],
      "biomes": [
        "meadows",
        "black-forest",
        "ocean",
        "swamp",
        "mountain",
        "plains",
        "mistlands",
        "ashlands",
        "deep-north"
      ],
      "durationSeconds": 90,
      "notes": [
        "Bronze Chest returned to Hildir"
      ],
      "source": "https://valheim.weirdgloop.org/w/Events"
    }
  ],
  "expedition": {
    "bosses": [
      {
        "id": "eikthyr",
        "name": "Eikthyr",
        "biome": "meadows",
        "order": 1,
        "altar": {
          "name": "Forsaken Altar",
          "howToFind": "Eikthyr's Forsaken Altar is located in the Meadows. To the left of his Sacrificial Stone is a small glowing Runestone called a Vegvisir; interacting with it will add his closest summoning location on the map."
        },
        "summonItems": [
          {
            "id": "deer-trophy",
            "count": 2
          }
        ],
        "forsakenPower": {
          "name": "Eikthyr Power",
          "effect": "60% reduced stamina usage for running, jumping, and swimming.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/Eikthyr"
      },
      {
        "id": "the-elder",
        "name": "The Elder",
        "biome": "black-forest",
        "order": 2,
        "altar": {
          "name": "Forsaken Altar",
          "howToFind": "The Elder's Forsaken Altar is located in Black Forests. His location can be revealed when visiting Burial Chambers and sometimes ruined structures around Black Forests, where a Vegvisir will reveal his nearest summoning location on the map."
        },
        "summonItems": [
          {
            "id": "ancient-seed",
            "count": 3
          }
        ],
        "forsakenPower": {
          "name": "The Elder Power",
          "effect": "+60% Chop and Pickaxe damage increase, +30% health regeneration increase.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/The_Elder"
      },
      {
        "id": "bonemass",
        "name": "Bonemass",
        "biome": "swamp",
        "order": 4,
        "altar": {
          "name": "Forsaken Altar",
          "howToFind": "Bonemass' Forsaken Altar is located in Swamps. His location can be found when visiting Sunken Crypts and sometimes ruined structures, where a Vegvisir will reveal his nearest summoning location on the map."
        },
        "summonItems": [
          {
            "id": "withered-bone",
            "count": 10
          }
        ],
        "forsakenPower": {
          "name": "Bonemass Power",
          "effect": "Slightly resistant (-25%) VS pierce, slash, and blunt damage, -100% block stamina cost, +5 stamina returned per block.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/Bonemass"
      },
      {
        "id": "moder",
        "name": "Moder",
        "biome": "mountain",
        "order": 5,
        "altar": {
          "name": "Forsaken Altar",
          "howToFind": "Moder's Forsaken Altar is located in the Mountains. Her location can be found when visiting specific ruined structures, typically at the top, where a Vegvisir will reveal her nearest summoning location on the map."
        },
        "summonItems": [
          {
            "id": "dragon-egg",
            "count": 3
          }
        ],
        "forsakenPower": {
          "name": "Moder Power",
          "effect": "Always tailwind when sailing, +300.0 increased carry weight, +10% increased movement speed, Resistant (-50%) vs frost.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/Moder"
      },
      {
        "id": "yagluth",
        "name": "Yagluth",
        "biome": "plains",
        "order": 6,
        "altar": {
          "name": "Forsaken Altar",
          "howToFind": "Yagluth's Forsaken Altar is located in the Plains. His location can be found when visiting Stonehenge structures, where a Vegvisir will reveal his nearest summoning location on the map."
        },
        "summonItems": [
          {
            "id": "fuling-totem",
            "count": 5
          }
        ],
        "forsakenPower": {
          "name": "Yagluth Power",
          "effect": "Resistant (-50%) vs lightning, +25 Farming (skill), and +10% increased damage.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/Yagluth"
      },
      {
        "id": "the-queen",
        "name": "The Queen",
        "biome": "mistlands",
        "order": 7,
        "altar": {
          "name": "Infested Citadel",
          "howToFind": "The Queen's Forsaken Altar rests in the Mistlands. Unlike all previous bosses, she must be fought in a dungeon, the Infested Citadel, and her first fight requires no sacrifice. The nearest Infested Citadel can be located by Vegvisirs found in Infested Mines, but entry requires a Sealbreaker, which can be constructed from fragments also found in the mines."
        },
        "summonItems": [
          {
            "id": "sealbreaker",
            "count": 1
          }
        ],
        "forsakenPower": {
          "name": "The Queen's Power",
          "effect": "+100% Eitr regeneration increase, -100% sneak stamina usage, and resistant (-50%) vs poison.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/The_Queen"
      },
      {
        "id": "fader",
        "name": "Fader",
        "biome": "ashlands",
        "order": 8,
        "altar": {
          "name": "Summoning altar",
          "howToFind": "The Emerald Flame's summoning altar can be found in a coliseum-like structure in the Ashlands. The Vegvisir can be found in the central tower of Charred Fortresses and very rarely on top of Charred Ruins, revealing the nearest summoning altar on the map. Fader can be summoned by placing three Bells around the coliseum. It takes three Bell Fragments to craft one bell. Bell fragments can be found in charred fortresses around the Ashlands."
        },
        "summonItems": [
          {
            "id": "bell",
            "count": 3
          }
        ],
        "forsakenPower": {
          "name": "Fader Power",
          "effect": "+100% Adrenaline increase, 50% reduced stagger meter modifier, and resistant (-50%) vs fire.",
          "cooldownSeconds": 1200
        },
        "source": "https://valheim.weirdgloop.org/w/Fader"
      },
      {
        "id": "kall-fimbulbringer",
        "name": "Kall Fimbulbringer",
        "biome": "deep-north",
        "order": 9,
        "altar": {
          "name": "Strange Bowl",
          "howToFind": "Kall Fimbulbringer is imprisoned in The Prison, reached through the Aesir Passage. He is summoned by offering three Malicious Blood at the Strange Bowl in his boss room. He appears 12 seconds after the offering."
        },
        "summonItems": [
          {
            "id": "malicious-blood",
            "count": 3
          }
        ],
        "forsakenPower": null,
        "source": "https://valheim.weirdgloop.org/w/Kall_Fimbulbringer"
      }
    ],
    "items": {
      "ancient-seed": {
        "id": "ancient-seed",
        "name": "Ancient Seed",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "black-forest",
        "tier": 2,
        "sources": [
          {
            "text": "Greydwarf Brute",
            "kind": "creature",
            "creatureId": "greydwarf-brute",
            "biomes": [
              "black-forest"
            ]
          },
          {
            "text": "Greydwarf Nest",
            "kind": "other"
          }
        ],
        "recipe": null,
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Ancient_Seed"
      },
      "bell": {
        "id": "bell",
        "name": "Bell",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "ashlands",
        "tier": 8,
        "sources": [
          {
            "text": "Black Forge",
            "kind": "station"
          }
        ],
        "recipe": {
          "station": "Black Forge",
          "stationLevel": 1,
          "materials": [
            {
              "item": "bell-fragment",
              "amount": 3
            }
          ],
          "yields": 1
        },
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Bell"
      },
      "bell-fragment": {
        "id": "bell-fragment",
        "name": "Bell Fragment",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "ashlands",
        "tier": 8,
        "sources": [
          {
            "text": "Charred Fortress",
            "kind": "location"
          }
        ],
        "recipe": null,
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Bell_Fragment"
      },
      "dragon-egg": {
        "id": "dragon-egg",
        "name": "Dragon Egg",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "mountain",
        "tier": 5,
        "sources": [
          {
            "text": "Drake Nest",
            "kind": "other"
          }
        ],
        "recipe": null,
        "teleportable": false,
        "wiki": "https://valheim.weirdgloop.org/w/Dragon_Egg"
      },
      "fuling-totem": {
        "id": "fuling-totem",
        "name": "Fuling Totem",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "plains",
        "tier": 6,
        "sources": [
          {
            "text": "Fuling Village",
            "kind": "location"
          },
          {
            "text": "Fuling Berserker",
            "kind": "creature",
            "creatureId": "fuling-berserker",
            "biomes": [
              "plains"
            ]
          }
        ],
        "recipe": null,
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Fuling_Totem"
      },
      "malicious-blood": {
        "id": "malicious-blood",
        "name": "Malicious Blood",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "deep-north",
        "tier": 9,
        "sources": [
          {
            "text": "Mörkhalla",
            "kind": "other"
          }
        ],
        "recipe": null,
        "teleportable": null,
        "wiki": "https://valheim.weirdgloop.org/w/Malicious_Blood"
      },
      "portal": {
        "id": "portal",
        "name": "Portal",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "black-forest",
        "tier": 2,
        "sources": [
          {
            "text": "Workbench",
            "kind": "station"
          }
        ],
        "recipe": {
          "station": "Workbench",
          "stationLevel": 1,
          "materials": [
            {
              "item": "greydwarf-eye",
              "amount": 10
            },
            {
              "item": "finewood",
              "amount": 20
            },
            {
              "item": "surtling-core",
              "amount": 2
            }
          ],
          "yields": 1
        },
        "teleportable": null,
        "wiki": "https://valheim.weirdgloop.org/w/Portal"
      },
      "sealbreaker": {
        "id": "sealbreaker",
        "name": "Sealbreaker",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "mistlands",
        "tier": 7,
        "sources": [
          {
            "text": "Galdr Table",
            "kind": "station"
          }
        ],
        "recipe": {
          "station": "Galdr Table",
          "stationLevel": 1,
          "materials": [
            {
              "item": "sealbreaker-fragment",
              "amount": 9
            }
          ],
          "yields": 1
        },
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Sealbreaker"
      },
      "sealbreaker-fragment": {
        "id": "sealbreaker-fragment",
        "name": "Sealbreaker Fragment",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "mistlands",
        "tier": 7,
        "sources": [
          {
            "text": "Infested Mines",
            "kind": "location"
          }
        ],
        "recipe": null,
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Sealbreaker_Fragment"
      },
      "withered-bone": {
        "id": "withered-bone",
        "name": "Withered Bone",
        "addedBy": "expedition",
        "names": {},
        "image": null,
        "biome": "swamp",
        "tier": 4,
        "sources": [
          {
            "text": "Muddy Scrap Piles",
            "kind": "location"
          },
          {
            "text": "Sunken Crypts",
            "kind": "location"
          }
        ],
        "recipe": null,
        "teleportable": true,
        "wiki": "https://valheim.weirdgloop.org/w/Withered_Bone"
      }
    },
    "stations": [
      {
        "id": "galdr-table",
        "name": "Galdr Table",
        "names": {
          "cs": "Galdrový stůl",
          "ru": "Стол гальдров"
        },
        "wiki": "https://valheim.weirdgloop.org/w/Galdr_Table",
        "type": "crafting",
        "materials": [
          {
            "item": "black-metal",
            "amount": 10
          },
          {
            "item": "yggdrasil-wood",
            "amount": 20
          },
          {
            "item": "black-core",
            "amount": 5
          },
          {
            "item": "refined-eitr",
            "amount": 5
          }
        ],
        "unlock": {
          "station": "workbench",
          "materials": [
            "black-metal",
            "yggdrasil-wood",
            "black-core",
            "refined-eitr"
          ]
        },
        "biome": "mistlands",
        "tier": 7,
        "maxLevel": 5,
        "levels": [
          {
            "level": 1,
            "upgrade": null,
            "biome": "mistlands",
            "tier": 7
          },
          {
            "level": 2,
            "upgrade": "rune-table",
            "biome": "mistlands",
            "tier": 7
          },
          {
            "level": 3,
            "upgrade": "unfading-candles",
            "biome": "mistlands",
            "tier": 7
          },
          {
            "level": 4,
            "upgrade": "feathery-wreath",
            "biome": "ashlands",
            "tier": 8
          },
          {
            "level": 5,
            "upgrade": "standing-loom",
            "biome": "deep-north",
            "tier": 9
          }
        ]
      }
    ]
  },
  "tips": [
    {
      "id": "eikthyr-0",
      "boss": "eikthyr",
      "text": "Find Eikthyr’s Vegvisir at the Sacrificial Stones.",
      "source": "https://valheim.weirdgloop.org/w/Eikthyr"
    },
    {
      "id": "eikthyr-1",
      "boss": "eikthyr",
      "text": "Bring Deer Trophy to the Forsaken Altar.",
      "source": "https://valheim.weirdgloop.org/w/Eikthyr"
    },
    {
      "id": "the-elder-0",
      "boss": "the-elder",
      "text": "Look for The Elder’s Vegvisir in Burial Chambers or ruined structures.",
      "source": "https://valheim.weirdgloop.org/w/The_Elder"
    },
    {
      "id": "the-elder-1",
      "boss": "the-elder",
      "text": "Bring Ancient Seed to the Forsaken Altar.",
      "source": "https://valheim.weirdgloop.org/w/The_Elder"
    },
    {
      "id": "bonemass-0",
      "boss": "bonemass",
      "text": "Look for Bonemass’ Vegvisir in Sunken Crypts or ruined structures.",
      "source": "https://valheim.weirdgloop.org/w/Bonemass"
    },
    {
      "id": "bonemass-1",
      "boss": "bonemass",
      "text": "Bring Withered Bone to the Forsaken Altar.",
      "source": "https://valheim.weirdgloop.org/w/Bonemass"
    },
    {
      "id": "moder-0",
      "boss": "moder",
      "text": "Look for Moder’s Vegvisir in ruined structures in the Mountains.",
      "source": "https://valheim.weirdgloop.org/w/Moder"
    },
    {
      "id": "moder-1",
      "boss": "moder",
      "text": "Bring Dragon Egg to the Forsaken Altar.",
      "source": "https://valheim.weirdgloop.org/w/Moder"
    },
    {
      "id": "yagluth-0",
      "boss": "yagluth",
      "text": "Look for Yagluth’s Vegvisir at Stonehenge structures.",
      "source": "https://valheim.weirdgloop.org/w/Yagluth"
    },
    {
      "id": "yagluth-1",
      "boss": "yagluth",
      "text": "Bring Fuling Totem to the Forsaken Altar.",
      "source": "https://valheim.weirdgloop.org/w/Yagluth"
    },
    {
      "id": "the-queen-0",
      "boss": "the-queen",
      "text": "Look for The Queen’s Vegvisir in Infested Mines.",
      "source": "https://valheim.weirdgloop.org/w/The_Queen"
    },
    {
      "id": "the-queen-1",
      "boss": "the-queen",
      "text": "Use Sealbreaker to enter the Infested Citadel.",
      "source": "https://valheim.weirdgloop.org/w/The_Queen"
    },
    {
      "id": "fader-0",
      "boss": "fader",
      "text": "Look for Fader’s Vegvisir in the central tower of Charred Fortresses.",
      "source": "https://valheim.weirdgloop.org/w/Fader"
    },
    {
      "id": "fader-1",
      "boss": "fader",
      "text": "Craft Bell from Bell Fragment before visiting the altar.",
      "source": "https://valheim.weirdgloop.org/w/Fader"
    },
    {
      "id": "kall-fimbulbringer-0",
      "boss": "kall-fimbulbringer",
      "text": "Reach The Prison through the Aesir Passage.",
      "source": "https://valheim.weirdgloop.org/w/Kall_Fimbulbringer"
    },
    {
      "id": "kall-fimbulbringer-1",
      "boss": "kall-fimbulbringer",
      "text": "Offer Malicious Blood at the Strange Bowl.",
      "source": "https://valheim.weirdgloop.org/w/Kall_Fimbulbringer"
    },
    {
      "id": "world",
      "text": "World-based events are the default mode.",
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "dungeon",
      "text": "Raids do not start while the player is in a dungeon.",
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "timer",
      "text": "Stay in the event area until the timer runs out; it pauses without players, except during the hunted event.",
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "biome",
      "text": "The biome check uses the exact biome at your position.",
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "deaths",
      "text": "Environmental deaths can also unlock creature-based events.",
      "source": "https://valheim.weirdgloop.org/w/Events"
    },
    {
      "id": "pets",
      "text": "Protect tamed creatures during raids.",
      "source": "https://valheim.weirdgloop.org/w/Events"
    }
  ]
};
