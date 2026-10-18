/* Focused player choices from saved public data. No formula or native-only name is added. */
(function(root){
  const data={
  "attacks": [
    {
      "key": "technique:tech-951dc6e009-51e4eb4abc-60",
      "name": "シリアル シュート",
      "category": "キック",
      "family": "physical",
      "skillName": "キック",
      "requirements": [
        {
          "skill": "キック",
          "min": 60
        }
      ],
      "description": "上方向へのダメージ判定が発生する蹴りを繰り出す\nターゲット不要\n自分の前方から上に範囲攻撃",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-951dc6e009-51e4eb4abc-60"
      }
    },
    {
      "key": "technique:tech-951dc6e009-9fe4e9044e-80",
      "name": "トルネード",
      "category": "キック",
      "family": "physical",
      "skillName": "キック",
      "requirements": [
        {
          "skill": "キック",
          "min": 80
        }
      ],
      "description": "回し蹴りを繰り出して、四方の敵を攻撃する\n使用直後から攻撃が当たるまでダメージを無効化する\nターゲット不要\n自分を中心とした範囲攻撃\n使用した瞬間に物理ダメージ100%軽減、魔法無効化の防御Buffが短時間発生\n物理攻撃の追加効果は貫通",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-951dc6e009-9fe4e9044e-80"
      }
    },
    {
      "key": "technique:tech-4b3a352348-304a9f7134-60",
      "name": "ハウリング ボイス",
      "category": "シャウト",
      "family": "physical",
      "skillName": "シャウト",
      "requirements": [
        {
          "skill": "シャウト",
          "min": 60
        }
      ],
      "description": "声を振動させて対象に衝撃波を放つ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-4b3a352348-304a9f7134-60"
      }
    },
    {
      "key": "technique:tech-203575cfb7-1f7f0f3eb3-90",
      "name": "ソード ダンス",
      "category": "刀剣",
      "family": "physical",
      "skillName": "刀剣",
      "requirements": [
        {
          "skill": "刀剣",
          "min": 90
        }
      ],
      "description": "装備している武器で敵の直接攻撃をはじき返し ダメージを与える\n物理攻撃の範囲は前方扇状のレンジ3.5\n武器損傷：通常攻撃2回分/Fizzle時1回分",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-203575cfb7-1f7f0f3eb3-90"
      }
    },
    {
      "key": "technique:tech-5da33608cb-fcf73d454f-80",
      "name": "ギロチン コール",
      "category": "暗黒命令",
      "family": "physical",
      "skillName": "暗黒命令",
      "requirements": [
        {
          "skill": "暗黒命令",
          "min": 80
        }
      ],
      "description": "最大ヒットポイントの20%を切った対象の首を刎ねる\n(与えることが出来るダメージは最大で200です。)",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-5da33608cb-fcf73d454f-80"
      }
    },
    {
      "key": "technique:tech-e5e6cb266e-1875a0d57b-20",
      "name": "タイダル スピアー",
      "category": "槍",
      "family": "physical",
      "skillName": "槍",
      "requirements": [
        {
          "skill": "槍",
          "min": 20
        }
      ],
      "description": "後退した後に前方に踏み込み攻撃する",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-e5e6cb266e-1875a0d57b-20"
      }
    },
    {
      "key": "technique:tech-e5e6cb266e-861a5bc2a9-80",
      "name": "ドラゴン フォール",
      "category": "槍",
      "family": "physical",
      "skillName": "槍",
      "requirements": [
        {
          "skill": "槍",
          "min": 80
        }
      ],
      "description": "大ジャンプを行い 落下中に\n空中制動して頭上から槍を突き立てる\n着弾点中心の小範囲技",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-e5e6cb266e-861a5bc2a9-80"
      }
    },
    {
      "key": "technique:tech-87d892e099-1d012c885a-20",
      "name": "ブラッド サック",
      "category": "牙",
      "family": "physical",
      "skillName": "牙",
      "requirements": [
        {
          "skill": "牙",
          "min": 20
        }
      ],
      "description": "対象に激しく噛みつき 吸い取った血でHPを回復する\n魔法攻撃扱い（必中、半減レジスト判定有）\n回復量はダメージと等量",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-87d892e099-1d012c885a-20"
      }
    },
    {
      "key": "technique:tech-7f095f6964-ff7dedeafb-90",
      "name": "サイズミック ウェーブ",
      "category": "素手",
      "family": "physical",
      "skillName": "素手",
      "requirements": [
        {
          "skill": "素手",
          "min": 90
        }
      ],
      "description": "大地を伝わる衝撃波で周囲にダメージを与える技\n使用アイテム：原初の粉 1",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-7f095f6964-ff7dedeafb-90"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-e1d104ba57-1",
      "name": "リトル ツイスター",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 1
        }
      ],
      "description": "突風を巻き起こし ダメージを与える\n※ 前方に限り、対象と近いほどヒット数が増える\n特殊な魔法：詳しくは\n短評\n参照",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-e1d104ba57-1"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-8d7bcc9e6e-10",
      "name": "ポイズン ミスト",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 10
        }
      ],
      "description": "毒の霧を発生させ 敵を毒状態にする\n3秒間隔で9回の毒ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-8d7bcc9e6e-10"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-030c3198b6-20",
      "name": "ショック ボルト",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 20
        }
      ],
      "description": "電撃でダメージを与える",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-030c3198b6-20"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-8b02c91614-20",
      "name": "ブレイズ",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 20
        }
      ],
      "description": "火柱を発生させ 敵に継続的なダメージを与える\n1秒間隔で4回の魔法ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-8b02c91614-20"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-29fc051aca-30",
      "name": "フリーズ",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 30
        }
      ],
      "description": "敵を凍らせてダメージを与え 移動速度を遅くする\n鈍足効果",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-29fc051aca-30"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-439db53213-30",
      "name": "ポイズン レイン",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 30
        }
      ],
      "description": "毒の雨を降らせ 敵に強烈な毒の効果を与える\n4秒間隔で7回の毒ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-439db53213-30"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-bcbb5d38a0-40",
      "name": "オーブン",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 40
        }
      ],
      "description": "対象の周りに火災を発生させ 継続ダメージを与えて焼き尽くす\n範囲魔法。10秒間隔で5回の魔法ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-bcbb5d38a0-40"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-7cd031cd0b-40",
      "name": "ソニック ケイジ",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 40
        }
      ],
      "description": "対象にダメージを与え 周りにいる敵にもダメージを伝達させる\n範囲魔法。ダメージは対象の最大HPが多いほど増加(最大40)",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-7cd031cd0b-40"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-d72f8761b4-50",
      "name": "サンダーボルト",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 50
        }
      ],
      "description": "雷を落とし ダメージと麻痺の効果を与える\n麻痺効果",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-d72f8761b4-50"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-e74e65c63a-50",
      "name": "スターダスト",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 50
        }
      ],
      "description": "空から無数の星屑を降らせ 敵にぶつける\n※ 時間差魔法\n4秒後に1回の魔法ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-e74e65c63a-50"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-84c7bdcf70-60",
      "name": "ブリザード",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 60
        }
      ],
      "description": "氷の竜巻を起こして大ダメージを与え 移動速度を遅くする\n範囲魔法。鈍足効果",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-84c7bdcf70-60"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-7449f1fa9e-70",
      "name": "ストロング ボルト",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 70
        }
      ],
      "description": "強烈な雷撃を脳天に落とし ダメージと麻痺の効果を与える\n範囲魔法（他より広範囲）・麻痺効果",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-7449f1fa9e-70"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-5ad207f2ce-70",
      "name": "ポイズン クラウド",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 70
        }
      ],
      "description": "毒の雲を発生させ 範囲内の敵に継続的なダメージを与える\n範囲魔法。5秒間隔で6回の毒ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-5ad207f2ce-70"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-7cf0883209-80",
      "name": "フローズン ビーム",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 80
        }
      ],
      "description": "凍結ダメージを与え対象を凍結させる\n※ 凍結中の対象はクリティカルを大幅に受けやすくなる\nやや弱い鈍足効果・被クリティカル率上昇のDebuff",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-7cf0883209-80"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-2fe965e050-90",
      "name": "メテオ ストライク",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 90
        }
      ],
      "description": "巨大な隕石を頭上に落とす\n※ 時間差魔法\n範囲魔法。4秒(5秒?)後に1回の魔法ダメージ",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-2fe965e050-90"
      }
    },
    {
      "key": "technique:magic-04c97dbe4a-89d67ee3ac-90",
      "name": "メテオライト インパクト",
      "category": "破壊魔法",
      "family": "magic",
      "skillName": "破壊魔法",
      "requirements": [
        {
          "skill": "破壊魔法",
          "min": 90
        }
      ],
      "description": "敵単体に巨大な隕石を落下させ 衝撃で大ダメージを与える古代魔法\n※ War Ageでは魔法チャージ不可\n微弱なノックバック効果\n対PC・人型Mobには転倒モーションあり",
      "calculationSupported": false,
      "calculationReason": "この攻撃のダメージ式・適用経路は計算未対応です。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-04c97dbe4a-89d67ee3ac-90"
      }
    }
  ],
  "buffs": [
    {
      "id": "player-fusion",
      "name": "フュージョン",
      "category": "暗黒命令",
      "requirements": [
        {
          "skill": "暗黒命令",
          "min": 90
        }
      ],
      "info": "パーティメンバー全員が合体し 一体の怪物へと姿を変える\n技使用者以外は操作不能になり 力を分け与える事しか出来なくなる\n発動者は、強靭な力と長いリーチを得られる\n※自分を含めて2人以上のパーティを組んでいる時に発動可能",
      "summary": "2人以上のパーティで合体。発動者以外は操作不能。能力変化量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "tech-5da33608cb-ab26cfeef8-90"
      }
    },
    {
      "id": "player-flame-blade",
      "name": "フレイム ブレイド",
      "category": "神秘魔法",
      "requirements": [
        {
          "skill": "神秘魔法",
          "min": 20
        }
      ],
      "info": "武器に炎を宿らせ 炎属性を追加する\n※ プレイヤーのメイン攻撃にのみ属性を付加する\n→\nエンチャント魔法の特性",
      "summary": "通常アタックに火属性追撃を付与。追撃量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-73ce8d2790-3ffb0df848-20"
      }
    },
    {
      "id": "player-freeze-blade",
      "name": "フリーズ ブレイド",
      "category": "神秘魔法",
      "requirements": [
        {
          "skill": "神秘魔法",
          "min": 50
        }
      ],
      "info": "武器に冷気を宿らせ 水属性を追加する\n※ プレイヤーのメイン攻撃にのみ属性を付加する\n→\nエンチャント魔法の特性",
      "summary": "通常アタックに水属性追撃を付与。追撃量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-73ce8d2790-3447471068-50"
      }
    },
    {
      "id": "player-lightning-blade",
      "name": "ライトニング ブレイド",
      "category": "神秘魔法",
      "requirements": [
        {
          "skill": "神秘魔法",
          "min": 90
        }
      ],
      "info": "武器に雷を宿らせて 風属性を追加する\n※ 自分の武器のみ有効\n→\nエンチャント魔法の特性",
      "summary": "自分の武器に風属性追撃を付与。通常アタック後の追撃量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-73ce8d2790-9bc06b39da-90"
      }
    },
    {
      "id": "player-poison-blade",
      "name": "ポイズン ブレイド",
      "category": "複合魔法/補助",
      "requirements": [
        {
          "skill": "神秘魔法",
          "min": 70
        },
        {
          "skill": "死の魔法",
          "min": 40
        }
      ],
      "info": "武器に毒を宿らせ 土属性を追加する\n※プレイヤーのメイン攻撃のみに属性を付加する",
      "summary": "通常アタックに地属性追撃を付与。追撃量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-9892901ca5-435914bfb0-70-40"
      }
    },
    {
      "id": "player-explode-blade",
      "name": "エクスプロード ブレイド",
      "category": "複合魔法/補助",
      "requirements": [
        {
          "skill": "神秘魔法",
          "min": 80
        },
        {
          "skill": "薬調合",
          "min": 50
        }
      ],
      "info": "攻撃と同時に対象を爆炎が包み込む",
      "summary": "攻撃と同時に対象を爆炎が包む。追撃量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-9892901ca5-ca42d2bcea-80-50"
      }
    },
    {
      "id": "player-bloody-blade",
      "name": "ブラッティ ブレイド",
      "category": "複合魔法/補助",
      "requirements": [
        {
          "skill": "死の魔法",
          "min": 90
        },
        {
          "skill": "牙",
          "min": 70
        }
      ],
      "info": "武器に闇の力を宿らせ 対象の体力を奪う魔剣に変える\n※両手剣によるメイン攻撃にのみ効果がある",
      "summary": "両手剣の通常アタックで対象のHPを吸収。追撃・回復量・持続時間は未対応。",
      "source": {
        "file": "src/data/skillSimKnowledge.js",
        "id": "magic-9892901ca5-345ccc6376-90-70"
      }
    },
    {
      "id": "player-enchant-fire",
      "name": "エンチャント ファイアー",
      "category": "装備由来Buff",
      "requirements": [],
      "info": "常時フレイム ブレイド相当の追撃・HP継続減少。効果量は未対応。",
      "summary": "常時フレイム ブレイド相当の追撃・HP継続減少。効果量は未対応。",
      "clientBuffDefinitionId": "1577",
      "source": {
        "file": "src/data/manual/buffRules.manual.js",
        "id": "technic-1577"
      }
    },
    {
      "id": "player-enchant-ice",
      "name": "エンチャント アイス",
      "category": "装備由来Buff",
      "requirements": [],
      "info": "常時フリーズ ブレイド相当の追撃・HP約30/分減少。数値は説明のみで計算未対応。",
      "summary": "常時フリーズ ブレイド相当の追撃・HP約30/分減少。数値は説明のみで計算未対応。",
      "clientBuffDefinitionId": "1578",
      "source": {
        "file": "src/data/manual/buffRules.manual.js",
        "id": "technic-1578"
      }
    },
    {
      "id": "player-enchant-thunder",
      "name": "エンチャント サンダー",
      "category": "装備由来Buff",
      "requirements": [],
      "info": "常時ライトニング ブレイド相当の追撃・HP継続減少。効果量は未対応。",
      "summary": "常時ライトニング ブレイド相当の追撃・HP継続減少。効果量は未対応。",
      "clientBuffDefinitionId": "1579",
      "source": {
        "file": "src/data/manual/buffRules.manual.js",
        "id": "technic-1579"
      }
    },
    {
      "id": "player-enchant-leg",
      "name": "エンチャント レッグ",
      "category": "装備由来Buff",
      "requirements": [],
      "info": "通常攻撃不可。専用技「エンチャント シュート」が使用可能。行動制限は計算未対応。",
      "summary": "通常攻撃不可。専用技「エンチャント シュート」が使用可能。行動制限は計算未対応。",
      "clientBuffDefinitionId": "11262",
      "source": {
        "file": "src/data/manual/buffRules.manual.js",
        "id": "technic-11262"
      }
    }
  ]
};
  data.buffs=data.buffs.map(entry=>({...entry,inputKind:"none",calculationSupported:false,description:entry.summary,
    evaluate(){return {
      ...(entry.clientBuffDefinitionId?{clientBuffDefinitionId:entry.clientBuffDefinitionId}:{}),
      extraEffects:[{key:"custom",name:"計算未対応："+entry.summary,value:0,unit:"",scope:"display",note:""}]
    };}
  }));
  if(typeof module!=="undefined"&&module.exports)module.exports=data;
  else root.MOE_PLAYER_CATALOG_ADDITIONS=data;
})(globalThis);
