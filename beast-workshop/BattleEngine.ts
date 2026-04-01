/**
 * BattleEngine - 自动战斗引擎
 * 基于 Tick 的纯逻辑战斗系统 - Phase 5 增强版 + Phase 8 精英词条
 * 支持: burn, poison, freeze, shock 状态异常结算
 * 支持: armored, thorns, regen, berserk 精英词条
 */
import { ActiveRunEntity, RunSkill, RunEquipment, StatusEffect, randomInt, randomElement, generateUid } from './types';

export interface BattleEvent {
    tick: number;
    source: string;
    target: string;
    type: 'attack' | 'skill' | 'heal' | 'effect' | 'status';
    message: string;
    damage?: number;
    heal?: number;
}

export interface BattleResult {
    winner: 'player' | 'enemy';
    totalTicks: number;
    events: BattleEvent[];
    playerFinalHp: number;
    enemyFinalHp: number;
}

export class BattleEngine {
    public player: ActiveRunEntity;
    public enemy: ActiveRunEntity;
    public tickCount: number = 0;
    public events: BattleEvent[] = [];
    public isFinished: boolean = false;
    public winner: 'player' | 'enemy' | null = null;

    private static readonly ATTACK_CD = 2;

    constructor(player: ActiveRunEntity, enemy: ActiveRunEntity) {
        this.player = player;
        this.enemy = enemy;
        
        (this.player as any)._attackCd = BattleEngine.ATTACK_CD;
        (this.enemy as any)._attackCd = BattleEngine.ATTACK_CD;
        (this.player as any)._nextAttackCancelled = false;
        (this.enemy as any)._nextAttackCancelled = false;
    }

    public tick(): void {
        if (this.isFinished) return;

        this.tickCount++;

        // Phase 5: 处理状态异常
        this.processStatusEffects(this.player, 'player');
        
        // Phase 8: 处理 regen 词条
        this.processRegenEffect(this.player, 'player');
        
        if (this.player.currentHp <= 0 || this.enemy.currentHp <= 0) {
            this.checkBattleEnd();
            return;
        }

        this.processEntityTurn(this.player, this.enemy, 'player');
        
        if (this.enemy.currentHp <= 0) {
            this.endBattle('player');
            return;
        }

        this.processStatusEffects(this.enemy, 'enemy');
        this.processRegenEffect(this.enemy, 'enemy');
        
        if (this.player.currentHp <= 0 || this.enemy.currentHp <= 0) {
            this.checkBattleEnd();
            return;
        }

        this.processEntityTurn(this.enemy, this.player, 'enemy');
        
        if (this.player.currentHp <= 0) {
            this.endBattle('enemy');
            return;
        }
    }

    private processRegenEffect(entity: ActiveRunEntity, entityName: string): void {
        if (entity.eliteAffixes?.includes('regen')) {
            const regenAmount = Math.floor(entity.maxHp * 0.02);
            if (regenAmount > 0) {
                const oldHp = entity.currentHp;
                entity.currentHp = Math.min(entity.maxHp, entity.currentHp + regenAmount);
                const actualRegen = entity.currentHp - oldHp;
                
                this.recordEvent({
                    tick: this.tickCount,
                    source: entityName,
                    target: entityName,
                    type: 'heal',
                    message: `💚 ${entityName} 恢复 ${actualRegen} HP (regen 2%)`
                });
            }
        }
    }

    private checkBattleEnd(): void {
        if (this.enemy.currentHp <= 0) {
            this.endBattle('player');
        } else if (this.player.currentHp <= 0) {
            this.endBattle('enemy');
        }
    }

