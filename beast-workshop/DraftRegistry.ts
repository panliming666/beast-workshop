/**
 * DraftRegistry - 三层卡池与元素变异系统
 * 公共池 + 元素池 + 职业池(变异模板)
 */
import { RunSkill, RunEquipment, DraftChoice, DraftChoiceType, ClassTag, ElementTag, StatusEffect, randomElement, generateUid } from './types';

// ========== 公共池 ==========
export const PUBLIC_EQUIPMENT_POOL: Omit<RunEquipment, 'id'>[] = [
    { name: '生命护符', type: 'hp_boost', value: 500 },
    { name: '力量之剑', type: 'attack_boost', value: 15 },
    { name: '敏捷手套', type: 'attack_boost', value: 8 },
    { name: '吸血鬼之牙', type: 'lifesteal', value: 15 },
    { name: '诅咒之镜', type: 'merchant_cursed', value: 20 },
];

export const PUBLIC_SKILL_POOL: Omit<RunSkill, 'id' | 'currentCd'>[] = [
    { name: '火球术', maxCd: 4, effectValue: 25, statusToApply: { type: 'burn', duration: 3, value: 5 } },
    { name: '冰枪术', maxCd: 3, effectValue: 20, statusToApply: { type: 'freeze', duration: 2, value: 3 } },
    { name: '雷击', maxCd: 5, effectValue: 30, statusToApply: { type: 'shock', duration: 1, value: 0 } },
    { name: '治疗术', maxCd: 6, effectValue: 30 },
    { name: '重击', maxCd: 3, effectValue: 35 },
];

// ========== 元素专属池 ==========
export const ELEMENT_EQUIPMENT_POOL: Record<ElementTag, Omit<RunEquipment, 'id'>[]> = {
    'Fire': [
        { name: '烈焰之核', type: 'attack_boost', value: 20 },
        { name: '熔岩护符', type: 'hp_boost', value: 300 },
    ],
    'Ice': [
        { name: '霜冻之心', type: 'attack_boost', value: 15 },
        { name: '寒冰护盾', type: 'hp_boost', value: 400 },
    ],
    'Thunder': [
        { name: '雷霆之怒', type: 'attack_boost', value: 25 },
        { name: '闪电戒指', type: 'lifesteal', value: 10 },
    ],
    'Venom': [
        { name: '瘟疫之源', type: 'attack_boost', value: 18 },
        { name: '毒液瓶', type: 'lifesteal', value: 20 },
    ],
};

export const ELEMENT_SKILL_POOL: Record<ElementTag, Omit<RunSkill, 'id' | 'currentCd'>[]> = {
    'Fire': [
        { name: '炎爆术', maxCd: 5, effectValue: 40, statusToApply: { type: 'burn', duration: 4, value: 8 } },
    ],
    'Ice': [
        { name: '冰封术', maxCd: 4, effectValue: 25, statusToApply: { type: 'freeze', duration: 3, value: 2 } },
    ],
    'Thunder': [
        { name: '连锁闪电', maxCd: 4, effectValue: 35, statusToApply: { type: 'shock', duration: 1, value: 0 } },
    ],
    'Venom': [
        { name: '剧毒喷雾', maxCd: 4, effectValue: 22, statusToApply: { type: 'poison', duration: 3, value: 6 } },
    ],
};

// ========== 职业模板池 (变异系统核心) ==========
// 基础模板定义 - 根据玩家元素变异为不同技能
export interface ClassTemplate {
    baseName: string;
    baseSkill: Omit<RunSkill, 'id' | 'currentCd' | 'name'>;
    variants: Record<ElementTag, { name: string; statusToApply: StatusEffect }>;
}

export const CLASS_TEMPLATE_POOL: Record<ClassTag, ClassTemplate[]> = {
    'Striker': [
        {
            baseName: '狂暴打击',
            baseSkill: { maxCd: 3, effectValue: 30 },
            variants: {
                'Fire': { name: '烈焰斩', statusToApply: { type: 'burn', duration: 3, value: 6 } },
                'Ice': { name: '寒冰斩', statusToApply: { type: 'freeze', duration: 2, value: 2 } },
                'Thunder': { name: '雷霆斩', statusToApply: { type: 'shock', duration: 1, value: 0 } },
                'Venom': { name: '毒刃斩', statusToApply: { type: 'poison', duration: 3, value: 5 } },
            }
        },
    ],
    'Caster': [
        {
            baseName: '秘术纸符',
            baseSkill: { maxCd: 4, effectValue: 25 },
            variants: {
                'Fire': { name: '炎咒', statusToApply: { type: 'burn', duration: 3, value: 6 } },
                'Ice': { name: '极寒咒', statusToApply: { type: 'freeze', duration: 2, value: 3 } },
                'Thunder': { name: '雷咒', statusToApply: { type: 'shock', duration: 1, value: 0 } },
                'Venom': { name: '剧毒咒', statusToApply: { type: 'poison', duration: 4, value: 4 } },
            }
        },
        {
            baseName: '奥术飞弹',
            baseSkill: { maxCd: 3, effectValue: 20 },
            variants: {
                'Fire': { name: '火焰飞弹', statusToApply: { type: 'burn', duration: 2, value: 4 } },
                'Ice': { name: '冰霜飞弹', statusToApply: { type: 'freeze', duration: 2, value: 1 } },
                'Thunder': { name: '闪电飞弹', statusToApply: { type: 'shock', duration: 1, value: 0 } },
                'Venom': { name: '剧毒飞弹', statusToApply: { type: 'poison', duration: 3, value: 3 } },
            }
        },
    ],
    'Conjurer': [
        {
            baseName: '秘术纸符',
            baseSkill: { maxCd: 4, effectValue: 25 },
            variants: {
                'Fire': { name: '炎咒', statusToApply: { type: 'burn', duration: 3, value: 6 } },
                'Ice': { name: '极寒咒', statusToApply: { type: 'freeze', duration: 2, value: 3 } },
                'Thunder': { name: '雷咒', statusToApply: { type: 'shock', duration: 1, value: 0 } },
                'Venom': { name: '剧毒咒', statusToApply: { type: 'poison', duration: 4, value: 4 } },
            }
        },
        {
            baseName: '召唤术',
            baseSkill: { maxCd: 5, effectValue: 35 },
            variants: {
                'Fire': { name: '召唤火灵', statusToApply: { type: 'burn', duration: 4, value: 7 } },
                'Ice': { name: '召唤冰灵', statusToApply: { type: 'freeze', duration: 3, value: 2 } },
                'Thunder': { name: '召唤雷灵', statusToApply: { type: 'shock', duration: 1, value: 0 } },
                'Venom': { name: '召唤毒灵', statusToApply: { type: 'poison', duration: 4, value: 5 } },
            }
        },
    ],
};

