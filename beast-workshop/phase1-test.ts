/**
 * Phase 1 测试入口
 * 核心状态管理与"流浪者保底"开局
 */
import { MetaGameManager } from './MetaGameManager';
import { RunManager } from './RunManager';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     Phase 1 测试: 核心状态管理与流浪者保底开局            ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 1. 获取 MetaGameManager 单例
const metaManager = MetaGameManager.getInstance();

// 2. 调用 debugInit() - 随机生成 1 只幻兽放入网格
metaManager.debugInit();

// 3. 打印网格状态
metaManager.printGridStatus();

// 4. 获取 RunManager 实例
const runManager = new RunManager();

// 5. 生成开局选项
const starterOptions = runManager.generateStarterOptions();

// 6. 打印选项信息
runManager.printStarterOptions(starterOptions);

// 7. 模拟选择第 1 个选项并开始战斗
const selectedBeast = starterOptions[0];
const activeEntity = runManager.startRun(selectedBeast);

// 8. 打印局内实体属性
runManager.printActiveEntity(activeEntity);

// 额外测试：测试流浪者保底机制（清空网格模拟）
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║     额外测试: 流浪者保底机制 (网格为空)                  ║');
console.log('╚══════════════════════════════════════════════════════════╝');

// 重置网格（清空所有幻兽）
metaManager.grid.forEach(cell => cell.beast = null);
console.log('✅ 网格已清空\n');

const starterOptions2 = runManager.generateStarterOptions();
runManager.printStarterOptions(starterOptions2);

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Phase 1 测试完成！');
console.log('═══════════════════════════════════════════════════════════\n');
