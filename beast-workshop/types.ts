// 全局数据类型定义 - Phase X 终极羁绊版 (兼容性更新)

export type ClassTag = 'Striker' | 'Caster' | 'Conjurer';
export type ElementTag = 'Fire' | 'Ice' | 'Thunder' | 'Venom';

export const GAME_CONFIG = {
    gridSize: 25,
    workstationSlots: 4,
    maxStages: 10,
    draftStages: [1, 4, 7],
    dropStages: [2, 3, 6, 9],
    merchantStages: [5, 8],
    rerollCost: 50,
    baseChestCost: 100
};

export interface MetaState {
    gold: number;
    chests: number;
    lastOfflineTime: number;
    talents: Record<string, number>;
}

export interface WorkerBeast {
    uid: string;
    class: ClassTag;
    element: ElementTag;
    starLevel: number;
    baseHp: number;
    baseAttack: number;
    workPower: number;
    isMercenary?: boolean;
}

export interface GridCell {
    index: number;
    beast: WorkerBeast | null;
}

export interface StatusEffect {
    type: 'burn' | 'freeze' | 'poison' | 'shock' | 'stun';
    duration: number;
    value: number;
}

// Phase X 召唤物实体
export interface SummonEntity {
    id: string;
    name: string;
    maxHp: number;
    currentHp: number;
    baseAttack: number;
    attackCd: number;
    currentAttackCd: number;
    attackSpeed?: number;
    onAttackEffect?: (target: ActiveRunEntity, battle: any) => void;
    onDeathEffect?: (owner: ActiveRunEntity, enemy: ActiveRunEntity, battle: any) => void;
    hasThorns?: boolean;
    poisonChance?: number;
    burnDamage?: number;
    isSelfDestruct?: boolean;
    selfDestructDamage?: number;
}

// Phase X 技能类型
export type SkillType = 'damage' | 'heal' | 'summon' | 'passive' | undefined;

// Phase X 技能 (兼容旧版)
export interface RunSkill {
    id: string;
    name: string;
    type?: SkillType;  // 改为可选，兼容旧代码
    maxCd: number;
    currentCd: number;
    effectValue: number;
    // 可选扩展属性
    onPassiveTick?: (self: ActiveRunEntity, enemy: ActiveRunEntity, battle: any) => void;
    summonTemplate?: SummonEntity;
    statusToApply?: StatusEffect;
    isCharged?: boolean;
    chargeCount?: number;
    damageAmplifyStack?: number;
    isUltimateForm?: boolean;
    stunChance?: number;
    cooldownResetChance?: number;
    lifestealSteal?: number;
    maxHpSteal?: number;
    atkSteal?: number;
    multiHit?: number;
    trueDamage?: number;
    cdExtension?: number;
    timeStopDuration?: number;
    tickDamage?: number;
}

export interface RunEquipment {
    id: string;
    name: string;
    type: 'attack_boost' | 'hp_boost' | 'lifesteal' | 'merchant_cursed';
    value: number;
}

export type EliteAffixType = 'armored' | 'thorns' | 'regen' | 'berserk';

// Phase X 实体 (兼容旧版)
export interface ActiveRunEntity {
    class: ClassTag;
    element: ElementTag;
    starLevel: number;
    maxHp: number;
    currentHp: number;
    baseAttack: number;
    skills: RunSkill[];
    equipments: RunEquipment[];
    effects: StatusEffect[];
    isBoss?: boolean;
    eliteAffixes?: EliteAffixType[];
    // 可选扩展属性
    summon?: SummonEntity | null;
    passiveSkills?: RunSkill[];
    isTimeStopped?: boolean;
    timeStopRemaining?: number;
    permanentDamageAmp?: number;
    permanentMaxHpSteal?: number;
    permanentAtkSteal?: number;
}

export type DraftChoiceType = 'star_up' | 'skill' | 'merchant_item';

export interface DraftChoice {
    type: DraftChoiceType;
    data: any;
    description: string;
    cost?: number;
}

// Phase X 羁绊配方
export interface SynergyRecipe {
    id: string;
    requiredClass: ClassTag;
    requiredElement: ElementTag;
    requiredSkillId: string;
    requiredEquipId: string;
    evolvedSkill: RunSkill;
    description: string;
}

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateUid(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}