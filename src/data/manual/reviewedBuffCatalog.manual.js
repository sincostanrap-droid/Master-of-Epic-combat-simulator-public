// __MOE_REVIEWED_BUFF_MAGIC_DELAY_FIX_V1__
// Reviewed Buffの魔法ディレイ固定値反映漏れを補完。
// タケミカヅチ -25 / リリース オブ マジック -25。
// __MOE_REVIEWED_BUFF_ATTACK_DELAY_FLAT_FIX_V2__
// Reviewed Buffの「攻撃ディレイ-N」を extraAttackDelay（固定値）として扱う。
// 正式値: レイジ ドライブ -10 / トリニティ エンハンス -20 / フォース ステップ -20。
// __MOE_REVIEWED_BUFF_ATTACK_DELAY_FLAT_FIX_V1__
// Reviewed Buffの「攻撃ディレイ-N」を extraAttackDelay（固定値）へ統一。
// フォース ステップはユーザー確認値 -10。
/* __MOE_BATCH1_RUNTIME_AND_LIMIT_BREAK_V3__ */
// __MOE_REVIEWED_BUFF_CATALOG_DATA_SPLIT_V1__
// Master of Epic 戦闘シミュレーター
//
// 精査済みの技・魔法Buff定義。
// このファイルは src/main.js より先に読み込む。
//
// 追加バッチは、この配列へオブジェクトを追記する。
// evaluate() 内で参照する補助関数は、実行時に src/main.js 側から解決される。

// __MOE_ACCELERATION_MEASURED_TABLE_FIX_V2__
// __MOE_REVIEWED_BUFF_CATALOG_EXCLUSION_LAYER_V1__
// ユーザー確認済み削除対象。正規化名の完全一致で除外する。
window.MOE_REVIEWED_BUFF_CATALOG_EXCLUDED_NAMES = [
  "バンザイ ダンス",
  "ツイスト",
  "ヴァンパイア フォーム",
  "ヴァンパイアフォーム",
  "天啓視",
  "空力",
  "豪脚",
  "エクステンション サークル",
  "ジャイアント キリング",
  "ガード レイジ",
  "八卦蹴撃陣",
  "ヒーロー タイム",
  "キャッスル オブ ストーン",
  "ブラスト ファイアー",
  "ライト",
  "ソーン スキン",
  "ソーンスキン",
  "イリュージョン シールド",
  "エレメンタル ウェポン",
  "バトル オーラ"
];

// __MOE_REVIEWED_BUFF_CANONICAL_BULK_SYNC_V1__
// __MOE_REVIEWED_BUFF_BULK_BATCH_LION_BOOST_V1__
// __MOE_REVIEWED_BUFF_DARKNESS_FORCE_V1__
// __MOE_REVIEWED_BUFF_MANUAL_MASTER_BULK_V1__
// __MOE_REVIEWED_BUFF_FIXED_FORMULA_BULK_V1__
// __MOE_REVIEWED_BUFF_MAGIC_PCT_FIX_V1__
// __MOE_REVIEWED_BUFF_MAGIC_FLAT_FIX_V1__
// __MOE_KNIGHT_OF_GOD_CONFLICT_GROUP_FIX_V1__
// __MOE_REVIEWED_BUFF_REFERENCE_BATCH_V1__
// __MOE_REVIEWED_BUFF_SPECIAL_CONFLICTS_BULK_V1__
// __MOE_SUIKEN_NAME_FIX_V1__
// __MOE_SUIKEN_DRUNK_CONVERSION_V2__
window.MOE_REVIEWED_BUFF_CATALOG_MANUAL = [
  {
    id: "kung-fu-soul",
    name: "カンフー ソウル",
    category: "戦闘技術",
    inputKind: "skill",
    skillLabel: "戦闘技術",
    defaultSkill: 100,
    conflictGroup: "critical:A2",
    description: "メイン攻撃クリティカル率+33%。持続時間はWiki表を戦技値で区間補間。回避・耐全属性低下は数値不明のため未実装。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const duration = reviewedBuffInterpolateTable(skill, [
        [60, 8],
        [70, 10],
        [80, 13],
        [90, 17],
        [100, 21]
      ]);
      const sec = reviewedBuffRound1(duration);
      return {
        extraCritRatePct: 33,
        durationSeconds: sec,
        note: `カタログ由来 / 戦闘技術${skill} / クリティカル率+33% / 持続${sec}秒 / 回避・耐全属性低下は未実装`
      };
    }
  },
  {
    id: "wave-dance",
    name: "ウェーブ ダンス",
    category: "ダンス",
    inputKind: "none",
    conflictGroup: "critical:B2",
    description: "メイン攻撃のクリティカル率+40%、命中+5。",
    evaluate() {
      return {
        extraCritRatePct: 40,
        extraHit: 5,
        note: "カタログ由来 / クリティカル率+40% / 命中+5 / 競合 critical:B2"
      };
    }
  },
  {
    id: "wild-roar",
    name: "ワイルド ロア",
    category: "シャウト",
    inputKind: "skill",
    skillLabel: "シャウト",
    defaultSkill: 100,
    conflictGroup: "attack-delay:wild-roar",
    description: "攻撃ディレイ短縮はシャウト90で-33、100で-36。持続時間はMedi記録の実測表を補間。100超の短縮量は90→100の傾きを延長した推定値。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);

      let delay;
      let estimated = false;

      if (skill <= 100) {
        delay = reviewedBuffInterpolateTable(skill, [
          [80, -30],
          [90, -33],
          [100, -36]
        ]);
      } else {
        delay = -36 - (skill - 100) * 0.3;
        estimated = true;
      }

      const duration = reviewedBuffInterpolateTable(skill, [
        [80, 12.75],
        [90, 14.69],
        [100, 16.63],
        [110, 18.57],
        [120, 20.48],
        [150, 26.25],
        [165, 31.0]
      ]);

      const delayValue = reviewedBuffRound1(delay);
      const seconds = reviewedBuffRound1(duration);

      return {
        extraAttackDelay: delayValue,
        durationSeconds: seconds,
        note: `カタログ由来 / シャウト${skill} / 攻撃ディレイ${delayValue} / 持続${seconds}秒${estimated ? " / 短縮量は100超推定" : ""}`
      };
    }
  },
  {
    id: "keen-edge",
    name: "キーン エッジ",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 90,
    defaultMagic: 100,
    conflictGroup: "battle:attack-enhancement",
    description: "攻撃力上昇量 = 強化魔法×0.14 + 魔力×0.094 - 0.5。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.14 + magic * 0.094 - 0.5);
      const rounded = Math.round(value * 1000) / 1000;
      return {
        flatAttack: rounded,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 攻撃力+${rounded}`
      };
    }
  },
// __MOE_BUFF_CATALOG_ENHANCEMENT_BATCH2_V1__
  {
    id: "enlighten",
    name: "エンライテン",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "battle:accuracy",
    description: "命中上昇量 = 強化魔法×0.1 + 魔力×0.067 + 1。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.1 + magic * 0.067 + 1);
      return { extraHit: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 命中+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "holy-guard",
    name: "ホーリー ガード",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "armor:greater-hardening",
    description: "AC上昇量 = 強化魔法×0.1 + 魔力×0.067。スピリット ガードと競合。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.1 + magic * 0.067);
      return { extraAC: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / AC+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "spirit-guard",
    name: "スピリット ガード",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "armor:greater-hardening",
    description: "AC上昇量 = 強化魔法×0.12 + 魔力×0.07。ホーリー ガードと競合。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.12 + magic * 0.07);
      return { extraAC: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / AC+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "quickening",
    name: "クイックニング",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "enhancement:evasion",
    description: "回避上昇量 = 強化魔法×0.1 + 魔力×0.065 + 1。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.1 + magic * 0.065 + 1);
      return { extraAvoid: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 回避+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "vigor",
    name: "ヴィガー",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "battle:attack-enhancement",
    description: "攻撃力上昇量 = 強化魔法×0.14 + 魔力×0.067 + 2.5。キーン エッジ等と競合。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.14 + magic * 0.067 + 2.5);
      return { flatAttack: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 攻撃力+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "blood-rush",
    name: "ブラッド ラッシュ",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "enhancement:hp",
    description: "最大HP上昇量 = 強化魔法×0.1 + 魔力×0.065 + 1。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.1 + magic * 0.065 + 1);
      return { extraHP: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 最大HP+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "mind-rush",
    name: "マインド ラッシュ",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "",
    description: "最大MP上昇量 = 強化魔法×0.1 + 魔力×0.065 + 1。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.1 + magic * 0.065 + 1);
      return { extraMP: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 最大MP+${Math.round(value * 1000) / 1000}` };
    }
  },
  {
    id: "transform",
    name: "トランスフォーム",
    category: "強化魔法",
    inputKind: "skillMagic",
    skillLabel: "強化魔法",
    defaultSkill: 100,
    defaultMagic: 100,
    conflictGroup: "",
    description: "命中上昇量 = 強化魔法×0.135 + 魔力×0.08 + 17。変身による他効果は未実装。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const magic = Math.max(0, Number(input.magic) || 0);
      const value = Math.max(0, skill * 0.135 + magic * 0.08 + 17);
      return { extraHit: Math.round(value * 1000) / 1000,
        note: `カタログ由来 / 強化魔法${skill} / 魔力${magic} / 命中+${Math.round(value * 1000) / 1000} / 変身の他効果は未実装` };
    }
  },
  {
    id: "steam-blood",
    name: "スティーム ブラッド",
    category: "強化魔法",
    inputKind: "none",
    conflictGroup: "",
    description: "移動速度+6。ST減少などの副作用は未実装。",
    evaluate() {
      return { flatSpeed: 6, note: "カタログ由来 / 移動速度+6 / 副作用は未実装" };
    }
  },
