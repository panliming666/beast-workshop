/**
 * SynergyRegistry - 终极羁绊与职业觉醒引擎
 * 12套完整的元素觉醒配方
 */
import { RunSkill, SummonEntity, SynergyRecipe, ClassTag, ElementTag, generateUid } from './types';

// ========== 基础技能 ID 常量 ==========
const SKILL_IDS = {
    // 唤灵者基础技能
    SUMMON_SKELETON: 'skill_summon_skeleton',
    SUMMON_FIRE_SPIRIT: 'skill_summon_fire_spirit',
    SUMMON_THUNDER_BEAST: 'skill_summon_thunder_beast',
    SUMMON_YETI: 'skill_summon_yeti',
    
    // 强袭者基础技能
    FLAMING_SWORD: 'skill_flaming_sword',
    HALF_MOON_BLADE: 'skill_half_moon_blade',
    ASSASSINATE_BLADE: 'skill_assassinate_blade',
    ATTACK_BLADE: 'skill_attack_blade',
    
    // 秘术师基础技能
    THUNDER_STRIKE: 'skill_thunder_strike',
    BURST_FIRE: 'skill_burst_fire',
    ICE_ROAR: 'skill_ice_roar',
    ACID_SPLASH: 'skill_acid_splash',
};

// ========== 装备 ID 常量 ==========
const EQUIP_IDS = {
    // 唤灵者专属
    PANLONG_STAFF: 'equip_panlong_staff',
    CORE_FURNACE: 'equip_core_furnace',
    EYE_OF_STORM: 'equip_eye_of_storm',
    EXTREME_ICE: 'equip_extreme_ice',
    
    // 强袭者专属
    PARALYZE_RING: 'equip_paralyze_ring',
    GALE_NECKLACE: 'equip_gale_necklace',
    SNOW_ARMOR: 'equip_snow_armor',
    BLOOD_SWORD: 'equip_blood_sword',
    
    // 秘术师专属
    PRAYER_RING: 'equip_prayer_ring',
    DRAGON_BRACELET: 'equip_dragon_bracelet',
    PROTECTION_RING: 'equip_protection_ring',
    TOXIC_ROBE: 'equip_toxic_robe',
};

