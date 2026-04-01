import { WorkerBeast, ActiveRunEntity, RunSkill, RunEquipment, StatusEffect, DraftChoice, DraftChoiceType, GAME_CONFIG, randomElement, randomInt, generateUid } from './types';
import { MetaGameManager } from './MetaGameManager';
import { BattleEngine } from './BattleEngine';
import { DraftRegistry, PUBLIC_SKILL_POOL, PUBLIC_EQUIPMENT_POOL, ELEMENT_EQUIPMENT_POOL, CURSED_RELIC_POOL } from './DraftRegistry';
import { checkSynergyEvolution } from './SynergyRegistry';

/**
 * RunSession - 单次运行状态
 */
export interface RunSession {
    player: ActiveRunEntity;
    currentStage: number;
    isFinished: boolean;
    result: 'victory' | 'defeat' | null;
    chestsEarned: number;
}

/**
 * RunManager - 局内战斗管理器
 */
export class RunManager {
    private metaManager: MetaGameManager;
    public session: RunSession | null = null;

    constructor() {
        this.metaManager = MetaGameManager.getInstance();
    }

    public generateStarterOptions(): WorkerBeast[] {
        const gridBeasts = this.metaManager.getGridBeasts();
        let options: WorkerBeast[] = [];
        
        if (gridBeasts.length >= 3) {
            const shuffled = [...gridBeasts].sort(() => Math.random() - 0.5);
            options = shuffled.slice(0, 3);
        } else {
            options = [...gridBeasts];
            const needed = 3 - options.length;
            for (let i = 0; i < needed; i++) {
                const mercenary = this.metaManager.generateRandomBeast(1, true);
                options.push(mercenary);
            }
        }
        
        return options;
    }

    public startRun(selectedBeast: WorkerBeast): ActiveRunEntity {
        const hpBonus = this.metaManager.getHpBonus();
        const dmgBonusPercent = this.metaManager.getDamageBonusPercent();
        
        const starMultiplier = 1 + (selectedBeast.starLevel - 1) * 0.5;
        
        let maxHp = Math.floor(selectedBeast.baseHp * starMultiplier);
        let baseAttack = Math.floor(selectedBeast.baseAttack * starMultiplier);
        
        maxHp += hpBonus;
        baseAttack = Math.floor(baseAttack * (1 + dmgBonusPercent / 100));
        
        const activeEntity: ActiveRunEntity = {
            class: selectedBeast.class,
            element: selectedBeast.element,
            starLevel: selectedBeast.starLevel,
            maxHp: maxHp,
            currentHp: maxHp,
            baseAttack: baseAttack,
            skills: [],
            equipments: [],
            effects: []
        };

        this.session = {
            player: activeEntity,
            currentStage: 1,
            isFinished: false,
            result: null,
            chestsEarned: 0
        };
        
        return activeEntity;
    }

    private getStageType(stage: number): 'draft' | 'drop' | 'merchant' | 'combat' {
        if (GAME_CONFIG.draftStages.includes(stage)) return 'draft';
        if (GAME_CONFIG.dropStages.includes(stage)) return 'drop';
        if (GAME_CONFIG.merchantStages.includes(stage)) return 'merchant';
        return 'combat';
    }

    public generateDraft(): DraftChoice[] {
        if (!this.session) return [];
        const player = this.session.player;
        return DraftRegistry.drawThreeChoices(player.class, player.element);
    }

    public generateDrop(): RunEquipment {
        const equipTemplate = randomElement(PUBLIC_EQUIPMENT_POOL);
        return {
            id: generateUid(),
            ...equipTemplate
        } as RunEquipment;
    }

    public generateMerchant(): DraftChoice[] {
        if (!this.session) return [];
        const playerElement = this.session.player.element;
        const choices: DraftChoice[] = [];

        // 货架 1：公共装备或技能 (售价 50~100)
        const publicEquip = randomElement(PUBLIC_EQUIPMENT_POOL);
        choices.push({
            type: 'merchant_item',
            data: { equipment: { id: generateUid(), ...publicEquip } },
            description: `📦 [${publicEquip.name}] (${publicEquip.type})`,
            cost: randomInt(50, 100)
        });

        // 货架 2：元素专属装备 (售价 100~150)
        const elementEquips = ELEMENT_EQUIPMENT_POOL[playerElement];
        if (elementEquips && elementEquips.length > 0) {
            const elemEquip = randomElement(elementEquips);
            choices.push({
                type: 'merchant_item',
                data: { equipment: { id: generateUid(), ...elemEquip } },
                description: `🔥 [${elemEquip.name}] (${playerElement}专属)`,
                cost: randomInt(100, 150)
            });
        }

        // 货架 3：天价诅咒遗物 (售价 200~300)
        const cursedRelic = randomElement(CURSED_RELIC_POOL);
        choices.push({
            type: 'skill',
            data: { ...cursedRelic, id: generateUid(), currentCd: 0 },
            description: `☠️ ${cursedRelic.name} (极度危险)`,
            cost: randomInt(200, 300)
        });

        return choices;
    }

