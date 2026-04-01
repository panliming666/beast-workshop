/**
 * DraftRegistry - 三层卡池与元素变异系统
 * 公共池 + 元素池 + 职业池(变异模板)
 */
import { RunSkill, RunEquipment, DraftChoice, DraftChoiceType, ClassTag, ElementTag, StatusEffect, randomElement, generateUid } from './types';
import { MetaGameManager } from './MetaGameManager';

// ========== 1. 简单数值遗物池 (RunEquipment) ==========
export const PUBLIC_EQUIPMENT_POOL: Omit<RunEquipment, 'id'>[] = [
    // 基础血量
    { name: '巨人腰带', type: 'hp_boost', value: 300 },
    { name: '巨魔之血', type: 'hp_boost', value: 600 },
    { name: '泰坦之心', type: 'hp_boost', value: 1200 },
    { name: '生命护符', type: 'hp_boost', value: 500 },
    { name: '龙鳞胸甲', type: 'hp_boost', value: 800 },
    
    // 基础攻击
    { name: '生锈的铁剑', type: 'attack_boost', value: 10 },
    { name: '暴风大剑', type: 'attack_boost', value: 30 },
    { name: '斩魔长刀', type: 'attack_boost', value: 80 },
    { name: '力量之剑', type: 'attack_boost', value: 15 },
    { name: '穿刺者', type: 'attack_boost', value: 50 },
    
    // 吸血组件
    { name: '多兰之刃', type: 'lifesteal', value: 5 },
    { name: '吸血鬼面具', type: 'lifesteal', value: 15 },
    { name: '饮血镰刀', type: 'lifesteal', value: 30 },
    { name: '血之分身', type: 'lifesteal', value: 25 },
    { name: '暮光之刃', type: 'lifesteal', value: 40 },
    
    // 诅咒/特殊
    { name: '诅咒之镜', type: 'merchant_cursed', value: 20 },
    { name: '暗影斗篷', type: 'merchant_cursed', value: 35 },
    { name: '恶魔印记', type: 'merchant_cursed', value: 50 },
];

// ========== 2. 机制型与经济联动遗物池 (作为 Passive Skill 实现) ==========
export const PUBLIC_SKILL_POOL: Partial<RunSkill>[] = [
    // 原有基础主动技能
    { name: '火球术', type: 'damage', maxCd: 4, effectValue: 25, statusToApply: { type: 'burn', duration: 3, value: 5 } },
    { name: '冰枪术', type: 'damage', maxCd: 3, effectValue: 20, statusToApply: { type: 'freeze', duration: 2, value: 3 } },
    { name: '雷击', type: 'damage', maxCd: 5, effectValue: 30, statusToApply: { type: 'shock', duration: 1, value: 0 } },
    { name: '治疗术', type: 'heal', maxCd: 6, effectValue: 30 },
    { name: '重击', type: 'damage', maxCd: 3, effectValue: 35 },

    // --- 新增【机制型被动遗物】 ---

    // 【经济联动系】
    {
        name: '【遗物】紫金算盘',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            const gold = MetaGameManager.getInstance().metaState.gold;
            const extraDmg = Math.floor(gold / 100);
            if (self.passiveSkills) {
                self.passiveSkills.forEach((s: any) => {
                    if (s.name === '【遗物】紫金算盘') {
                        s.effectValue = extraDmg;
                    }
                });
            }
        }
    },
    {
        name: '【遗物】赏金猎人执照',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any, enemy: any) => {
            if (enemy.isBoss) {
                if (!self.eliteAffixes) self.eliteAffixes = [];
                if (!self.eliteAffixes.includes('berserk')) self.eliteAffixes.push('berserk');
            }
        }
    },
    {
        name: '【遗物】财富金币',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: () => {
            // 每5秒(10 tick)获得10金币 - 需要在引擎外处理，这里简单处理为每次触发
            MetaGameManager.getInstance().metaState.gold += 1;
        }
    },

    // 【精英词条赋予系】
    {
        name: '【遗物】荆棘胸甲',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            if (!self.eliteAffixes) self.eliteAffixes = [];
            if (!self.eliteAffixes.includes('thorns')) self.eliteAffixes.push('thorns');
        }
    },
    {
        name: '【遗物】坚韧壁垒',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            if (!self.eliteAffixes) self.eliteAffixes = [];
            if (!self.eliteAffixes.includes('armored')) self.eliteAffixes.push('armored');
        }
    },
    {
        name: '【遗物】狂战士面甲',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            if (!self.eliteAffixes) self.eliteAffixes = [];
            if (!self.eliteAffixes.includes('berserk')) self.eliteAffixes.push('berserk');
        }
    },
    {
        name: '【遗物】复苏绿叶',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            if (!self.eliteAffixes) self.eliteAffixes = [];
            if (!self.eliteAffixes.includes('regen')) self.eliteAffixes.push('regen');
        }
    },

    // 【双刃剑与极限机制系】
    {
        name: '【遗物】破釜沉舟',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            // 首次触发时，将最大HP的一半转化为攻击力
            if ((self as any)._破釜沉舟已触发) return;
            (self as any)._破釜沉舟已触发 = true;
            const transfer = Math.floor(self.maxHp * 0.5);
            self.baseAttack += transfer;
            self.maxHp -= transfer;
            self.currentHp = Math.min(self.currentHp, self.maxHp);
        }
    },
    {
        name: '【遗物】玻璃渣',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            // 普攻变为2连击，但每次自己扣5血
            if (self.passiveSkills) {
                self.passiveSkills.forEach((s: any) => {
                    if (s.name === '【遗物】玻璃渣') {
                        s.multiHit = 2;
                    }
                });
            }
            self.currentHp = Math.max(1, self.currentHp - 5);
        }
    },

    // 【特殊机制系】
    {
        name: '【遗物】闪电护符',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any, enemy: any) => {
            // 攻击有20%概率造成2倍伤害
            if (Math.random() < 0.2) {
                if (!self.eliteAffixes) self.eliteAffixes = [];
                if (!self.eliteAffixes.includes('berserk')) self.eliteAffixes.push('berserk');
            }
        }
    },
    {
        name: '【遗物】反甲斗篷',
        type: 'passive',
        maxCd: 0, effectValue: 0,
        onPassiveTick: (self: any) => {
            // 受到伤害时，反弹10%给敌人
            if (!self.eliteAffixes) self.eliteAffixes = [];
            if (!self.eliteAffixes.includes('thorns')) self.eliteAffixes.push('thorns');
        }
    },
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

