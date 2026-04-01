/**
 * BattleEngine - 自动战斗引擎 - Phase X 终极羁绊完整版
 * 支持: 召唤物、被动技能、羁绊觉醒、状态异常 (burn/poison/freeze/shock)
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
        // 初始化普攻CD
        (this.player as any)._attackCd = BattleEngine.ATTACK_CD;
        (this.enemy as any)._attackCd = BattleEngine.ATTACK_CD;
    }

    /**
     * 主战斗循环 - 每Tick执行一次
     */
    public tick(): void {
        if (this.isFinished) return;
        this.tickCount++;

        // ========== 1. 状态异常结算 (Phase 5) ==========
        // 在回合开始时处理所有状态效果
        this.processStatusEffects(this.player, 'player');
        this.processStatusEffects(this.enemy, 'enemy');

        // 检查战斗结束
        if (this.player.currentHp <= 0 || this.enemy.currentHp <= 0) {
            this.checkBattleEnd();
            return;
        }

        // ========== 2. 被动技能结算 (Phase X) ==========
        // 被动技能在每次tick都会触发
        if (this.player.passiveSkills) {
            this.player.passiveSkills.forEach(skill => {
                if (skill.onPassiveTick) {
                    skill.onPassiveTick(this.player, this.enemy, this);
                    this.recordEvent({
                        tick: this.tickCount,
                        source: 'player',
                        target: 'player',
                        type: 'passive',
                        message: `🔥 [${skill.name}] 被动效果触发!`
                    });
                }
            });
        }
        if (this.enemy.passiveSkills) {
            this.enemy.passiveSkills.forEach(skill => {
                if (skill.onPassiveTick) {
                    skill.onPassiveTick(this.enemy, this.player, this);
                }
            });
        }

        // ========== 3. 时停检查 ==========
        // 检查敌人是否处于时停状态
        if (this.enemy.isTimeStopped && this.enemy.timeStopRemaining && this.enemy.timeStopRemaining > 0) {
            this.recordEvent({
                tick: this.tickCount,
                source: 'system',
                target: 'enemy',
                type: 'effect',
                message: '⏱️ 敌方处于时停状态，无法行动!'
            });
            // 时停递减
            this.enemy.timeStopRemaining--;
            if (this.enemy.timeStopRemaining <= 0) {
                this.enemy.isTimeStopped = false;
                this.enemy.timeStopRemaining = 0;
            }
        }

        // ========== 4. 玩家回合 ==========
        if (!this.enemy.isTimeStopped) {
            this.processEntityTurn(this.player, this.enemy, 'player');
        }

        if (this.enemy.currentHp <= 0) {
            this.endBattle('player');
            return;
        }

        // ========== 5. 召唤物结算 (玩家) - Phase X ==========
        if (this.player.summon) {
            this.processSummonAttack(this.player.summon, this.enemy, 'player');
            // 检查召唤物是否死亡
            if (this.player.summon.currentHp <= 0) {
                this.processSummonDeath(this.player.summon, this.player, this.enemy, 'player');
            }
        }

        // ========== 6. 敌方回合 ==========
        if (!this.enemy.isTimeStopped) {
            this.processEntityTurn(this.enemy, this.player, 'enemy');
        }

        if (this.player.currentHp <= 0) {
            this.endBattle('enemy');
            return;
        }

        // ========== 7. 召唤物结算 (敌方) - Phase X ==========
        if (this.enemy.summon) {
            this.processSummonAttack(this.enemy.summon, this.player, 'enemy');
            if (this.enemy.summon.currentHp <= 0) {
                this.processSummonDeath(this.enemy.summon, this.enemy, this.player, 'enemy');
            }
        }

        // 最终检查
        this.checkBattleEnd();
    }

    /**
     * 检查战斗结束
     */
    private checkBattleEnd(): void {
        if (this.enemy.currentHp <= 0) {
            this.endBattle('player');
        } else if (this.player.currentHp <= 0) {
            this.endBattle('enemy');
        }
    }

    /**
     * Phase 5: 处理状态异常效果
     * burn: 每tick扣除value HP
     * poison: 累加层数，按总层数扣血（修复多重扣血bug）
     * freeze: 延长敌方所有技能CD
     * shock: 标记取消下一次普攻
     */
    private processStatusEffects(entity: ActiveRunEntity, entityName: string): void {
        // 先统计 poison 总层数（只统计一次）
        let poisonStacks = 0;
        for (const effect of entity.effects) {
            if (effect.type === 'poison') {
                poisonStacks += effect.value;
            }
        }

        // 遍历处理每个状态
        for (let i = entity.effects.length - 1; i >= 0; i--) {
            const effect = entity.effects[i];

            switch (effect.type) {
                case 'burn':
                    // burn: 每tick扣除value HP
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
                    // poison: 按总层数扣血（只扣一次）
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
                    }
                    break;

                case 'freeze':
                    // freeze: 延长所有技能CD（只在挂载时触发一次）
                    const freezeExtend = effect.value;
                    let extendedSkills: string[] = [];
                    for (const skill of entity.skills) {
                        if (skill.type !== 'passive') {  // 不延长被动技能CD
                            skill.currentCd += freezeExtend;
                            extendedSkills.push(skill.name);
                        }
                    }
                    if (extendedSkills.length > 0) {
                        this.recordEvent({
                            tick: this.tickCount,
                            source: entityName,
                            target: entityName,
                            type: 'status',
                            message: `❄️ ${entityName} 被冰冻! 技能CD延长 ${freezeExtend}: [${extendedSkills.join(', ')}]`
                        });
                    }
                    // freeze 只触发一次，然后移除
                    entity.effects.splice(i, 1);
                    continue;

                case 'shock':
                    // shock: 标记取消下一次普攻
                    (entity as any)._nextAttackCancelled = true;
                    this.recordEvent({
                        tick: this.tickCount,
                        source: entityName,
                        target: entityName,
                        type: 'status',
                        message: `⚡ ${entityName} 被电击! 下一次普攻将被取消`
                    });
                    break;

                case 'stun':
                    // stun: 直接晕眩
                    (entity as any)._nextAttackCancelled = true;
                    this.recordEvent({
                        tick: this.tickCount,
                        source: entityName,
                        target: entityName,
                        type: 'status',
                        message: `💫 ${entityName} 被晕眩!`
                    });
                    break;
            }

            // 持续时间递减
            effect.duration--;
            if (effect.duration <= 0) {
                entity.effects.splice(i, 1);
            }
        }
    }

    /**
     * 处理实体回合
     * 包含: 技能冷却递减、技能/普攻判定
     */
    private processEntityTurn(attacker: ActiveRunEntity, defender: ActiveRunEntity, attackerName: string): void {
        const targetName = attackerName === 'player' ? 'enemy' : 'player';

        // ========== A. 技能冷却递减 (Phase 5 基础逻辑) ==========
        // 遍历所有技能，递减CD
        // 注意: 如果有召唤物存活，summon类型技能CD被锁定
        for (const skill of attacker.skills) {
            if (skill.type === 'passive') continue;  // 被动技能不减CD
            
            // 召唤物存活时，summon类型技能CD锁定
            if (skill.type === 'summon' && attacker.summon) {
                // CD锁定，不递减
                continue;
            }
            
            // 正常递减
            if (skill.currentCd > 0) {
                skill.currentCd--;
            }
        }

        // ========== B. 检查是否被晕眩 (shock) ==========
        const nextAttackCancelled = (attacker as any)._nextAttackCancelled as boolean;
        if (nextAttackCancelled) {
            (attacker as any)._nextAttackCancelled = false;
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: attackerName,
                type: 'status',
                message: `💫 ${attackerName} 被晕眩，普攻被取消!`
            });
            return;
        }

        // ========== C. 技能判定 (优先 summon 类型) ==========
        // 1. 先检查是否有召唤技能且召唤物不在场
        const summonSkill = attacker.skills.find(s => s.type === 'summon' && s.currentCd <= 0 && !attacker.summon);
        if (summonSkill) {
            this.executeSummonSkill(attacker, summonSkill, attackerName);
            return;
        }

        // 2. 检查其他ready的技能
        const readySkill = attacker.skills.find(s => s.type !== 'passive' && s.type !== 'summon' && s.currentCd <= 0);
        if (readySkill) {
            this.executeSkill(attacker, defender, readySkill, attackerName, targetName);
            return;
        }

        // ========== D. 普攻判定 ==========
        const attackCd = (attacker as any)._attackCd as number;
        if (attackCd <= 0) {
            this.executeAttack(attacker, defender, attackerName, targetName);
            (attacker as any)._attackCd = BattleEngine.ATTACK_CD;
        } else {
            (attacker as any)._attackCd--;
        }
    }

    /**
     * 执行普攻
     */
    private executeAttack(attacker: ActiveRunEntity, defender: ActiveRunEntity, attackerName: string, targetName: string): void {
        let damage = attacker.baseAttack;

        // 基础装备攻击加成
        for (const equip of attacker.equipments) {
            if (equip.type === 'attack_boost') {
                damage += equip.value;
            }
        }

        // 被动技能加成 (强袭者连击/真伤)
        if (attacker.passiveSkills) {
            attacker.passiveSkills.forEach(skill => {
                // 真实伤害加成
                if (skill.trueDamage) {
                    damage += skill.trueDamage;
                }
                
                // 连击处理
                if (skill.multiHit) {
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
                    return; // 连击已处理完本次普攻
                }
            });
        }

        // 敌方 armored 减伤 (Phase 8)
        if (defender.eliteAffixes?.includes('armored')) {
            const origDamage = damage;
            damage = Math.floor(damage * 0.7);
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'effect',
                message: `🛡️ ${targetName} 的护甲生效! 伤害减免 ${origDamage}→${damage}`
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

        // 敌方 thorns 反伤 (Phase 8)
        if (defender.eliteAffixes?.includes('thorns')) {
            const reflectDamage = Math.floor(damage * 0.1);
            attacker.currentHp = Math.max(0, attacker.currentHp - reflectDamage);
            this.recordEvent({
                tick: this.tickCount,
                source: targetName,
                target: attackerName,
                type: 'effect',
                message: `🌵 ${targetName} 反弹 ${reflectDamage} 伤害!`
            });
        }

        // 吸血装备效果
        this.processLifesteal(attacker, damage, attackerName);
    }

    /**
     * 处理召唤技能
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

        // CD锁定提示
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

    /**
     * 执行技能
     */
    private executeSkill(attacker: ActiveRunEntity, defender: ActiveRunEntity, skill: RunSkill, attackerName: string, targetName: string): void {
        let damage = skill.effectValue;

        // 技能基础伤害 + 装备加成
        for (const equip of attacker.equipments) {
            if (equip.type === 'attack_boost') {
                damage += equip.value;
            }
        }

        // ========== Phase X: Caster 特殊技能效果 ==========

        // C1. 天罚·狂雷紫电：80%清空CD
        if (skill.cooldownResetChance && Math.random() < skill.cooldownResetChance) {
            skill.currentCd = 0;
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'skill',
                message: `⚡ [${skill.name}] 触发清空CD! 无限连击!`
            });
        } else {
            skill.currentCd = skill.maxCd;
        }

        // C2. 灭世·流星火雨：充能 + 伤害放大
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

        // C3. 时空·极寒领域：CD延长 + 时停
        if (skill.cdExtension) {
            defender.skills.forEach(s => {
                if (s.type !== 'passive') {
                    s.currentCd += skill.cdExtension!;
                }
            });
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'skill',
                message: `❄️ [${skill.name}] 延长敌方所有技能CD +${skill.cdExtension}!`
            });
        }

        // C4. 化尸·万毒噬心：永久偷取
        if (skill.maxHpSteal && skill.atkSteal) {
            // 造成伤害
            defender.currentHp = Math.max(0, defender.currentHp - damage);

            // 偷取最大HP
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
            return;
        }

        // ========== 正常技能伤害结算 ==========

        // armored 减伤
        if (defender.eliteAffixes?.includes('armored')) {
            const orig = damage;
            damage = Math.floor(damage * 0.7);
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'effect',
                message: `🛡️ ${targetName} 护甲减免 ${orig}→${damage}`
            });
        }

        defender.currentHp = Math.max(0, defender.currentHp - damage);

        // 应用状态效果
        if (skill.statusToApply) {
            defender.effects.push({ ...skill.statusToApply });
            this.recordEvent({
                tick: this.tickCount,
                source: attackerName,
                target: targetName,
                type: 'status',
                message: `🩸 ${attackerName} 对 ${targetName} 施加了 [${skill.statusToApply.type}]!`
            });
        }

        this.recordEvent({
            tick: this.tickCount,
            source: attackerName,
            target: targetName,
            type: 'skill',
            message: `✨ ${attackerName} 释放 [${skill.name}] → 造成 ${damage} 伤害`,
            damage: damage
        });

        // thorns 反伤
        if (defender.eliteAffixes?.includes('thorns')) {
            const reflect = Math.floor(damage * 0.1);
            attacker.currentHp = Math.max(0, attacker.currentHp - reflect);
            this.recordEvent({
                tick: this.tickCount,
                source: targetName,
                target: attackerName,
                type: 'effect',
                message: `🌵 ${targetName} 反弹 ${reflect} 伤害!`
            });
        }

        // 吸血
        this.processLifesteal(attacker, damage, attackerName);
    }

    /**
     * 处理召唤物攻击
     */
    private processSummonAttack(summon: any, target: ActiveRunEntity, ownerName: string): void {
        summon.currentAttackCd--;

        if (summon.currentAttackCd <= 0) {
            summon.currentAttackCd = summon.attackCd || 3;

            let damage = summon.baseAttack;
            if (summon.attackSpeed) {
                damage = Math.floor(damage * summon.attackSpeed);
            }

            target.currentHp = Math.max(0, target.currentHp - damage);

            this.recordEvent({
                tick: this.tickCount,
                source: ownerName,
                target: 'enemy',
                type: 'summon',
                message: `👻 [${summon.name}] 攻击 → ${damage} 伤害`,
                damage: damage
            });

            // 攻击特效 - poison (龙骨骷髅)
            if (summon.poisonChance && Math.random() * 100 < summon.poisonChance) {
                target.effects.push({ type: 'poison', duration: 3, value: 5 });
                this.recordEvent({
                    tick: this.tickCount,
                    source: ownerName,
                    target: 'enemy',
                    type: 'effect',
                    message: `☠️ [${summon.name}] 使敌方中毒!`
                });
            }

            // 攻击特效 - burn (远古炎魔)
            if (summon.burnDamage) {
                target.effects.push({ type: 'burn', duration: 4, value: summon.burnDamage });
                this.recordEvent({
                    tick: this.tickCount,
                    source: ownerName,
                    target: 'enemy',
                    type: 'effect',
                    message: `🔥 [${summon.name}] 使敌方燃烧!`
                });
            }

            // 攻击特效 - shock (麒麟)
            if (summon.onAttackEffect) {
                summon.onAttackEffect(target, this);
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
                message: `💥 [${summon.name}] 自爆! ${damage} 真实伤害!`,
                damage: damage
            });
        }

        if (summon.onDeathEffect) {
            summon.onDeathEffect(owner, enemy, this);
        }

        this.recordEvent({
            tick: this.tickCount,
            source: ownerName,
            target: ownerName,
            type: 'summon',
            message: `💀 [${summon.name}] 被消灭!`
        });

        owner.summon = null;
    }

    /**
     * 处理吸血装备效果
     */
    private processLifesteal(entity: ActiveRunEntity, damage: number, entityName: string): void {
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
        const summonInfo = this.player.summon ? ` [${this.player.summon.name}:${this.player.summon.currentHp}]` : '';
        console.log(`Tick ${this.tickCount}: player HP${this.player.currentHp}${summonInfo} | enemy HP${this.enemy.currentHp}`);
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