// __MOE_BUFF_CATALOG_BATTLE_BATCH3_V1__
  {
    id: "berserk",
    name: "バーサーク",
    category: "戦闘技術",
    inputKind: "skill",
    skillLabel: "戦闘技術",
    defaultSkill: 100,
    conflictGroup: "battle:attack-enhancement",
    description: "Wikiの持続時間・上昇量表を区間補間。戦技255実測 Ave54.6・166秒を追加節点として使用。AC低下なし。素手以外の通常アタックのみディレイ13%短縮。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const attack = reviewedBuffInterpolateTable(skill, [
        [30, 12.45], [40, 14.45], [50, 16.4], [60, 18.4],
        [70, 20.25], [80, 22.1], [90, 24.05], [100, 26.0],
        [255, 54.6]
      ]);
      const duration = reviewedBuffInterpolateTable(skill, [
        [30, 9], [40, 16], [50, 23], [60, 30],
        [70, 37], [80, 44], [90, 51], [100, 58],
        [255, 166]
      ]);
      const atk = reviewedBuffRound1(attack);
      const sec = reviewedBuffRound1(duration);
      return {
        flatAttack: atk,
        extraAttackDelayPct: -13,
        durationSeconds: sec,
        note: `カタログ由来 / 戦闘技術${skill} / 攻撃力+${atk} / 持続${sec}秒 / 通常アタック13%短縮 / AC低下なし`
      };
    }
  },
  {
    id: "berserk-all",
    name: "バーサーク オール",
    category: "戦闘技術",
    inputKind: "skill",
    skillLabel: "戦闘技術",
    defaultSkill: 100,
    conflictGroup: "battle:attack-enhancement",
    description: "Wiki表を区間補間。戦技255実測 Ave78.9・54秒を追加節点として使用。AC低下なし。回避低下はWiki表の100までを補間し、100超は100時点で据え置き。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const attack = reviewedBuffInterpolateTable(skill, [
        [70, 27.1], [80, 29.7], [90, 31.95], [100, 34.95],
        [255, 78.9]
      ]);
      const avoidPenalty = reviewedBuffInterpolateTable(Math.min(skill, 100), [
        [70, -39.65], [80, -43.05], [90, -45.9], [100, -49.9]
      ]);
      const duration = reviewedBuffInterpolateTable(skill, [
        [70, 27], [80, 28], [90, 30], [100, 31], [255, 54]
      ]);
      const atk = reviewedBuffRound1(attack);
      const avoid = reviewedBuffRound1(avoidPenalty);
      const sec = reviewedBuffRound1(duration);
      return {
        flatAttack: atk,
        extraAvoid: avoid,
        durationSeconds: sec,
        note: `カタログ由来 / 戦闘技術${skill} / 攻撃力+${atk} / 回避${avoid} / 持続${sec}秒 / AC低下なし`
      };
    }
  },
  {
    id: "night-mind",
    name: "ナイト マインド",
    category: "戦闘技術",
    inputKind: "skill",
    skillLabel: "戦闘技術",
    defaultSkill: 100,
    conflictGroup: "battle:accuracy",
    description: "Wikiの持続時間・上昇量表を区間補間。戦技255実測 Ave78.4・168秒を追加節点として使用。エンライテンと競合。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const hit = reviewedBuffInterpolateTable(skill, [
        [50, 34.5], [60, 36.8], [70, 39.05], [80, 41.4],
        [90, 43.35], [100, 43.55], [255, 78.4]
      ]);
      const duration = reviewedBuffInterpolateTable(skill, [
        [50, 9], [60, 17], [70, 25], [80, 33],
        [90, 41], [100, 49], [255, 168]
      ]);
      const value = reviewedBuffRound1(hit);
      const sec = reviewedBuffRound1(duration);
      return {
        extraHit: value,
        durationSeconds: sec,
        note: `カタログ由来 / 戦闘技術${skill} / 命中+${value} / 持続${sec}秒`
      };
    }
  },
// __MOE_REVIEWED_BUFF_CATALOG_BULK_BATCH1_V1__
  {
  id: "queens-order", name: "クイーンズ オーダー", category: "複合技/補助",
  inputKind: "none", conflictGroup: "",
  description: "自分以外のPTメンバーの攻撃力と命中を10%上昇。",
  evaluate() { return { attackPct:10, extraHitPct:10,
    note:"精査済み / 攻撃力+10% / 命中+10% / 自分には効果なし" }; }
},
  {
  id: "group-quickening", name: "グループ クイックニング", category: "複合魔法/補助",
  inputKind: "magic", defaultMagic:110, conflictGroup:"enhancement:evasion", reference:true,
  description:"強化100実測表を魔力で区間補間。",
  evaluate(input) {
    const magic=Math.max(0,Number(input.magic)||0);
    const v=reviewedBuffRound1(reviewedBuffInterpolateTable(magic,[[110,17.5],[140,19.6],[170,21.7]]));
    const sec=reviewedBuffRound1(reviewedBuffInterpolateTable(magic,[[110,381],[140,438],[170,496]]));
    return { extraAvoid:v, durationSeconds:sec,
      note:`精査済み実測補間 / 強化100 / 魔力${magic} / 回避+${v} / 持続${sec}秒 / PT範囲` };
  }
},
  {
  id: "group-blood-rush", name: "グループ ブラッド ラッシュ", category: "複合魔法/補助",
  inputKind: "magic", defaultMagic:110, conflictGroup:"enhancement:hp", reference:true,
  description:"強化100実測表を魔力で区間補間。",
  evaluate(input) {
    const magic=Math.max(0,Number(input.magic)||0);
    const v=reviewedBuffRound1(reviewedBuffInterpolateTable(magic,[[110,24.5],[140,28.5],[170,31.5]]));
    const sec=reviewedBuffRound1(reviewedBuffInterpolateTable(magic,[[110,663],[140,815],[170,965]]));
    return { extraHP:v, durationSeconds:sec,
      note:`精査済み実測補間 / 強化100 / 魔力${magic} / 最大HP+${v} / 持続${sec}秒 / PT範囲` };
  }
},
  {
  id: "great-eruption", name: "大噴火", category: "複合技/補助",
  inputKind: "skill", skillLabel: "自然調和", defaultSkill: 90,
  conflictGroup: "physical-damage:standard",
  description: "物理与ダメージ+10%。持続時間は自然調和×0.65-6.5秒。",
  evaluate(input) {
    const skill=Math.max(0,Number(input.skill)||0);
    const sec=reviewedBuffRound1(Math.max(0,skill*0.65-6.5));
    return { dmgPct:10, durationSeconds:sec,
      note:`精査済み / 自然調和${skill} / 物理与ダメージ+10% / 持続${sec}秒` };
  }
},
  {
  id: "accelerator", name: "アクセラレイター", category: "複合技/補助",
  inputKind: "none", conflictGroup: "movement-speed:forced",
  description: "2秒間、移動速度+100。効果中はテクニック使用不能。",
  evaluate() { return { flatSpeed:100, durationSeconds:2,
    note:"精査済み / 移動速度+100 / 持続2秒 / 効果中テクニック使用不能" }; }
},
  {
    id: "system-alter",
    name: "システム・オルタ",
    category: "複合技/補助",
    inputKind: "skill",
    skillLabel: "強化魔法相当値",
    defaultSkill: 100,
    conflictGroup: "battle:attack-enhancement",
    reference: true,
    description: "参考補間。強化100で攻撃力約+35・28秒、強化120相当で約+41.5・35秒。素手以外の通常アタック13%短縮。",
    evaluate(input) {
      const skill = Math.max(0, Number(input.skill) || 0);
      const clamped = Math.max(100, Math.min(120, skill));
      const t = (clamped - 100) / 20;
      const attack = 35 + (41.5 - 35) * t;
      const duration = 28 + (35 - 28) * t;
      const atk = Math.round(attack * 10) / 10;
      const seconds = Math.round(duration * 10) / 10;
      return {
        flatAttack: atk,
        extraAttackDelayPct: -13,
        durationSeconds: seconds,
        note: `カタログ由来・参考補間 / 強化相当${skill} / 攻撃力+${atk} / 持続${seconds}秒 / 通常アタック13%短縮`
      };
    }
  },
