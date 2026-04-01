/**
 * EventManager - 简单的事件系统
 * 用于 View-Model 通信
 */
export type EventCallback = (...args: any[]) => void;

export class EventManager {
    private listeners: Record<string, EventCallback[]> = {};

    public on(event: string, callback: EventCallback): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    public off(event: string, callback: EventCallback): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    public emit(event: string, ...args: any[]): void {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(cb => cb(...args));
    }

    public clear(): void {
        this.listeners = {};
    }
}

// 全局事件总线
export const gameEvents = new EventManager();

// 事件名称常量
export const GameEvents = {
    // 资源变化
    GOLD_CHANGED: 'gold_changed',
    CHESTS_CHANGED: 'chests_changed',
    TALENT_CHANGED: 'talent_changed',
    
    // 网格变化
    GRID_UPDATED: 'grid_updated',
    WORKSTATION_UPDATED: 'workstation_updated',
    
    // 战斗相关
    BATTLE_START: 'battle_start',
    BATTLE_TICK: 'battle_tick',
    BATTLE_END: 'battle_end',
    
    // 选秀/商人
    DRAFT_OPEN: 'draft_open',
    MERCHANT_OPEN: 'merchant_open',
    DRAFT_SELECTED: 'draft_selected',
    
    // 阶段变化
    STAGE_CHANGED: 'stage_changed',
    RUN_START: 'run_start',
    RUN_END: 'run_end',
    
    // 视图切换
    VIEW_SWITCH: 'view_switch',
    
    // 合并
    MERGE_SUCCESS: 'merge_success',
    MERGE_FAILED: 'merge_failed',
    
    // 开箱
    CHEST_OPENED: 'chest_opened',
} as const;