export const ELEMENT_SKILL_POOL: Record<ElementTag, Partial<RunSkill>[]> = {
    'Fire': [
        { name: '炎爆术', type: 'damage', maxCd: 5, effectValue: 40, statusToApply: { type: 'burn', duration: 4, value: 8 } },
    ],
    'Ice': [
        { name: '冰封术', type: 'damage', maxCd: 4, effectValue: 25, statusToApply: { type: 'freeze', duration: 3, value: 2 } },
    ],
    'Thunder': [
        { name: '连锁闪电', type: 'damage', maxCd: 4, effectValue: 35, statusToApply: { type: 'shock', duration: 1, value: 0 } },
    ],
    'Venom': [
        { name: '剧毒喷雾', type: 'damage', maxCd: 4, effectValue: 22, statusToApply: { type: 'poison', duration: 3, value: 6 } },
    ],
};

// ========== 职业模板池 (变异系统核心) ==========
export interface ClassTemplate {
    baseName: string;
    baseSkill: Partial<RunSkill>;
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
     */
    public static generatePool(playerClass: ClassTag, playerElement: ElementTag): DraftChoice[] {
        const pool: DraftChoice[] = [];

        // 1. 公共装备池
        for (const equip of PUBLIC_EQUIPMENT_POOL) {
            const isRelic = equip.name.includes('【遗物】');
            pool.push({
                type: 'merchant_item',
                data: { equipment: { id: generateUid(), ...equip } },
                description: isRelic ? `🔮 [${equip.name}] (被动机制遗物)` : `📦 [${equip.name}] +${equip.value}`
            });
        }

        // 2. 公共技能池
        for (const skill of PUBLIC_SKILL_POOL) {
            const skillName = skill.name || '未知技能';
            const isRelic = skillName.includes('【遗物】');
            if (isRelic) {
                pool.push({
                    type: 'skill',
                    data: { ...skill, id: generateUid(), currentCd: 0, name: skillName },
                    description: `🔮 [${skillName}] (被动机制遗物)`
                });
            } else {
                pool.push({
                    type: 'skill',
                    data: { ...skill, id: generateUid(), currentCd: 0, name: skillName },
                    description: `✨ [${skillName}] 伤害:${skill.effectValue} CD:${skill.maxCd}`
                });
            }
        }

        // 3. 元素专属装备池
        const elementEquips = ELEMENT_EQUIPMENT_POOL[playerElement];
        for (const equip of elementEquips) {
            pool.push({
                type: 'merchant_item',
                data: { equipment: { id: generateUid(), ...equip } },
                description: `🔥 [${equip.name}] (${playerElement}专属) +${equip.value}`
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
            const variant = template.variants[playerElement];
            if (variant) {
                const mutatedSkill: RunSkill = {
                    id: generateUid(),
                    name: variant.name,
                    maxCd: template.baseSkill.maxCd || 4,
                    currentCd: 0,
                    effectValue: template.baseSkill.effectValue || 25,
                    statusToApply: variant.statusToApply
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
     * 根据玩家属性抽取3个选项 - 优先保证有变异技能和遗物
     */
    public static drawThreeChoices(playerClass: ClassTag, playerElement: ElementTag): DraftChoice[] {
        const pool = this.generatePool(playerClass, playerElement);
        
        // 分离选项
        const mutatedSkills = pool.filter(c => c.type === 'skill' && c.description.includes('变异'));
        const relicOptions = pool.filter(c => c.type === 'skill' && c.description.includes('【遗物】'));
        const otherOptions = pool.filter(c => !(c.type === 'skill' && (c.description.includes('变异') || c.description.includes('【遗物】'))));
        
        const result: DraftChoice[] = [];
        
        // 1. 确保1个变异技能
        if (mutatedSkills.length > 0) {
            result.push(mutatedSkills[Math.floor(Math.random() * mutatedSkills.length)]);
        }
        
        // 2. 确保1个遗物
        if (relicOptions.length > 0) {
            result.push(relicOptions[Math.floor(Math.random() * relicOptions.length)]);
        }
        
        // 3. 补满其他选项
        const remaining = [...otherOptions, ...mutatedSkills, ...relicOptions].filter(c => !result.includes(c));
        const shuffled = remaining.sort(() => Math.random() - 0.5);
        result.push(...shuffled.slice(0, 3 - result.length));
        
        // 洗牌
        return result.sort(() => Math.random() - 0.5);
    }
}
