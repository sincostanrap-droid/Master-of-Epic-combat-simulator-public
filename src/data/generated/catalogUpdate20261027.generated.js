// Reviewed10/27 public additions. Unknown effects retain explicit descriptions.
(function(root){'use strict';const data={
  "date": "2026-10-27",
  "releaseRevision": "20261027",
  "sourceSha256": "245da4b4f8e84ab3f32e9b68b67c0a4911e3c45a9e6ba4855f903a01ed993d07",
  "equipment": [
    {
      "catalogId": "official-defense-23505",
      "id": "official-defense-23505",
      "officialId": 23505,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "マジック キー ネックレス",
      "info": "魔力・魔法ディレイ・盗み・ピッキング失敗回数を補正する胸装飾。",
      "slot": "装飾: 胸",
      "equip": "胸（装）",
      "equipGender": "",
      "equipRace": "",
      "itemType": "",
      "requiredSkill": "着こなし",
      "needLevel": 1,
      "armorClass": 0,
      "weaponDamage": 0,
      "weaponAttackInterval": 0,
      "weaponRange": 0,
      "weaponType": "",
      "weaponHand": "",
      "requirements": [
        {
          "name": "着こなし",
          "required": 1
        }
      ],
      "weaponReq": [],
      "technicId": 14692,
      "addStatuses": [
        {
          "statusId": "",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 3,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "魔法ディレイ",
          "normalizedName": "魔法ディレイ",
          "statKey": "extraMagicDelay",
          "statLabel": "魔法ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "盗み補正",
          "normalizedName": "盗み補正",
          "statKey": "extraSteal",
          "statLabel": "盗み補正",
          "value": 5,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "ピッキング失敗回数補正",
          "normalizedName": "ピッキング失敗回数補正",
          "statKey": "extraLockpickingFail",
          "statLabel": "ピッキング失敗回数補正",
          "value": 1,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "magic": 3,
        "extraMagicDelay": -2,
        "extraSteal": 5,
        "extraLockpickingFail": 1
      },
      "buffRefs": [
        "technic-14692"
      ],
      "equipBuff": {
        "id": "technic-14692",
        "name": "魔法の鍵",
        "info": "魔力が上昇して、詠唱移動速度が少し速くなる\n※WarAgeでは効果がない"
      },
      "source": "official-client-20261027",
      "sourceUrl": "https://moepic.com/top/news_detail.php?hidden_key=42f67953637b35563b62facba8f1758cdd1eafbf522e4b1438fc181cdd05712e88f293bb5b4603f9cb322d8c363e5eeb41",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 0.10000000149011612,
      "canMithrilEnhance": true,
      "durability": null
    },
    {
      "catalogId": "official-defense-23528",
      "id": "official-defense-23528",
      "officialId": 23528,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "オキュラス シニヨン ウィッグ",
      "info": "2026/10/27公式告知とクライアント定義を照合。",
      "slot": "防具: 頭",
      "equip": "頭（防）",
      "equipGender": "",
      "equipRace": "",
      "itemType": "",
      "requiredSkill": "着こなし",
      "needLevel": 21,
      "armorClass": 4,
      "weaponDamage": 0,
      "weaponAttackInterval": 0,
      "weaponRange": 0,
      "weaponType": "",
      "weaponHand": "",
      "requirements": [
        {
          "name": "着こなし",
          "required": 21
        }
      ],
      "weaponReq": [],
      "technicId": 14698,
      "addStatuses": [
        {
          "statusId": "",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "命中",
          "normalizedName": "命中",
          "statKey": "extraHit",
          "statLabel": "命中",
          "value": 5,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "magic": 4,
        "extraHit": 5
      },
      "buffRefs": [
        "technic-14698"
      ],
      "equipBuff": {
        "id": "technic-14698",
        "name": "千里眼",
        "info": "見えないものが見えるようになり、魔力の10%が命中に加算、遠距離攻撃や魔法の射程が伸びる\n※WarAgeでは効果がない"
      },
      "source": "official-client-20261027",
      "sourceUrl": "https://moepic.com/top/news_detail.php?hidden_key=0f692ae4e512fa1e932e60495e6c94dd6525b4053fc9e3024c99ce02f3d4df9b72d464c3de1cdf4693e488e8038dfaf488",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 1,
      "canMithrilEnhance": false,
      "durability": null
    },
    {
      "catalogId": "official-defense-23529",
      "id": "official-defense-23529",
      "officialId": 23529,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "クロノスフィア スカート",
      "info": "公式表示AC5.0。計算にはクライアントの装備値5.04を使用。",
      "slot": "防具: パンツ",
      "equip": "パンツ（防）",
      "equipGender": "",
      "equipRace": "",
      "itemType": "",
      "requiredSkill": "着こなし",
      "needLevel": 26,
      "armorClass": 5.039999961853027,
      "weaponDamage": 0,
      "weaponAttackInterval": 0,
      "weaponRange": 0,
      "weaponType": "",
      "weaponHand": "",
      "requirements": [
        {
          "name": "着こなし",
          "required": 26
        }
      ],
      "weaponReq": [],
      "technicId": 13828,
      "addStatuses": [
        {
          "statusId": "",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 5,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "最大MP",
          "normalizedName": "最大MP",
          "statKey": "extraMP",
          "statLabel": "MP",
          "value": 5,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "攻撃ディレイ",
          "normalizedName": "攻撃ディレイ",
          "statKey": "extraAttackDelay",
          "statLabel": "攻撃ディレイ",
          "value": -3,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "魔法ディレイ",
          "normalizedName": "魔法ディレイ",
          "statKey": "extraMagicDelay",
          "statLabel": "魔法ディレイ",
          "value": -3,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "magic": 5,
        "extraMP": 5,
        "extraAttackDelay": -3,
        "extraMagicDelay": -3
      },
      "buffRefs": [
        "technic-13828"
      ],
      "equipBuff": {
        "id": "technic-13828",
        "name": "スイフトキャスト",
        "info": "詠唱速度、魔法ディレイ、詠唱移動速度が上昇する\n※WarAgeでは効果がない"
      },
      "source": "official-client-20261027",
      "sourceUrl": "https://moepic.com/top/news_detail.php?hidden_key=0f692ae4e512fa1e932e60495e6c94dd6525b4053fc9e3024c99ce02f3d4df9b72d464c3de1cdf4693e488e8038dfaf488",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 1.600000023841858,
      "canMithrilEnhance": false,
      "durability": null
    },
    {
      "catalogId": "official-defense-23530",
      "id": "official-defense-23530",
      "officialId": 23530,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "ミスティック アイヴェール",
      "info": "2026/10/27公式告知とクライアント定義を照合。",
      "slot": "装飾: 顔",
      "equip": "顔（装）",
      "equipGender": "",
      "equipRace": "",
      "itemType": "",
      "requiredSkill": "着こなし",
      "needLevel": 1,
      "armorClass": 0,
      "weaponDamage": 0,
      "weaponAttackInterval": 0,
      "weaponRange": 0,
      "weaponType": "",
      "weaponHand": "",
      "requirements": [
        {
          "name": "着こなし",
          "required": 1
        }
      ],
      "weaponReq": [],
      "technicId": 9789,
      "addStatuses": [
        {
          "statusId": "",
          "name": "命中",
          "normalizedName": "命中",
          "statKey": "extraHit",
          "statLabel": "命中",
          "value": 3,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 3,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "耐無属性",
          "normalizedName": "耐無属性",
          "statKey": "extraNeutralRes",
          "statLabel": "耐無属性",
          "value": 10,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "extraHit": 3,
        "magic": 3,
        "extraNeutralRes": 10
      },
      "buffRefs": [
        "technic-9789"
      ],
      "equipBuff": {
        "id": "technic-9789",
        "name": "神秘のオーラ",
        "info": "神秘魔法の効果と魔力が3%上昇する\n※WarAgeでは効果がない"
      },
      "source": "official-client-20261027",
      "sourceUrl": "https://moepic.com/top/news_detail.php?hidden_key=1801b3964880d173cc589de1540c4e6b732f548a86d42bfecc8f77ff197d8f281708932d1eff9aede17f0ce6e4bdafe9cb",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 0.4000000059604645,
      "canMithrilEnhance": false,
      "durability": null
    },
    {
      "catalogId": "official-defense-23531",
      "id": "official-defense-23531",
      "officialId": 23531,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "ヌリカベのペンダント",
      "info": "2026/10/27公式告知とクライアント定義を照合。",
      "slot": "装飾: 胸",
      "equip": "胸（装）",
      "equipGender": "",
      "equipRace": "",
      "itemType": "",
      "requiredSkill": "着こなし",
      "needLevel": 1,
      "armorClass": 0,
      "weaponDamage": 0,
      "weaponAttackInterval": 0,
      "weaponRange": 0,
      "weaponType": "",
      "weaponHand": "",
      "requirements": [
        {
          "name": "着こなし",
          "required": 1
        }
      ],
      "weaponReq": [],
      "technicId": 14697,
      "addStatuses": [],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {},
      "buffRefs": [
        "technic-14697"
      ],
      "equipBuff": {
        "id": "technic-14697",
        "name": "ヌリカベ フォーム",
        "info": "ヌリカベに変身できる"
      },
      "source": "official-client-20261027",
      "sourceUrl": "https://moepic.com/top/news_detail.php?hidden_key=a919c75224068ab02e56204645e8b452e55c8ef020495e925c9858c29c2acc768a16681c1094859bd2c6c7f82772f1a912",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 0.800000011920929,
      "canMithrilEnhance": false,
      "durability": null
    }
  ],
  "buffs": [
    {
      "catalogId": "technic-14692",
      "id": "technic-14692",
      "officialTechnicId": 14692,
      "name": "魔法の鍵",
      "info": "魔力が上昇して、詠唱移動速度が少し速くなる\n※WarAgeでは効果がない",
      "source": "official-client-20261027",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23505"
      ],
      "sourceEquipmentNames": [
        "マジック キー ネックレス"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14692",
      "verified": false
    },
    {
      "catalogId": "technic-14698",
      "id": "technic-14698",
      "officialTechnicId": 14698,
      "name": "千里眼",
      "info": "見えないものが見えるようになり、魔力の10%が命中に加算、遠距離攻撃や魔法の射程が伸びる\n※WarAgeでは効果がない",
      "source": "official-client-20261027",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23528"
      ],
      "sourceEquipmentNames": [
        "オキュラス シニヨン ウィッグ"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14698",
      "verified": false
    },
    {
      "catalogId": "technic-13828",
      "id": "technic-13828",
      "officialTechnicId": 13828,
      "name": "スイフトキャスト",
      "info": "詠唱速度、魔法ディレイ、詠唱移動速度が上昇する\n※WarAgeでは効果がない",
      "source": "official-client-20261027",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23529"
      ],
      "sourceEquipmentNames": [
        "クロノスフィア スカート"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-13828",
      "verified": false
    },
    {
      "catalogId": "technic-9789",
      "id": "technic-9789",
      "officialTechnicId": 9789,
      "name": "神秘のオーラ",
      "info": "神秘魔法の効果と魔力が3%上昇する\n※WarAgeでは効果がない",
      "source": "official-client-20261027",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23530"
      ],
      "sourceEquipmentNames": [
        "ミスティック アイヴェール"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-9789",
      "verified": false
    },
    {
      "catalogId": "technic-14697",
      "id": "technic-14697",
      "officialTechnicId": 14697,
      "name": "ヌリカベ フォーム",
      "info": "ヌリカベに変身できる",
      "source": "official-client-20261027",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23531"
      ],
      "sourceEquipmentNames": [
        "ヌリカベのペンダント"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14697",
      "verified": false
    }
  ],
  "records": [
    {
      "id": 14692,
      "name": "魔法の鍵",
      "effects": [
        {
          "index": 0,
          "kind": 147,
          "value": 3,
          "selector": 7,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 1,
          "kind": 91,
          "value": 1.0499999523162842,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "conflictGroup": 14692
    },
    {
      "id": 14697,
      "name": "ヌリカベ フォーム",
      "effects": [
        {
          "index": 0,
          "kind": 77,
          "value": 0,
          "selector": 2646,
          "qualifier": 0,
          "other10": 0,
          "flags": 48,
          "other18": 0
        }
      ],
      "conflictGroup": 78
    },
    {
      "id": 14698,
      "name": "千里眼",
      "effects": [
        {
          "index": 0,
          "kind": 93,
          "value": 3,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 1,
          "kind": 248,
          "value": 3,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 2,
          "kind": 66,
          "value": 0,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 3,
          "kind": 21,
          "value": 0,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 4,
          "kind": 284,
          "value": 10,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "conflictGroup": 14698
    },
    {
      "id": 14696,
      "name": "ブルズアイ",
      "effects": [
        {
          "index": 0,
          "kind": 284,
          "value": 30,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 48,
          "other18": 0
        },
        {
          "index": 1,
          "kind": 225,
          "value": 2724,
          "selector": 7,
          "qualifier": 0,
          "other10": 0,
          "flags": 48,
          "other18": 0
        }
      ],
      "conflictGroup": 14696
    },
    {
      "id": 9789,
      "name": "神秘のオーラ",
      "effects": [
        {
          "index": 0,
          "kind": 235,
          "value": 10,
          "selector": 58,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 1,
          "kind": 147,
          "value": 3,
          "selector": 7,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "conflictGroup": 9789
    },
    {
      "id": 13828,
      "name": "スイフトキャスト",
      "effects": [
        {
          "index": 0,
          "kind": 91,
          "value": 1.149999976158142,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 1,
          "kind": 41,
          "value": -10,
          "selector": 16,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 2,
          "kind": 109,
          "value": 85,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "conflictGroup": 83
    }
  ],
  "rules": {
    "technic-14692": {
      "name": "魔法の鍵",
      "officialTechnicId": 14692,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261027",
      "reviewStatus": "partial",
      "reviewComplete": false,
      "conflictGroup": "technic-14692",
      "stackRule": "same-technic",
      "conditions": {
        "disabledInWarAge": true
      },
      "stats": {
        "magicPct": 3
      },
      "authoritativeStats": [
        "magicPct"
      ],
      "skillEffects": [],
      "elementEffects": [],
      "customEffects": [
        {
          "name": "詠唱中移動速度の係数（適合行動時）",
          "value": 1.05,
          "unit": "倍"
        }
      ],
      "clientDefinition": {
        "technicId": 14692,
        "snapshotDate": "2026-10-20",
        "rawRecordSha256": "ef08c329977a31ec2d2878e14032a80386cac618df42a9d3d3d00a6e61568431",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "魔力+3%。詠唱中移動の採用枝への係数1.05。通常移動速度へ加算しない。WarAge無効。"
    },
    "technic-14698": {
      "name": "千里眼",
      "officialTechnicId": 14698,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261027",
      "reviewStatus": "partial",
      "reviewComplete": false,
      "conflictGroup": "technic-14698",
      "stackRule": "same-technic",
      "conditions": {
        "disabledInWarAge": true
      },
      "stats": {},
      "authoritativeStats": [],
      "skillEffects": [],
      "elementEffects": [],
      "customEffects": [
        {
          "name": "魔力の10%を命中へ加算",
          "value": 10,
          "unit": "%"
        }
      ],
      "clientDefinition": {
        "technicId": 14698,
        "snapshotDate": "2026-10-27",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "魔力から命中への加算を計算。不可視認識と射程は説明表示。WarAge無効。"
    },
    "technic-14697": {
      "name": "ヌリカベ フォーム",
      "officialTechnicId": 14697,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261027",
      "reviewStatus": "description",
      "reviewComplete": false,
      "conflictGroup": "technic-14697",
      "stackRule": "same-technic",
      "conditions": {},
      "stats": {},
      "authoritativeStats": [],
      "skillEffects": [],
      "elementEffects": [],
      "customEffects": [],
      "clientDefinition": {
        "technicId": 14697,
        "snapshotDate": "2026-10-27",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "変身を説明表示。未確認の戦闘能力値を加算しない。"
    }
  },
  "releasedDeferredEquipment": [
    23505
  ],
  "partialEffects": [
    14692,
    14697,
    14698,
    13828,
    9789
  ]
};root.MOE_CATALOG_UPDATE_20261027=data;
for(const [key,rows]of [['MOE_EQUIPMENT_CATALOG_GENERATED',data.equipment],['MOE_BUFF_CATALOG_GENERATED',data.buffs]]){if(!Array.isArray(root[key]))continue;const ids=new Set(rows.map(r=>r.catalogId));root[key]=root[key].filter(r=>!ids.has(r.catalogId));root[key].push(...rows);}
root.MOE_BUFF_RULES_MANUAL={...root.MOE_BUFF_RULES_MANUAL,...data.rules};for(const key of ['MOE_EQUIPMENT_CATALOG_META','MOE_BUFF_CATALOG_META'])if(root[key])root[key]={...root[key],gameUpdateDate:data.date,...(Array.isArray(root.MOE_EQUIPMENT_CATALOG_GENERATED)?{equipmentCount:root.MOE_EQUIPMENT_CATALOG_GENERATED.length}:{}),...(Array.isArray(root.MOE_BUFF_CATALOG_GENERATED)?{buffCount:root.MOE_BUFF_CATALOG_GENERATED.length}:{})};
if(typeof module!=='undefined'&&module.exports)module.exports=data;})(globalThis);
