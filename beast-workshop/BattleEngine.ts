/**
 * BattleEngine - 自动战斗引擎 - Phase X 终极羁绊版
 * 支持: 召唤物、被动技能、羁绊觉醒
 */
import { ActiveRunEntity, RunSkill, StatusEffect, randomInt } from './types';

export interface BattleEvent {
    tick: number;
    source: string;
    target: string;
    type: 'attack' | 'skill' | 'heal' | 'effect' | 'status' | 'summon' | 'passive';
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
    }

    public tick(): void {
        if (this.isFinished) return;
        this.tickCount++;

        // ========== 时停处理 ==========
        if (this.enemy.isTimeStopped && this.enemy.timeStopRemaining && this.enemy.timeStopRemaining > 0) {
            this.recordEvent({
                tick: this.tickCount,
                source: 'system',
                target: 'enemy',
                type: 'effect',
                message: '⏱️ 敌方处于时停状态，无法行动!'
            });
            // 时停递减在被动技能中处理
        }

        // ========== 玩家被动技能结算 ==========
        this.processPassiveSkills(this.player, 'player', this.enemy);

        // ========== 玩家回合 ==========
        if (!this.enemy.isTimeStopped) {
            this.processEntityTurn(this.player, this.enemy, 'player');
        }
        
        if (this.enemy.currentHp <= 0) {
            this.endBattle('player');
            return;
        }

        // ========== 敌方被动技能结算 ==========
        this.processPassiveSkills(this.enemy, 'enemy', this.player);

        // ========== 召唤物结算 (玩家) ==========
        if (this.player.summon) {
            this.processSummonAttack(this.player.summon, this.enemy, 'player');
            // 检查召唤物死亡
            if (this.player.summon.currentHp <= 0) {
                this.processSummonDeath(this.player.summon, this.player, this.enemy, 'player');
            }
        }

        // ========== 敌方回合 ==========
        if (!this.enemy.isTimeStopped) {
            this.processEntityTurn(this.enemy, this.player, 'enemy');
        }

        // ========== 召唤物结算 (敌方) ==========
        if (this.enemy.summon) {
            this.processSummonAttack(this.enemy.summon, this.player, 'enemy');
            if (this.enemy.summon.currentHp <= 0) {
                this.processSummonDeath(this.enemy.summon, this.enemy, this.player, 'enemy');
            }
        }

        if (this.player.currentHp <= 0) {
            this.endBattle('enemy');
        }
    }

    /**
     * 处理被动技能
     */
    private processPassiveSkills(entity: ActiveRunEntity, entityName: string, target: ActiveRunEntity): void {
        if (!entity.passiveSkills || entity.passiveSkills.length === 0) return;

        entity.passiveSkills.forEach(skill => {
            if (skill.onPassiveTick) {
                skill.onPassiveTick(entity, target, this);
                
                this.recordEvent({
                    tick: this.tickCount,
                    source: entityName,
                    target: entityName,
                    type: 'passive',
                    message: `🔥 [${skill.name}] 被动效果触发!`
                });
            }
        });
    }

    /**
     * 处理召唤物攻击
     */
    private processSummonAttack(summon: any, target: ActiveRunEntity, ownerName: string): void {
        summon.currentAttackCd--;
        
        if (summon.currentAttackCd <= 0) {
            summon.currentAttackCd = summon.attackCd;
            
            // 计算伤害
            let damage = summon.baseAttack;
            if (summon.attackSpeed) {
                damage = Math.floor(damage * summon.attackSpeed);
            }

            // 荆棘反伤
            if (summon.hasThorns) {
                this.recordEvent({
                    tick: this.tickCount,
                    source: ownerName,
                    target: 'enemy',
                    type: 'effect',
                    message: `🌵 [${summon.name}] 荆棘反伤激活!`
                });
            }

            // 造成伤害
            target.currentHp = Math.max(0, target.currentHp - damage);
            
            this.recordEvent({
                tick: this.tickCount,
                source: ownerName,
                target: 'enemy',
                type: 'summon',
                message: `👻 [${summon.name}] 攻击 → 造成 ${damage} 伤害`,
                damage: damage
            });

            // 攻击特效
            if (summon.onAttackEffect) {
                summon.onAttackEffect(target, this);
            }

            // 中毒效果 (龙骨骷髅)
            if (summon.poisonChance && Math.random() * 100 < summon.poisonChance) {
                target.effects.push({
                    type: 'poison',
                    duration: 3,
                    value: 5
                });
                this.recordEvent({
                    tick: this.tickCount,
                    source: ownerName,
                    target: 'enemy',
                    type: 'effect',
                    message: `☠️ [${summon.name}] 使敌方中毒!`
                });
            }

            // 燃烧效果 (远古炎魔)
            if (summon.burnDamage) {
                target.effects.push({
                    type: 'burn',
                    duration: 4,
                    value: summon.burnDamage
                });
                this.recordEvent({
                    tick: this.tickCount,
                    source: ownerName,
                    target: 'enemy',
                    type: 'effect',
                    message: `🔥 [${summon.name}] 使敌方燃烧 +${summon.burnDamage}!`
                });
            }

            // 荆棘反伤效果 (冰霜巨兽)
            if (summon.hasThorns) {
                const reflectDamage = Math.floor(damage * 0.1);
                if (ownerName === 'player' && this.enemy.summon) {
                    this.enemy.summon.currentHp -= reflectDamage;
                } else if (ownerName === 'enemy' && this.player.summon) {
                    this.player.summon.currentHp -= reflectDamage;
                }
            }
        }
    }

    /**
     * 处理召唤物死亡
     */
    private processSummonDeath(summon: any, owner: ActiveRunEntity, enemy: ActiveRunEntity, ownerName: string): void {
        // 自爆效果 (远古炎魔)
        if (summon.isSelfDestruct && summon.selfDestructDamage) {
            const damage = Math.floor(summon.maxHp * summon.selfDestructDamage);
            enemy.currentHp = Math.max(0, enemy.currentHp - damage);
            
            this.recordEvent({
                tick: this.tickCount,
                source: ownerName,
                target: 'enemy',
                type: 'summon',
                message: `💥 [${summon.name}] 自爆! 造成 ${damage} 真实伤害!`,
                damage: damage
            });
        }

        // 死亡特效
        if (summon.onDeathEffect) {
            summon.onDeathEffect(owner, enemy, this);
        }

        this.recordEvent({
            tick: this.tickCount,
            source: ownerName,
            target: ownerName,
            type: 'summon',
            message: `💀 [${summon.name}] 被消灭了!`
        });

        owner.summon = null;
    }

    private processEntityTurn(attacker: ActiveRunEntity, defender: ActiveRunEntity, attackerName: string): void {
        const targetName = attackerName === 'player' ? 'enemy' : 'player';

        // 技能判定 - 优先召唤物类型
        const summonSkill = attacker.skills.find(s => s.type === 'summon' && s.currentCd <= 0);
        if (summonSkill && summonSkill.summonTemplate && !attacker.summon) {
            this.executeSummonSkill(attacker, summonSkill, attackerName);
            return;
        }

        // 其他技能
        const readySkill = attacker.skills.find(s => s.type !== 'passive' && s.currentCd <= 0);
        if (readySkill) {
            this.executeSkill(attacker, defender, readySkill, attackerName, targetName);
            return;
        }

        // 普攻
        const attackCd = (attacker as any)._attackCd as number;
        if (attackCd <= 0) {
            this.executeAttack(attacker, defender, attackerName, targetName);
            (attacker as any)._attackCd = BattleEngine.ATTACK_CD;
        } else {
            (attacker as any)._attackCd--;
        }
    }

    /**
     * 执行召唤技能
     */
    private executeSummonSkill(attacker: ActiveRunEntity, skill: RunSkill, attackerName: string): void {
        if (!skill.summonTemplate) return;

        // 创建召唤物
        attacker.summon = {
            ...skill.summonTemplate,
            id: skill.summonTemplate.id + '_' + Date.now(),
            currentHp: skill.summonTemplate.maxHp,
            currentAttackCd: skill.summonTemplate.attackCd
        };

        skill.currentCd = skill.maxCd;

        this.recordEvent({
            tick: this.tickCount,
            source: attackerName,
            target: attackerName,
            type: 'summon',
            message: `✨ 召唤 [${skill.summonTemplate.name}]! HP:${skill.summonTemplate.maxHp}`
        });

        // CD 锁定：若有召唤物在，该技能不递减
        if (attacker.summon) {
            this.recordEvent({
                tick: this.tickCount,
                source: 'system',
                target: attackerName,
                type: 'status',
                message: `🔒 [${skill.name}] 进入CD锁定状态`
            });
        }
    }

    private executeAttack(attacker: ActiveRunEntity, defender: ActiveRunEntity, attackerName: string, targetName: string): void {
        let damage = attacker.baseAttack;

        // 被动技能加成 (强袭者)
        if (attacker.passiveSkills) {
            attacker.passiveSkills.forEach(skill => {
                if (skill.trueDamage) {
                    damage += skill.trueDamage;
                }
                if (skill.multiHit) {
                    // 连击处理
                    for (let i = 0; i < skill.multiHit; i++) {
                        defender.currentHp = Math.max(0, defender.currentHp - damage);
                        this.recordEvent({
                            tick: this.tickCount,
                            source: attackerName,
                            target: targetName,
                            type: 'attack',
                            message: `⚔️ [${skill.name}] 连击 ${i+1}/${skill.multiHit} → 造成 ${damage} 伤害`
                        });
                    }
                    return;  // 连击已处理完
                }
            });
        }

        // 造成伤害
        defender.currentHp = Math.max(0, defender.currentHp - damage);
        
        this.recordEvent({
            tick: this.tickCount,
            source: attackerName,
            target: targetName,
            type: 'attack',
            message: `⚔️ ${attackerName} 普攻 → 造成 ${damage} 伤害`,
            damage: damage
        });
    }

    private executeSkill(attacker: ActiveRunEntity, defender: ActiveRunEntity, skill: RunSkill, attackerName: string, targetName: string): void {
        let damage = skill.effectValue;

        // ========== 秘术师特殊效果 ==========
        
        // 天罚·狂雷紫电：80% 清空 CD
        if (skill.cooldownResetChance && Math.random() < skill.cooldownResetChance) {
            skill.currentCd = 0;
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'skill',
                message: `⚡ [${skill.name}] 触发清空 CD! 无限连击!`
            });
        } else {
            skill.currentCd = skill.maxCd;
        }

        // 灭世·流星火雨：充能 + 伤害放大
        if (skill.isCharged && skill.chargeCount) {
            damage = damage * skill.chargeCount;
            if (skill.damageAmplifyStack) {
                damage = Math.floor(damage * (1 + skill.damageAmplifyStack));
            }
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'skill',
                message: `🔥 [${skill.name}] 充能×${skill.chargeCount}! 伤害提升!`
            });
        }

        // 时空·极寒领域：CD 延长 + 时停
        if (skill.cdExtension) {
            defender.skills.forEach(s => {
                s.currentCd += skill.cdExtension!;
            });
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'skill',
                message: `❄️ [${skill.name}] 延长敌方所有技能 CD +${skill.cdExtension}!`
            });
        }

        // 化尸·万毒噬心：永久偷取
        if (skill.maxHpSteal && skill.atkSteal) {
            // 造成伤害
            defender.currentHp = Math.max(0, defender.currentHp - damage);
            
            // 偷取最大 HP
            if (defender.maxHp > 50) {
                const stolenHp = Math.floor(defender.maxHp * (skill.maxHpSteal / 100));
                defender.maxHp -= stolenHp;
                attacker.maxHp += stolenHp;
                attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + stolenHp);
            }
            
            // 偷取攻击力
            const stolenAtk = skill.atkSteal;
            defender.baseAttack = Math.max(5, defender.baseAttack - stolenAtk);
            attacker.baseAttack += stolenAtk;
            
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'skill',
                message: `☠️ [${skill.name}] 造成伤害并偷取敌方属性!`,
                damage: damage
            });
            return;  // 已处理完
        }

        // 普通技能伤害
        defender.currentHp = Math.max(0, defender.currentHp - damage);
        
        this.recordEvent({
            tick: this.tickCount,
            source: attackerName,
            target: targetName,
            type: 'skill',
            message: `✨ ${attackerName} 释放 [${skill.name}] → 造成 ${damage} 伤害`,
            damage: damage
        });
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
        const summonHp = this.player.summon ? ` [${this.player.summon.name}:${this.player.summon.currentHp}]` : '';
        console.log(`Tick ${this.tickCount}: player HP${this.player.currentHp}${summonHp} | enemy HP${this.enemy.currentHp}`);
    }

    public runBattle(): BattleResult {
        console.log('\n========== 战斗开始! ==========');
        
        while (!this.isFinished && this.tickCount < 100) {
            this.tick();
            this.printTickStatus();
        }

        console.log(`========== 战斗结束 - ${this.winner === 'player' ? '胜利!' : '失败!'} ==========`);
        
        return this.getResult();
    }

    public printBattleLog(): void {
        console.log('\n========== 战斗日志 ==========');
        this.events.forEach(e => {
            console.log(`[Tick ${e.tick}] ${e.message}`);
        });
    }
}
