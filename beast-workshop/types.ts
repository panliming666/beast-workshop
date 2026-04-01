// 全局数据类型定义 - 严格遵循数据字典

// 职业标签
export type ClassTag = 'Striker' | 'Caster' | 'Conjurer';  // 强袭者(战) | 秘术师(法) | 唤灵者(道)

// 元素标签
export type ElementTag = 'Fire' | 'Ice' | 'Thunder' | 'Venom';  // 火 | 冰 | 雷 | 毒

// 游戏配置
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

// 元游戏状态
export interface MetaState {
    gold: number;
    chests: number;
    lastOfflineTime: number;
    talents: Record<string, number>;  // 天赋树等级
}

// worker 幻兽（网格中）
export interface WorkerBeast {
    uid: string;
    class: ClassTag;
    element: ElementTag;
    starLevel: number;
    baseHp: number;
    baseAttack: number;
    workPower: number;
    isMercenary?: boolean;  // 系统生成的保底幻兽
}

// 网格单元格
export interface GridCell {
    index: number;
    beast: WorkerBeast | null;
}

// 状态效果
export interface StatusEffect {
    type: 'burn' | 'freeze' | 'poison' | 'shock';
    duration: number;
    value: number;
}

// 局内技能
export interface RunSkill {
    id: string;
    name: string;
    maxCd: number;
    currentCd: number;
    effectValue: number;
    statusToApply?: StatusEffect;
}

// 局内装备
export interface RunEquipment {
    id: string;
    name: string;
    type: 'attack_boost' | 'hp_boost' | 'lifesteal' | 'merchant_cursed';
    value: number;
}

// 精英怪物词缀
export type EliteAffixType = 'armored' | 'thorns' | 'regen' | 'berserk';

// 局内实体（玩家/敌人）
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
}

// 选秀选项类型
export type DraftChoiceType = 'star_up' | 'skill' | 'merchant_item';

// 选秀选项
export interface DraftChoice {
    type: DraftChoiceType;
    data: any;
    description: string;
    cost?: number;
}

// 随机工具函数
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateUid(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}
