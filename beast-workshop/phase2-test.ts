/**
 * Phase 2 测试入口
 * 全自动 CD 战斗引擎测试
 */
import { MetaGameManager } from './MetaGameManager.js';
import { RunManager } from './RunManager.js';
import { BattleEngine } from './BattleEngine.js';
import { RunSkill, RunEquipment, ActiveRunEntity, EliteAffixType } from './types.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║          Phase 2 测试: 全自动 CD 战斗引擎                ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 初始化游戏
const metaManager = MetaGameManager.getInstance();
metaManager.debugInit();

// 2. 创建玩家角色
const runManager = new RunManager();
const starterOptions = runManager.generateStarterOptions();
const player = runManager.startRun(starterOptions[0]);

// 3. 给玩家添加一个技能（用于测试技能系统）
const playerSkill: RunSkill = {
    id: 'skill_fireball',
    name: '火球术',
    maxCd: 4,
    currentCd: 0,  // 初始即可用
    effectValue: 25,
    statusToApply: {
        type: 'burn',
        duration: 3,
        value: 5
    }
};
player.skills.push(playerSkill);

// 给玩家添加一件吸血装备
const playerEquip: RunEquipment = {
    id: 'equip_vampire',
    name: '吸血鬼之牙',
    type: 'lifesteal',
    value: 20  // 20% 吸血
};
player.equipments.push(playerEquip);

console.log('\n========== 玩家属性 ==========');
console.log(`职业: ${player.class} | 元素: ${player.element}`);
console.log(`HP: ${player.currentHp}/${player.maxHp}`);
console.log(`ATK: ${player.baseAttack}`);
console.log(`技能: [${playerSkill.name}] CD:${playerSkill.maxCd} 伤害:${playerSkill.effectValue}`);
console.log(`装备: [${playerEquip.name}] 吸血:${playerEquip.value}%`);
console.log('================================\n');

// 4. 创建敌方怪物（带技能和精英词缀）
const enemy: ActiveRunEntity = {
    class: 'Striker',
    element: 'Fire',
    starLevel: 2,
    maxHp: 200,
    currentHp: 200,
    baseAttack: 15,
    skills: [],
    equipments: [],
    effects: [],
    isBoss: false,
    eliteAffixes: ['thorns' as EliteAffixType]  // 荆棘词缀
};

// 给敌人添加一个技能
const enemySkill: RunSkill = {
    id: 'skill_shadow',
    name: '暗影箭',
    maxCd: 5,
    currentCd: 0,
    effectValue: 20,
    statusToApply: {
        type: 'poison',
        duration: 2,
        value: 3
    }
};
enemy.skills.push(enemySkill);

console.log('========== 敌方属性 ==========');
console.log(`职业: ${enemy.class} | 元素: ${enemy.element}`);
console.log(`HP: ${enemy.currentHp}/${enemy.maxHp}`);
console.log(`ATK: ${enemy.baseAttack}`);
console.log(`技能: [${enemySkill.name}] CD:${enemySkill.maxCd} 伤害:${enemySkill.effectValue}`);
console.log(`精英词缀: ${enemy.eliteAffixes?.join(', ') || '无'}`);
console.log('================================\n');

// 5. 创建战斗引擎并运行
const battle = new BattleEngine(player, enemy);
battle.runBattle();

// 6. 打印完整战斗日志
battle.printBattleLog();

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Phase 2 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