// __MOE_REVIEWED_BUFF_CATALOG_BULK_BATCH2_V1__
  {
  id: "acceleration", name: "アクセラレイション", category: "複合魔法/補助",
  inputKind: "magic", defaultMagic: 150, conflictGroup: "attack-delay:acceleration", reference: true,
  description: "強化100+50実測表を魔力で区間補間。効果量は攻撃ディレイ減算値。",
  evaluate(input) {
    const magic=Math.max(0,Number(input.magic)||0);
    const delay=reviewedBuffInterpolateTable(magic,[[150,-21],[200,-24],[300,-30],[400,-35],[500,-41]]);
    const duration=reviewedBuffInterpolateTable(magic,[[150,156],[200,183],[300,235],[400,280],[500,340]]);
    const value=reviewedBuffRound1(delay), sec=reviewedBuffRound1(duration);
    return { extraAttackDelay:value, durationSeconds:sec,
      note:`ユーザー提供実測 / 強化100+50 / 魔力${magic} / 攻撃ディレイ${value} / 持続${sec}秒` };
  }
},
// __MOE_REVIEWED_BUFF_CATALOG_GIRYU_V1__
  // __MOE_GIRYU_CONFLICT_NONE_FIX_V1__
{
  id: "giryu", name: "擬竜", category: "複合魔法/補助",
  inputKind: "none", conflictGroup: "",
  description: "攻撃力と物理与ダメージが約10%増加。現時点で競合なし。",
  evaluate() { return { attackPct: 10, dmgPct: 10,
    note: "ユーザー確認済み / 攻撃力+10% / 物理与ダメージ+10% / 競合なし" }; }
},
// __MOE_REVIEWED_BUFF_CATALOG_IDOL_SONG_V1__
  {
  id: "idol-song", name: "アイドル ソング", category: "複合技/補助",
  inputKind: "none", conflictGroup: "", reference: true,
  description: "音楽100実測参考。攻撃力・防御力が各約+20、持続約20秒。",
  evaluate() { return { flatAttack: 20, extraAC: 20, durationSeconds: 20,
    note: "ユーザー確認済み / 音楽100実測参考 / 攻撃力+20 / AC+20 / 持続20秒" }; }
},
{
  id: "lionic-aura",
  name: "ライオニック オーラ",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "body-potential:lionic",
  description: "最大HP・攻撃力・防御力・回避を各10%上昇。筋力100で持続約37秒。",
  evaluate() {
    return {
      extraHPPct: 10,
      attackPct: 10,
      extraACPct: 10,
      extraAvoidPct: 10,
      durationSeconds: 37,
      note: "Wiki確認値 / 最大HP+10% / 攻撃力+10% / AC+10% / 回避+10% / 筋力100で持続約37秒"
    };
  }
},
{
  id: "lionic-form",
  name: "ライオニック フォーム",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "牙",
  defaultSkill: 40,
  conflictGroup: "form:lionic",
  reference: true,
  description: "攻撃力と移動速度が上昇。牙40で各+10・15秒、牙90で各20弱・約30秒。既知2点を補間。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(reviewedBuffInterpolateTable(skill, [[40,10],[90,19.5]]));
    const seconds = reviewedBuffRound1(reviewedBuffInterpolateTable(skill, [[40,15],[90,30]]));
    return {
      flatAttack: value,
      flatSpeed: value,
      durationSeconds: seconds,
      note: `Wiki既知点補間 / 牙${skill} / 攻撃力+${value} / 移動速度+${value} / 持続${seconds}秒`
    };
  }
},
{
  id: "boost",
  name: "Boost",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "チャージ段階",
  defaultSkill: 1,
  conflictGroup: "physical-damage:force-boost",
  description: "攻撃力依存の攻撃で与えるダメージ+5%。最大5段階で、連続チャージごとに上昇量が2倍。",
  evaluate(input) {
    const level = Math.max(1, Math.min(5, Math.round(Number(input.skill) || 1)));
    const value = 5 * Math.pow(2, level - 1);
    return {
      dmgPct: value,
      note: `説明文確定値 / チャージ${level}段階 / 攻撃力依存の物理与ダメージ+${value}% / ST・MP消費増加は計算対象外`
    };
  }
},
{
  id: "darkness-force",
  name: "ダークネス フォース",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "body-potential:darkness-force",
  description: "攻撃力・防御力・命中が各+30。HP自然回復が上昇し、120秒後に666固定ダメージを受けて効果終了。",
  evaluate() {
    return {
      flatAttack: 30,
      extraAC: 30,
      extraHit: 30,
      durationSeconds: 120,
      note: "Wiki確認値 / 攻撃力+30 / AC+30 / 命中+30 / HP自然回復 約2/秒 / 120秒後に666固定ダメージ / 2022-10-18以降は他の攻撃力上昇Buffと併用可能"
    };
  }
},
{
  id: "reviewed-manual-270",
  name: "ツイスター ラン",
  category: "自然調和",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["移動速度"],
  sourceCandidateNo: 270,
  description: "移動速度上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 移動速度上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-681",
  name: "大地の守り",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["AC", "全抵抗"],
  sourceCandidateNo: 681,
  description: "AC・全抵抗の上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / AC・全抵抗の上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-690",
  name: "ハヤメ",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["命中"],
  sourceCandidateNo: 690,
  description: "命中上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 命中上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-701",
  name: "ムーン フォース",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["魔力", "全抵抗"],
  sourceCandidateNo: 701,
  description: "魔力・全抵抗の上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 魔力・全抵抗の上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-723",
  name: "ブレイン マッスル",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["攻撃力"],
  sourceCandidateNo: 723,
  description: "攻撃力上昇量を手入力。バーサーク系・キーン エッジ競合では最優先。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 攻撃力上昇量を手入力。バーサーク系・キーン エッジ競合では最優先。"
    };
  }
},
{
  id: "reviewed-manual-735",
  name: "アンカー ハウル",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["AC"],
  sourceCandidateNo: 735,
  description: "AC上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / AC上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-769",
  name: "フォートレス",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["AC"],
  sourceCandidateNo: 769,
  description: "AC上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / AC上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-771",
  name: "全力全開",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "魔法熟練",
  defaultSkill: 100,
  conflictGroup: "magic-power:full-burst",
  reference: true,
  sourceCandidateNo: 771,
  description: "魔法熟練値から魔力上昇量を低信頼の一次式で推定。AC低下はデータ不足のため未計算。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.32 + 7.6);
    return {
      flatMagic: value,
      note: `134件レビュー済みBuffマスター / 低信頼推定・外挿対応 / 魔法熟練${skill} / 魔力+${value}推定 / AC低下は未計算`
    };
  }
},
{
  id: "reviewed-manual-781",
  name: "フルバースト マジック",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "魔法熟練",
  defaultSkill: 100,
  conflictGroup: "magic-power:full-burst",
  reference: true,
  sourceCandidateNo: 781,
  description: "魔法熟練値から魔力上昇量を一次式で推定。無属性強化補正は未計算。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.42066 + 1.4747);
    return {
      flatMagic: value,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 魔法熟練${skill} / 魔力+${value}推定 / 無属性強化補正は未計算`
    };
  }
},
{
  id: "reviewed-manual-782",
  name: "モラール ブースター",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["攻撃力"],
  sourceCandidateNo: 782,
  description: "攻撃力上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 攻撃力上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-803",
  name: "ブラッド ムーン",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["魔力"],
  sourceCandidateNo: 803,
  description: "魔力上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 魔力上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-883",
  name: "エイム ファイアー",
  category: "銃器",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["命中", "移動速度"],
  sourceCandidateNo: 883,
  description: "命中上昇量・移動速度低下量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 命中上昇量・移動速度低下量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-884",
  name: "アサルト ファイアー",
  category: "銃器",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["回避", "耐地属性"],
  sourceCandidateNo: 884,
  description: "回避・耐地属性上昇量を手入力。移動速度-150は固定。",
  evaluate() {
    return {
      flatSpeed: -150,
      note: "134件レビュー済みBuffマスター / 手入力必須 / 回避・耐地属性上昇量を手入力。移動速度-150は固定。"
    };
  }
},
{
  id: "reviewed-manual-893",
  name: "ベビースネークのエチュード",
  category: "音楽",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["耐地属性"],
  sourceCandidateNo: 893,
  description: "耐地属性上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 耐地属性上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-895",
  name: "イクシオン マーチ",
  category: "音楽",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["AC"],
  sourceCandidateNo: 895,
  description: "AC上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / AC上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-896",
  name: "アルケミスト ラプソディ",
  category: "音楽",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["魔力"],
  sourceCandidateNo: 896,
  description: "魔力上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 魔力上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-898",
  name: "アビシニアン ワルツ",
  category: "音楽",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["回避"],
  sourceCandidateNo: 898,
  description: "回避上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 回避上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-904",
  name: "ホーリー ブレス",
  category: "魔法熟練",
  inputKind: "skill",
  skillLabel: "前提スキル",
  defaultSkill: 100,
  conflictGroup: "magic-power:full-burst",
  reference: true,
  sourceCandidateNo: 904,
  description: "前提1番目のスキル値から魔力上昇量と効果時間を一次式で推定。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.174833 + 8.48778);
    const seconds = reviewedBuffRound1(skill * 0.16 + 6.956);
    return {
      flatMagic: value,
      durationSeconds: Math.max(0, seconds),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / スキル${skill} / 魔力+${value}推定 / 持続${Math.max(0, seconds)}秒`
    };
  }
},
{
  id: "reviewed-manual-974",
  name: "ウルティメイト ヘルス",
  category: "強化魔法",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["最大HP"],
  sourceCandidateNo: 974,
  description: "最大HP上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 最大HP上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-977",
  name: "エレメンタル アーマー",
  category: "強化魔法",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["全抵抗"],
  sourceCandidateNo: 977,
  description: "全抵抗上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 全抵抗上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1116",
  name: "譲天",
  category: "複合魔法/回復",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["魔力"],
  sourceCandidateNo: 1116,
  description: "魔力上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 魔力上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1121",
  name: "ウルティメイト エナジー",
  category: "複合魔法/回復",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["最大ST"],
  sourceCandidateNo: 1121,
  description: "最大ST上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 最大ST上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1124",
  name: "ムーンライト シンフォニー",
  category: "複合魔法/回復",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["AC", "回避", "全抵抗"],
  sourceCandidateNo: 1124,
  description: "防御力・回避・全耐性上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 防御力・回避・全耐性上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1238",
  name: "プロモーション・ナイト",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "promotion:class",
  reference: true,
  sourceCandidateNo: 1238,
  description: "回避・移動速度上昇、魔力・防御低下。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(magic * 0.06725 + skill * 0.11183 + 4.3756);
    return {
      extraAvoid: value,
      flatSpeed: value,
      flatMagic: -value,
      extraAC: -value,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 回避/移動速度+${value}・魔力/防御-${value}推定`
    };
  }
},
{
  id: "reviewed-manual-1239",
  name: "プロモーション・ビショップ",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "promotion:class",
  reference: true,
  sourceCandidateNo: 1239,
  description: "魔力上昇、攻撃・防御低下。破壊魔法+10は別途skillPlusで反映。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(magic * 0.06725 + skill * 0.11183 + 4.3756);
    return {
      extraEffects: [{ key: "skillPlus", name: "破壊魔法", value: 10, unit: "", scope: "display" }],
      flatMagic: value,
      flatAttack: -value,
      extraAC: -value,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 魔力+${value}・攻撃/防御-${value}推定 / 破壊魔法+10は別途skillPlus`
    };
  }
},
{
  id: "reviewed-manual-1240",
  name: "プロモーション・ルーク",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "promotion:class",
  reference: true,
  sourceCandidateNo: 1240,
  description: "攻撃・防御上昇、回避・移動速度低下。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(magic * 0.06725 + skill * 0.11183 + 4.3756);
    return {
      flatAttack: value,
      extraAC: value,
      extraAvoid: -value,
      flatSpeed: -value,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 攻撃/防御+${value}・回避/移動速度-${value}推定`
    };
  }
},
{
  id: "reviewed-manual-1242",
  name: "マジックウォード・ホーリー",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["耐無属性"],
  sourceCandidateNo: 1242,
  description: "耐無属性上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 耐無属性上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1246",
  name: "アジリティ インプルーブ",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["回避", "攻撃ディレイ", "移動速度"],
  sourceCandidateNo: 1246,
  description: "回避・攻撃速度・移動速度上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 回避・攻撃速度・移動速度上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1256",
  name: "パーフェクト・ウォリアー",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["攻撃力", "命中", "AC"],
  sourceCandidateNo: 1256,
  description: "攻撃力・命中・防御力上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 攻撃力・命中・防御力上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1257",
  name: "マジック プロテクション",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["全抵抗"],
  sourceCandidateNo: 1257,
  description: "全抵抗上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 全抵抗上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1258",
  name: "エアリアル",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "",
  reference: true,
  sourceCandidateNo: 1258,
  description: "強化魔法と魔力から攻撃・防御・移動速度を推定。風属性強化補正は未計算。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const atkDef = reviewedBuffRound1(skill * 0.12375779 + magic * 0.05741985 + 3.2949085);
    const speed = reviewedBuffRound1(skill * 0.12 + magic * 0.05670103 - 3.82164948);
    return {
      flatAttack: Math.max(0, atkDef),
      extraAC: Math.max(0, atkDef),
      flatSpeed: Math.max(0, speed),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 攻撃/防御+${Math.max(0, atkDef)}・移動速度+${Math.max(0, speed)}推定 / 風属性強化補正未計算`
    };
  }
},
{
  id: "reviewed-manual-1259",
  name: "グレーター ハードニング",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "armor:greater-hardening",
  reference: true,
  manualRequired: true,
  manualFields: ["AC"],
  sourceCandidateNo: 1259,
  description: "AC上昇量を手入力。スピリット ガード・ホーリー ガードと併用不可で常に本Buff優先。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / AC上昇量を手入力。スピリット ガード・ホーリー ガードと併用不可で常に本Buff優先。"
    };
  }
},
{
  id: "reviewed-manual-1268",
  name: "カラミティ フォース",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["攻撃力"],
  sourceCandidateNo: 1268,
  description: "攻撃力上昇量を手入力。アタックディレイ-15は固定。",
  evaluate() {
    return {
      extraAttackDelay: -15,
      note: "134件レビュー済みBuffマスター / 手入力必須 / 攻撃力上昇量を手入力。アタックディレイ-15は固定。"
    };
  }
},
{
  id: "reviewed-manual-1270",
  name: "デボーテッド エイド",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["攻撃力", "命中", "回避", "AC"],
  sourceCandidateNo: 1270,
  description: "攻撃力・命中・回避・防御力上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 攻撃力・命中・回避・防御力上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1272",
  name: "プロモーション・クイーン",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "promotion:class",
  reference: true,
  sourceCandidateNo: 1272,
  description: "攻撃・魔力・回避・防御・移動速度を上昇。クイーンは他プロモーションより効果量約1低い。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(magic * 0.06725 + skill * 0.11183 + 3.3756);
    return {
      flatAttack: value,
      flatMagic: value,
      extraAvoid: value,
      extraAC: value,
      flatSpeed: value,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 攻撃・魔力・回避・防御・移動速度+${value}推定 / クイーン補正済み`
    };
  }
},
{
  id: "reviewed-manual-1273",
  name: "リインフォース",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  sourceCandidateNo: 1273,
  description: "強化魔法と魔力から、攻撃・命中・回避・防御・魔力・移動速度の上昇量を推定。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(skill * 0.16463 + magic * 0.03954 + 4.557);
    return {
      flatAttack: value,
      extraHit: value,
      extraAvoid: value,
      extraAC: value,
      flatMagic: value,
      flatSpeed: value,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 攻撃・命中・回避・防御・魔力・移動速度+${value}推定`
    };
  }
},
{
  id: "reviewed-manual-1275",
  name: "ウルティメイト マナ",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["最大MP"],
  sourceCandidateNo: 1275,
  description: "最大MP上昇量を手入力。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 手入力必須 / 最大MP上昇量を手入力。"
    };
  }
},
{
  id: "reviewed-manual-1279",
  name: "プリズム エフェクト",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  sourceCandidateNo: 1279,
  description: "強化魔法と魔力からHP・ST・MP・攻撃・防御・命中・回避の上昇量を推定。神秘魔法は発動条件。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(magic * 0.055736 + skill * 0.090239 - 4.69476);
    const safeValue = Math.max(0, value);
    return {
      extraHP: safeValue,
      extraST: safeValue,
      extraMP: safeValue,
      flatAttack: safeValue,
      extraAC: safeValue,
      extraHit: safeValue,
      extraAvoid: safeValue,
      durationSeconds: 115,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / HP・ST・MP・攻撃・防御・命中・回避+${safeValue}推定 / 持続115秒参考`
    };
  }
},
{
  id: "reviewed-manual-1282",
  name: "アクムレイト マナ",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  conflictGroup: "battle:attack-enhancement",
  reference: true,
  sourceCandidateNo: 1282,
  description: "強化魔法と魔力から攻撃力上昇量を一次式で推定。キーン エッジ系統と競合。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(skill * 0.304 + magic * 0.235 - 12.54);
    return {
      flatAttack: Math.max(0, value),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 攻撃力+${Math.max(0, value)}推定 / キーン エッジ系統と競合`
    };
  }
},
{
  id: "reviewed-manual-1286",
  name: "グレーター フルポテンシャル",
  category: "複合魔法/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "",
  reference: true,
  sourceCandidateNo: 1286,
  description: "強化魔法と魔力から攻撃・命中・防御・回避・魔力・全耐性を推定。風属性強化補正は未計算。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const value = reviewedBuffRound1(skill * 0.1785034 + magic * 0.06442177 - 14.72653061);
    const safeValue = Math.max(0, value);
    return {
      flatAttack: safeValue,
      extraHit: safeValue,
      extraAC: safeValue,
      extraAvoid: safeValue,
      flatMagic: safeValue,
      extraFireRes: safeValue,
      extraWaterRes: safeValue,
      extraEarthRes: safeValue,
      extraWindRes: safeValue,
      extraNeutralRes: safeValue,
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill}・魔力${magic} / 攻撃・命中・防御・回避・魔力・全耐性+${safeValue}推定 / 風属性強化補正未計算`
    };
  }
},
{
  id: "reviewed-manual-1305",
  name: "シャイニング フォース",
  category: "複合魔法/防御",
  inputKind: "skillMagic",
  skillLabel: "神秘魔法",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  sourceCandidateNo: 1305,
  description: "神秘魔法と魔力から全耐性上昇・ダメージカット率・効果時間を推定。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const magic = Math.max(0, Number(input.magic) || 0);
    const resist = reviewedBuffRound1(skill * 0.12043 + magic * 0.08880 + 16.828);
    const damageReduce = reviewedBuffRound1(skill * 0.01440 + magic * 0.02643 + 16.848);
    const seconds = reviewedBuffRound1(skill * 0.85051 + magic * 0.46778 + 77.953);
    return {
      extraFireRes: resist,
      extraWaterRes: resist,
      extraEarthRes: resist,
      extraWindRes: resist,
      extraNeutralRes: resist,
      extraDamageReducePct: damageReduce,
      durationSeconds: Math.max(0, seconds),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 神秘魔法${skill}・魔力${magic} / 全耐性+${resist}・ダメージカット${damageReduce}%推定 / 持続${Math.max(0, seconds)}秒`
    };
  }
},
{
  id: "dragon-force",
  name: "ドラゴン フォース",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+15% / AC+15%。牙攻撃力+20%は注記のみ。",
  evaluate() {
    return {
      attackPct: 15,
      extraACPct: 15,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃力+15% / AC+15% / 牙攻撃力+20%"
    };
  }
},
{
  id: "mode-change-tank",
  name: "モードチェンジ タンク",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "移動速度+30。",
  evaluate() {
    return {
      flatSpeed: 30,
      note: "134件レビュー済みBuffマスター / 固定値 / 移動速度+30"
    };
  }
},
{
  id: "release-of-force",
  name: "リリース オブ フォース",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃ディレイ-25。",
  evaluate() {
    return {
      extraAttackDelay: -25,
      note: "134件レビュー済みBuffマスター / 固定値 / 攻撃ディレイ-25"
    };
  }
},
{
  id: "release-of-magic",
  name: "リリース オブ マジック",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "魔法ディレイ-25 / 魔力+10%。物理計算では注記のみ。",
  evaluate() {
    return {
      magicPct: 10,
      extraMagicDelay: -25,
      note: "134件レビュー済みBuffマスター / 固定値・固定割合 / 魔法ディレイ-25 / 魔力+10%"
    };
  }
},
{
  id: "raising-heart-setup",
  name: "レイジングハート セットアップ！",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "魔力+10%。物理計算では注記のみ。",
  evaluate() {
    return {
      magicPct: 10,
      note: "134件レビュー済みBuffマスター / 固定割合 / 魔力+10%"
    };
  }
},
{
  id: "youryoku-kaihou",
  name: "妖力解放",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "魔力+10%。物理計算では注記のみ。",
  evaluate() {
    return {
      magicPct: 10,
      note: "134件レビュー済みBuffマスター / 固定割合 / 魔力+10%"
    };
  }
},
{
  id: "senki-kaihou",
  name: "仙気解放",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "自然調和",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  description: "攻撃力・命中・回避・防御 = 自然調和×0.172+7.55。アタックディレイ-13。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.172 + 7.55);
    return {
      flatAttack: value,
      extraHit: value,
      extraAvoid: value,
      extraAC: value,
      extraAttackDelay: -13,
      note: `134件レビュー済みBuffマスター / 自然調和${skill} / 攻撃力・命中・回避・防御+${value} / 攻撃ディレイ-13`
    };
  }
},
{
  id: "steam-burst",
  name: "スチーム バースト",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+15。",
  evaluate() {
    return {
      flatAttack: 15,
      note: "134件レビュー済みBuffマスター / 固定値 / 攻撃力+15"
    };
  }
},
{
  id: "boost-vitality",
  name: "ブースト バイタリティ",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "最大HP1.25倍。",
  evaluate() {
    return {
      extraHPPct: 25,
      note: "134件レビュー済みBuffマスター / 固定倍率 / 最大HP1.25倍（+25%）"
    };
  }
},
{
  id: "rose-ensemble",
  name: "薔薇のアンサンブル",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "クリティカル率+30%。",
  evaluate() {
    return {
      extraCritRatePct: 30,
      note: "134件レビュー済みBuffマスター / 固定割合 / クリティカル率+30%"
    };
  }
},
{
  id: "agility-circle",
  name: "アジリティ サークル",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "回避+20 / 攻撃ディレイ-5。",
  evaluate() {
    return {
      extraAvoid: 20,
      extraAttackDelay: -5,
      note: "134件レビュー済みBuffマスター / 固定値 / 回避+20 / 攻撃ディレイ-5"
    };
  }
},
{
  id: "boosted-legs",
  name: "ブーステッド レッグス",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "キックスキル+10。skillPlusとして表示・集計・最適化へ反映。",
  evaluate() {
    return {
      extraEffects: [{ key: "skillPlus", name: "キック", value: 10, unit: "", scope: "display" }],
      note: "134件レビュー済みBuffマスター / 固定値 / キックスキル+10 / キックスキル+10をskillPlusへ反映"
    };
  }
},
{
  id: "belka-magic-circle-vita",
  name: "ベルカ式魔法陣(ヴィータ)",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+20。",
  evaluate() {
    return {
      flatAttack: 20,
      note: "134件レビュー済みBuffマスター / 固定値 / 攻撃力+20"
    };
  }
},
{
  id: "magic-circle",
  name: "マジック サークル",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "魔力+10。物理計算では注記のみ。",
  evaluate() {
    return {
      flatMagic: 10,
      note: "134件レビュー済みBuffマスター / 固定値 / 魔力+10"
    };
  }
},
{
  id: "midchilda-circle-nanoha",
  name: "ミッドチルダ式魔法陣(なのは)",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "魔力+15。物理計算では注記のみ。",
  evaluate() {
    return {
      flatMagic: 15,
      note: "134件レビュー済みBuffマスター / 固定値 / 魔力+15"
    };
  }
},
{
  id: "midchilda-circle-fate",
  name: "ミッドチルダ式魔法陣(フェイト)",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "回避+20 / 移動速度+20。",
  evaluate() {
    return {
      extraAvoid: 20,
      flatSpeed: 20,
      note: "134件レビュー済みBuffマスター / 固定値 / 回避+20 / 移動速度+20"
    };
  }
},
{
  id: "yuumou-muhi-no-jin",
  name: "勇猛無比の陣",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+15%。",
  evaluate() {
    return {
      attackPct: 15,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃力+15%"
    };
  }
},
{
  id: "argonaut",
  name: "アルゴノゥト",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "与ダメージ+100%。",
  evaluate() {
    return {
      dmgPct: 100,
      note: "134件レビュー済みBuffマスター / 固定割合 / 与ダメージ+100%"
    };
  }
},
{
  id: "unlimited-force",
  name: "アンリミテッド フォース",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "physical-damage:force-boost",
  description: "与ダメージ+15% / 魔力+20%。Boost・マスター ストレングスと競合。",
  evaluate() {
    return {
      magicPct: 20,
      dmgPct: 15,
      note: "134件レビュー済みBuffマスター / 固定割合 / 与ダメージ+15% / 魔力+20% / Boost・マスター ストレングスと競合"
    };
  }
},
{
  id: "giant",
  name: "ジャイアント",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+25%。",
  evaluate() {
    return {
      attackPct: 25,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃力+25%"
    };
  }
},
{
  id: "spell-enhance",
  name: "スペル エンハンス",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "破壊魔法スキル+30。skillPlusとして表示・集計・最適化へ反映。",
  evaluate() {
    return {
      extraEffects: [{ key: "skillPlus", name: "破壊魔法", value: 30, unit: "", scope: "display" }],
      note: "134件レビュー済みBuffマスター / 固定値 / 破壊魔法スキル+30 / 破壊魔法スキル+30をskillPlusへ反映"
    };
  }
},
{
  id: "forced-awaken",
  name: "フォースド アウェイクン",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "与ダメージ+20%。",
  evaluate() {
    return {
      dmgPct: 20,
      note: "134件レビュー済みBuffマスター / 固定割合 / 与ダメージ+20%"
    };
  }
},
/* __MOE_RAGE_ACCUMULATE_FIX_AND_HEROES_AUDIT_V1__ */
{
  id: "rage-drive",
  name: "レイジ ドライブ",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "与ダメージ+20% / 攻撃ディレイ-10 / 回避-50%。",
  evaluate() {
    return {
      dmgPct: 20,
      extraAttackDelay: -10,
      extraAvoidPct: -50,
      note: "134件レビュー済みBuffマスター / 固定値・固定割合 / 与ダメージ+20% / 攻撃ディレイ-10 / 回避-50%"
    };
  }
},
{
  id: "zetsudan",
  name: "絶断",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "与ダメージ+20%。",
  evaluate() {
    return {
      dmgPct: 20,
      note: "134件レビュー済みBuffマスター / 固定割合 / 与ダメージ+20%"
    };
  }
},
{
  id: "gravity-axis",
  name: "グラビティアクシス",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃ディレイ-25。",
  evaluate() {
    return {
      extraAttackDelay: -25,
      note: "134件レビュー済みBuffマスター / 固定値 / 攻撃ディレイ-25"
    };
  }
},
{
  id: "great-magic-circle",
  name: "グレート マジック サークル",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "魔力+15%。物理計算では注記のみ。",
  evaluate() {
    return {
      magicPct: 15,
      note: "134件レビュー済みBuffマスター / 固定割合 / 魔力+15%"
    };
  }
},
{
  id: "takemikazuchi",
  name: "タケミカヅチ",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃ディレイ-25 / 魔法ディレイ-25 / 移動速度+25 / 回避+25。",
  evaluate() {
    return {
      extraAttackDelay: -25,
      extraMagicDelay: -25,
      flatSpeed: 25,
      extraAvoid: 25,
      note: "134件レビュー済みBuffマスター / 固定値 / 攻撃ディレイ-25 / 魔法ディレイ-25 / 移動速度+25 / 回避+25"
    };
  }
},
{
  id: "master-strength",
  name: "マスター ストレングス",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "physical-damage:force-boost",
  description: "与ダメージ+100%。",
  evaluate() {
    return {
      dmgPct: 100,
      note: "134件レビュー済みBuffマスター / 固定割合 / 与ダメージ+100%"
    };
  }
},
{
  id: "gigantic-mode",
  name: "ギガンテック モード",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+25 / 移動速度+50。",
  evaluate() {
    return {
      flatAttack: 25,
      flatSpeed: 50,
      note: "134件レビュー済みBuffマスター / 固定値 / 攻撃力+25 / 移動速度+50"
    };
  }
},
{
  id: "limit-breakthrough",
  name: "限界突破",
  category: "複合技/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃・命中・防御・回避・魔力+20%。神の騎士・ウチデノコヅチ等と併用不可。",
  evaluate() {
    return {
      magicPct: 20,
      attackPct: 20,
      extraHitPct: 20,
      extraACPct: 20,
      extraAvoidPct: 20,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃・命中・防御・回避・魔力+20% / 神の騎士・ウチデノコヅチ等と併用不可"
    };
  }
},
{
  id: "otherworld-magic",
  name: "異界の魔力",
  category: "回復魔法",
  inputKind: "none",
  conflictGroup: "",
  description: "魔力+15%。物理計算では注記のみ。",
  evaluate() {
    return {
      magicPct: 15,
      note: "134件レビュー済みBuffマスター / 固定割合 / 魔力+15%"
    };
  }
},
{
  id: "gogyoufu",
  name: "五行符",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "全属性強化1.1倍。物理計算では注記のみ。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 固定倍率 / 全属性強化1.1倍"
    };
  }
},
{
  id: "force-step",
  name: "フォース ステップ",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "与ダメージ+10% / 攻撃ディレイ-20。",
  evaluate() {
    return {
      dmgPct: 10,
      extraAttackDelay: -20,
      note: "134件レビュー済みBuffマスター / 固定値・固定割合 / 与ダメージ+10% / 攻撃ディレイ-20"
    };
  }
},
{
  id: "crown-of-god",
  name: "神の王冠",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "全耐性+50%。物理計算では注記のみ。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 固定割合 / 全耐性+50%"
    };
  }
},
{
  id: "knight-of-god",
  name: "神の騎士",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "body-potential:knight-of-god",
  description: "攻撃・命中・回避・防御+10%。",
  evaluate() {
    return {
      attackPct: 10,
      extraHitPct: 10,
      extraAvoidPct: 10,
      extraACPct: 10,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃・命中・回避・防御+10%"
    };
  }
},
/* __MOE_REVIEWED_BUFF_SKILLPLUS_BATCH4_V1__ */
{
  id: "elixir",
  name: "エリクシール",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "回復魔法スキル+30。skillPlusとして表示・集計・最適化へ反映。",
  evaluate() {
    return {
      extraEffects: [{ key: "skillPlus", name: "回復魔法", value: 30, unit: "", scope: "display" }],
      note: "134件レビュー済みBuffマスター / 固定値 / 回復魔法スキル+30 / 回復魔法スキル+30をskillPlusへ反映"
    };
  }
},
{
  id: "infinity-force",
  name: "インフィニティ フォース",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃・防御・命中・回避+20%。",
  evaluate() {
    return {
      attackPct: 20,
      extraACPct: 20,
      extraHitPct: 20,
      extraAvoidPct: 20,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃・防御・命中・回避+20%"
    };
  }
},
{
  id: "uchide-no-kozuchi",
  name: "ウチデノコヅチ",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "body-potential:knight-of-god",
  description: "攻撃力・命中・回避・防御力・魔力+15%。",
  evaluate() {
    return {
      magicPct: 15,
      attackPct: 15,
      extraHitPct: 15,
      extraAvoidPct: 15,
      extraACPct: 15,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃力・命中・回避・防御力・魔力+15%"
    };
  }
},
{
  id: "elemental-increase",
  name: "エレメンタル インクリース",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "全耐性+50%。物理計算では注記のみ。",
  evaluate() {
    return {
      note: "134件レビュー済みBuffマスター / 固定割合 / 全耐性+50%"
    };
  }
},
{
  id: "trinity-enhance",
  name: "トリニティ エンハンス",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "",
  description: "攻撃力+20% / 攻撃ディレイ-20。",
  evaluate() {
    return {
      attackPct: 20,
      extraAttackDelay: -20,
      note: "134件レビュー済みBuffマスター / 固定割合・固定値 / 攻撃力+20% / 攻撃ディレイ-20"
    };
  }
},
{
  id: "multiple-enhance",
  name: "マルチプル エンハンス",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "body-potential:knight-of-god",
  description: "攻撃・命中・回避・防御・最大ST+10%。神の騎士系と競合。",
  evaluate() {
    return {
      attackPct: 10,
      extraHitPct: 10,
      extraAvoidPct: 10,
      extraACPct: 10,
      note: "134件レビュー済みBuffマスター / 固定割合 / 攻撃・命中・回避・防御・最大ST+10% / 神の騎士系と競合"
    };
  }
},
/* __MOE_REVIEWED_BUFF_FORMULA_BATCH2_V2__ */
{
  id: "reverse-fusion",
  name: "りばーす・ふゅーじょん",
  category: "暗黒命令",
  inputKind: "skill",
  skillLabel: "暗黒命令",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  description: "暗黒命令値からHP・ST・MP・攻撃力・防御力・魔力の上昇量と効果時間を推定。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.34862 - 11.0888);
    const seconds = reviewedBuffRound1(skill * 3.9329 - 309.69);
    const safeValue = Math.max(0, value);
    return {
      extraHP: safeValue,
      extraST: safeValue,
      extraMP: safeValue,
      flatAttack: safeValue,
      extraAC: safeValue,
      flatMagic: safeValue,
      durationSeconds: Math.max(0, seconds),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 暗黒命令${skill} / HP・ST・MP・攻撃力・防御力・魔力+${safeValue}推定 / 持続${Math.max(0, seconds)}秒`
    };
  }
},
/* __MOE_WEREWOLF_MANUAL_FIELDS_FIX_V1__ */
{
  id: "werewolf",
  name: "ワーウルフ",
  category: "牙",
  inputKind: "skill",
  skillLabel: "牙",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  manualRequired: true,
  manualFields: ["耐風低下"],
  description: "耐風低下量を手入力。牙100で耐風低下50の参考値あり。別途記録されている48の対象能力は未確定のため、計算効果には含めない。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    return {
      note: `134件レビュー済みBuffマスター / 参考値・手入力 / 牙${skill} / 牙100で耐風低下50 / 未確定の48は計算対象外`
    };
  }
},
{
  id: "cool-de-chocolat",
  name: "クール・ド・ショコラ",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "料理",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  description: "料理100で攻撃・防御・命中・回避・魔力・全抵抗が約11.9〜12.9上昇。中央値12.4を基準に比例推定。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.124);
    return {
      flatAttack: value,
      extraAC: value,
      extraHit: value,
      extraAvoid: value,
      flatMagic: value,
      note: `134件レビュー済みBuffマスター / 参考値 / 料理${skill} / 各能力+${value}推定 / 料理100で11.9〜12.9 / 全抵抗も同程度`
    };
  }
},
{
  id: "fenrir-force",
  name: "フェンリル フォース",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "牙",
  defaultSkill: 98,
  conflictGroup: "",
  reference: true,
  description: "牙98で攻撃力+20.2、移動速度+20.2。既知点から比例推定。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * (20.2 / 98));
    return {
      flatAttack: value,
      flatSpeed: value,
      note: `134件レビュー済みBuffマスター / 参考値 / 牙${skill} / 攻撃力+${value} / 移動速度+${value} / 牙98で+20.2`
    };
  }
},
{
  id: "medarot-ground-control",
  name: "メダロット たいちせいぎょ",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "自然調和",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  description: "自然調和100で移動速度+20.2、現在重量-31.0〜33.6%。移動速度のみ比例推定して反映。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const speed = reviewedBuffRound1(skill * 0.202);
    return {
      flatSpeed: speed,
      note: `134件レビュー済みBuffマスター / 参考値 / 自然調和${skill} / 移動速度+${speed} / 自然調和100で現在重量-31.0〜33.6%`
    };
  }
},
/* __MOE_REVIEWED_BUFF_FORMULA_BATCH3_V1__ */
{
  id: "ignis-form",
  name: "イグニス フォーム",
  category: "複合技/補助",
  inputKind: "skillMagic",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  defaultMagic: 100,
  conflictGroup: "battle:attack-enhancement",
  reference: true,
  description: "強化魔法値から攻撃力上昇量を推定。火属性強化補正は未計算。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.22229 + 15.359);
    return {
      flatAttack: Math.max(0, value),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill} / 攻撃力+${Math.max(0, value)}推定 / 火属性強化補正未計算 / キーン エッジ系統と競合`
    };
  }
},
/* __MOE_REVIEWED_BUFF_FORMULA_BATCH1_V2__ */
{
  id: "dialos-pops",
  name: "ダイアロス ポップス",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "音楽",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  description: "音楽値から攻撃力上昇量と効果時間を一次式で推定。確認範囲外も外挿。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.33249 - 4.1243);
    const seconds = reviewedBuffRound1(skill * 0.4 - 6);
    return {
      flatAttack: value,
      durationSeconds: Math.max(0, seconds),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 音楽${skill} / 攻撃力+${value}推定 / 持続${Math.max(0, seconds)}秒`
    };
  }
},
{
  id: "limit-break",
  name: "リミット ブレイク",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "強化魔法",
  defaultSkill: 100,
  conflictGroup: "",
  reference: true,
  description: "強化魔法値から攻撃力上昇量と効果時間を一次式で推定。確認範囲外も外挿。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.243794 + 5.4988);
    const seconds = reviewedBuffRound1(skill * 0.812727 - 48.9858);
    return {
      flatAttack: value,
      durationSeconds: Math.max(0, seconds),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 強化魔法${skill} / 攻撃力+${value}推定 / 持続${Math.max(0, seconds)}秒`
    };
  }
},
/* __MOE_HEROES_FANTASIA_FORMULA_V1__ */
{
  id: "heroes-fantasia",
  name: "ヒーローズ ファンタジア",
  category: "複合技/補助",
  inputKind: "skill",
  skillLabel: "音楽",
  defaultSkill: 98,
  conflictGroup: "",
  reference: true,
  description: "攻撃・命中・回避・防御・魔力・全耐性上昇。音楽98/153の実測から一次式で推定し、確認範囲外も外挿。",
  evaluate(input) {
    const skill = Math.max(0, Number(input.skill) || 0);
    const value = reviewedBuffRound1(skill * 0.1609090909 + 4.6745454545);
    const seconds = reviewedBuffRound1(skill * 0.8363636364 - 32.9636363636);
    return {
      flatAttack: value,
      extraHit: value,
      extraAvoid: value,
      extraAC: value,
      flatMagic: value,
      extraFireRes: value,
      extraWaterRes: value,
      extraEarthRes: value,
      extraWindRes: value,
      extraNeutralRes: value,
      durationSeconds: Math.max(0, seconds),
      note: `134件レビュー済みBuffマスター / 参考値・外挿対応 / 音楽${skill} / 攻撃・命中・回避・防御・魔力・全耐性+${value}推定 / 持続${Math.max(0, seconds)}秒`
    };
  }
},
{
  id: "suiken",
  name: "酔拳",
  category: "複合魔法/補助",
  inputKind: "none",
  conflictGroup: "attack-conversion",
  reference: false,
  description: "酩酊度の50%を攻撃力へ変換。通常の攻撃力加算ではなく、ステータス変換として上限外加算。",
  evaluate() {
    return {
      convDrunkRate: 50,
      note: "134件レビュー済みBuffマスター / 酔拳 / 酩酊度→攻撃力変換50% / 上限外加算"
    };
  }
}
];

