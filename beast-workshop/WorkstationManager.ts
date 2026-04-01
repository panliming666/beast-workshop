/**
 * WorkstationManager - 工作站与挂机产出管理
 * 负责工坊合并、放置产出
 */
import { WorkerBeast, GridCell, GAME_CONFIG, randomElement, randomInt, generateUid, ClassTag, ElementTag } from './types';
import { MetaGameManager } from './MetaGameManager';

export class WorkstationManager {
    private metaManager: MetaGameManager;
    public workstation: (WorkerBeast | null)[] = [];  // 工作站槽位
    private tickCount: number = 0;

    constructor() {
        this.metaManager = MetaGameManager.getInstance();
        // 初始化工作站 - 动态读取槽位上限
        this.refreshWorkstationSize();
    }

    /**
     * 刷新工作站大小（应用天赋加成）
     */
    public refreshWorkstationSize(): void {
        const baseSlots = GAME_CONFIG.workstationSlots;
        const extraSlots = this.metaManager.getExtraWorkstationSlots();
        const totalSlots = baseSlots + extraSlots;
        
        // 保留原有数据
        const oldWorkstation = this.workstation;
        this.workstation = new Array(totalSlots).fill(null);
        
        // 复制旧数据
        for (let i = 0; i < Math.min(oldWorkstation.length, totalSlots); i++) {
            this.workstation[i] = oldWorkstation[i];
        }
        
        if (extraSlots > 0) {
            console.log(`📈 天赋加成: 工作站槽位 +${extraSlots} (${baseSlots} → ${totalSlots})`);
        }
    }

    /**
     * 获取当前工作站槽位上限
     */
    public getMaxSlots(): number {
        return GAME_CONFIG.workstationSlots + this.metaManager.getExtraWorkstationSlots();
    }

    /**
     * 开宝箱
     */
    public openChest(): WorkerBeast | null {
        console.log('\n========== openChest() 执行 ==========');
        
        if (this.metaManager.metaState.chests <= 0) {
            console.log('⚠️ 宝箱不足!');
            return null;
        }

        const emptySlot = this.getFirstEmptyWorkstation();
        if (emptySlot === -1) {
            console.log('⚠️ 工作站已满!');
            return null;
        }

        this.metaManager.metaState.chests--;

        const classes: ClassTag[] = ['Striker', 'Caster', 'Conjurer'];
        const elements: ElementTag[] = ['Fire', 'Ice', 'Thunder', 'Venom'];

        const beast: WorkerBeast = {
            uid: generateUid(),
            class: randomElement(classes),
            element: randomElement(elements),
            starLevel: 1,
            baseHp: 100,
            baseAttack: 10,
            workPower: 5
        };

        this.workstation[emptySlot] = beast;

        console.log(`✅ 宝箱已打开!`);
        console.log(`   剩余宝箱: ${this.metaManager.metaState.chests}`);
        console.log(`   生成幻兽: [${beast.uid}] ${beast.class} | ${beast.element} | ⭐${beast.starLevel}`);
        console.log('=========================================\n');

        return beast;
    }

    /**
     * 获取第一个空工作站槽位
     */
    private getFirstEmptyWorkstation(): number {
        return this.workstation.findIndex(slot => slot === null);
    }

    /**
     * 获取所有非空工作站幻兽
     */
    public getWorkstationBeasts(): WorkerBeast[] {
        return this.workstation.filter(b => b !== null) as WorkerBeast[];
    }