    private processEntityTurn(attacker: ActiveRunEntity, defender: ActiveRunEntity, attackerName: string): void {
        const targetName = attackerName === 'player' ? 'enemy' : 'player';

        const nextAttackCancelled = (attacker as any)._nextAttackCancelled as boolean;
        if (nextAttackCancelled) {
            (attacker as any)._nextAttackCancelled = false;
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: attackerName,
                type: 'status',
                message: `💫 ${attackerName} 被电击眩晕，普攻被取消!`
            });
            return;
        }

        const readySkill = this.getReadySkill(attacker);
        if (readySkill) {
            this.executeSkill(attacker, defender, readySkill, attackerName, targetName);
            return;
        }

        const attackCd = (attacker as any)._attackCd as number;
        if (attackCd <= 0) {
            this.executeAttack(attacker, defender, attackerName, targetName);
            (attacker as any)._attackCd = BattleEngine.ATTACK_CD;
        } else {
            (attacker as any)._attackCd--;
        }
    }

    private getReadySkill(entity: ActiveRunEntity): RunSkill | null {
        for (const skill of entity.skills) {
            if (skill.currentCd <= 0) {
                return skill;
            }
        }
        return null;
    }

    private executeAttack(attacker: ActiveRunEntity, defender: ActiveRunEntity, attackerName: string, targetName: string): void {
        let totalAttack = attacker.baseAttack;
        for (const equip of attacker.equipments) {
            if (equip.type === 'attack_boost') {
                totalAttack += equip.value;
            }
        }

        // berserk 检查
        const hpPercent = defender.currentHp / defender.maxHp;
        if (defender.eliteAffixes?.includes('berserk') && hpPercent < 0.3) {
            totalAttack *= 2;
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'status',
                message: `💀 ${targetName} 进入狂暴状态! 伤害翻倍!`
            });
        }

        // armored 检查
        let actualDamage = totalAttack;
        if (defender.eliteAffixes?.includes('armored')) {
            actualDamage = Math.floor(actualDamage * 0.7);
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'effect',
                message: `🛡️ ${targetName} 的护甲生效! 伤害减免 30% (${totalAttack} → ${actualDamage})`
            });
        }

        defender.currentHp = Math.max(0, defender.currentHp - actualDamage);

        this.recordEvent({
            tick: this.tickCount,
            source: attackerName,
            target: targetName,
            type: 'attack',
            message: `⚔️ ${attackerName} 普攻 → ${targetName}`,
            damage: actualDamage
        });

        // thorns 检查
        if (defender.eliteAffixes?.includes('thorns')) {
            const reflectDamage = Math.floor(actualDamage * 0.1);
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage);
            this.recordEvent({
                tick: this.tickCount,
                source: targetName,
                target: attackerName,
                type: 'effect',
                message: `🌵 ${targetName} 反弹 ${reflectDamage} 伤害给 ${attackerName}!`
            });
        }

        this.processEquipEffects(attacker, actualDamage, attackerName);
    }

    private executeSkill(attacker: ActiveRunEntity, defender: ActiveRunEntity, skill: RunSkill, attackerName: string, targetName: string): void {
        let totalAttack = skill.effectValue;
        for (const equip of attacker.equipments) {
            if (equip.type === 'attack_boost') {
                totalAttack += equip.value;
            }
        }

        const hpPercent = defender.currentHp / defender.maxHp;
        if (defender.eliteAffixes?.includes('berserk') && hpPercent < 0.3) {
            totalAttack *= 2;
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'status',
                message: `💀 ${targetName} 进入狂暴状态! 伤害翻倍!`
            });
        }

        let actualDamage = totalAttack;
        if (defender.eliteAffixes?.includes('armored')) {
            actualDamage = Math.floor(actualDamage * 0.7);
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'effect',
                message: `🛡️ ${targetName} 的护甲生效! 伤害减免 30% (${totalAttack} → ${actualDamage})`
            });
        }

        defender.currentHp = Math.max(0, defender.currentHp - actualDamage);

        if (skill.statusToApply) {
            defender.effects.push({ ...skill.statusToApply });
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'status',
                message: `🩸 ${attackerName} 对 ${targetName} 施加了 [${skill.statusToApply.type}] 状态!`
            });
        }

        skill.currentCd = skill.maxCd;

        let msg = `✨ ${attackerName} 释放 [${skill.name}] → ${targetName}`;
        if (skill.statusToApply) {
            msg += ` (${skill.statusToApply.type} ×${skill.statusToApply.value}, 持续${skill.statusToApply.duration}ticks)`;
        }
        
        this.recordEvent({
            tick: this.tickCount,
            source: attackerName,
            target: targetName,
            type: 'skill',
            message: msg,
            damage: actualDamage
        });

        if (defender.eliteAffixes?.includes('thorns')) {
            const reflectDamage = Math.floor(actualDamage * 0.1);
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage);
            this.recordEvent({
                tick: this.tickCount,
                source: targetName,
                target: attackerName,
                type: 'effect',
                message: `🌵 ${targetName} 反弹 ${reflectDamage} 伤害给 ${attackerName}!`
            });
        }

        this.processEquipEffects(attacker, actualDamage, attackerName);
    }

    private processEquipEffects(entity: ActiveRunEntity, damage: number, entityName: string): void {
        for (const equip of entity.equipments) {
            if (equip.type === 'lifesteal') {
                const healAmount = Math.floor(damage * (equip.value / 100));
                const oldHp = entity.currentHp;
                entity.currentHp = Math.min(entity.maxHp, entity.currentHp + healAmount);
                const actualHeal = entity.currentHp - oldHp;

                if (actualHeal > 0) {
                    this.recordEvent({
                        tick: this.tickCount,
                        source: entityName,
                        target: entityName,
                        type: 'heal',
                        message: `💚 ${entityName} 吸血 +${actualHeal} HP`,
                        heal: actualHeal
                    });
                }
            }
        }
    }

    private processStatusEffects(entity: ActiveRunEntity, entityName: string): void {
        let poisonStacks = 0;
        for (const effect of entity.effects) {
            if (effect.type === 'poison') {
                poisonStacks += effect.value;
            }
        }

        for (let i = entity.effects.length - 1; i >= 0; i--) {
            const effect = entity.effects[i];
            
            switch (effect.type) {
                case 'burn':
                    entity.currentHp = Math.max(0, entity.currentHp - effect.value);
                    this.recordEvent({
                        tick: this.tickCount,
                        source: entityName,
                        target: entityName,
                        type: 'effect',
                        message: `🔥 ${entityName} 受到点燃伤害 ${effect.value} HP (剩余${entity.currentHp})`,
                        damage: effect.value
                    });
                    break;
                    
                case 'poison':
                    if (poisonStacks > 0) {
                        entity.currentHp = Math.max(0, entity.currentHp - poisonStacks);
                        this.recordEvent({
                            tick: this.tickCount,
                            source: entityName,
                            target: entityName,
                            type: 'effect',
                            message: `🟢 ${entityName} 受到毒液伤害 ${poisonStacks} HP (${effect.duration}层, 剩余${entity.currentHp})`,
                            damage: poisonStacks
                        });
                        break;
                    }
                    break;
                    
                case 'freeze':
                    const freezeExtend = effect.value;
                    let extendedSkills: string[] = [];
                    for (const skill of entity.skills) {
                        skill.currentCd += freezeExtend;
                        extendedSkills.push(skill.name);
                    }
                    this.recordEvent({
                        tick: this.tickCount,
                        source: entityName,
                        target: entityName,
                        type: 'status',
                        message: `❄️ ${entityName} 被冰冻! 技能CD延长 ${freezeExtend}: [${extendedSkills.join(', ')}]`
                    });
                    entity.effects.splice(i, 1);
                    continue;
                    
                case 'shock':
                    (entity as any)._nextAttackCancelled = true;
                    this.recordEvent({
                        tick: this.tickCount,
                        source: entityName,
                        target: entityName,
                        type: 'status',
                        message: `⚡ ${entityName} 被电击! 下一次普攻将被取消`
                    });
                    break;
            }

            effect.duration--;
            if (effect.duration <= 0) {
                entity.effects.splice(i, 1);
            }
        }
    }

    private recordEvent(event: BattleEvent): void {
        this.events.push(event);
    }

    private endBattle(winner: 'player' | 'enemy'): void {
        this.isFinished = true;
        this.winner = winner;
    }

    public getResult(): BattleResult {
        return {
            winner: this.winner!,
            totalTicks: this.tickCount,
            events: this.events,
            playerFinalHp: this.player.currentHp,
            enemyFinalHp: this.enemy.currentHp
        };
    }

    public printTickStatus(): void {
        console.log(`--- Tick ${this.tickCount}: player HP${this.player.currentHp} | enemy HP${this.enemy.currentHp}`);
    }

    public runBattle(): BattleResult {
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║                    战斗开始！                              ║');
        console.log('╚══════════════════════════════════════════════════════════╝');
        
        this.printTickStatus();

        while (!this.isFinished) {
            this.tick();
            this.printTickStatus();
            
            if (this.tickCount > 100) {
                console.log('⚠️ 战斗超时，强制结束');
                break;
            }
        }

        const result = this.getResult();
        
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log(`║                 战斗结束 - ${result.winner === 'player' ? '胜利！' : '失败！'}                       ║`);
        console.log('╚══════════════════════════════════════════════════════════╝');
        console.log(`📊 战斗时长: ${result.totalTicks} Ticks`);
        console.log(`   玩家剩余 HP: ${result.playerFinalHp}`);
        console.log(`   敌方剩余 HP: ${result.enemyFinalHp}`);

        return result;
    }

    public printBattleLog(): void {
        console.log('\n========== 战斗事件日志 ==========');
        for (const event of this.events) {
            console.log(`[Tick ${event.tick}] ${event.message}`);
        }
        console.log('===================================\n');
    }
}