// ========== 12套羁绊配方 ==========
export const SYNERGY_RECIPES: SynergyRecipe[] = [
    // ========== A. 唤灵者 (Conjurer) - 核心机制：实体召唤进化 ==========
    
    // A1. 毒系 (Venom)：召唤龙骨骷髅
    {
        id: 'synergy_conjurer_venom_1',
        requiredClass: 'Conjurer',
        requiredElement: 'Venom',
        requiredSkillId: SKILL_IDS.SUMMON_SKELETON,
        requiredEquipId: EQUIP_IDS.PANLONG_STAFF,
        description: '【召唤龙骨骷髅】- 召唤物攻击极快，每次攻击附加 poison',
        evolvedSkill: {
            id: 'skill_ultimate_skeleton_king',
            name: '召唤龙骨骷髅',
            type: 'summon',
            maxCd: 8,
            currentCd: 0,
            effectValue: 25,
            isUltimateForm: true,
            summonTemplate: {
                id: 'summon_skeleton_king',
                name: '龙骨骷髅',
                maxHp: 150,
                currentHp: 150,
                baseAttack: 15,
                attackCd: 2,
                currentAttackCd: 0,
                attackSpeed: 2,  // 极快攻速
                poisonChance: 100  // 100% 中毒
            }
        }
    },
    
    // A2. 火系 (Fire)：召唤远古炎魔
    {
        id: 'synergy_conjurer_fire_1',
        requiredClass: 'Conjurer',
        requiredElement: 'Fire',
        requiredSkillId: SKILL_IDS.SUMMON_FIRE_SPIRIT,
        requiredEquipId: EQUIP_IDS.CORE_FURNACE,
        description: '【召唤远古炎魔】- 召唤物攻击附带高层数 burn，死亡时自爆',
        evolvedSkill: {
            id: 'skill_ultimate_ancient_fire_demon',
            name: '召唤远古炎魔',
            type: 'summon',
            maxCd: 10,
            currentCd: 0,
            effectValue: 35,
            isUltimateForm: true,
            summonTemplate: {
                id: 'summon_ancient_fire_demon',
                name: '远古炎魔',
                maxHp: 250,
                currentHp: 250,
                baseAttack: 25,
                attackCd: 3,
                currentAttackCd: 0,
                attackSpeed: 1,
                burnDamage: 10,
                isSelfDestruct: true,
                selfDestructDamage: 0.5  // 50% 最大HP真实伤害
            }
        }
    },
    
    // A3. 雷系 (Thunder)：召唤圣兽麒麟
    {
        id: 'synergy_conjurer_thunder_1',
        requiredClass: 'Conjurer',
        requiredElement: 'Thunder',
        requiredSkillId: SKILL_IDS.SUMMON_THUNDER_BEAST,
        requiredEquipId: EQUIP_IDS.EYE_OF_STORM,
        description: '【召唤圣兽麒麟】- 30% 概率附加 shock 打断行动',
        evolvedSkill: {
            id: 'skill_ultimate_holy_qilin',
            name: '召唤圣兽麒麟',
            type: 'summon',
            maxCd: 9,
            currentCd: 0,
            effectValue: 30,
            isUltimateForm: true,
            summonTemplate: {
                id: 'summon_holy_qilin',
                name: '圣兽麒麟',
                maxHp: 200,
                currentHp: 200,
                baseAttack: 20,
                attackCd: 3,
                currentAttackCd: 0,
                attackSpeed: 1.5,
                onAttackEffect: (target, battle) => {
                    // 30% 概率触发 shock
                    if (Math.random() < 0.3) {
                        target.effects.push({
                            type: 'shock',
                            duration: 1,
                            value: 0
                        });
                    }
                }
            }
        }
    },
    
    // A4. 冰系 (Ice)：召唤冰霜巨兽
    {
        id: 'synergy_conjurer_ice_1',
        requiredClass: 'Conjurer',
        requiredElement: 'Ice',
        requiredSkillId: SKILL_IDS.SUMMON_YETI,
        requiredEquipId: EQUIP_IDS.EXTREME_ICE,
        description: '【召唤冰霜巨兽】- 全游戏最高血量召唤物，自带 thorns',
        evolvedSkill: {
            id: 'skill_ultimate_frost_giant',
            name: '召唤冰霜巨兽',
            type: 'summon',
            maxCd: 12,
            currentCd: 0,
            effectValue: 40,
            isUltimateForm: true,
            summonTemplate: {
                id: 'summon_frost_giant',
                name: '冰霜巨兽',
                maxHp: 500,  // 全游戏最高血量
                currentHp: 500,
                baseAttack: 18,
                attackCd: 4,
                currentAttackCd: 0,
                attackSpeed: 0.8,
                hasThorns: true  // 荆棘反伤
            }
        }
    },
    
    // ========== B. 强袭者 (Striker) - 核心机制：普攻质变 ==========
    
    // B1. 火系 (Fire)：麻痹·烈火刀法
    {
        id: 'synergy_striker_fire_1',
        requiredClass: 'Striker',
        requiredElement: 'Fire',
        requiredSkillId: SKILL_IDS.FLAMING_SWORD,
        requiredEquipId: EQUIP_IDS.PARALYZE_RING,
        description: '【麻痹·烈火刀法】- passive，普攻额外附带真实伤害，10% shock',
        evolvedSkill: {
            id: 'skill_ultimate_paralysis_flame_blade',
            name: '麻痹·烈火刀法',
            type: 'passive',
            maxCd: 0,
            currentCd: 0,
            effectValue: 15,
            isUltimateForm: true,
            trueDamage: 15,
            stunChance: 0.1,
            onPassiveTick: (self, enemy, battle) => {
                // 10% 概率使敌方 shock
                if (Math.random() < 0.1) {
                    enemy.effects.push({ type: 'shock', duration: 1, value: 0 });
                }
            }
        }
    },
    
    // B2. 雷系 (Thunder)：雷霆·狂风快剑
    {
        id: 'synergy_striker_thunder_1',
        requiredClass: 'Striker',
        requiredElement: 'Thunder',
        requiredSkillId: SKILL_IDS.HALF_MOON_BLADE,
        requiredEquipId: EQUIP_IDS.GALE_NECKLACE,
        description: '【雷霆·狂风快剑】- passive，普攻变为 5 连击，20% 重置技能 CD',
        evolvedSkill: {
            id: 'skill_ultimate_thunder_gale_blade',
            name: '雷霆·狂风快剑',
            type: 'passive',
            maxCd: 0,
            currentCd: 0,
            effectValue: 8,
            isUltimateForm: true,
            multiHit: 5,  // 5连击
            cooldownResetChance: 0.2,
            onPassiveTick: (self, enemy, battle) => {
                // 20% 概率重置自身所有主动技能 CD
                if (Math.random() < 0.2) {
                    self.skills.forEach(skill => {
                        if (skill.type !== 'passive') {
                            skill.currentCd = 0;
                        }
                    });
                }
            }
        }
    },
    
    // B3. 冰系 (Ice)：绝对零度·破冰斩
    {
        id: 'synergy_striker_ice_1',
        requiredClass: 'Striker',
        requiredElement: 'Ice',
        requiredSkillId: SKILL_IDS.ASSASSINATE_BLADE,
        requiredEquipId: EQUIP_IDS.SNOW_ARMOR,
        description: '【绝对零度·破冰斩】- passive，无视减伤，freeze 时转化为 HP',
        evolvedSkill: {
            id: 'skill_ultimate_absolute_zero',
            name: '绝对零度·破冰斩',
            type: 'passive',
            maxCd: 0,
            currentCd: 0,
            effectValue: 20,
            isUltimateForm: true,
            trueDamage: 20,
            // 特殊逻辑在战斗引擎中处理
            onPassiveTick: (self, enemy, battle) => {
                // 如果敌方处于 freeze 状态
                const freezeEffect = enemy.effects.find(e => e.type === 'freeze');
                if (freezeEffect) {
                    // 将敌方被延长的 CD 数值转化为自身最大生命值
                    const cdToHp = freezeEffect.value * 10;
                    self.maxHp += cdToHp;
                    self.currentHp += cdToHp;
                }
            }
        }
    },
    
    // B4. 毒系 (Venom)：猩红·饮血剑
    {
        id: 'synergy_striker_venom_1',
        requiredClass: 'Striker',
        requiredElement: 'Venom',
        requiredSkillId: SKILL_IDS.ATTACK_BLADE,
        requiredEquipId: EQUIP_IDS.BLOOD_SWORD,
        description: '【猩红·饮血剑】- passive，每 tick 扣除自身 5% 造成伤害，poison 层数越高吸血越高',
        evolvedSkill: {
            id: 'skill_ultimate_blood_drinker',
            name: '猩红·饮血剑',
            type: 'passive',
            maxCd: 0,
            currentCd: 0,
            effectValue: 0,
            isUltimateForm: true,
            tickDamage: 0.05,  // 5% 自身最大HP
            lifestealSteal: 50,  // 50% 吸血
            onPassiveTick: (self, enemy, battle) => {
                // 每 tick 扣除自身 5% 最大生命值
                const selfDamage = Math.floor(self.maxHp * 0.05);
                self.currentHp = Math.max(1, self.currentHp - selfDamage);
                
                // 计算 poison 总层数
                let poisonStacks = 0;
                enemy.effects.forEach(e => {
                    if (e.type === 'poison') poisonStacks += e.value;
                });
                
                // 造成伤害 = 基础 + poison层数
                const totalDamage = selfDamage + poisonStacks;
                enemy.currentHp = Math.max(0, enemy.currentHp - totalDamage);
                
                // 吸血 = 伤害 * 50%
                const heal = Math.floor(totalDamage * 0.5);
                self.currentHp = Math.min(self.maxHp, self.currentHp + heal);
            }
        }
    },
    
    // ========== C. 秘术师 (Caster) - 核心机制：法术规则改写 ==========
    
    // C1. 雷系 (Thunder)：天罚·狂雷紫电
    {
        id: 'synergy_caster_thunder_1',
        requiredClass: 'Caster',
        requiredElement: 'Thunder',
        requiredSkillId: SKILL_IDS.THUNDER_STRIKE,
        requiredEquipId: EQUIP_IDS.PRAYER_RING,
        description: '【天罚·狂雷紫电】- 80% 概率瞬间清空 CD，实现无限连击',
        evolvedSkill: {
            id: 'skill_ultimate_divine_thunder',
            name: '天罚·狂雷紫电',
            type: 'damage',
            maxCd: 5,
            currentCd: 0,
            effectValue: 40,
            isUltimateForm: true,
            cooldownResetChance: 0.8  // 80% 概率清空 CD
        }
    },
    
    // C2. 火系 (Fire)：灭世·流星火雨
    {
        id: 'synergy_caster_fire_1',
        requiredClass: 'Caster',
        requiredElement: 'Fire',
        requiredSkillId: SKILL_IDS.BURST_FIRE,
        requiredEquipId: EQUIP_IDS.DRAGON_BRACELET,
        description: '【灭世·流星火雨】- 充能机制，后续火焰伤害永久 +10%',
        evolvedSkill: {
            id: 'skill_ultimate_meteor_swarm',
            name: '灭世·流星火雨',
            type: 'damage',
            maxCd: 8,
            currentCd: 0,
            effectValue: 50,
            isUltimateForm: true,
            isCharged: true,
            chargeCount: 3,
            damageAmplifyStack: 0.1  // 每次充能 +10% 伤害
        }
    },
    
    // C3. 冰系 (Ice)：时空·极寒领域
    {
        id: 'synergy_caster_ice_1',
        requiredClass: 'Caster',
        requiredElement: 'Ice',
        requiredSkillId: SKILL_IDS.ICE_ROAR,
        requiredEquipId: EQUIP_IDS.PROTECTION_RING,
        description: '【时空·极寒领域】- CD 延长超过 10 时触发时停',
        evolvedSkill: {
            id: 'skill_ultimate_frozen_realm',
            name: '时空·极寒领域',
            type: 'damage',
            maxCd: 6,
            currentCd: 0,
            effectValue: 30,
            isUltimateForm: true,
            cdExtension: 5,
            timeStopDuration: 5,
            onPassiveTick: (self, enemy, battle) => {
                // 检查是否有技能被延长超过 10 tick
                let extendedSkillFound = false;
                enemy.skills.forEach(skill => {
                    if (skill.currentCd > 10) {
                        extendedSkillFound = true;
                    }
                });
                
                // 触发时停
                if (extendedSkillFound && !enemy.isTimeStopped) {
                    enemy.isTimeStopped = true;
                    enemy.timeStopRemaining = 5;
                }
                
                // 时停递减
                if (enemy.isTimeStopped && enemy.timeStopRemaining !== undefined) {
                    enemy.timeStopRemaining--;
                    if (enemy.timeStopRemaining <= 0) {
                        enemy.isTimeStopped = false;
                        enemy.timeStopRemaining = 0;
                    }
                }
            }
        }
    },
    
    // C4. 毒系 (Venom)：化尸·万毒噬心
    {
        id: 'synergy_caster_venom_1',
        requiredClass: 'Caster',
        requiredElement: 'Venom',
        requiredSkillId: SKILL_IDS.ACID_SPLASH,
        requiredEquipId: EQUIP_IDS.TOXIC_ROBE,
        description: '【化尸·万毒噬心】- 永久偷取敌方最大 HP 和攻击力',
        evolvedSkill: {
            id: 'skill_ultimate_corrosive_curse',
            name: '化尸·万毒噬心',
            type: 'damage',
            maxCd: 4,
            currentCd: 0,
            effectValue: 25,
            isUltimateForm: true,
            maxHpSteal: 10,  // 每次施法偷取 10% 最大HP
            atkSteal: 5,      // 每次施法偷取 5 点攻击力
            onPassiveTick: (self, enemy, battle) => {
                // 永久偷取
                if (enemy.maxHp > 50) {  // 保底
                    const stolenHp = Math.floor(enemy.maxHp * 0.05);
                    enemy.maxHp -= stolenHp;
                    self.maxHp += stolenHp;
                    self.currentHp = Math.min(self.maxHp, self.currentHp + stolenHp);
                }
                
                const stolenAtk = 2;
                enemy.baseAttack = Math.max(5, enemy.baseAttack - stolenAtk);
                self.baseAttack += stolenAtk;
            }
        }
    },
];

