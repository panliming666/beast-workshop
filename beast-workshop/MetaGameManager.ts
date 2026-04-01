import { MetaState, GridCell, WorkerBeast, ClassTag, ElementTag, GAME_CONFIG, randomInt, randomElement, generateUid } from './types';
import { TalentRegistry, calculateTalentCost, getTalentEffect, getHpBonus, getDamageBonusPercent, getRerollDiscount, getExtraWorkstationSlots, TALENT_CONFIGS } from './TalentRegistry';

/**
 * MetaGameManager - 元游戏状态管理器
 * 负责全局资源管理和网格系统 + 天赋系统
 */
export class MetaGameManager {
    private static instance: MetaGameManager;
    
    // 全局元状态
    public metaState: MetaState;
    
    // 网格系统
    public grid: GridCell[];
    
    // 天赋系统
    public talentRegistry: TalentRegistry;
    
    private constructor() {
        // 初始化元状态：1000金币，3宝箱，天赋为空
        this.metaState = {
            gold: 1000,
            chests: 3,
            lastOfflineTime: Date.now(),
            talents: {}
        };
        
        // 初始化网格
        this.grid = this.initGrid();
        
        // 初始化天赋系统
        this.talentRegistry = new TalentRegistry();
    }
    
    // 获取单例
    public static getInstance(): MetaGameManager {
        if (!MetaGameManager.instance) {
            MetaGameManager.instance = new MetaGameManager();
        }
        return MetaGameManager.instance;
    }
    
    // 初始化网格
    private initGrid(): GridCell[] {
        const cells: GridCell[] = [];
        for (let i = 0; i < GAME_CONFIG.gridSize; i++) {
            cells.push({
                index: i,
                beast: null
            });
        }
        return cells;
    }
    
    // 获取网格中的幻兽列表（非 null）
    public getGridBeasts(): WorkerBeast[] {
        return this.grid
            .filter(cell => cell.beast !== null)
            .map(cell => cell.beast!);
    }
    
    // 获取空插槽数量
    public getEmptySlotCount(): number {
        return this.grid.filter(cell => cell.beast === null).length;
    }
    
    // 随机获取一个空插槽
    private getRandomEmptySlot(): number | null {
        const emptyIndices = this.grid
            .map((cell, idx) => cell.beast === null ? idx : -1)
            .filter(idx => idx !== -1);
        
        if (emptyIndices.length === 0) return null;
        return randomElement(emptyIndices);
    }
    
    // 生成随机幻兽
    public generateRandomBeast(starLevel: number = 1, isMercenary: boolean = false): WorkerBeast {
        const classes: ClassTag[] = ['Striker', 'Caster', 'Conjurer'];
        const elements: ElementTag[] = ['Fire', 'Ice', 'Thunder', 'Venom'];
        
        // 根据星级和职业计算基础属性
        const baseHp = 100 * starLevel * (randomInt(8, 12) / 10);
        const baseAttack = 10 * starLevel * (randomInt(8, 12) / 10);
        const workPower = 5 * starLevel;
        
        return {
            uid: generateUid(),
            class: randomElement(classes),
            element: randomElement(elements),
            starLevel,
            baseHp: Math.floor(baseHp),
            baseAttack: Math.floor(baseAttack),
            workPower,
            isMercenary
        };
    }
    
    // 添加幻兽到网格
    public addBeastToGrid(beast: WorkerBeast): boolean {
        const slot = this.getRandomEmptySlot();
        if (slot === null) {
            console.warn('⚠️ 网格已满，无法添加幻兽');
            return false;
        }
        
        this.grid[slot].beast = beast;
        console.log(`✅ 幻兽 [${beast.uid}] 已放入网格槽位 ${slot} (职业: ${beast.class}, 元素: ${beast.element}, ⭐${beast.starLevel})`);
        return true;
    }
    
    // 调试初始化：随机生成1只幻兽放入网格
    public debugInit(): void {
        console.log('\n========== debugInit() 执行 ==========');
        
        // 随机生成1只1星幻兽
        const beast = this.generateRandomBeast(1, false);
        this.addBeastToGrid(beast);
        
        console.log('========== debugInit() 完成 ==========\n');
    }
    
    // 打印当前网格状态
    public printGridStatus(): void {
        console.log('\n========== 网格状态 ==========');
        console.log(`💰 金币: ${this.metaState.gold} | 🎁 宝箱: ${this.metaState.chests}`);
        console.log(`📦 网格: ${this.getGridBeasts().length}/${GAME_CONFIG.gridSize} (空槽: ${this.getEmptySlotCount()})`);
        
        this.grid.forEach((cell, idx) => {
            if (cell.beast) {
                const b = cell.beast;
                console.log(`  [${idx.toString().padStart(2, '0')}] ${b.uid} | ${b.class} | ${b.element} | ⭐${b.starLevel} | HP:${b.baseHp} | ATK:${b.baseAttack} ${b.isMercenary ? '🔰 Mercenary' : ''}`);
            }
        });
        console.log('================================\n');
    }

    // ========== 天赋系统方法 ==========

    /**
     * 升级天赋
     */
    public upgradeTalent(talentId: string): { success: boolean; cost: number; message: string } {
        const result = this.talentRegistry.upgradeTalent(talentId, this.metaState.gold);
        
        if (result.success) {
            this.metaState.gold -= result.cost;
            // 同步到 metaState
            this.metaState.talents = this.talentRegistry.exportTalentLevels();
        }
        
        console.log(`\n${result.message}`);
        
        return result;
    }

    /**
     * 批量升级天赋
     */
    public upgradeTalentMultiple(talentId: string, times: number): { 
        success: boolean; 
        totalCost: number; 
        actualUpgrades: number;
        messages: string[];
    } {
        const result = this.talentRegistry.upgradeTalentMultiple(talentId, times, this.metaState.gold);
        
        if (result.success) {
            this.metaState.gold -= result.totalCost;
            this.metaState.talents = this.talentRegistry.exportTalentLevels();
        }
        
        return result;
    }

    /**
     * 获取生命值加成
     */
    public getHpBonus(): number {
        return getHpBonus(this.metaState.talents);
    }

    /**
     * 获取伤害加成百分比
     */
    public getDamageBonusPercent(): number {
        return getDamageBonusPercent(this.metaState.talents);
    }

    /**
     * 获取 D 牌降价
     */
    public getRerollDiscount(): number {
        return getRerollDiscount(this.metaState.talents);
    }

    /**
     * 获取额外打工槽位
     */
    public getExtraWorkstationSlots(): number {
        return getExtraWorkstationSlots(this.metaState.talents);
    }
}
