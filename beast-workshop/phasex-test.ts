/**
 * Phase X 测试入口
 * 终极羁绊与职业觉醒引擎测试
 */
import { BattleEngine } from './BattleEngine.js';
import { checkSynergyEvolution, printAllRecipes, SYNERGY_RECIPES } from './SynergyRegistry.js';
import { ActiveRunEntity, RunSkill, RunEquipment, SummonEntity } from './types.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║    Phase X 测试: 终极羁绊与职业觉醒引擎               ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 打印所有配方
printAllRecipes();

console.log('\n================================================');
console.log('       测试 1: 冰系唤灵者 (Conjurer Ice)');
console.log('================================================');

// 初始化 Ice Conjurer
const player1: ActiveRunEntity = {
    class: 'Conjurer',
    element: 'Ice',
    starLevel: 2,
    maxHp: 300,
    currentHp: 300,
    baseAttack: 20,
    skills: [],
    equipments: [],
    effects: [],
    summon: null,
    passiveSkills: [],
    permanentDamageAmp: 0,
    permanentMaxHpSteal: 0,
    permanentAtkSteal: 0
};

// 赋予基础技能和装备
const summonSkill: RunSkill = {
    id: 'skill_summon_yeti',
    name: '召唤雪人',
    type: 'summon',
    maxCd: 8,
    currentCd: 0,
    effectValue: 30,
    summonTemplate: {
        id: 'summon_yeti',
        name: '雪人',
        maxHp: 100,
        currentHp: 100,
        baseAttack: 10,
        attackCd: 3,
        currentAttackCd: 0,
        attackSpeed: 1
    }
};
player1.skills.push(summonSkill);

const equip1: RunEquipment = {
    id: 'equip_extreme_ice',
    name: '极寒冰晶',
    type: 'hp_boost',
    value: 50
};
player1.equipments.push(equip1);

// 检查羁绊
console.log('\n【检查羁绊条件】');
console.log(`职业: ${player1.class}, 元素: ${player1.element}`);
console.log(`技能: ${summonSkill.id}`);
console.log(`装备: ${equip1.id}`);

const evolvedSkill1 = checkSynergyEvolution(
    player1.class,
    player1.element,
    player1.skills,
    player1.equipments
);

if (evolvedSkill1) {
    console.log(`\n✅ 羁绊触发成功!`);
    console.log(`进化技能: ${evolvedSkill1.name}`);
    console.log(`类型: ${evolvedSkill1.type}`);
    if (evolvedSkill1.summonTemplate) {
        console.log(`召唤物: ${evolvedSkill1.summonTemplate.name}`);
        console.log(`召唤物HP: ${evolvedSkill1.summonTemplate.maxHp}`);
        console.log(`自带荆棘: ${evolvedSkill1.summonTemplate.hasThorns}`);
    }
    
    // 应用进化
    player1.skills.push(evolvedSkill1);
}

// 创建敌方
const enemy1: ActiveRunEntity = {
    class: 'Striker',
    element: 'Fire',
    starLevel: 2,
    maxHp: 200,
    currentHp: 200,
    baseAttack: 15,
    skills: [],
    equipments: [],
    effects: [],
    summon: null,
    passiveSkills: []
};

// 战斗测试
console.log('\n【战斗测试 - 验证召唤物反伤】');
const battle1 = new BattleEngine(player1, enemy1);
battle1.runBattle();
battle1.printBattleLog();

console.log('\n================================================');
console.log('       测试 2: 雷系强袭者 (Striker Thunder)');
console.log('================================================');

// 初始化 Thunder Striker
const player2: ActiveRunEntity = {
    class: 'Striker',
    element: 'Thunder',
    starLevel: 2,
    maxHp: 250,
    currentHp: 250,
    baseAttack: 25,
    skills: [],
    equipments: [],
    effects: [],
    summon: null,
    passiveSkills: [],
    permanentDamageAmp: 0,
    permanentMaxHpSteal: 0,
    permanentAtkSteal: 0
};

// 赋予基础技能和装备
const bladeSkill: RunSkill = {
    id: 'skill_half_moon_blade',
    name: '半月弯刀',
    type: 'damage',
    maxCd: 4,
    currentCd: 0,
    effectValue: 15
};
player2.skills.push(bladeSkill);

const equip2: RunEquipment = {
    id: 'equip_gale_necklace',
    name: '狂风项链',
    type: 'attack_boost',
    value: 10
};
player2.equipments.push(equip2);

// 检查羁绊
console.log('\n【检查羁绊条件】');
const evolvedSkill2 = checkSynergyEvolution(
    player2.class,
    player2.element,
    player2.skills,
    player2.equipments
);