/**
 * 检查玩家是否可以触发羁绊进化
 */
export function checkSynergyEvolution(
    playerClass: ClassTag,
    playerElement: ElementTag,
    playerSkills: RunSkill[],
    playerEquips: { id: string }[]
): RunSkill | null {
    const skillIds = playerSkills.map(s => s.id);
    const equipIds = playerEquips.map(e => e.id);
    
    for (const recipe of SYNERGY_RECIPES) {
        // 检查职业和元素
        if (recipe.requiredClass !== playerClass || recipe.requiredElement !== playerElement) {
            continue;
        }
        
        // 检查是否有所需技能
        if (!skillIds.includes(recipe.requiredSkillId)) {
            continue;
        }
        
        // 检查是否有所需装备
        if (!equipIds.includes(recipe.requiredEquipId)) {
            continue;
        }
        
        // 找到匹配配方，返回进化后的技能
        return recipe.evolvedSkill;
    }
    
    return null;
}

/**
 * 获取某个职业+元素的所有配方
 */
export function getRecipesForClassAndElement(
    playerClass: ClassTag,
    playerElement: ElementTag
): SynergyRecipe[] {
    return SYNERGY_RECIPES.filter(
        r => r.requiredClass === playerClass && r.requiredElement === playerElement
    );
}

/**
 * 打印所有配方 (调试用)
 */
export function printAllRecipes(): void {
    console.log('\n========== 羁绊配方表 ==========');
    console.log(`总计: ${SYNERGY_RECIPES.length} 套配方\n`);
    
    const byClass: Record<string, SynergyRecipe[]> = {};
    SYNERGY_RECIPES.forEach(r => {
        if (!byClass[r.requiredClass]) byClass[r.requiredClass] = [];
        byClass[r.requiredClass].push(r);
    });
    
    for (const [cls, recipes] of Object.entries(byClass)) {
        console.log(`【${cls}】`);
        recipes.forEach(r => {
            console.log(`  ${r.requiredElement}: ${r.description}`);
        });
        console.log('');
    }
}
