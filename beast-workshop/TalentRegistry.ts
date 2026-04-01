/**
 * TalentRegistry - 局外天赋树系统
 * 消耗金币升级全局天赋，影响局内属性
 */
import { ClassTag, ElementTag } from './types';

export interface TalentConfig {
    id: string;
    name: string;
    description: string;
    maxLevel: number;
    baseCost: number;
    costMultiplier: number;  // 每级成本递增系数
    effectPerLevel: number;  // 每级效果值
    effectType: 'flat' | 'percent';  // 固定值或百分比
}

export interface TalentState {
    level: number;
    totalSpent: number;
}

// 天赋配置表
export const TALENT_CONFIGS: Record<string, TalentConfig> = {
    'talent_hp': {
        id: 'talent_hp',
        name: '生命强化',
        description: '每级初始 HP +100',
        maxLevel: 20,
        baseCost: 500,
        costMultiplier: 1.2,
        effectPerLevel: 100,
        effectType: 'flat'
    },
    'talent_discount': {
        id: 'talent_discount',
        name: '议价精通',
        description: '每级 D 牌降价 5 金币',
        maxLevel: 10,
        baseCost: 800,
        costMultiplier: 1.3,
        effectPerLevel: 5,
        effectType: 'flat'
    },
    'talent_slots': {
        id: 'talent_slots',
        name: '工作扩张',
        description: '每级打工槽位 +1',
        maxLevel: 5,
        baseCost: 2000,
        costMultiplier: 1.5,
        effectPerLevel: 1,
        effectType: 'flat'
    },
    'talent_dmg': {
        id: 'talent_dmg',
        name: '伤害增幅',
        description: '每级全伤害 +5%',
        maxLevel: 20,
        baseCost: 600,
        costMultiplier: 1.25,
        effectPerLevel: 5,
        effectType: 'percent'
    }
};

/**
 * 计算指定天赋的升级成本
 */
export function calculateTalentCost(talentId: string, currentLevel: number): number {
    const config = TALENT_CONFIGS[talentId];
    if (!config) return 0;
    
    // 成本 = 基础成本 × (递增系数 ^ 当前等级)
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, currentLevel));
}

/**
 * 获取天赋的当前效果值
 */
export function getTalentEffect(talentId: string, level: number): number {
    const config = TALENT_CONFIGS[talentId];
    if (!config) return 0;
    
    return level * config.effectPerLevel;
}

/**
 * 获取生命值加成 (来自 talent_hp)
 */
export function getHpBonus(talentLevels: Record<string, number>): number {
    return getTalentEffect('talent_hp', talentLevels['talent_hp'] || 0);
}

/**
 * 获取伤害加成百分比 (来自 talent_dmg)
 */
export function getDamageBonusPercent(talentLevels: Record<string, number>): number {
    return getTalentEffect('talent_dmg', talentLevels['talent_dmg'] || 0);
}

/**
 * 获取 D 牌降价 (来自 talent_discount)
 */
export function getRerollDiscount(talentLevels: Record<string, number>): number {
    return getTalentEffect('talent_discount', talentLevels['talent_discount'] || 0);
}

/**
 * 获取额外打工槽位 (来自 talent_slots)
 */
export function getExtraWorkstationSlots(talentLevels: Record<string, number>): number {
    return getTalentEffect('talent_slots', talentLevels['talent_slots'] || 0);
}

/**
 * TalentRegistry - 天赋管理器
 */
export class TalentRegistry {
    private talentLevels: Record<string, number> = {};
    private totalSpent: Record<string, number> = {};

    constructor(initialLevels: Record<string, number> = {}) {
        this.talentLevels = { ...initialLevels };
        // 初始化 totalSpent
        for (const [id, level] of Object.entries(initialLevels)) {
            this.totalSpent[id] = this.calculateTotalSpent(id, level);
        }
    }

    /**
     * 获取天赋等级
     */
    public getLevel(talentId: string): number {
        return this.talentLevels[talentId] || 0;
    }

    /**
     * 获取天赋总花费
     */
    public getTotalSpent(talentId: string): number {
        return this.totalSpent[talentId] || 0;
    }