// __MOE_CLIENT_CATALOG_FIXED_STAT_FORMULAS_20261005_V1__
// Selected original client kind41 formulas. Seed10 is a deterministic reference,
// not an observed mean. Percent, delay, conditional and child/stage paths excluded.
(function installClientCatalogFixedStatFormulas(root) {
  'use strict';
  const rows = [{"id":813,"sourceId":"kung-fu-soul","primary":"戦闘技術","magic":false,"strength":{"required":70,"coefficient":0.003000000026077032,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":1,"base":-12.0,"fields":["extraNeutralRes"],"target":"耐無属性"},{"index":2,"base":-12.0,"fields":["extraFireRes"],"target":"耐火属性"},{"index":3,"base":-12.0,"fields":["extraWaterRes"],"target":"耐水属性"},{"index":4,"base":-12.0,"fields":["extraWindRes"],"target":"耐風属性"},{"index":5,"base":-12.0,"fields":["extraEarthRes"],"target":"耐地属性"},{"index":6,"base":-12.0,"fields":["extraAvoid"],"target":"回避"}],"partial":true,"element":1,"name":"カンフー ソウル"},{"id":10726,"sourceId":"keen-edge","primary":"強化魔法","magic":true,"strength":{"required":50,"coefficient":0.01899999938905239,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":37,"flags254":128,"entries":[{"index":0,"base":3.700000047683716,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":6,"name":"キーン エッジ"},{"id":153,"sourceId":"enlighten","primary":"強化魔法","magic":true,"strength":{"required":20,"coefficient":0.017999999225139618,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":1.0700000524520874,"fields":["extraHit"],"target":"命中"}],"partial":false,"element":4,"name":"エンライテン"},{"id":114,"sourceId":"holy-guard","primary":"強化魔法","magic":true,"strength":{"required":70,"coefficient":0.01979999989271164,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":1.0,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":5,"name":"ホーリー ガード"},{"id":166,"sourceId":"spirit-guard","primary":"強化魔法","magic":true,"strength":{"required":30,"coefficient":0.0026000000070780516,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":4.5,"fields":["extraAC"],"target":"防御力"}],"partial":true,"element":5,"name":"スピリット ガード"},{"id":142,"sourceId":"quickening","primary":"強化魔法","magic":true,"strength":{"required":20,"coefficient":0.017999999225139618,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":5,"flags254":128,"entries":[{"index":0,"base":1.059999942779541,"fields":["extraAvoid"],"target":"回避"}],"partial":false,"element":5,"name":"クイックニング"},{"id":131,"sourceId":"vigor","primary":"強化魔法","magic":true,"strength":{"required":30,"coefficient":0.01899999938905239,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":1.0989999771118164,"fields":["flatAttack"],"target":"攻撃力"}],"partial":false,"element":6,"name":"ヴィガー"},{"id":154,"sourceId":"blood-rush","primary":"強化魔法","magic":true,"strength":{"required":50,"coefficient":0.019999999552965164,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.599999904632568,"fields":["extraHP"],"target":"最大HP"}],"partial":false,"element":5,"name":"ブラッド ラッシュ"},{"id":155,"sourceId":"mind-rush","primary":"強化魔法","magic":true,"strength":{"required":50,"coefficient":0.019999999552965164,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.599999904632568,"fields":["extraMP"],"target":"最大MP"}],"partial":false,"element":4,"name":"マインド ラッシュ"},{"id":152,"sourceId":"transform","primary":"強化魔法","magic":true,"strength":{"required":90,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":5,"flags254":642,"entries":[{"index":0,"base":21.0,"fields":["extraHit"],"target":"命中"},{"index":1,"base":21.0,"fields":["extraAC"],"target":"防御力"},{"index":2,"base":-50.0,"fields":["extraMP"],"target":"最大MP"},{"index":3,"base":-50.0,"fields":["flatMagic"],"target":"魔力"}],"partial":true,"element":2,"name":"トランスフォーム"},{"id":96,"sourceId":"steam-blood","primary":"強化魔法","magic":true,"strength":{"required":60,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":5,"flags254":131,"entries":[{"index":0,"base":5.800000190734863,"fields":["flatSpeed"],"target":"移動速度"}],"partial":true,"element":3,"name":"スティーム ブラッド"},{"id":322,"sourceId":"berserk","primary":"戦闘技術","magic":false,"strength":{"required":30,"coefficient":0.0020000000949949026,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":386,"entries":[{"index":0,"base":8.199999809265137,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":1,"name":"バーサーク"},{"id":384,"sourceId":"berserk-all","primary":"戦闘技術","magic":false,"strength":{"required":60,"coefficient":0.006000000052154064,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":32769,"flags254":128,"entries":[{"index":0,"base":14.800000190734863,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":-26.0,"fields":["extraAvoid"],"target":"回避"}],"partial":false,"element":2,"name":"バーサーク オール"},{"id":324,"sourceId":"night-mind","primary":"戦闘技術","magic":false,"strength":{"required":50,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":25.0,"fields":["extraHit"],"target":"命中"}],"partial":false,"element":1,"name":"ナイト マインド"},{"id":5096,"sourceId":"group-quickening","primary":"強化魔法","magic":true,"strength":{"required":70,"coefficient":0.017999999225139618,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":5,"flags254":128,"entries":[{"index":0,"base":1.100000023841858,"fields":["extraAvoid"],"target":"回避"}],"partial":false,"element":5,"name":"グループ クイックニング"},{"id":5097,"sourceId":"group-blood-rush","primary":"強化魔法","magic":true,"strength":{"required":80,"coefficient":0.019999999552965164,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":128,"entries":[{"index":0,"base":6.0,"fields":["extraHP"],"target":"最大HP"}],"partial":false,"element":5,"name":"グループ ブラッド ラッシュ"},{"id":8438,"sourceId":"system-alter","primary":"強化魔法","magic":false,"strength":{"required":60,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":386,"entries":[{"index":0,"base":13.199999809265137,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":1,"name":"システム・オルタ"},{"id":6270,"sourceId":"idol-song","primary":"音楽","magic":false,"strength":{"required":40,"coefficient":0.003000000026077032,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":8388609,"flags254":128,"entries":[{"index":0,"base":4.099999904632568,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":4.099999904632568,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":2,"name":"アイドル ソング"},{"id":9749,"sourceId":"reviewed-manual-681","primary":"強化魔法","magic":false,"strength":{"required":1,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":789,"flags254":128,"entries":[{"index":0,"base":3.0,"fields":["extraAC"],"target":"防御力"},{"index":1,"base":3.0,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":false,"element":6,"name":"大地の守り"},{"id":13051,"sourceId":"reviewed-manual-723","primary":"筋力","magic":false,"strength":{"required":90,"coefficient":0.0020000000949949026,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":1,"flags254":385,"entries":[{"index":0,"base":38.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":38.0,"fields":["extraAC"],"target":"防御力"}],"partial":true,"element":0,"name":"ブレイン マッスル"},{"id":9760,"sourceId":"reviewed-manual-769","primary":"盾","magic":false,"strength":{"required":60,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":33,"flags254":128,"entries":[{"index":0,"base":15.0,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":1,"name":"フォートレス"},{"id":8436,"sourceId":"reviewed-manual-771","primary":"魔法熟練","magic":false,"strength":{"required":60,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":21,"flags254":130,"entries":[{"index":0,"base":15.5,"fields":["flatMagic"],"target":"魔力"},{"index":2,"base":-7.699999809265137,"fields":["extraAC"],"target":"防御力"}],"partial":true,"element":2,"name":"全力全開"},{"id":9758,"sourceId":"reviewed-manual-781","primary":"魔法熟練","magic":false,"strength":{"required":70,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":37,"flags254":130,"entries":[{"index":0,"base":20.0,"fields":["flatMagic"],"target":"魔力"}],"partial":true,"element":2,"name":"フルバースト マジック"},{"id":4568,"sourceId":"reviewed-manual-782","primary":"シャウト","magic":false,"strength":{"required":70,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":49153,"flags254":160,"entries":[{"index":0,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":2,"name":"モラール ブースター"},{"id":11758,"sourceId":"reviewed-manual-803","primary":"牙","magic":false,"strength":{"required":80,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":1,"flags254":128,"entries":[{"index":0,"base":15.0,"fields":["flatMagic"],"target":"魔力"}],"partial":true,"element":5,"name":"ブラッド ムーン"},{"id":396,"sourceId":"reviewed-manual-884","primary":"銃器","magic":false,"strength":{"required":20,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":128,"entries":[{"index":1,"base":35.0,"fields":["extraAvoid"],"target":"回避"},{"index":4,"base":-150.0,"fields":["flatSpeed"],"target":"移動速度"},{"index":6,"base":50.0,"fields":["extraEarthRes"],"target":"耐地属性"}],"partial":true,"element":1,"name":"アサルト ファイアー"},{"id":2443,"sourceId":"reviewed-manual-893","primary":"音楽","magic":false,"strength":{"required":1,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":8388613,"flags254":130,"entries":[{"index":0,"base":5.5,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":false,"element":1,"name":"ベビースネークのエチュード"},{"id":2455,"sourceId":"reviewed-manual-896","primary":"音楽","magic":false,"strength":{"required":30,"coefficient":0.007000000216066837,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":8388613,"flags254":130,"entries":[{"index":0,"base":8.0,"fields":["flatMagic"],"target":"魔力"}],"partial":false,"element":1,"name":"アルケミスト ラプソディ"},{"id":363,"sourceId":"reviewed-manual-904","primary":"魔法熟練","magic":false,"strength":{"required":20,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":9.699999809265137,"fields":["flatMagic"],"target":"魔力"}],"partial":false,"element":2,"name":"ホーリー ブレス"},{"id":140,"sourceId":"reviewed-manual-974","primary":"強化魔法","magic":true,"strength":{"required":80,"coefficient":0.05000000074505806,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":129,"entries":[{"index":0,"base":9.399999618530273,"fields":["extraHP"],"target":"最大HP"}],"partial":true,"element":4,"name":"ウルティメイト ヘルス"},{"id":158,"sourceId":"reviewed-manual-977","primary":"強化魔法","magic":true,"strength":{"required":90,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":13.0,"fields":["extraFireRes"],"target":"耐火属性"},{"index":1,"base":13.0,"fields":["extraWaterRes"],"target":"耐水属性"},{"index":2,"base":13.0,"fields":["extraWindRes"],"target":"耐風属性"},{"index":3,"base":13.0,"fields":["extraEarthRes"],"target":"耐地属性"},{"index":4,"base":13.0,"fields":["extraNeutralRes"],"target":"耐無属性"}],"partial":false,"element":3,"name":"エレメンタル アーマー"},{"id":13606,"sourceId":"reviewed-manual-1116","primary":"回復魔法","magic":true,"strength":{"required":60,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":1152,"entries":[{"index":1,"base":0.5,"fields":["flatMagic"],"target":"魔力"}],"partial":true,"element":2,"name":"譲天"},{"id":1538,"sourceId":"reviewed-manual-1121","primary":"強化魔法","magic":true,"strength":{"required":90,"coefficient":0.029999999329447746,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":5,"flags254":129,"entries":[{"index":0,"base":15.0,"fields":["extraST"],"target":"最大ST"}],"partial":true,"element":4,"name":"ウルティメイト エナジー"},{"id":11105,"sourceId":"reviewed-manual-1124","primary":"回復魔法","magic":true,"strength":{"required":80,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":37,"flags254":128,"entries":[{"index":1,"base":1.5,"fields":["extraAC"],"target":"防御力"},{"index":2,"base":1.5,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":1.5,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":true,"element":2,"name":"ムーンライト シンフォニー"},{"id":11905,"sourceId":"reviewed-manual-1238","primary":"強化魔法","magic":true,"strength":{"required":40,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.0,"fields":["extraAvoid"],"target":"回避"},{"index":1,"base":5.0,"fields":["flatSpeed"],"target":"移動速度"},{"index":2,"base":-5.0,"fields":["flatMagic"],"target":"魔力"},{"index":3,"base":-5.0,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":2,"name":"プロモーション・ナイト"},{"id":11907,"sourceId":"reviewed-manual-1239","primary":"強化魔法","magic":true,"strength":{"required":40,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.0,"fields":["flatMagic"],"target":"魔力"},{"index":2,"base":-5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":3,"base":-5.0,"fields":["extraAC"],"target":"防御力"}],"partial":true,"element":2,"name":"プロモーション・ビショップ"},{"id":11906,"sourceId":"reviewed-manual-1240","primary":"強化魔法","magic":true,"strength":{"required":40,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":5.0,"fields":["extraAC"],"target":"防御力"},{"index":2,"base":-5.0,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":-5.0,"fields":["flatSpeed"],"target":"移動速度"}],"partial":false,"element":2,"name":"プロモーション・ルーク"},{"id":7998,"sourceId":"reviewed-manual-1242","primary":"強化魔法","magic":true,"strength":{"required":60,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":128,"entries":[{"index":0,"base":50.0,"fields":["extraNeutralRes"],"target":"耐無属性"}],"partial":false,"element":2,"name":"マジックウォード・ホーリー"},{"id":13055,"sourceId":"reviewed-manual-1246","primary":"強化魔法","magic":true,"strength":{"required":60,"coefficient":0.003000000026077032,"extra_coefficient":0.0,"upper_limit":3.0,"extra_upper_limit":0.0},"flags":37,"flags254":131,"entries":[{"index":0,"base":14.0,"fields":["flatSpeed"],"target":"移動速度"},{"index":1,"base":14.0,"fields":["extraAvoid"],"target":"回避"}],"partial":true,"element":3,"name":"アジリティ インプルーブ"},{"id":8002,"sourceId":"reviewed-manual-1256","primary":"強化魔法","magic":true,"strength":{"required":70,"coefficient":0.014999999664723873,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":129,"entries":[{"index":1,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":2,"base":5.0,"fields":["extraHit"],"target":"命中"},{"index":3,"base":5.0,"fields":["extraAC"],"target":"防御力"}],"partial":true,"element":2,"name":"パーフェクト・ウォリアー"},{"id":8911,"sourceId":"reviewed-manual-1257","primary":"強化魔法","magic":true,"strength":{"required":90,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":2.5,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":false,"element":2,"name":"マジック プロテクション"},{"id":8000,"sourceId":"reviewed-manual-1259","primary":"強化魔法","magic":true,"strength":{"required":80,"coefficient":0.00800000037997961,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":12.0,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":5,"name":"グレーター ハードニング"},{"id":11602,"sourceId":"reviewed-manual-1268","primary":"死の魔法","magic":true,"strength":{"required":70,"coefficient":0.01899999938905239,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":37,"flags254":128,"entries":[{"index":0,"base":3.799999952316284,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":6,"name":"カラミティ フォース"},{"id":7400,"sourceId":"reviewed-manual-1270","primary":"強化魔法","magic":true,"strength":{"required":90,"coefficient":0.0010000000474974513,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":2097157,"flags254":130,"entries":[{"index":0,"base":3.5,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":3.5,"fields":["extraHit"],"target":"命中"},{"index":2,"base":3.5,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":3.5,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":5,"name":"デボーテッド エイド"},{"id":11946,"sourceId":"reviewed-manual-1272","primary":"強化魔法","magic":true,"strength":{"required":70,"coefficient":0.003000000026077032,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":5.0,"fields":["flatMagic"],"target":"魔力"},{"index":2,"base":5.0,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":5.0,"fields":["extraAC"],"target":"防御力"},{"index":4,"base":5.0,"fields":["flatSpeed"],"target":"移動速度"}],"partial":false,"element":2,"name":"プロモーション・クイーン"},{"id":12886,"sourceId":"reviewed-manual-1273","primary":"強化魔法","magic":true,"strength":{"required":70,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":130,"entries":[{"index":0,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":5.0,"fields":["flatMagic"],"target":"魔力"},{"index":2,"base":5.0,"fields":["extraHit"],"target":"命中"},{"index":3,"base":5.0,"fields":["extraAvoid"],"target":"回避"},{"index":4,"base":5.0,"fields":["extraAC"],"target":"防御力"},{"index":5,"base":5.0,"fields":["flatSpeed"],"target":"移動速度"}],"partial":true,"element":2,"name":"リインフォース"},{"id":13825,"sourceId":"reviewed-manual-1275","primary":"強化魔法","magic":true,"strength":{"required":80,"coefficient":0.05000000074505806,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":129,"entries":[{"index":0,"base":9.399999618530273,"fields":["extraMP"],"target":"最大MP"}],"partial":true,"element":4,"name":"ウルティメイト マナ"},{"id":6590,"sourceId":"reviewed-manual-1279","primary":"強化魔法","magic":true,"strength":{"required":80,"coefficient":0.019999999552965164,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":129,"entries":[{"index":0,"base":7.0,"fields":["extraHP"],"target":"最大HP"},{"index":1,"base":7.0,"fields":["extraST"],"target":"最大ST"},{"index":2,"base":7.0,"fields":["extraMP"],"target":"最大MP"},{"index":3,"base":7.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":4,"base":7.0,"fields":["extraHit"],"target":"命中"},{"index":5,"base":7.0,"fields":["extraAvoid"],"target":"回避"},{"index":6,"base":7.0,"fields":["extraAC"],"target":"防御力"}],"partial":false,"element":2,"name":"プリズム エフェクト"},{"id":7999,"sourceId":"reviewed-manual-1286","primary":"強化魔法","magic":true,"strength":{"required":90,"coefficient":0.019999999552965164,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":129,"entries":[{"index":0,"base":8.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":8.0,"fields":["extraHit"],"target":"命中"},{"index":2,"base":8.0,"fields":["extraAC"],"target":"防御力"},{"index":3,"base":8.0,"fields":["extraAvoid"],"target":"回避"},{"index":4,"base":8.0,"fields":["flatMagic"],"target":"魔力"},{"index":5,"base":8.0,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":false,"element":5,"name":"グレーター フルポテンシャル"},{"id":3980,"sourceId":"reviewed-manual-1305","primary":"神秘魔法","magic":true,"strength":{"required":90,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":5,"flags254":128,"entries":[{"index":1,"base":20.0,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":true,"element":2,"name":"シャイニング フォース"},{"id":12835,"sourceId":"reverse-fusion","primary":"暗黒命令","magic":false,"strength":{"required":90,"coefficient":0.014999999664723873,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":32769,"flags254":387,"entries":[{"index":2,"base":22.0,"fields":["extraHP"],"target":"最大HP"},{"index":3,"base":22.0,"fields":["extraST"],"target":"最大ST"},{"index":4,"base":22.0,"fields":["extraMP"],"target":"最大MP"},{"index":5,"base":22.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":6,"base":22.0,"fields":["extraAC"],"target":"防御力"},{"index":7,"base":22.0,"fields":["flatMagic"],"target":"魔力"},{"index":8,"base":5.0,"fields":["flatSpeed"],"target":"移動速度"}],"partial":true,"element":1,"name":"りばーす・ふゅーじょん"},{"id":430,"sourceId":"werewolf","primary":"牙","magic":false,"strength":{"required":40,"coefficient":0.009999999776482582,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":1,"flags254":642,"entries":[{"index":1,"base":20.0,"fields":["extraWindRes"],"target":"耐風属性"},{"index":2,"base":19.0,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":-31.0,"fields":["flatMagic"],"target":"魔力"}],"partial":true,"element":0,"name":"ワーウルフ"},{"id":13472,"sourceId":"cool-de-chocolat","primary":"料理","magic":false,"strength":{"required":1,"coefficient":0.014999999664723873,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":257,"flags254":129,"entries":[{"index":0,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":5.0,"fields":["extraHit"],"target":"命中"},{"index":2,"base":5.0,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":5.0,"fields":["extraAC"],"target":"防御力"},{"index":4,"base":5.0,"fields":["flatMagic"],"target":"魔力"},{"index":5,"base":5.0,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":false,"element":2,"name":"クール・ド・ショコラ"},{"id":12399,"sourceId":"medarot-ground-control","primary":"自然調和","magic":false,"strength":{"required":1,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":805,"flags254":384,"entries":[{"index":0,"base":4.5,"fields":["flatSpeed"],"target":"移動速度"}],"partial":true,"element":1,"name":"メダロット たいちせいぎょ"},{"id":9257,"sourceId":"ignis-form","primary":"強化魔法","magic":false,"strength":{"required":80,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":25165825,"flags254":128,"entries":[{"index":1,"base":20.0,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":3,"name":"イグニス フォーム"},{"id":10636,"sourceId":"dialos-pops","primary":"音楽","magic":false,"strength":{"required":70,"coefficient":0.019999999552965164,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":8388645,"flags254":130,"entries":[{"index":0,"base":8.0,"fields":["flatAttack"],"target":"攻撃力"}],"partial":false,"element":1,"name":"ダイアロス ポップス"},{"id":1546,"sourceId":"limit-break","primary":"強化魔法","magic":false,"strength":{"required":80,"coefficient":0.004999999888241291,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":1,"flags254":384,"entries":[{"index":0,"base":12.0,"fields":["flatAttack"],"target":"攻撃力"}],"partial":true,"element":1,"name":"リミット ブレイク"},{"id":13824,"sourceId":"heroes-fantasia","primary":"音楽","magic":false,"strength":{"required":90,"coefficient":0.0,"extra_coefficient":0.0,"upper_limit":0.0,"extra_upper_limit":0.0},"flags":8388613,"flags254":130,"entries":[{"index":0,"base":5.0,"fields":["flatAttack"],"target":"攻撃力"},{"index":1,"base":5.0,"fields":["extraHit"],"target":"命中"},{"index":2,"base":5.0,"fields":["extraAvoid"],"target":"回避"},{"index":3,"base":5.0,"fields":["extraAC"],"target":"防御力"},{"index":4,"base":5.0,"fields":["flatMagic"],"target":"魔力"},{"index":5,"base":5.0,"fields":["extraNeutralRes","extraFireRes","extraWaterRes","extraWindRes","extraEarthRes"],"target":"全属性抵抗"}],"partial":false,"element":1,"name":"ヒーローズ ファンタジア"}];
  const f = Math.fround;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const finiteNonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const elementLabels = {2:'無',3:'火',4:'水',5:'風',6:'地'};
  function elementPercent(row, input) {
    if (!elementLabels[row.element] || (row.flags & 0x1000)) return 0;
    const value = Number(input.casterElementStrengthPct);
    return Number.isFinite(value) && Number.isFinite(f(value / 100)) ? value : 0;
  }
  function actionInput(row, input) {
    const skill = finiteNonnegative(input.skill);
    const integerSkill = Math.round(skill * 10000);
    const convertedSkill = integerSkill * f(.0001);
    // Technique stores skill in float32 before integer conversion. The magic
    // constructor combines extended intermediates and float32 constants first.
    const combined = row.magic
      ? convertedSkill * f(.6) + f(finiteNonnegative(input.magic)) * f(.4)
      : f(convertedSkill);
    const encoded = Math.trunc(combined * 16);
    // Reject int16 overflow instead of wrapping a UI input into a negative skill.
    if (encoded < -32768 || encoded > 32767) return null;
    return encoded / 16;
  }
  function evaluateStats(row, input) {
    const x = actionInput(row, input);
    if (x === null) return null;
    let multiplier = 1, addition = 0;
    if (!(row.flags & 0x1000)) {
      const p = row.strength;
      let sub = Math.max(f(.1), 1 + (x - p.required) * (f(p.coefficient) + f(p.extra_coefficient)));
      const limit = f(p.upper_limit) + f(p.extra_upper_limit);
      if (limit >= 1) sub = Math.min(sub, limit);
      sub = f(sub);
      if ((row.flags & 2) || (row.flags254 & 1)) multiplier = sub;
      else {
        multiplier = (x + 300) * f(1 / 350) + sub - 1;
        addition = clamp(f(x * f(.15)), 0, 40);
      }
      multiplier = clamp(f(multiplier), 0, 10); // J=0 (controlled seed10)
      // Original5a0a8d: boost caster multiplier after its clamp, never addition.
      multiplier = f(multiplier * (1 + f(elementPercent(row, input) / 100)));
    }
    const result = {};
    for (const entry of row.entries) {
      const value = f(f(entry.base) * multiplier + (entry.base < 0 ? -addition : addition));
      for (const field of entry.fields) result[field] = (result[field] || 0) + value;
    }
    return result;
  }
  const catalog = root.MOE_REVIEWED_BUFF_CATALOG_MANUAL;
  if (!Array.isArray(catalog)) return;
  for (const row of rows) {
    const rule = catalog.find(rule => rule.id === row.sourceId);
    if (!rule) throw new Error('Missing client formula catalog row: ' + row.sourceId);
    const previousEvaluate = rule.evaluate;
    rule.inputKind = row.magic ? 'skillMagic' : 'skill';
    rule.skillLabel = row.primary;
    if (!Number.isFinite(rule.defaultSkill)) rule.defaultSkill = 100;
    if (row.magic && !Number.isFinite(rule.defaultMagic)) rule.defaultMagic = 100;
    rule.clientFormula = {definitionId:row.id, version:'20261005-v3-element', referenceSeed:10, element:row.element,
      casterElementInput:!!elementLabels[row.element],
      targets:row.entries.map(e => e.target), partial:row.partial};
    if (elementLabels[row.element] && !(row.flags & 0x1000)) {
      rule.catalogOptions = [...(rule.catalogOptions || []),
        {key:'casterElementStrengthPct', type:'number', defaultValue:0, step:'any',
          label:'使用者の' + elementLabels[row.element] + '属性強化（%）'}];
    }
    rule.description = row.entries.map(e => e.target).join('・') +
      'の補正を使用者の' + row.primary + (row.magic ? 'と魔力' : '') +
      'から計算。変動を含まない基準値を使用。' +
      (row.partial ? 'その他の効果は個別の設定を使用。' : '') +
      '能力低下も反映。' + (elementLabels[row.element] ?
        '使用者に有効な' + elementLabels[row.element] + '属性強化の合計を入力。倍率部分のみ補正し、固定加算と効果時間は変えません。' : '');
    rule.evaluate = function(input = {}) {
      const old = previousEvaluate.call(this, input);
      const stats = evaluateStats(row, input);
      if (!stats) return {...old, note:(old.note || '') + ' / 入力範囲外'};
      const targets = row.entries.map(e => e.target).join('・');
      return {...old, ...stats,
        note:'変動を含まない基準値 / ' + row.primary + finiteNonnegative(input.skill) +
          (row.magic ? '・魔力' + finiteNonnegative(input.magic) : '') + ' / ' + targets +
          (elementLabels[row.element] ? ' / 使用者の' + elementLabels[row.element] + '属性強化' + elementPercent(row, input) + '%' : '') +
          (row.partial ? ' / その他の効果は登録値' : '') +
          (Number.isFinite(old.durationSeconds) ? ' / 効果時間は登録値' : '')};
    };
  }
})(window);

// __MOE_CLIENT_CATALOG_FORMULAS_20261005_V2__
(function installClientCatalogFormulaFollowup(root) {
  'use strict';
  const catalog = root.MOE_REVIEWED_BUFF_CATALOG_MANUAL;
  const percentRows = [{"id":"dragon-force","definitionId":9259,"effects":{"extraAvoidPct":-15.0},"description":"回避-15%","entries":1},{"id":"takemikazuchi","definitionId":6469,"effects":{"extraHPPct":-70.0,"extraMPPct":-70.0,"extraSTPct":-70.0},"description":"最大HP-70%・最大MP-70%・最大ST-70%","entries":3},{"id":"crown-of-god","definitionId":9118,"effects":{"extraNeutralResPct":50.0,"extraFireResPct":50.0,"extraWaterResPct":50.0,"extraWindResPct":50.0,"extraEarthResPct":50.0},"description":"全属性抵抗+50%","entries":1},{"id":"elemental-increase","definitionId":11376,"effects":{"extraNeutralResPct":50.0,"extraFireResPct":50.0,"extraWaterResPct":50.0,"extraWindResPct":50.0,"extraEarthResPct":50.0},"description":"全属性抵抗+50%","entries":1},{"id":"multiple-enhance","definitionId":11370,"effects":{"extraSTPct":10.0},"description":"最大ST+10%","entries":1}];
  const criticalRows = [{"id":"kung-fu-soul","definitionId":813,"value":34.99999940395355},{"id":"rose-ensemble","definitionId":9876,"value":30.000001192092896}];
  const find = id => {
    const rule = catalog.find(row => row.id === id);
    if (!rule) throw new Error('Missing followup Buff: ' + id);
    return rule;
  };
  for (const row of percentRows) {
    const rule = find(row.id), old = rule.evaluate;
    rule.clientPercentageCoverage = {definitionId:row.definitionId, entries:row.entries,
      version:'20261005-v2', finalApplicationOrderVerified:false};
    rule.description += ' 追加効果：' + row.description + '。';
    rule.evaluate = function(input = {}) {
      const previous = old.call(this, input);
      return {...previous, ...row.effects, note:(previous.note || '') + ' / ' + row.description};
    };
  }
  for (const row of criticalRows) {
    const rule = find(row.id), old = rule.evaluate;
    rule.clientCriticalCoverage = {definitionId:row.definitionId, selector:1, version:'20261005-v2'};
    // Kung-fu's v1 stat adapter already replaces its old +33% description.
    if (row.id === 'rose-ensemble') rule.description = 'クリティカル確率に30ポイント加算。最終確率は他の寄与と合わせて計算。';
    else rule.description += ' クリティカル確率に35ポイント加算。';
    rule.evaluate = function(input = {}) {
      const previous = old.call(this, input);
      return {...previous, extraCritRatePct:row.value,
        note:(previous.note || '').replace(/クリティカル率\+33%/g, 'クリティカル確率+35ポイント') +
          ' / クリティカル確率加算 ' + Math.round(row.value) + 'ポイント'};
    };
  }
  const moon = find('reviewed-manual-701');
  const oldMoon = moon.evaluate;
  moon.inputKind = 'skill';
  moon.skillLabel = '神秘魔法';
  moon.defaultSkill = 100;
  moon.manualRequired = false;
  moon.catalogOptions = [{key:'timePeriod',label:'ゲーム内の時間帯',defaultValue:'day',
    values:[{value:'day',label:'昼（04:00～21:59）'},{value:'night',label:'夜（22:00～03:59）'}]}];
  moon.clientFormula = {definitionId:10137, version:'20261005-v2', referenceSeed:10,
    targets:['魔力（夜）','全属性抵抗（夜）','魔力（昼）','全属性抵抗（昼）'],partial:true};
  moon.description = '神秘魔法とゲーム内の時間帯から魔力・全属性抵抗の上昇量を計算。夜は昼の2倍。効果の変動を含まない基準値を使用。';
  moon.evaluate = function(input = {}) {
    const f = Math.fround;
    const rawSkill = Number(input.skill);
    const skill = Number.isFinite(rawSkill) ? Math.max(0, rawSkill) : 0;
    const x = Math.trunc(f(Math.round(skill * 10000) * f(.0001)) * 16) / 16;
    const multiplier = Math.max(0, Math.min(10, f(Math.max(f(.1), 1 + (x - 30) * f(.015)))));
    const night = input.timePeriod === 'night';
    const flatMagic = f((night ? 6 : 3) * multiplier);
    const resistance = f((night ? 12 : 6) * multiplier);
    return {...oldMoon.call(this, input), flatMagic,
      extraNeutralRes:resistance, extraFireRes:resistance, extraWaterRes:resistance,
      extraWindRes:resistance, extraEarthRes:resistance,
      note:'変動を含まない基準値 / 神秘魔法' + skill + ' / ' + (night ? '夜' : '昼') +
        ' / 魔力+' + flatMagic + ' / 全属性抵抗+' + resistance};
  };
})(window);

// These player descriptions are selectable without inventing effect amounts.
for (const rule of globalThis.MOE_PLAYER_CATALOG_ADDITIONS?.buffs || []) {
  if (!window.MOE_REVIEWED_BUFF_CATALOG_MANUAL.some(existing => existing.id === rule.id || existing.name === rule.name)) {
    window.MOE_REVIEWED_BUFF_CATALOG_MANUAL.push(rule);
  }
}
