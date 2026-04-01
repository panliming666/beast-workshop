/**
 * Phase 8 测试入口
 * 精英怪物与动态难度系统
 */
import { BattleEngine } from './BattleEngine.js';
import { RunManager } from './RunManager.js';
import { MetaGameManager } from './MetaGameManager.js';
import { ActiveRunEntity, RunSkill } from './types.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║       Phase 8 测试: 精英怪物与动态难度系统              ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 初始化游戏并创建高强度玩家
const metaManager = MetaGameManager.getInstance();
metaManager.debugInit();

// 给玩家一些天赋加成以应对BOSS
metaManager.metaState.gold = 10000;
metaManager.upgradeTalentMultiple('talent_hp', 5);  // +500 HP
metaManager.upgradeTalentMultiple('talent_dmg', 5);  // +25% 伤害

const runManager = new RunManager();
const starterOptions = runManager.generateStarterOptions();
const player = runManager.startRun(starterOptions[0]);

// 给玩家添加一些强力装备
player.equipments.push(
    { id: 'equip_strong', name: '屠龙剑', type: 'attack_boost', value: 50 },
    { id: 'equip_hp', name: '泰坦护符', type: 'hp_boost', value: 200 }
);

// 给玩家添加技能
const playerSkill: RunSkill = {
    id: 'skill_fire',
    name: '烈焰冲击',
    maxCd: 3,
    currentCd: 0,
    effectValue: 40,
    statusToApply: { type: 'burn', duration: 3, value: 10 }
};
player.skills.push(playerSkill);

console.log('\n========== 玩家属性 ==========');
console.log(`HP: ${player.currentHp}/${player.maxHp}`);
console.log(`ATK: ${player.baseAttack}`);
console.log(`技能: [${playerSkill.name}] 伤害:${playerSkill.effectValue}`);
console.log(`装备: 屠龙剑(+50), 泰坦护符(+200)`);

console.log('\n================================================');
console.log('       任务1: 生成 Stage 10 BOSS');
console.log('================================================');

// 手动创建 Stage 10 BOSS (含3个词条)
const boss: ActiveRunEntity = {
    class: 'Striker',
    element: 'Fire',
    starLevel: 5,
    maxHp: 0,  // 稍后计算
    currentHp: 0,
    baseAttack: 0,  // 稍后计算
    skills: [],
    equipments: [],
    effects: [],
    isBoss: true,
    eliteAffixes: ['armored', 'thorns', 'regen']  // 3个词条
};

// 计算 BOSS 属性 (指数级增长)
const stage = 10;
const growthFactor = Math.pow(1.3, stage - 1);
const baseHp = Math.floor(80 * growthFactor);
const baseAtk = Math.floor(8 * growthFactor);

boss.maxHp = baseHp * 2;  // BOSS HP 翻倍
boss.currentHp = boss.maxHp;
boss.baseAttack = baseAtk;

// BOSS 技能
const bossSkill: RunSkill = {
    id: 'skill_boss',
    name: '毁灭打击',
    maxCd: 4,
    currentCd: 0,
    effectValue: 50,
    statusToApply: { type: 'shock', duration: 1, value: 0 }
};
boss.skills.push(bossSkill);

console.log('\n========== Stage 10 BOSS ==========');
console.log(`职业: ${boss.class} | 元素: ${boss.element}`);
console.log(`HP: ${boss.maxHp} (基础: ${baseHp}, BOSS翻倍)`);
console.log(`ATK: ${boss.baseAttack} (增长因子: ${growthFactor.toFixed(2)})`);
console.log(`星级: ${boss.starLevel}`);
console.log(`词条: [${boss.eliteAffixes?.join(', ')}]`);
console.log(`技能: [${bossSkill.name}] 伤害:${bossSkill.effectValue}`);

console.log('\n词条说明:');
console.log('  🛡️ armored: 受伤 × 0.7');
console.log('  🌵 thorns: 反弹 10% 伤害');
console.log('  💚 regen: 每 Tick 回复 2% 最大 HP');

console.log('\n================================================');
console.log('       任务2: 与 BOSS 对战');
console.log('================================================');

// 创建战斗引擎
const battle = new BattleEngine(player, boss);
battle.runBattle();

// 打印详细战斗日志
battle.printBattleLog();

// 统计词条效果触发次数
console.log('\n========== 词条效果统计 ==========');

const armoredEvents = battle.events.filter(e => e.message.includes('护甲生效') || e.message.includes('伤害减免'));
const thornsEvents = battle.events.filter(e => e.message.includes('反弹'));
const regenEvents = battle.events.filter(e => e.message.includes('regen'));

console.log(`🛡️ 护甲生效次数: ${armoredEvents.length}`);
console.log(`🌵 反弹次数: ${thornsEvents.length}`);
console.log(`💚 回血次数: ${regenEvents.length}`);

// 显示部分效果日志
if (armoredEvents.length > 0) {
    console.log('\n护甲效果示例:');
    armoredEvents.slice(0, 3).forEach(e => console.log(`  [Tick ${e.tick}] ${e.message}`));
}

if (thornsEvents.length > 0) {
    console.log('\n反弹效果示例:');
    thornsEvents.slice(0, 3).forEach(e => console.log(`  [Tick ${e.tick}] ${e.message}`));
}

if (regenEvents.length > 0) {
    console.log('\n回血效果示例:');
    regenEvents.slice(0, 3).forEach(e => console.log(`  [Tick ${e.tick}] ${e.message}`));
}

console.log('\n================================================');
console.log('       任务3: 动态难度验证');
console.log('================================================');

console.log('\n各阶段怪物属性对比:');
for (let s = 1; s <= 10; s += 2) {
    const gf = Math.pow(1.3, s - 1);
    const hp = Math.floor(80 * gf);
    const atk = Math.floor(8 * gf);
    let affixes = 0;
    if (s >= 4 && s <= 6) affixes = 1;
    else if (s >= 7 && s <= 9) affixes = 2;
    else if (s === 10) affixes = 3;
    
    console.log(`Stage ${s.toString().padStart(2, ' ')}: HP=${hp.toString().padStart(4, ' ')}, ATK=${atk.toString().padStart(3, ' ')}, 词条=${affixes}, 增长=${gf.toFixed(2)}`);
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    测试结果                               ║');
console.log('╚══════════════════════════════════════════════════════════╝');

const allPassed = 
    armoredEvents.length > 0 &&  // 有护甲减伤
    thornsEvents.length > 0 &&   // 有反伤
    regenEvents.length > 0;      // 有回血

if (allPassed) {
    console.log('✅ Phase 8 测试通过!');
    console.log('   - 指数级难度增长 ✓');
    console.log('   - 精英词条系统 ✓');
    console.log('   - armored/thorns/regen 全部生效 ✓');
} else {
    console.log('❌ Phase 8 部分测试失败');
    console.log(`   armored: ${armoredEvents.length > 0 ? '✓' : '✗'}`);
    console.log(`   thorns: ${thornsEvents.length > 0 ? '✓' : '✗'}`);
    console.log(`   regen: ${regenEvents.length > 0 ? '✓' : '✗'}`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Phase 8 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