    /**
     * 计算升级到某等级的总花费
     */
    private calculateTotalSpent(talentId: string, targetLevel: number): number {
        let total = 0;
        for (let i = 0; i < targetLevel; i++) {
            total += calculateTalentCost(talentId, i);
        }
        return total;
    }

    /**
     * 获取下一级升级成本
     */
    public getNextUpgradeCost(talentId: string): number {
        const currentLevel = this.getLevel(talentId);
        const config = TALENT_CONFIGS[talentId];
        
        if (!config) return 0;
        if (currentLevel >= config.maxLevel) return 0;
        
        return calculateTalentCost(talentId, currentLevel);
    }

    /**
     * 升级指定天赋
     * @returns { success: boolean, cost: number, message: string }
     */
    public upgradeTalent(talentId: string, availableGold: number): { success: boolean; cost: number; message: string } {
        const config = TALENT_CONFIGS[talentId];
        
        if (!config) {
            return { success: false, cost: 0, message: '天赋不存在' };
        }

        const currentLevel = this.getLevel(talentId);
        
        if (currentLevel >= config.maxLevel) {
            return { success: false, cost: 0, message: `已达最大等级 (${config.maxLevel})` };
        }

        const cost = this.getNextUpgradeCost(talentId);
        
        if (availableGold < cost) {
            return { success: false, cost, message: `金币不足 (需要 ${cost}, 当前 ${availableGold})` };
        }

        // 升级
        this.talentLevels[talentId] = currentLevel + 1;
        this.totalSpent[talentId] = (this.totalSpent[talentId] || 0) + cost;

        return { 
            success: true, 
            cost, 
            message: `${config.name} 升级成功! Lv.${currentLevel} → Lv.${currentLevel + 1}` 
        };
    }

    /**
     * 批量升级天赋
     */
    public upgradeTalentMultiple(talentId: string, times: number, availableGold: number): { 
        success: boolean; 
        totalCost: number; 
        actualUpgrades: number;
        messages: string[];
    } {
        let totalCost = 0;
        let actualUpgrades = 0;
        const messages: string[] = [];
        let remainingGold = availableGold;

        for (let i = 0; i < times; i++) {
            const result = this.upgradeTalent(talentId, remainingGold);
            
            if (!result.success) {
                messages.push(result.message);
                break;
            }
            
            totalCost += result.cost;
            remainingGold -= result.cost;
            actualUpgrades++;
            messages.push(result.message);
        }

        return {
            success: actualUpgrades > 0,
            totalCost,
            actualUpgrades,
            messages
        };
    }

    /**
     * 获取所有天赋状态
     */
    public getAllTalents(): Record<string, TalentState> {
        const result: Record<string, TalentState> = {};
        
        for (const id of Object.keys(TALENT_CONFIGS)) {
            result[id] = {
                level: this.getLevel(id),
                totalSpent: this.getTotalSpent(id)
            };
        }
        
        return result;
    }

    /**
     * 打印天赋树状态
     */
    public printTalentTree(): void {
        console.log('\n========== 天赋树状态 ==========');
        
        for (const [id, config] of Object.entries(TALENT_CONFIGS)) {
            const level = this.getLevel(id);
            const nextCost = this.getNextUpgradeCost(id);
            const totalSpent = this.getTotalSpent(id);
            
            console.log(`\n[${config.name}] ${id}`);
            console.log(`  当前等级: ${level}/${config.maxLevel}`);
            console.log(`  当前效果: +${getTalentEffect(id, level)}${config.effectType === 'percent' ? '%' : ''}`);
            console.log(`  累计花费: ${totalSpent} 金币`);
            
            if (level < config.maxLevel) {
                console.log(`  下次升级: ${nextCost} 金币`);
            } else {
                console.log(`  下次升级: 已达上限`);
            }
        }
        
        console.log('\n================================\n');
    }

    /**
     * 导出天赋等级数据 (用于保存)
     */
    public exportTalentLevels(): Record<string, number> {
        return { ...this.talentLevels };
    }
}