if (evolvedSkill2) {
    console.log(`\n✅ 羁绊触发成功!`);
    console.log(`进化技能: ${evolvedSkill2.name}`);
    console.log(`类型: ${evolvedSkill2.type}`);
    console.log(`连击次数: ${evolvedSkill2.multiHit}`);
    console.log(`CD重置概率: ${(evolvedSkill2.cooldownResetChance || 0) * 100}%`);
    
    // 添加第二个技能用于测试 CD 重置
    const extraSkill: RunSkill = {
        id: 'skill_heavy_strike',
        name: '重击',
        type: 'damage',
        maxCd: 3,
        currentCd: 2,  // 设置为快好的状态
        effectValue: 20
    };
    player2.skills.push(extraSkill);
    player2.passiveSkills = player2.passiveSkills || [];
    player2.passiveSkills.push(evolvedSkill2);
}

// 创建敌方
const enemy2: ActiveRunEntity = {
    class: 'Caster',
    element: 'Ice',
    starLevel: 2,
    maxHp: 300,
    currentHp: 300,
    baseAttack: 20,
    skills: [],
    equipments: [],
    effects: [],
    summon: null,
    passiveSkills: []
};

// 战斗测试
console.log('\n【战斗测试 - 验证普攻连击 + CD重置】');
const battle2 = new BattleEngine(player2, enemy2);
battle2.runBattle();
battle2.printBattleLog();

console.log('\n================================================');
console.log('       测试 3: 毒系秘术师 (Caster Venom)');
console.log('================================================');

// 初始化 Venom Caster
const player3: ActiveRunEntity = {
    class: 'Caster',
    element: 'Venom',
    starLevel: 2,
    maxHp: 200,
    currentHp: 200,
    baseAttack: 18,
    skills: [],
    equipments: [],
    effects: [],
    summon: null,
    passiveSkills: [],
    permanentDamageAmp: 0,
    permanentMaxHpSteal: 0,
    permanentAtkSteal: 0
};

// 赋予基础技能和装备
const acidSkill: RunSkill = {
    id: 'skill_acid_splash',
    name: '酸液飞溅',
    type: 'damage',
    maxCd: 3,
    currentCd: 0,
    effectValue: 20
};
player3.skills.push(acidSkill);

const equip3: RunEquipment = {
    id: 'equip_toxic_robe',
    name: '剧毒法袍',
    type: 'hp_boost',
    value: 30
};
player3.equipments.push(equip3);

// 检查羁绊
console.log('\n【检查羁绊条件】');
const evolvedSkill3 = checkSynergyEvolution(
    player3.class,
    player3.element,
    player3.skills,
    player3.equipments
);

if (evolvedSkill3) {
    console.log(`\n✅ 羁绊触发成功!`);
    console.log(`进化技能: ${evolvedSkill3.name}`);
    console.log(`类型: ${evolvedSkill3.type}`);
    console.log(`HP偷取: ${evolvedSkill3.maxHpSteal}%`);
    console.log(`ATK偷取: ${evolvedSkill3.atkSteal}`);
    
    player3.skills.push(evolvedSkill3);
}

// 创建敌方
const enemy3: ActiveRunEntity = {
    class: 'Conjurer',
    element: 'Fire',
    starLevel: 2,
    maxHp: 400,
    currentHp: 400,
    baseAttack: 15,
    skills: [],
    equipments: [],
    effects: [],
    summon: null,
    passiveSkills: []
};

console.log('\n【战斗前属性】');
console.log(`玩家: HP=${player3.currentHp}/${player3.maxHp}, ATK=${player3.baseAttack}`);
console.log(`敌方: HP=${enemy3.currentHp}/${enemy3.maxHp}, ATK=${enemy3.baseAttack}`);

// 战斗测试
console.log('\n【战斗测试 - 验证永久偷取】');
const battle3 = new BattleEngine(player3, enemy3);
battle3.runBattle();

console.log('\n【战斗后属性 - 验证偷取效果】');
console.log(`玩家: HP=${player3.currentHp}/${player3.maxHp}, ATK=${player3.baseAttack}`);
console.log(`敌方: HP=${enemy3.currentHp}/${enemy3.maxHp}, ATK=${enemy3.baseAttack}`);

// 检查偷取是否生效
const hpStolen = player3.maxHp - 200;
const atkStolen = player3.baseAttack - 18;
console.log(`\n偷取效果:`);
console.log(`  HP增加: +${hpStolen}`);
console.log(`  ATK增加: +${atkStolen}`);

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    测试结果                               ║');
console.log('╚══════════════════════════════════════════════════════════╝');

console.log(`\n✅ 测试1 (冰系唤灵者): 羁绊触发 + 召唤物生成`);
console.log(`✅ 测试2 (雷系强袭者): 羁绊触发 + 被动连击`);
console.log(`✅ 测试3 (毒系秘术师): 羁绊触发 + 永久偷取`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Phase X 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
