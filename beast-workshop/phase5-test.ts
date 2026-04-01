/**
 * Phase 5 测试入口
 * 状态异常结算引擎测试
 */
import { BattleEngine } from './BattleEngine.js';
import { RunSkill, RunEquipment, ActiveRunEntity } from './types.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║       Phase 5 测试: 状态异常结算引擎                    ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 创建玩家 - 带【点燃】技能
const player: ActiveRunEntity = {
    class: 'Caster',
    element: 'Fire',
    starLevel: 2,
    maxHp: 200,
    currentHp: 200,
    baseAttack: 15,
    skills: [],
    equipments: [],
    effects: []
};

// 玩家技能: 点燃 (burn)
const burnSkill: RunSkill = {
    id: 'skill_ignite',
    name: '点燃',
    maxCd: 3,
    currentCd: 0,
    effectValue: 20,
    statusToApply: {
        type: 'burn',
        duration: 4,
        value: 8  // 每tick 8伤害
    }
};
player.skills.push(burnSkill);

// 2. 创建怪物 - 带【冰冻】技能
const enemy: ActiveRunEntity = {
    class: 'Caster',
    element: 'Ice',
    starLevel: 2,
    maxHp: 250,
    currentHp: 250,
    baseAttack: 12,
    skills: [],
    equipments: [],
    effects: []
};

// 怪物技能: 冰霜新星 (freeze)
const freezeSkill: RunSkill = {
    id: 'skill_frost_nova',
    name: '冰霜新星',
    maxCd: 4,
    currentCd: 0,
    effectValue: 10,
    statusToApply: {
        type: 'freeze',
        duration: 1,
        value: 2  // 延长所有技能CD 2
    }
};
enemy.skills.push(freezeSkill);

console.log('\n========== 参战双方 ==========');
console.log('玩家:');
console.log(`  职业: ${player.class} | 元素: ${player.element}`);
console.log(`  HP: ${player.currentHp}/${player.maxHp}`);
console.log(`  ATK: ${player.baseAttack}`);
console.log(`  技能: [${burnSkill.name}] CD:${burnSkill.maxCd} 伤害:${burnSkill.effectValue}`);
console.log(`       状态: ${burnSkill.statusToApply!.type} ×${burnSkill.statusToApply!.value} 持续${burnSkill.statusToApply!.duration}ticks`);

console.log('\n怪物:');
console.log(`  职业: ${enemy.class} | 元素: ${enemy.element}`);
console.log(`  HP: ${enemy.currentHp}/${enemy.maxHp}`);
console.log(`  ATK: ${enemy.baseAttack}`);
console.log(`  技能: [${freezeSkill.name}] CD:${freezeSkill.maxCd} 伤害:${freezeSkill.effectValue}`);
console.log(`       状态: ${freezeSkill.statusToApply!.type} 延长CD ${freezeSkill.statusToApply!.value}`);

// 3. 创建战斗引擎
const battle = new BattleEngine(player, enemy);

// 4. 运行战斗
battle.runBattle();

// 5. 打印详细日志
console.log('\n');
battle.printBattleLog();

// 6. 统计状态效果
console.log('\n========== 状态效果统计 ==========');

const burnEvents = battle.events.filter(e => e.message.includes('点燃'));
const freezeEvents = battle.events.filter(e => e.message.includes('冰冻') || e.message.includes('CD延长'));
const poisonTestEvents = battle.events.filter(e => e.message.includes('毒液'));
const shockTestEvents = battle.events.filter(e => e.message.includes('电击'));

console.log(`🔥 点燃触发次数: ${burnEvents.length}`);
console.log(`❄️ 冰冻触发次数: ${freezeEvents.length}`);

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Phase 5 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
