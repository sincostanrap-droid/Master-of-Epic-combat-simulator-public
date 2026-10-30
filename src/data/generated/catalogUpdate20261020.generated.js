// Current 10/20 raid rewards. The next-week campaign remains in local research files.
(function(root){'use strict';const data={
  "date": "2026-10-20",
  "releaseRevision": "20261020-raid",
  "sourceSha256": "14b84a194d89b25061ddbabbb64e8f3dfff35fcbd91d4b18a7924ab6db95122a",
  "equipment": [
    {
      "catalogId": "official-defense-23508",
      "id": "official-defense-23508",
      "officialId": 23508,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "キャンドル スピリット",
      "info": "ハロウィンレイド報酬。装備中に「灯火」が発動する。",
      "slot": "装飾: 耳",
      "equip": "耳（装）",
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
      "technicId": 14693,
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
          "name": "耐水属性",
          "normalizedName": "耐水属性",
          "statKey": "extraWaterRes",
          "statLabel": "耐水属性",
          "value": 10,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "magic": 3,
        "extraMP": 5,
        "extraWaterRes": 10
      },
      "buffRefs": [
        "technic-14693"
      ],
      "equipBuff": {
        "id": "technic-14693",
        "name": "灯火",
        "info": "火属性の効果が上昇して、水属性のダメージを軽減する\n※WarAgeでは効果がない"
      },
      "source": "user-confirmed-client",
      "sourceUrl": "",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 0,
      "canMithrilEnhance": false,
      "durability": null
    },
    {
      "catalogId": "official-defense-23509",
      "id": "official-defense-23509",
      "officialId": 23509,
      "category": "defense",
      "categoryLabel": "防具/装飾",
      "name": "キャンドル スピリット カラー",
      "info": "ハロウィンレイド報酬。装備中に「灯火」が発動する。",
      "slot": "装飾: 耳",
      "equip": "耳（装）",
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
      "technicId": 14693,
      "addStatuses": [
        {
          "statusId": "",
          "name": "攻撃力",
          "normalizedName": "攻撃力",
          "statKey": "attack",
          "statLabel": "攻撃力",
          "value": 3,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "最大HP",
          "normalizedName": "最大HP",
          "statKey": "extraHP",
          "statLabel": "HP",
          "value": 5,
          "mapped": true,
          "ignored": false
        },
        {
          "statusId": "",
          "name": "耐水属性",
          "normalizedName": "耐水属性",
          "statKey": "extraWaterRes",
          "statLabel": "耐水属性",
          "value": 10,
          "mapped": true,
          "ignored": false
        }
      ],
      "addStatusText": "",
      "unmappedAddStatuses": [],
      "extraStats": {
        "attack": 3,
        "extraHP": 5,
        "extraWaterRes": 10
      },
      "buffRefs": [
        "technic-14693"
      ],
      "equipBuff": {
        "id": "technic-14693",
        "name": "灯火",
        "info": "火属性の効果が上昇して、水属性のダメージを軽減する\n※WarAgeでは効果がない"
      },
      "source": "user-confirmed-client",
      "sourceUrl": "",
      "sourceSheetUrl": "",
      "fetchedAt": "",
      "updatedAt": "",
      "verified": true,
      "weight": 0,
      "canMithrilEnhance": false,
      "durability": null
    }
  ],
  "buffs": [
    {
      "catalogId": "technic-14693",
      "id": "technic-14693",
      "officialTechnicId": 14693,
      "name": "灯火",
      "info": "火属性の効果が上昇して、水属性のダメージを軽減する\n※WarAgeでは効果がない",
      "source": "user-confirmed-client",
      "sourceSheetUrl": "",
      "sourceEquipmentIds": [
        "23508",
        "23509"
      ],
      "sourceEquipmentNames": [
        "キャンドル スピリット",
        "キャンドル スピリット カラー"
      ],
      "parsedStats": {},
      "conflictGroup": "technic-14693",
      "verified": false
    }
  ],
  "records": [
    {
      "id": 14693,
      "name": "灯火",
      "effects": [
        {
          "index": 0,
          "kind": 275,
          "value": 0.10000000149011612,
          "selector": 3,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        },
        {
          "index": 1,
          "kind": 273,
          "value": 10,
          "selector": 4,
          "qualifier": 0,
          "other10": 0,
          "flags": 304,
          "other18": 0
        }
      ],
      "rawRecordSha256": "a37ba86c5094f126b8fb49e6171cfbd9b9557a3456c1afb5ea405acf7f10947a",
      "conflictGroup": 14693
    }
  ],
  "rules": {
    "technic-14693": {
      "name": "灯火",
      "officialTechnicId": 14693,
      "verified": true,
      "applyDefault": true,
      "replaceOfficialDescription": true,
      "source": "manual-client-20261020",
      "reviewStatus": "partial",
      "reviewComplete": false,
      "conflictGroup": "technic-14693",
      "stackRule": "same-technic",
      "conditions": {
        "disabledInWarAge": true
      },
      "stats": {},
      "authoritativeStats": [],
      "skillEffects": [],
      "elementEffects": [
        {
          "name": "火属性",
          "value": 10
        }
      ],
      "customEffects": [
        {
          "name": "水属性ダメージ軽減（この効果を選択した要求量）",
          "value": 10,
          "unit": "%"
        }
      ],
      "clientDefinition": {
        "technicId": 14693,
        "snapshotDate": "2026-10-20",
        "rawRecordSha256": "a37ba86c5094f126b8fb49e6171cfbd9b9557a3456c1afb5ea405acf7f10947a",
        "operationsReviewed": true,
        "liveActivationVerified": false
      },
      "memo": "火属性効果+10%、水属性ダメージ軽減10%。同じ灯火は1回。WarAge無効。"
    }
  },
  "held": []
};
root.MOE_CATALOG_UPDATE_20261020=data;
for(const [key,rows,managed]of [['MOE_EQUIPMENT_CATALOG_GENERATED',data.equipment,['official-defense-23505','official-defense-23508','official-defense-23509']],['MOE_BUFF_CATALOG_GENERATED',data.buffs,['technic-14692','technic-14693']]]){if(!Array.isArray(root[key]))continue;root[key]=root[key].filter(r=>!managed.includes(r.catalogId));root[key].push(...rows);}
const rules={...root.MOE_BUFF_RULES_MANUAL};if(rules['technic-14692']?.source==='manual-client-20261020')delete rules['technic-14692'];root.MOE_BUFF_RULES_MANUAL={...rules,...data.rules};
for(const key of ['MOE_EQUIPMENT_CATALOG_META','MOE_BUFF_CATALOG_META'])if(root[key])root[key]={...root[key],gameUpdateDate:data.date,...(Array.isArray(root.MOE_EQUIPMENT_CATALOG_GENERATED)?{equipmentCount:root.MOE_EQUIPMENT_CATALOG_GENERATED.length}:{}),...(Array.isArray(root.MOE_BUFF_CATALOG_GENERATED)?{buffCount:root.MOE_BUFF_CATALOG_GENERATED.length}:{})};
if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(globalThis);
