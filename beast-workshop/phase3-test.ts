/**
 * Phase 3 测试入口
 * 双轨制关卡流转与商人节点测试
 */
import { MetaGameManager } from './MetaGameManager.js';
import { RunManager } from './RunManager.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║       Phase 3 测试: 双轨制关卡流转与商人节点            ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 初始化游戏
const metaManager = MetaGameManager.getInstance();
metaManager.debugInit();

// 2. 创建 RunManager
const runManager = new RunManager();

// 3. 开局选角
const starterOptions = runManager.generateStarterOptions();
runManager.printStarterOptions(starterOptions);

// 选择第1个幻兽开始冒险
const player = runManager.startRun(starterOptions[0]);
runManager.printSessionStatus();

// 4. 自动模拟 1-10 关
console.log('\n================================================');
console.log('           开始自动模拟关卡流程                ');
console.log('================================================\n');

while (runManager.session && !runManager.session.isFinished) {
    runManager.runNextStage();
    runManager.printSessionStatus();
}

// 5. 最终结果
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    最终结果                               ║');
console.log('╚══════════════════════════════════════════════════════════╝');

if (runManager.session) {
    console.log(`🎯 通关结果: ${runManager.session.result === 'victory' ? '✅ 胜利' : '❌ 失败'}`);
    console.log(`📊 到达关卡: ${runManager.session.currentStage}/10`);
    console.log(`🎁 获得宝箱: ${runManager.chestsEarned}`);
    console.log(`💰 剩余金币: ${metaManager.metaState.gold}`);
    console.log(`\n📦 玩家最终属性:`);
    console.log(`   HP: ${runManager.session.player.currentHp}/${runManager.session.player.maxHp}`);
    console.log(`   ATK: ${runManager.session.player.baseAttack}`);
    console.log(`   星级: ⭐${runManager.session.player.starLevel}`);
    console.log(`   技能: ${runManager.session.player.skills.map(s => s.name).join(', ') || '无'}`);
    console.log(`   装备: ${runManager.session.player.equipments.map(e => e.name).join(', ') || '无'}`);
}

console.log('\n═══════════════════════════════════════════════════════════');
console.log('✅ Phase 3 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');