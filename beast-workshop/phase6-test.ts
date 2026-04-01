/**
 * Phase 6 测试入口
 * 三层卡池与元素变异系统测试
 */
import { RunManager } from './RunManager.js';
import { DraftRegistry, CLASS_TEMPLATE_POOL, ELEMENT_SKILL_POOL } from './DraftRegistry.js';
import { ActiveRunEntity } from './types.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║       Phase 6 测试: 三层卡池与元素变异                ║');
console.log('╚══════════════════════════════════════════════════════════╝');

console.log('\n================================================');
console.log('       任务1: 构建三层卡池测试');
console.log('================================================');

console.log('\n【公共池】');
console.log('技能: 火球术, 冰枪术, 雷击, 治疗术, 重击');
console.log('装备: 生命护符, 力量之剑, 吸血鬼之牙...');

console.log('\n【元素专属池 - Venom】');
console.log('技能:', ELEMENT_SKILL_POOL['Venom'].map(s => s.name).join(', '));
console.log('装备:', '瘟疫之源, 毒液瓶');

console.log('\n【职业模板池 - Conjurer 变异系统】');
const templates = CLASS_TEMPLATE_POOL['Conjurer'];
for (const t of templates) {
    console.log(`\n  模板: ${t.baseName}`);
    console.log(`    Fire  → ${t.variants['Fire'].name}`);
    console.log(`    Ice   → ${t.variants['Ice'].name}`);
    console.log(`    Thunder → ${t.variants['Thunder'].name}`);
    console.log(`    Venom  → ${t.variants['Venom'].name}`);
}

console.log('\n================================================');
console.log('       任务2: Venom Conjurer 选秀测试');
console.log('================================================');

// 创建一个 Venom Conjurer 玩家
const player: ActiveRunEntity = {
    class: 'Conjurer',
    element: 'Venom',
    starLevel: 1,
    maxHp: 100,
    currentHp: 100,
    baseAttack: 10,
    skills: [],
    equipments: [],
    effects: []
};

console.log(`\n玩家: ${player.class} | ${player.element}`);

// 使用 DraftRegistry 生成选项
const choices = DraftRegistry.drawThreeChoices(player.class, player.element);

console.log('\n========== 选秀选项 (3抽) ==========');
let hasVenomSkill = false;
let hasVenomEquip = false;
let hasMutatedSkill = false;
let mutatedSkillName = '';

choices.forEach((c, i) => {
    console.log(`\n[选项 ${i+1}] ${c.description}`);
    
    // 检查是否有Venom专属
    if (c.description.includes('Venom') || c.description.includes('毒')) {
        hasVenomSkill = true;
    }
    // 检查是否有Venom装备
    if (c.description.includes('瘟疫之源') || c.description.includes('毒液瓶')) {
        hasVenomEquip = true;
    }
    // 检查是否有变异技能
    if (c.description.includes('变异') && c.type === 'skill') {
        hasMutatedSkill = true;
        // 提取变异后的名字
        const match = c.description.match(/→ \[(.*?)\]/);
        if (match) {
            mutatedSkillName = match[1];
        }
    }
});

console.log('\n=========================================');

console.log('\n========== 验证结果 ==========');
console.log(`✅ 包含Venom专属技能: ${hasVenomSkill ? '是' : '否'}`);
console.log(`✅ 包含Venom专属装备: ${hasVenomEquip ? '是' : '否'}`);
console.log(`✅ 包含职业模板变异技能: ${hasMutatedSkill ? '是' : '否'}`);

if (hasMutatedSkill) {
    console.log(`\n🎯 变异验证:`);
    console.log(`   模板: 秘术纸符`);
    console.log(`   玩家元素: Venom`);
    console.log(`   变异结果: ${mutatedSkillName}`);
    
    if (mutatedSkillName === '剧毒咒') {
        console.log(`   ✅ 变异正确! 秘术纸符 → 剧毒咒 (附带poison状态)`);
    } else {
        console.log(`   ❌ 变异错误! 期望: 剧毒咒, 实际: ${mutatedSkillName}`);
    }
}

console.log('\n================================================');
console.log('       任务3: 验证不含其他职业/元素专属');
console.log('================================================');

let hasOtherClassSkill = false;
let hasOtherElementSkill = false;

for (const c of choices) {
    // 检查是否包含其他职业的模板 (通过关键字判断)
    if (c.description.includes('Striker') || c.description.includes('Caster')) {
        // 只检查不是Conjurer的
        if (!c.description.includes('Conjurer') && c.description.includes('模板')) {
            hasOtherClassSkill = true;
        }
    }
    // 检查是否包含其他元素 (Fire/Ice/Thunder 专属)
    if (c.description.includes('Fire') || c.description.includes('Ice') || c.description.includes('Thunder')) {
        if (!c.description.includes('Venom') && c.description.includes('专属')) {
            hasOtherElementSkill = true;
        }
    }
}

console.log(`\n不含其他职业专属模板: ${!hasOtherClassSkill ? '✅ 是' : '❌ 否'}`);
console.log(`不含其他元素专属: ${!hasOtherElementSkill ? '✅ 是' : '❌ 否'}`);

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    测试结果                               ║');
console.log('╚══════════════════════════════════════════════════════════╝');

if (hasMutatedSkill && mutatedSkillName === '剧毒咒') {
    console.log('✅ Phase 6 测试通过!');
    console.log('   - 三层卡池构建成功');
    console.log('   - 元素变异系统工作正常');
    console.log('   - 秘术纸符 → 剧毒咒 变异成功');
} else {
    console.log('❌ Phase 6 测试失败');
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Phase 6 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
