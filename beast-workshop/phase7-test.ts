/**
 * Phase 7 测试入口
 * 局外天赋树与经济深度闭环
 */
import { MetaGameManager } from './MetaGameManager.js';
import { RunManager } from './RunManager.js';
import { TalentRegistry, TALENT_CONFIGS } from './TalentRegistry.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     Phase 7 测试: 局外天赋树与经济深度闭环            ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 初始化游戏
const metaManager = MetaGameManager.getInstance();

console.log('\n========== 初始状态 ==========');
console.log(`💰 金币: ${metaManager.metaState.gold}`);
metaManager.talentRegistry.printTalentTree();

console.log('\n================================================');
console.log('       任务1: 天赋系统构建');
console.log('================================================');

console.log('\n【天赋配置】');
for (const [id, config] of Object.entries(TALENT_CONFIGS)) {
    console.log(`  ${id}: ${config.name}`);
    console.log(`    效果: ${config.description}`);
    console.log(`    最大等级: ${config.maxLevel}`);
    console.log(`    基础成本: ${config.baseCost} 金币`);
    console.log(`    成本递增: ×${config.costMultiplier}`);
}

console.log('\n================================================');
console.log('       任务2: 升级 talent_hp ×3');
console.log('================================================');

// 给玩家 10000 金币
metaManager.metaState.gold = 10000;
console.log(`\n设置金币: ${metaManager.metaState.gold}`);

// 连升 3 级 talent_hp
const result = metaManager.upgradeTalentMultiple('talent_hp', 3);

console.log('\n升级结果:');
result.messages.forEach(msg => console.log(`  ${msg}`));
console.log(`\n总花费: ${result.totalCost} 金币`);
console.log(`实际升级: ${result.actualUpgrades} 次`);

// 打印当前天赋状态
metaManager.talentRegistry.printTalentTree();

console.log('\n================================================');
console.log('       任务3: 验证血量加成');
console.log('================================================');

// 获取血量加成
const hpBonus = metaManager.getHpBonus();
console.log(`\n天赋血量加成: +${hpBonus} HP (期望: +300)`);

// 创建 RunManager 并调用 startRun()
const runManager = new RunManager();

// 生成开局选项并选择
const starterOptions = runManager.generateStarterOptions();
const selectedBeast = starterOptions[0];

console.log(`\n选中幻兽基础属性:`);
console.log(`  基础 HP: ${selectedBeast.baseHp}`);
console.log(`  基础 ATK: ${selectedBeast.baseAttack}`);

const player = runManager.startRun(selectedBeast);

console.log(`\n局内实体最终属性:`);
console.log(`  最大 HP: ${player.maxHp}`);
console.log(`  当前 HP: ${player.currentHp}`);
console.log(`  基础攻击: ${player.baseAttack}`);

// 计算期望血量
const starMultiplier = 1 + (selectedBeast.starLevel - 1) * 0.5;
const expectedBaseHp = Math.floor(selectedBeast.baseHp * starMultiplier);
const expectedMaxHp = expectedBaseHp + hpBonus;

console.log(`\n========== 验证结果 ==========`);
console.log(`基础血量 (无天赋): ${expectedBaseHp}`);
console.log(`天赋加成: +${hpBonus}`);
console.log(`期望血量: ${expectedMaxHp}`);
console.log(`实际血量: ${player.maxHp}`);

if (player.maxHp === expectedMaxHp) {
    console.log(`✅ 血量加成验证通过! (+${hpBonus} HP)`);
} else {
    console.log(`❌ 血量加成验证失败! 期望 ${expectedMaxHp}, 实际 ${player.maxHp}`);
}

console.log('\n================================================');
console.log('       任务4: 验证 D 牌降价');
console.log('================================================');

// 先升一级 talent_discount
console.log('\n升级 talent_discount...');
const discountResult = metaManager.upgradeTalent('talent_discount');

const rerollDiscount = metaManager.getRerollDiscount();
console.log(`\nD牌降价: -${rerollDiscount} 金币`);
console.log(`原始花费: 50 金币`);
console.log(`实际花费: ${50 - rerollDiscount} 金币`);

console.log('\n================================================');
console.log('       任务5: 验证打工槽位');
console.log('================================================');

console.log('\n升级 talent_slots...');
const slotResult = metaManager.upgradeTalent('talent_slots');

const extraSlots = metaManager.getExtraWorkstationSlots();
console.log(`\n额外打工槽位: +${extraSlots}`);
console.log(`基础槽位: 4`);
console.log(`总槽位: ${4 + extraSlots}`);

console.log('\n================================================');
console.log('       任务6: 验证伤害加成');
console.log('================================================');

console.log('\n升级 talent_dmg...');
const dmgResult = metaManager.upgradeTalent('talent_dmg');

const dmgBonus = metaManager.getDamageBonusPercent();
console.log(`\n伤害加成: +${dmgBonus}%`);

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    最终天赋状态                           ║');
console.log('╚══════════════════════════════════════════════════════════╝');

metaManager.talentRegistry.printTalentTree();

console.log(`\n💰 剩余金币: ${metaManager.metaState.gold}`);

// 最终验证
console.log('\n========== 最终验证 ==========');
const allPassed = 
    hpBonus === 300 &&  // 3级 HP 加成
    player.maxHp === expectedMaxHp &&  // 血量正确应用
    dmgBonus === 5;  // 1级伤害加成

if (allPassed) {
    console.log('✅ Phase 7 所有测试通过!');
} else {
    console.log('❌ Phase 7 部分测试失败');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Phase 7 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