    public applyDraftChoice(choice: DraftChoice): void {
        if (!this.session) return;
        
        switch (choice.type) {
            case 'star_up':
                const oldMaxHp = this.session.player.maxHp;
                const oldAttack = this.session.player.baseAttack;
                
                this.session.player.maxHp = Math.floor(oldMaxHp * 1.1);
                this.session.player.currentHp = Math.floor(this.session.player.currentHp * 1.1);
                this.session.player.baseAttack = Math.floor(oldAttack * 1.1);
                this.session.player.starLevel++;
                
                console.log(`⭐ 升星成功! HP: ${oldMaxHp} → ${this.session.player.maxHp}`);
                break;
                
            case 'skill':
                const skill: RunSkill = {
                    ...choice.data,
                    currentCd: 0
                };
                this.session.player.skills.push(skill);
                console.log(`✨ 获得技能: [${skill.name}]`);
                break;
                
            case 'merchant_item':
                const cost = choice.cost || 0;
                if (this.metaManager.metaState.gold >= cost) {
                    this.metaManager.metaState.gold -= cost;
                    this.session.player.equipments.push(choice.data.equipment);
                    console.log(`💎 购买装备: [${choice.data.equipment.name}]`);
                }
                break;
        }
        
        // ========== 检查羁绊进化 ==========
        this.checkSynergyEvolution();
    }
    
    /**
     * 检查并触发羁绊进化
     */
    private checkSynergyEvolution(): void {
        if (!this.session) return;
        
        const player = this.session.player;
        
        // 初始化被动技能数组
        if (!player.passiveSkills) {
            player.passiveSkills = [];
        }
        
        // 检查是否能触发羁绊
        const evolvedSkill = checkSynergyEvolution(
            player.class,
            player.element,
            player.skills,
            player.equipments
        );
        
        if (evolvedSkill) {
            // 找到基础技能并删除
            const baseSkillIndex = player.skills.findIndex(s => s.id === evolvedSkill.requiredSkillId);
            if (baseSkillIndex >= 0) {
                const baseSkill = player.skills[baseSkillIndex];
                player.skills.splice(baseSkillIndex, 1);
                
                // 添加进化后的技能
                const newSkill = { ...evolvedSkill };
                player.skills.push(newSkill);
                
                // 如果是被动技能，也添加到 passiveSkills
                if (newSkill.type === 'passive') {
                    player.passiveSkills.push(newSkill);
                }
                
                // 打印极其显眼的羁绊共鸣日志
                console.log('\n');
                console.log('╔══════════════════════════════════════════════════════════╗');
                console.log('║        🎉🎉🎉  【羁绊共鸣】进化成功!!! 🎉🎉🎉          ║');
                console.log('╚══════════════════════════════════════════════════════════╝');
                console.log(`   职业: ${player.class} | 元素: ${player.element}`);
                console.log(`   基础技能: ${baseSkill.name}`);
                console.log(`   进化技能: ${newSkill.name}`);
                console.log(`   技能类型: ${newSkill.type}`);
                console.log('════════════════════════════════════════════════════════════\n');
            }
        }
    }

    public rerollDraft(): DraftChoice[] | null {
        if (!this.session) return null;

        const baseCost = GAME_CONFIG.rerollCost;
        const discount = this.metaManager.getRerollDiscount();
        const actualCost = Math.max(0, baseCost - discount);
        
        if (this.metaManager.metaState.gold < actualCost) return null;

        this.metaManager.metaState.gold -= actualCost;
        return this.generateDraft();
    }

