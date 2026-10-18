// Official 10/13 item relations and bounded client Buff extraction. Existing catalogs are retained.
(function(root){'use strict';
const data={
  "date": "2026-10-13",
  "sourceSha256": "42a416043717455b99e02dfc2e799adb43984dd215c5ebe18092b484d02a527c",
  "equipment": [
    {
      "catalogId": "official-defense-23519",
      "id": "official-defense-23519",
      "officialId": 23519,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "魔眼の呪腕",
      "info": "無数の魔眼を宿した禍々しい呪腕",
      "slot": "防具: 手",
      "equip": "手（防）",
      "equipGender": "ALL",
      "equipRace": "ALL",
      "itemType": "防具",
      "requiredSkill": "着こなし",
      "needLevel": 21,
      "armorClass": 3.6,
      "canMithrilEnhance": false,
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
      "technicId": 14687,
      "addStatuses": [
        {
          "statusId": "3",
          "name": "攻撃力",
          "normalizedName": "攻撃力",
          "statKey": "attack",
          "statLabel": "攻撃力",
          "value": 5,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "4",
          "name": "命中",
          "normalizedName": "命中",
          "statKey": "extraHit",
          "statLabel": "命中",
          "value": 5,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "攻撃力 +5\n命中 +5\nなし +0\nなし +0\nなし +0",
      "unmappedAddStatuses": [],
      "extraStats": {
        "attack": 5,
        "extraHit": 5
      },
      "buffRefs": [
        "technic-14687"
      ],
      "equipBuff": {
        "id": "technic-14687",
        "name": "邪眼の衝動",
        "info": "攻撃力と攻撃力依存のダメージが少し上昇、死の魔法の効果が15上昇する\n専用技『 カースド ゲイズ 』が使用可能になる\n※WarAgeでは効果がない"
      },
      "source": "official-idb",
      "sourceUrl": "https://idb.moepic.com/items/defences/23519",
      "sourceSheetUrl": "",
      "fetchedAt": "2026-10-13T15:49:52.2210910Z",
      "updatedAt": "2026-10-13T05:54:16Z",
      "verified": false
    },
    {
      "catalogId": "official-defense-23518",
      "id": "official-defense-23518",
      "officialId": 23518,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "グレイシャル レガリア レッグガード",
      "info": "凍てつく魔力を宿した氷晶の礼装",
      "slot": "防具: 腰",
      "equip": "腰（防）",
      "equipGender": "ALL",
      "equipRace": "ALL",
      "itemType": "防具",
      "requiredSkill": "着こなし",
      "needLevel": 26,
      "armorClass": 2.88,
      "canMithrilEnhance": false,
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
      "technicId": 14685,
      "addStatuses": [
        {
          "statusId": "3",
          "name": "攻撃力",
          "normalizedName": "攻撃力",
          "statKey": "attack",
          "statLabel": "攻撃力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "7",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "17",
          "name": "攻撃ディレイ",
          "normalizedName": "攻撃ディレイ",
          "statKey": "extraAttackDelay",
          "statLabel": "攻撃ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "16",
          "name": "魔法ディレイ",
          "normalizedName": "魔法ディレイ",
          "statKey": "extraMagicDelay",
          "statLabel": "魔法ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "10",
          "name": "耐水属性",
          "normalizedName": "耐水属性",
          "statKey": "extraWaterRes",
          "statLabel": "耐水属性",
          "value": 10,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "攻撃力 +4\n魔力 +4\n攻撃ディレイ -2\n魔法ディレイ -2\n耐水属性 +10",
      "unmappedAddStatuses": [],
      "extraStats": {
        "attack": 4,
        "magic": 4,
        "extraAttackDelay": -2,
        "extraMagicDelay": -2,
        "extraWaterRes": 10
      },
      "buffRefs": [
        "technic-14685"
      ],
      "equipBuff": {
        "id": "technic-14685",
        "name": "グレイシャル フォース",
        "info": "魔力と水属性の効果が上昇して、火属性ダメージを大幅に軽減する\n専用技『 ダイアモンドダスト 』が使用可能になる\n※WarAgeでは効果がない"
      },
      "source": "official-idb",
      "sourceUrl": "https://idb.moepic.com/items/defences/23518",
      "sourceSheetUrl": "",
      "fetchedAt": "2026-10-13T15:49:52.2210910Z",
      "updatedAt": "2026-10-13T05:54:16Z",
      "verified": false
    },
    {
      "catalogId": "official-defense-23517",
      "id": "official-defense-23517",
      "officialId": 23517,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "グレイシャル レガリア ブーツ",
      "info": "凍てつく魔力を宿した氷晶の礼装",
      "slot": "防具: 靴",
      "equip": "靴（防）",
      "equipGender": "ALL",
      "equipRace": "ALL",
      "itemType": "防具",
      "requiredSkill": "着こなし",
      "needLevel": 26,
      "armorClass": 4.32,
      "canMithrilEnhance": false,
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
      "technicId": 14685,
      "addStatuses": [
        {
          "statusId": "3",
          "name": "攻撃力",
          "normalizedName": "攻撃力",
          "statKey": "attack",
          "statLabel": "攻撃力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "7",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "17",
          "name": "攻撃ディレイ",
          "normalizedName": "攻撃ディレイ",
          "statKey": "extraAttackDelay",
          "statLabel": "攻撃ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "16",
          "name": "魔法ディレイ",
          "normalizedName": "魔法ディレイ",
          "statKey": "extraMagicDelay",
          "statLabel": "魔法ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "10",
          "name": "耐水属性",
          "normalizedName": "耐水属性",
          "statKey": "extraWaterRes",
          "statLabel": "耐水属性",
          "value": 10,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "攻撃力 +4\n魔力 +4\n攻撃ディレイ -2\n魔法ディレイ -2\n耐水属性 +10",
      "unmappedAddStatuses": [],
      "extraStats": {
        "attack": 4,
        "magic": 4,
        "extraAttackDelay": -2,
        "extraMagicDelay": -2,
        "extraWaterRes": 10
      },
      "buffRefs": [
        "technic-14685"
      ],
      "equipBuff": {
        "id": "technic-14685",
        "name": "グレイシャル フォース",
        "info": "魔力と水属性の効果が上昇して、火属性ダメージを大幅に軽減する\n専用技『 ダイアモンドダスト 』が使用可能になる\n※WarAgeでは効果がない"
      },
      "source": "official-idb",
      "sourceUrl": "https://idb.moepic.com/items/defences/23517",
      "sourceSheetUrl": "",
      "fetchedAt": "2026-10-13T15:49:52.2210910Z",
      "updatedAt": "2026-10-13T05:54:16Z",
      "verified": false
    },
    {
      "catalogId": "official-defense-23516",
      "id": "official-defense-23516",
      "officialId": 23516,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "グレイシャル レガリア ローブ",
      "info": "凍てつく魔力を宿した氷晶の礼装",
      "slot": "防具: 胴",
      "equip": "胴（防）",
      "equipGender": "ALL",
      "equipRace": "ALL",
      "itemType": "防具",
      "requiredSkill": "着こなし",
      "needLevel": 26,
      "armorClass": 5.52,
      "canMithrilEnhance": false,
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
      "technicId": 14685,
      "addStatuses": [
        {
          "statusId": "3",
          "name": "攻撃力",
          "normalizedName": "攻撃力",
          "statKey": "attack",
          "statLabel": "攻撃力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "7",
          "name": "魔力",
          "normalizedName": "魔力",
          "statKey": "magic",
          "statLabel": "魔力",
          "value": 4,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "17",
          "name": "攻撃ディレイ",
          "normalizedName": "攻撃ディレイ",
          "statKey": "extraAttackDelay",
          "statLabel": "攻撃ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "16",
          "name": "魔法ディレイ",
          "normalizedName": "魔法ディレイ",
          "statKey": "extraMagicDelay",
          "statLabel": "魔法ディレイ",
          "value": -2,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "10",
          "name": "耐水属性",
          "normalizedName": "耐水属性",
          "statKey": "extraWaterRes",
          "statLabel": "耐水属性",
          "value": 10,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "攻撃力 +4\n魔力 +4\n攻撃ディレイ -2\n魔法ディレイ -2\n耐水属性 +10",
      "unmappedAddStatuses": [],
      "extraStats": {
        "attack": 4,
        "magic": 4,
        "extraAttackDelay": -2,
        "extraMagicDelay": -2,
        "extraWaterRes": 10
      },
      "buffRefs": [
        "technic-14685"
      ],
      "equipBuff": {
        "id": "technic-14685",
        "name": "グレイシャル フォース",
        "info": "魔力と水属性の効果が上昇して、火属性ダメージを大幅に軽減する\n専用技『 ダイアモンドダスト 』が使用可能になる\n※WarAgeでは効果がない"
      },
      "source": "official-idb",
      "sourceUrl": "https://idb.moepic.com/items/defences/23516",
      "sourceSheetUrl": "",
      "fetchedAt": "2026-10-13T15:49:52.2210910Z",
      "updatedAt": "2026-10-13T05:54:16Z",
      "verified": false
    },
    {
      "catalogId": "official-weapon-campaign-20261013-jugi",
      "id": "official-weapon-campaign-20261013-jugi",
      "officialId": null,
      "category": "weapon",
      "categoryLabel": "武器",
      "name": "呪儀の魔刃",
      "info": "染色可能。修理による最大耐久度低下なし・耐久度による破壊なし。公式告知の性能を登録。公式DB ID・重量・最大耐久度は未取得。",
      "slot": "武器: 右手",
      "equip": "右手 左手",
      "equipGender": "",
      "equipRace": "",
      "itemType": "",
      "requiredSkill": "刀剣",
      "needLevel": 41,
      "armorClass": 0,
      "weaponDamage": 42,
      "weaponAttackInterval": 140,
      "weaponRange": 4,
      "weaponType": "刀剣",
      "weaponHand": "1HAND",
      "requirements": [
        {
          "name": "刀剣",
          "required": 41
        }
      ],
      "weaponReq": [
        {
          "name": "刀剣",
          "required": 41
        }
      ],
      "technicId": 14686,
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
          "name": "攻撃ディレイ",
          "normalizedName": "攻撃ディレイ",
          "statKey": "extraAttackDelay",
          "statLabel": "攻撃ディレイ",
          "value": -2,
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
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "magic": 5,
        "extraAttackDelay": -2,
        "extraMagicDelay": -2
      },
      "buffRefs": [
        "technic-14686"
      ],
      "equipBuff": {
        "id": "technic-14686",
        "name": "呪印の共鳴",
        "info": "暗黒命令と死の魔法の効果が上昇する\n※WarAgeでは効果がない"
      },
      "source": "official-campaign",
      "sourceUrl": "https://moepic.com/top/news_detail.php?hidden_key=240f2663a6d0061d1450cb06c6217f11344c2777e2dcffeff9594e12f94450698891918d827076c5da12a13ad5b924c21e",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": null,
      "durability": null,
      "weaponDurability": null
    }
  ],
  "buffs": [
    {
      "catalogId": "technic-14687",
      "id": "technic-14687",
      "officialTechnicId": 14687,
      "name": "邪眼の衝動",
      "info": "攻撃力と攻撃力依存のダメージが少し上昇、死の魔法の効果が15上昇する\n専用技『 カースド ゲイズ 』が使用可能になる\n※WarAgeでは効果がない",
      "source": "official-idb",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23519"
      ],
      "sourceEquipmentNames": [
        "魔眼の呪腕"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14687",
      "verified": false
    },
    {
      "catalogId": "technic-14685",
      "id": "technic-14685",
      "officialTechnicId": 14685,
      "name": "グレイシャル フォース",
      "info": "魔力と水属性の効果が上昇して、火属性ダメージを大幅に軽減する\n専用技『 ダイアモンドダスト 』が使用可能になる\n※WarAgeでは効果がない",
      "source": "official-idb",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23518",
        "23517",
        "23516"
      ],
      "sourceEquipmentNames": [
        "グレイシャル レガリア レッグガード",
        "グレイシャル レガリア ブーツ",
        "グレイシャル レガリア ローブ"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14685",
      "verified": false
    },
    {
      "catalogId": "technic-14686",
      "id": "technic-14686",
      "officialTechnicId": 14686,
      "name": "呪印の共鳴",
      "info": "暗黒命令と死の魔法の効果が上昇する\n※WarAgeでは効果がない",
      "source": "official-campaign",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "campaign-20261013-jugi"
      ],
      "sourceEquipmentNames": [
        "呪儀の魔刃"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14686",
      "verified": false
    }
  ],
  "records": [
    {
      "id": 14685,
      "name": "グレイシャル フォース",
      "effects": [
        {
          "kind": 147,
          "value": 3,
          "selector": 7,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "kind": 275,
          "value": 0.20000000298023224,
          "selector": 4,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "kind": 273,
          "value": 35,
          "selector": 3,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "rawRecordSha256": "7f6180f8aae7bb870bec9c8c67979cb9e977a0db5a1cd857f57131638f145171",
      "conflictGroup": 14685
    },
    {
      "id": 14686,
      "name": "呪印の共鳴",
      "effects": [
        {
          "kind": 235,
          "value": 10,
          "selector": 66,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "kind": 235,
          "value": 10,
          "selector": 62,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "rawRecordSha256": "5c3a570aae836deba7caf7be743b0e67aa86f3328dc624628c743d1ce7d32d30",
      "conflictGroup": 14686
    },
    {
      "id": 14687,
      "name": "邪眼の衝動",
      "effects": [
        {
          "kind": 147,
          "value": 3,
          "selector": 3,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "kind": 247,
          "value": 0.10000000149011612,
          "selector": 0,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "kind": 235,
          "value": 15,
          "selector": 62,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "rawRecordSha256": "13509b0d52fb9750bdc037cda419e21234722ff86edd8c4005e198e3ae0b0d4d",
      "conflictGroup": 14687
    }
  ],
  "rules": {
    "technic-14685": {
      "name": "グレイシャル フォース",
      "officialTechnicId": 14685,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261013",
      "reviewStatus": "partial",
      "reviewComplete": false,
      "conflictGroup": "technic-14685",
      "stackRule": "same-technic",
      "conditions": {
        "disabledInWarAge": true
      },
      "stats": {
        "magicPct": 3
      },
      "skillEffects": [],
      "elementEffects": [
        {
          "name": "水属性",
          "value": 20
        }
      ],
      "customEffects": [
        {
          "name": "火属性ダメージ軽減（この効果を選択した要求量）",
          "value": 35,
          "unit": "%"
        }
      ],
      "clientDefinition": {
        "technicId": 14685,
        "snapshotDate": "2026-10-13",
        "rawRecordSha256": "7f6180f8aae7bb870bec9c8c67979cb9e977a0db5a1cd857f57131638f145171",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "10/13クライアント定義と保存済み共通処理を照合。装備中・Buff有効・通常世界の条件。必要技能・成功率には加算しない。同じBuffは複数部位でも1回。 / magicPct=3 / 水属性効果+20% / 火属性ダメージ軽減（この効果を選択した要求量） 35%",
      "authoritativeStats": [
        "magicPct"
      ],
      "authoritativeSkillEffects": [],
      "clientSkillInputVerified": false
    },
    "technic-14686": {
      "name": "呪印の共鳴",
      "officialTechnicId": 14686,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261013",
      "reviewStatus": "partial",
      "reviewComplete": false,
      "conflictGroup": "technic-14686",
      "stackRule": "same-technic",
      "conditions": {
        "disabledInWarAge": true
      },
      "stats": {},
      "skillEffects": [
        {
          "name": "暗黒命令",
          "value": 10
        },
        {
          "name": "死の魔法",
          "value": 10
        }
      ],
      "elementEffects": [],
      "customEffects": [],
      "clientDefinition": {
        "technicId": 14686,
        "snapshotDate": "2026-10-13",
        "rawRecordSha256": "5c3a570aae836deba7caf7be743b0e67aa86f3328dc624628c743d1ce7d32d30",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "10/13クライアント定義と保存済み共通処理を照合。装備中・Buff有効・通常世界の条件。必要技能・成功率には加算しない。同じBuffは複数部位でも1回。 / 暗黒命令効果技能+10 / 死の魔法効果技能+10",
      "authoritativeStats": [],
      "authoritativeSkillEffects": [
        "暗黒命令",
        "死の魔法"
      ],
      "clientSkillInputVerified": true
    },
    "technic-14687": {
      "name": "邪眼の衝動",
      "officialTechnicId": 14687,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261013",
      "reviewStatus": "partial",
      "reviewComplete": false,
      "conflictGroup": "technic-14687",
      "stackRule": "same-technic",
      "conditions": {
        "disabledInWarAge": true
      },
      "stats": {
        "attackPct": 3,
        "dmgPct": 10
      },
      "skillEffects": [
        {
          "name": "死の魔法",
          "value": 15
        }
      ],
      "elementEffects": [],
      "customEffects": [],
      "clientDefinition": {
        "technicId": 14687,
        "snapshotDate": "2026-10-13",
        "rawRecordSha256": "13509b0d52fb9750bdc037cda419e21234722ff86edd8c4005e198e3ae0b0d4d",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "10/13クライアント定義と保存済み共通処理を照合。装備中・Buff有効・通常世界の条件。必要技能・成功率には加算しない。同じBuffは複数部位でも1回。 / attackPct=3 / dmgPct=10 / 死の魔法効果技能+15",
      "authoritativeStats": [
        "attackPct",
        "dmgPct"
      ],
      "authoritativeSkillEffects": [
        "死の魔法"
      ],
      "clientSkillInputVerified": true
    }
  }
};
root.MOE_EQUIPMENT_ADDITIONS_20261013=data;
for(const [key,rows,count] of [['MOE_EQUIPMENT_CATALOG_GENERATED',data.equipment,'equipmentCount'],['MOE_BUFF_CATALOG_GENERATED',data.buffs,'buffCount']]){
 const existing=root[key];if(!Array.isArray(existing))continue;const ids=new Set(existing.map(x=>x.catalogId));
 for(const row of rows)if(!ids.has(row.catalogId)){existing.push(row);ids.add(row.catalogId);}
 const meta=key==='MOE_EQUIPMENT_CATALOG_GENERATED'?'MOE_EQUIPMENT_CATALOG_META':'MOE_BUFF_CATALOG_META';
 root[meta]={...root[meta],[count]:existing.length,gameUpdateDate:data.date};
}
if(Array.isArray(root.MOE_EQUIPMENT_CATALOG_GENERATED)&&Array.isArray(root.MOE_BUFF_CATALOG_GENERATED)){
 for(const key of ['MOE_EQUIPMENT_CATALOG_META','MOE_BUFF_CATALOG_META'])root[key]={...root[key],equipmentCount:root.MOE_EQUIPMENT_CATALOG_GENERATED.length,buffCount:root.MOE_BUFF_CATALOG_GENERATED.length};
}
root.MOE_BUFF_RULES_MANUAL={...root.MOE_BUFF_RULES_MANUAL,...data.rules};
if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(globalThis);