    /**
     * 核心合并: 3合1
     * 校验 sourceIdx 和 targetIdx 的实体 starLevel/class/element 是否一致
     * 若一致，全网格寻找第3只，找到则销毁三只，生成星级+1的新实体
     */
    public mergeBeast(sourceIdx: number, targetIdx: number): boolean {
        console.log('\n========== mergeBeast() 执行 ==========');
        console.log(`🔄 尝试合并: 槽位${sourceIdx} → 槽位${targetIdx}`);

        const source = this.workstation[sourceIdx];
        const target = this.workstation[targetIdx];

        // 校验源和目标
        if (!source || !target) {
            console.log('⚠️ 源或目标槽位为空!');
            return false;
        }

        if (source.starLevel !== target.starLevel ||
            source.class !== target.class ||
            source.element !== target.element) {
            console.log('⚠️ 属性不匹配! 无法合并');
            console.log(`   源: ⭐${source.starLevel} ${source.class} ${source.element}`);
            console.log(`   目标: ⭐${target.starLevel} ${target.class} ${target.element}`);
            return false;
        }

        // 全网格寻找第3只相同的幻兽
        const starLevel = source.starLevel;
        const matchClass = source.class;
        const matchElement = source.element;

        // 在工作站中寻找匹配的幻兽
        const matches: number[] = [];
        this.workstation.forEach((beast, idx) => {
            if (beast && 
                beast.starLevel === starLevel && 
                beast.class === matchClass && 
                beast.element === matchElement &&
                idx !== sourceIdx && 
                idx !== targetIdx) {
                matches.push(idx);
            }
        });

        // 在网格中也寻找
        this.metaManager.grid.forEach((cell, idx) => {
            if (cell.beast && 
                cell.beast.starLevel === starLevel && 
                cell.beast.class === matchClass && 
                cell.beast.element === matchElement) {
                matches.push(100 + idx);  // 100+ 表示来自网格
            }
        });

        if (matches.length === 0) {
            console.log('⚠️ 未找到第3只匹配的幻兽!');
            return false;
        }

        // 找到第3只，执行3合1
        const thirdIdx = matches[0];
        const isFromGrid = thirdIdx >= 100;
        const gridIdx = thirdIdx - 100;

        // 销毁三只幻兽
        this.workstation[sourceIdx] = null;
        this.workstation[targetIdx] = null;
        if (isFromGrid) {
            this.metaManager.grid[gridIdx].beast = null;
        } else {
            this.workstation[thirdIdx] = null;
        }

        // 生成星级+1的新实体
        const newStarLevel = starLevel + 1;
        const newWorkPower = target.workPower * 3;

        const mergedBeast: WorkerBeast = {
            uid: generateUid(),
            class: matchClass,
            element: matchElement,
            starLevel: newStarLevel,
            baseHp: Math.floor(target.baseHp * 1.5),
            baseAttack: Math.floor(target.baseAttack * 1.5),
            workPower: newWorkPower
        };

        // 放入目标槽位
        this.workstation[targetIdx] = mergedBeast;

        console.log(`✅ 3合1 合并成功!`);
        console.log(`   销毁: 槽位${sourceIdx}, 槽位${targetIdx}, ${isFromGrid ? '网格' : '工作站'}${thirdIdx}`);
        console.log(`   生成: [${mergedBeast.uid}] ${mergedBeast.class} | ${mergedBeast.element} | ⭐${mergedBeast.starLevel}`);
        console.log(`   新属性: HP:${mergedBeast.baseHp} ATK:${mergedBeast.baseAttack} 工作能力:${mergedBeast.workPower}`);
        console.log('=========================================\n');

        return true;
    }

    /**
     * 将网格幻兽放入工作站
     */
    public assignWorker(gridIndex: number, workstationIndex: number): boolean {
        const gridBeast = this.metaManager.grid[gridIndex].beast;
        
        if (!gridBeast) {
            console.log('⚠️ 网格槽位为空!');
            return false;
        }

        if (this.workstation[workstationIndex] !== null) {
            console.log('⚠️ 工作站槽位已占用!');
            return false;
        }

        // 移动
        this.metaManager.grid[gridIndex].beast = null;
        this.workstation[workstationIndex] = gridBeast;

        console.log(`✅ 已将 [${gridBeast.uid}] 从网格槽位${gridIndex} 移动到工作站槽位${workstationIndex}`);
        return true;
    }

    /**
     * 计算产出
     * 每 tick 调用，累加金币
     */
    public calculateYield(): number {
        this.tickCount++;

        // 计算总工作能力
        let totalWorkPower = 0;
        for (const beast of this.workstation) {
            if (beast) {
                totalWorkPower += beast.workPower;
            }
        }

        // 产出金币 = 工作能力总和
        if (totalWorkPower > 0) {
            this.metaManager.metaState.gold += totalWorkPower;
        }

        return totalWorkPower;
    }

    /**
     * 打印工作站状态
     */
    public printWorkstationStatus(): void {
        const maxSlots = this.getMaxSlots();
        
        console.log('\n========== 工作站状态 ==========');
        console.log(` Tick: ${this.tickCount}`);
        console.log(`💰 当前金币: ${this.metaManager.metaState.gold}`);
        console.log(`🎁 当前宝箱: ${this.metaManager.metaState.chests}`);
        
        console.log(`\n工作站槽位 (${maxSlots}):`);
        this.workstation.forEach((beast, idx) => {
            if (beast) {
                console.log(`  [${idx}] ${beast.uid} | ${beast.class} | ${beast.element} | ⭐${beast.starLevel} | 工作: ${beast.workPower}`);
            } else {
                console.log(`  [${idx}] (空)`);
            }
        });

        // 统计总工作能力
        const totalPower = this.getWorkstationBeasts().reduce((sum, b) => sum + b.workPower, 0);
        console.log(`\n总工作能力: ${totalPower}`);
        console.log('================================\n');
    }

    /**
     * 模拟一次挂机产出
     */
    public simulateIdleYield(ticks: number): void {
        console.log(`\n========== 模拟挂机 ${ticks} ticks ==========`);
        
        for (let i = 0; i < ticks; i++) {
            const yield_ = this.calculateYield();
            if (yield_ > 0 && (i === 0 || i === ticks - 1 || i % 5 === 0)) {
                console.log(` Tick ${i}: +${yield_} 金币 (总计: ${this.metaManager.metaState.gold})`);
            }
        }
        
        console.log(`\n✅ 挂机完成! 累计获得 ${ticks * this.getWorkstationBeasts().reduce((sum, b) => sum + b.workPower, 0)} 金币`);
        console.log(`   当前金币: ${this.metaManager.metaState.gold}`);
        console.log('=========================================\n');
    }
}