    /**
     * Phase 8: 生成怪物 - 指数增长 + 精英词条
     */
    private generateEnemy(): ActiveRunEntity {
        if (!this.session) throw new Error('No active session');
        
        const stage = this.session.currentStage;
        const isBoss = (stage === 10);
        
        const growthFactor = Math.pow(1.3, stage - 1);
        const baseHp = Math.floor(80 * growthFactor);
        const baseAtk = Math.floor(8 * growthFactor);
        
        const classes: ('Striker' | 'Caster' | 'Conjurer')[] = ['Striker', 'Caster', 'Conjurer'];
        const elements: ('Fire' | 'Ice' | 'Thunder' | 'Venom')[] = ['Fire', 'Ice', 'Thunder', 'Venom'];
        
        // 词条分配
        let eliteAffixes: ('armored' | 'thorns' | 'regen' | 'berserk')[] = [];
        let affixCount = 0;
        
        if (stage >= 4 && stage <= 6) affixCount = 1;
        else if (stage >= 7 && stage <= 9) affixCount = 2;
        else if (stage === 10) affixCount = 3;
        
        if (affixCount > 0) {
            const allAffixes: ('armored' | 'thorns' | 'regen' | 'berserk')[] = ['armored', 'thorns', 'regen', 'berserk'];
            const shuffled = [...allAffixes].sort(() => Math.random() - 0.5);
            eliteAffixes = shuffled.slice(0, affixCount);
        }
        
        let finalHp = isBoss ? baseHp * 2 : baseHp;
        
        const enemy: ActiveRunEntity = {
            class: randomElement(classes),
            element: randomElement(elements),
            starLevel: Math.min(5, 1 + Math.floor(stage / 3)),
            maxHp: finalHp,
            currentHp: finalHp,
            baseAttack: baseAtk,
            skills: [],
            equipments: [],
            effects: [],
            isBoss,
            eliteAffixes
        };

        if (isBoss) {
            const skillTemplate = randomElement(PUBLIC_SKILL_POOL);
            const skillName = skillTemplate.name || 'Boss技能';
            const skillMaxCd = skillTemplate.maxCd || 4;
            const skillEffectValue = skillTemplate.effectValue || 20;
            enemy.skills.push({
                id: generateUid(),
                name: skillName,
                type: 'damage',
                maxCd: skillMaxCd,
                currentCd: 0,
                effectValue: skillEffectValue
            });
        }

        console.log(`  生成怪物: Stage ${stage} ${isBoss ? '[BOSS]' : ''} HP:${enemy.maxHp} ATK:${enemy.baseAttack} 词条:[${eliteAffixes.join(', ')}]`);

        return enemy;
    }

    public runNextStage(): void {
        if (!this.session || this.session.isFinished) return;

        const stage = this.session.currentStage;
        const stageType = this.getStageType(stage);
        
        console.log(`\nStage ${stage}/10 - ${stageType.toUpperCase()}`);
        
        if (stageType === 'draft') {
            const choices = this.generateDraft();
            this.applyDraftChoice(choices[0]);
            this.session.currentStage++;
            return;
        }
        
        if (stageType === 'drop') {
            const equipment = this.generateDrop();
            this.session.player.equipments.push(equipment);
            this.session.currentStage++;
            return;
        }
        
        if (stageType === 'merchant') {
            const choices = this.generateMerchant();
            if (choices[0].cost && this.metaManager.metaState.gold >= choices[0].cost) {
                this.applyDraftChoice(choices[0]);
            }
            this.session.currentStage++;
            return;
        }

        const enemy = this.generateEnemy();
        
        const battle = new BattleEngine(this.session.player, enemy);
        battle.runBattle();
        
        if (battle.winner === 'player') {
            const healAmount = Math.floor(this.session.player.maxHp * 0.2);
            this.session.player.currentHp = Math.min(
                this.session.player.maxHp,
                this.session.player.currentHp + healAmount
            );
            
            if (stage === 10) {
                this.session.isFinished = true;
                this.session.result = 'victory';
                this.session.chestsEarned += 3;
                console.log(`🏆 通关成功! 获得 3 宝箱!`);
            } else {
                this.session.currentStage++;
            }
        } else {
            this.session.isFinished = true;
            this.session.result = 'defeat';
        }
    }

    public printSessionStatus(): void {
        if (!this.session) return;
        
        console.log(`\n状态: 阶段${this.session.currentStage}/10, HP:${this.session.player.currentHp}/${this.session.player.maxHp}, 宝箱:${this.session.chestsEarned}`);
    }

    public printStarterOptions(options: WorkerBeast[]): void {
        options.forEach((beast, idx) => {
            console.log(`[${idx+1}] ${beast.class} ${beast.element} ⭐${beast.starLevel} HP:${beast.baseHp}`);
        });
    }

    public printActiveEntity(entity: ActiveRunEntity): void {
        console.log(`HP: ${entity.currentHp}/${entity.maxHp}, ATK: ${entity.baseAttack}`);
    }

    public get chestsEarned(): number {
        return this.session?.chestsEarned || 0;
    }
}