/**
 * DraftRegistry - 卡池注册表
 */
export class DraftRegistry {
    /**
     * 根据玩家职业和元素生成选秀池
     * 包含: 公共池 + 元素专属池 + 职业模板池(变异后)
     */
    public static generatePool(playerClass: ClassTag, playerElement: ElementTag): DraftChoice[] {
        const pool: DraftChoice[] = [];

        // 1. 公共装备池
        for (const equip of PUBLIC_EQUIPMENT_POOL) {
            pool.push({
                type: 'merchant_item',
                data: { equipment: { id: generateUid(), ...equip } },
                description: `📦 [${equip.name}] (${equip.type}, +${equip.value})`
            });
        }

        // 2. 公共技能池
        for (const skill of PUBLIC_SKILL_POOL) {
            pool.push({
                type: 'skill',
                data: { ...skill, id: generateUid(), currentCd: 0 },
                description: `✨ [${skill.name}] 伤害:${skill.effectValue} CD:${skill.maxCd}`
            });
        }

        // 3. 元素专属装备池
        const elementEquips = ELEMENT_EQUIPMENT_POOL[playerElement];
        for (const equip of elementEquips) {
            pool.push({
                type: 'merchant_item',
                data: { equipment: { id: generateUid(), ...equip } },
                description: `🔥 [${equip.name}] (${playerElement}专属) ${equip.type}, +${equip.value}`
            });
        }

        // 4. 元素专属技能池
        const elementSkills = ELEMENT_SKILL_POOL[playerElement];
        for (const skill of elementSkills) {
            pool.push({
                type: 'skill',
                data: { ...skill, id: generateUid(), currentCd: 0 },
                description: `🔥 [${skill.name}] (${playerElement}专属) 伤害:${skill.effectValue}`
            });
        }

        // 5. 职业模板池 - 核心变异系统
        const classTemplates = CLASS_TEMPLATE_POOL[playerClass];
        for (const template of classTemplates) {
            // 根据玩家元素进行变异
            const variant = template.variants[playerElement];
            if (variant) {
                const mutatedSkill: RunSkill = {
                    id: generateUid(),
                    name: variant.name,  // 变异后的名字
                    maxCd: template.baseSkill.maxCd,
                    currentCd: 0,
                    effectValue: template.baseSkill.effectValue,
                    statusToApply: variant.statusToApply  // 变异后的状态效果
                };

                pool.push({
                    type: 'skill',
                    data: mutatedSkill,
                    description: `🎭 [${template.baseName}] → [${variant.name}] (${playerElement}变异) 伤害:${template.baseSkill.effectValue}`
                });
            }
        }

        // 6. 添加升星选项
        pool.push({
            type: 'star_up',
            data: { starBonus: 0.1 },
            description: `⭐ 星级提升 (+10% 属性倍率)`
        });

        return pool;
    }

    /**
     * 根据玩家属性抽取3个选项 - 优先保证有变异技能
     */
    public static drawThreeChoices(playerClass: ClassTag, playerElement: ElementTag): DraftChoice[] {
        const pool = this.generatePool(playerClass, playerElement);
        
        // 分离不同类型的选项
        const mutatedSkills = pool.filter(c => c.type === 'skill' && c.description.includes('变异'));
        const otherOptions = pool.filter(c => !(c.type === 'skill' && c.description.includes('变异')));
        
        // 确保至少1个变异技能
        const result: DraftChoice[] = [];
        
        if (mutatedSkills.length > 0) {
            // 随机选1个变异技能
            const mutated = mutatedSkills[Math.floor(Math.random() * mutatedSkills.length)];
            result.push(mutated);
        }
        
        // 随机补满2个其他选项
        const shuffled = [...otherOptions].sort(() => Math.random() - 0.5);
        result.push(...shuffled.slice(0, 2));
        
        // 再次洗牌
        return result.sort(() => Math.random() - 0.5);
    }
}
