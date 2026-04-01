/**
 * Phase 4 测试入口
 * 放置工坊、合并消除与经济闭环
 */
import { MetaGameManager } from './MetaGameManager.js';
import { WorkstationManager } from './WorkstationManager.js';
import { RunManager } from './RunManager.js';
import { GAME_CONFIG } from './types.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     Phase 4 测试: 放置工坊、合并消除与经济闭环          ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 初始化游戏
const metaManager = MetaGameManager.getInstance();
console.log('初始状态:');
console.log(`💰 金币: ${metaManager.metaState.gold}`);
console.log(`🎁 宝箱: ${metaManager.metaState.chests}`);

// 2. 创建 WorkstationManager
const workstation = new WorkstationManager();

console.log('\n================================================');
console.log('       任务1: 开宝箱测试');
console.log('================================================');

// 给玩家加宝箱
metaManager.metaState.chests = 5;
console.log(`\n增加宝箱至: ${metaManager.metaState.chests}`);

// 开3个宝箱
for (let i = 0; i < 3; i++) {
    workstation.openChest();
}

workstation.printWorkstationStatus();

console.log('\n================================================');
console.log('       任务2: 3合1 合并测试');
console.log('================================================');

// 先在网格中放入2个匹配的幻兽用于合并
// 修改工作站中的幻兽，让它们可以合并
const beast1 = workstation.workstation[0];
const beast2 = workstation.workstation[1];

if (beast1 && beast2) {
    // 手动修改为相同属性以便测试3合1
    (beast1 as any).class = 'Striker';
    (beast1 as any).element = 'Fire';
    (beast1 as any).starLevel = 1;
    
    (beast2 as any).class = 'Striker';
    (beast2 as any).element = 'Fire';
    (beast2 as any).starLevel = 1;
    
    // 手动创建一个到网格用于测试3合1
    metaManager.grid[0].beast = {
        uid: 'TEST-MERGE-3',
        class: 'Striker',
        element: 'Fire',
        starLevel: 1,
        baseHp: 100,
        baseAttack: 10,
        workPower: 1
    };
    
    console.log('\n设置3只相同幻兽用于3合1测试:');
    console.log(`  工作站[0]: ${beast1!.uid} → Striker, Fire, ⭐1`);
    console.log(`  工作站[1]: ${beast2!.uid} → Striker, Fire, ⭐1`);
    console.log(`  网格[0]: TEST-MERGE-3 → Striker, Fire, ⭐1`);
    
    // 执行3合1
    workstation.mergeBeast(0, 1);
}

workstation.printWorkstationStatus();

console.log('\n================================================');
console.log('       任务3: 挂机产出测试');
console.log('================================================');

// 模拟挂机产出
workstation.simulateIdleYield(10);

console.log('\n================================================');
console.log('       任务4: 局内 reroll 测试');
console.log('================================================');

// 创建一个局内会话用于测试 reroll
metaManager.metaState.gold = 1000;
console.log(`\n设置金币: ${metaManager.metaState.gold}`);

const runManager = new RunManager();
const starterOptions = runManager.generateStarterOptions();
runManager.startRun(starterOptions[0]);

// 进入选秀关卡
runManager.session!.currentStage = 1;  // 选秀关卡
runManager.runNextStage();

// 测试 reroll
const newChoices = runManager.rerollDraft();

if (newChoices) {
    console.log('\n刷新后的选项:');
    newChoices.forEach((c, i) => console.log(`  ${i+1}. ${c.description}`));
    
    // 应用第一个新选项
    runManager.applyDraftChoice(newChoices[0]);
}

console.log(`\nreroll 后金币剩余: ${metaManager.metaState.gold}`);

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    最终结果                               ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`💰 当前金币: ${metaManager.metaState.gold}`);
console.log(`🎁 剩余宝箱: ${metaManager.metaState.chests}`);

console.log('\n工作站最终状态:');
workstation.printWorkstationStatus();

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Phase 4 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
