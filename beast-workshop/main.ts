/**
 * main.ts - 前端入口
 * 真实实例化 TypeScript 引擎并绑定 UI 事件
 */
import { MetaGameManager } from './MetaGameManager';
import { RunManager } from './RunManager';
import { WorkstationManager } from './WorkstationManager';
import { BattleEngine, BattleEvent } from './BattleEngine';
import { GAME_CONFIG, ActiveRunEntity, WorkerBeast, DraftChoice, RunSkill, RunEquipment } from './types';
import { checkSynergyEvolution } from './SynergyRegistry';

// ========== 常量 ==========
const ELEMENT_ICONS: Record<string, string> = {
    'Fire': '🔥', 'Ice': '❄️', 'Thunder': '⚡', 'Venom': '🧪'
};
const CLASS_ICONS: Record<string, string> = {
    'Striker': '⚔️', 'Caster': '🧙‍♂️', 'Conjurer': '🔮'
};
const STATUS_ICONS: Record<string, string> = {
    'burn': '🔥', 'poison': '☠️', 'freeze': '❄️', 'shock': '⚡', 'stun': '💫'
};

// ========== 游戏状态 ==========
let metaManager: MetaGameManager;
let runManager: RunManager;
let workstation: WorkstationManager;
let battleEngine: BattleEngine | null = null;
let battleInterval: number | null = null;

// ========== DOM 元素 ==========
const els = {
    gold: document.getElementById('gold-display')!,
    chests: document.getElementById('chests-display')!,
    homeScene: document.getElementById('home-scene')!,
    battleScene: document.getElementById('battle-scene')!,
    beastGrid: document.getElementById('beast-grid')!,
    workstationGrid: document.getElementById('workstation-grid')!,
    draftModal: document.getElementById('draft-modal')!,
    draftChoices: document.getElementById('draft-choices')!,
    resultModal: document.getElementById('result-modal')!,
    resultIcon: document.getElementById('result-icon')!,
    resultTitle: document.getElementById('result-title')!,
    resultRewards: document.getElementById('result-rewards')!,
    battleLog: document.getElementById('battle-log')!,
    playerAvatar: document.getElementById('player-avatar')!,
    enemyAvatar: document.getElementById('enemy-avatar')!,
    playerHpBar: document.getElementById('player-hp-bar')!,
    playerHpText: document.getElementById('player-hp-text')!,
    enemyHpBar: document.getElementById('enemy-hp-bar')!,
    enemyHpText: document.getElementById('enemy-hp-text')!,
    playerStatus: document.getElementById('player-status')!,
    enemyStatus: document.getElementById('enemy-status')!,
    playerSummon: document.getElementById('player-summon')!,
    stageDisplay: document.getElementById('stage-display')!,
    synergyBanner: document.getElementById('synergy-banner')!,
    actionBar: document.getElementById('action-bar')!,
    btnOpenChest: document.getElementById('btn-open-chest')!,
    btnStartRun: document.getElementById('btn-start-run')!,
    btnIdle: document.getElementById('btn-idle')!,
    btnReroll: document.getElementById('btn-reroll')!,
    btnReturnHome: document.getElementById('btn-return-home')!
};

// ========== 拖拽状态 ==========
let draggedBeast: { id: string; source: string; index: number; beast: any } | null = null;

// ========== 初始化游戏 ==========
function initGame() {
    // 实例化管理器
    metaManager = MetaGameManager.getInstance();
    workstation = new WorkstationManager();
    runManager = new RunManager();

    // 初始放入一些幻兽用于测试
    addTestBeasts();

    // 渲染UI
    renderGrid();
    renderWorkstation();
    updateResources();

    // 绑定事件
    bindEvents();

    console.log('🎮 游戏初始化完成 - 真实引擎已连接');
}

function addTestBeasts() {
    // 在网格中放入测试幻兽
    const testBeasts = [
        { uid: 'TEST1', class: 'Conjurer', element: 'Ice', starLevel: 1, baseHp: 100, baseAttack: 10, workPower: 5 },
        { uid: 'TEST2', class: 'Conjurer', element: 'Ice', starLevel: 1, baseHp: 100, baseAttack: 10, workPower: 5 },
        { uid: 'TEST3', class: 'Striker', element: 'Thunder', starLevel: 1, baseHp: 100, baseAttack: 10, workPower: 5 },
    ];
    
    testBeasts.forEach((beast, i) => {
        if (metaManager.grid[i]) {
            metaManager.grid[i].beast = beast as any;
        }
    });
}

// ========== UI 渲染 ==========
function updateResources() {
    els.gold.textContent = String(metaManager.metaState.gold);
    els.chests.textContent = String(metaManager.metaState.chests);
}

function renderGrid() {
    els.beastGrid.innerHTML = '';
    
    for (let i = 0; i < GAME_CONFIG.gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = String(i);
        
        const beast = metaManager.grid[i]?.beast;
        if (beast) {
            const card = createBeastCard(beast, 'grid', i);
            cell.appendChild(card);
        }
        
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('dragleave', handleDragLeave);
        cell.addEventListener('drop', handleDrop);
        
        els.beastGrid.appendChild(cell);
    }
}

function renderWorkstation() {
    els.workstationGrid.innerHTML = '';
    
    const maxSlots = GAME_CONFIG.workstationSlots + metaManager.getExtraWorkstationSlots();
    let totalPower = 0;
    
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'work-slot';
        slot.dataset.index = String(i);
        slot.dataset.type = 'workstation';
        
        const beast = workstation.workstation[i];
        if (beast) {
            slot.appendChild(createBeastCard(beast, 'workstation', i));
            totalPower += beast.workPower;
        }
        
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
        
        els.workstationGrid.appendChild(slot);
    }
    
    // 显示总产出
    const powerDisplay = document.createElement('div');
    powerDisplay.className = 'power-display';
    powerDisplay.textContent = `产出: +${totalPower}/tick`;
    powerDisplay.style.width = 'auto';
    powerDisplay.style.position = 'static';
    els.workstationGrid.appendChild(powerDisplay);
}

function createBeastCard(beast: any, source: string, index: number) {
    const card = document.createElement('div');
    card.className = `beast-card element-${beast.element}`;
    card.draggable = true;
    card.dataset.id = beast.uid;
    card.dataset.source = source;
    card.dataset.index = String(index);
    card.innerHTML = `
        <span class="beast-star">${'⭐'.repeat(beast.starLevel)}</span>
        <span class="beast-element">${ELEMENT_ICONS[beast.element]}</span>
        <div style="font-size:28px">${CLASS_ICONS[beast.class]}</div>
        <div style="font-size:10px">${beast.workPower || 5}⚡</div>
    `;
    
    card.addEventListener('dragstart', (e) => {
        draggedBeast = { id: beast.uid, source, index, beast };
        card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    
    return card;
}

// ========== 拖拽处理 ==========
function handleDragOver(e: DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drag-over');
}

function handleDragLeave(e: DragEvent) {
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
}

function handleDrop(e: DragEvent) {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    if (!draggedBeast) return;
    
    const targetType = target.dataset.type || 'grid';
    const targetIndex = parseInt(target.dataset.index || '0');
    
    // 获取源幻兽
    let sourceBeast: any;
    if (draggedBeast.source === 'grid') {
        sourceBeast = metaManager.grid[draggedBeast.index]?.beast;
    } else {
        sourceBeast = workstation.workstation[draggedBeast.index];
    }
    
    // 获取目标幻兽
    let targetBeast: any;
    if (targetType === 'grid') {
        targetBeast = metaManager.grid[targetIndex]?.beast;
    } else {
        targetBeast = workstation.workstation[targetIndex];
    }
    
    // 尝试合并
    if (targetBeast && targetBeast.uid !== sourceBeast.uid) {
        if (tryMerge(sourceBeast, targetBeast, draggedBeast, targetType, targetIndex)) {
            draggedBeast = null;
            return;
        }
    }
    
    // 移动
    moveBeast(draggedBeast, targetType, targetIndex);
    draggedBeast = null;
}

function tryMerge(source: any, target: any, sourceInfo: any, targetType: string, targetIndex: number): boolean {
    if (source.class === target.class && 
        source.element === target.element && 
        source.starLevel === target.starLevel) {
        
        // 找第3个
        let third: any = null;
        let thirdLoc: { type: string; index: number } | null = null;
        
        // 网格中找
        for (let i = 0; i < GAME_CONFIG.gridSize; i++) {
            const b = metaManager.grid[i]?.beast;
            if (b && b.uid !== source.uid && b.uid !== target.uid &&
                b.class === source.class && b.element === source.element && b.starLevel === source.starLevel) {
                third = b;
                thirdLoc = { type: 'grid', index: i };
                break;
            }
        }
        
        // 工作站中找
        if (!third) {
            for (let i = 0; i < workstation.workstation.length; i++) {
                const b = workstation.workstation[i];
                if (b && b.uid !== source.uid && b.uid !== target.uid &&
                    b.class === source.class && b.element === source.element && b.starLevel === source.starLevel) {
                    third = b;
                    thirdLoc = { type: 'workstation', index: i };
                    break;
                }
            }
        }
        
        if (third && thirdLoc) {
            // 执行合并
            const newBeast = {
                uid: 'M' + Date.now(),
                class: source.class,
                element: source.element,
                starLevel: source.starLevel + 1,
                baseHp: Math.floor(source.baseHp * 1.5),
                baseAttack: Math.floor(source.baseAttack * 1.5),
                workPower: (source.workPower || 5) * 3
            };
            
            // 清除3个
            if (sourceInfo.source === 'grid') metaManager.grid[sourceInfo.index].beast = null;
            else workstation.workstation[sourceInfo.index] = null;
            
            if (targetType === 'grid') metaManager.grid[targetIndex].beast = newBeast;
            else workstation.workstation[targetIndex] = newBeast;
            
            if (thirdLoc.type === 'grid') metaManager.grid[thirdLoc.index].beast = null;
            else workstation.workstation[thirdLoc.index] = null;
            
            showToast(`⭐ 合成成功! ${CLASS_ICONS[newBeast.class]} 升到 ${newBeast.starLevel}星!`);
            renderGrid();
            renderWorkstation();
            return true;
        }
    }
    return false;
}

function moveBeast(sourceInfo: any, targetType: string, targetIndex: number) {
    let sourceBeast: any;
    
    if (sourceInfo.source === 'grid') {
        sourceBeast = metaManager.grid[sourceInfo.index]?.beast;
        metaManager.grid[sourceInfo.index].beast = null;
    } else {
        sourceBeast = workstation.workstation[sourceInfo.index];
        workstation.workstation[sourceInfo.index] = null;
    }
    
    if (!sourceBeast) return;
    
    // 如果目标有幻兽，交换
    let targetBeast: any;
    if (targetType === 'grid') {
        targetBeast = metaManager.grid[targetIndex]?.beast;
        metaManager.grid[targetIndex].beast = sourceBeast;
    } else {
        targetBeast = workstation.workstation[targetIndex];
        workstation.workstation[targetIndex] = sourceBeast;
    }
    
    // 把目标幻兽放回源位置
    if (targetBeast) {
        if (sourceInfo.source === 'grid') {
            metaManager.grid[sourceInfo.index].beast = targetBeast;
        } else {
            workstation.workstation[sourceInfo.index] = targetBeast;
        }
    }
    
    renderGrid();
    renderWorkstation();
}

// ========== 游戏功能 ==========
function openChest() {
    if (metaManager.metaState.chests <= 0) {
        showToast('🎁 宝箱不足!');
        return;
    }
    
    const result = workstation.openChest();
    if (result) {
        updateResources();
        renderGrid();
        renderWorkstation();
        showToast('🎉 获得新幻兽!');
    }
}

function startRun() {
    const allBeasts = [
        ...metaManager.grid.filter(c => c.beast).map(c => c.beast!),
        ...workstation.workstation.filter(b => b)
    ];
    
    if (allBeasts.length === 0) {
        showToast('⚠️ 没有可用幻兽!');
        return;
    }
    
    // 选择星级最高的
    const selected = allBeasts.sort((a, b) => (b?.starLevel || 0) - (a?.starLevel || 0))[0];
    
    // 开始冒险
    runManager.startRun(selected as any);
    
    // 切换场景
    els.homeScene.classList.remove('active');
    els.battleScene.classList.add('active');
    els.actionBar.style.display = 'none';
    els.btnIdle.style.display = 'none';
    
    // 更新玩家显示
    const player = runManager.session!.player;
    els.playerAvatar.textContent = CLASS_ICONS[player.class];
    
    // 开始第1关
    runManager.runNextStage();
    
    // 检查是否需要选秀/商人
    const stage = runManager.session!.currentStage;
    if (stage === 1 || stage === 4 || stage === 7) {
        showDraftModal();
    } else if (stage === 5 || stage === 8) {
        showMerchantModal();
    } else if (stage > 10 || runManager.session!.isFinished) {
        // 战斗结束
        handleRunEnd();
    } else {
        // 开始战斗
        startBattle();
    }
}

// ========== 战斗系统 ==========
function startBattle() {
    if (!runManager.session) return;
    
    const player = runManager.session.player;
    const stage = runManager.session.currentStage;
    
    // 生成敌人
    const enemy = generateEnemyForStage(stage);
    
    // 更新UI
    els.stageDisplay.textContent = `Stage ${stage}/10 - 战斗`;
    els.enemyAvatar.textContent = enemy.isBoss ? '👿' : '👹';
    updateHpDisplay();
    clearBattleLog();
    addBattleLog(`⚔️ 战斗开始! 遭遇 ${enemy.isBoss ? 'BOSS' : '敌人'}!`);
    
    // 创建战斗引擎
    battleEngine = new BattleEngine(player, enemy);
    
    // 启动战斗循环
    battleInterval = window.setInterval(() => {
        if (!battleEngine || battleEngine.isFinished) {
            if (battleInterval) clearInterval(battleInterval);
            return;
        }
        
        battleEngine.tick();
        
        // 更新UI
        updateHpDisplay();
        updateStatusDisplay();
        
        // 处理羁绊进化提示
        if (player.passiveSkills && player.passiveSkills.length > 0) {
            const lastPassive = player.passiveSkills[player.passiveSkills.length - 1];
            if (lastPassive?.isUltimateForm) {
                showSynergyBanner();
            }
        }
        
        // 检查结束
        if (battleEngine.isFinished) {
            if (battleInterval) clearInterval(battleInterval);
            handleBattleEnd();
        }
    }, 500);
}

function generateEnemyForStage(stage: number): ActiveRunEntity {
    const growth = Math.pow(1.3, stage - 1);
    const isBoss = stage === 10;
    let hp = Math.floor(80 * growth), atk = Math.floor(8 * growth);
    if (isBoss) hp *= 2;
    
    const elements = ['Fire', 'Ice', 'Thunder', 'Venom'] as const;
    const classes = ['Striker', 'Caster', 'Conjurer'] as const;
    
    let affixes: any[] = [];
    const affixPool = ['armored', 'thorns', 'regen', 'berserk'];
    let count = 0;
    if (stage >= 4 && stage <= 6) count = 1;
    else if (stage >= 7 && stage <= 9) count = 2;
    else if (stage === 10) count = 3;
    for (let i = 0; i < count; i++) affixes.push(affixPool[Math.floor(Math.random() * 4)]);
    
    return {
        class: classes[Math.floor(Math.random() * 3)],
        element: elements[Math.floor(Math.random() * 4)],
        starLevel: Math.min(5, 1 + Math.floor(stage / 3)),
        maxHp: hp,
        currentHp: hp,
        baseAttack: atk,
        skills: isBoss ? [{ id: 'boss_skill', name: 'Boss技能', type: 'damage', maxCd: 4, currentCd: 0, effectValue: atk }] : [],
        equipments: [],
        effects: [],
        isBoss,
        eliteAffixes: affixes as any,
        summon: null,
        passiveSkills: []
    };
}

function updateHpDisplay() {
    if (!battleEngine) return;
    
    const p = battleEngine.player;
    const e = battleEngine.enemy;
    
    els.playerHpBar.style.width = (p.currentHp / p.maxHp * 100) + '%';
    els.playerHpText.textContent = `${p.currentHp}/${p.maxHp}`;
    els.enemyHpBar.style.width = (e.currentHp / e.maxHp * 100) + '%';
    els.enemyHpText.textContent = `${e.currentHp}/${e.maxHp}`;
    
    // 显示召唤物
    if (p.summon) {
        els.playerSummon.textContent = `👻 ${p.summon.name}: ${p.summon.currentHp}/${p.summon.maxHp}`;
    } else {
        els.playerSummon.textContent = '';
    }
}

function updateStatusDisplay() {
    if (!battleEngine) return;
    
    // 玩家状态
    els.playerStatus.innerHTML = battleEngine.player.effects
        .map(e => `<span>${STATUS_ICONS[e.type] || '?'}</span>`).join('');
    
    // 敌方状态
    els.enemyStatus.innerHTML = battleEngine.enemy.effects
        .map(e => `<span>${STATUS_ICONS[e.type] || '?'}</span>`).join('');
}

function handleBattleEnd() {
    if (!battleEngine || !runManager.session) return;
    
    const player = runManager.session.player;
    const enemy = battleEngine.enemy;
    
    if (enemy.currentHp <= 0) {
        addBattleLog('🎉 战斗胜利!');
        
        // 回血
        const heal = Math.floor(player.maxHp * 0.2);
        player.currentHp = Math.min(player.maxHp, player.currentHp + heal);
        
        if (runManager.session.currentStage === 10) {
            // 通关
            runManager.session.chestsEarned += 3;
            metaManager.metaState.chests += 3;
            handleRunEnd();
        } else {
            // 下一关
            runManager.session.currentStage++;
            setTimeout(() => {
                const stage = runManager.session!.currentStage;
                
                if (stage === 1 || stage === 4 || stage === 7) {
                    showDraftModal();
                } else if (stage === 5 || stage === 8) {
                    showMerchantModal();
                } else {
                    startBattle();
                }
            }, 1000);
        }
    } else {
        addBattleLog('💀 战斗失败!');
        handleRunEnd();
    }
    
    updateResources();
}

function handleRunEnd() {
    if (battleInterval) clearInterval(battleInterval);
    
    const isVictory = runManager.session?.result === 'victory';
    
    els.resultIcon.textContent = isVictory ? '🏆' : '💀';
    els.resultTitle.textContent = isVictory ? '通关成功!' : '战斗失败';
    els.resultRewards.textContent = isVictory ? `获得 ${runManager.session?.chestsEarned || 0} 个宝箱` : '再试一次吧';
    
    els.resultModal.classList.add('active');
}

function returnHome() {
    els.resultModal.classList.remove('active');
    els.synergyBanner.style.display = 'none';
    els.battleScene.classList.remove('active');
    els.homeScene.classList.add('active');
    els.actionBar.style.display = 'flex';
    
    battleEngine = null;
    renderGrid();
    renderWorkstation();
    updateResources();
}

// ========== 选秀/商人 ==========
let currentChoices: DraftChoice[] = [];

function showDraftModal() {
    if (!runManager.session) return;
    
    currentChoices = runManager.generateDraft();
    renderChoices(currentChoices);
    els.draftModal.classList.add('active');
}

function showMerchantModal() {
    if (!runManager.session) return;
    
    currentChoices = runManager.generateMerchant();
    renderChoices(currentChoices);
    els.draftModal.classList.add('active');
}

function renderChoices(choices: DraftChoice[]) {
    els.draftChoices.innerHTML = '';
    
    choices.forEach((choice, i) => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        
        let icon = '✨';
        let name = '';
        let desc = '';
        
        if (choice.type === 'skill') {
            icon = '✨';
            name = choice.data.name || '技能';
            desc = choice.data.description || `伤害: ${choice.data.effectValue}`;
        } else if (choice.type === 'star_up') {
            icon = '⭐';
            name = '升星';
            desc = '+10% 属性';
        } else if (choice.type === 'merchant_item') {
            icon = choice.data.equipment?.type === 'attack_boost' ? '⚔️' : '❤️';
            name = choice.data.equipment?.name || '装备';
            desc = `+${choice.data.equipment?.value}`;
        }
        
        card.innerHTML = `
            <div class="choice-icon">${icon}</div>
            <div class="choice-name">${name}</div>
            <div class="choice-desc">${desc}</div>
            ${choice.cost ? `<div class="choice-cost">${choice.cost}💰</div>` : ''}
        `;
        
        card.onclick = () => selectChoice(i);
        els.draftChoices.appendChild(card);
    });
}

function selectChoice(index: number) {
    const choice = currentChoices[index];
    if (!choice) return;
    
    // 检查金币
    if (choice.cost && metaManager.metaState.gold < choice.cost) {
        showToast('💰 金币不足!');
        return;
    }
    
    // 应用选择
    runManager.applyDraftChoice(choice);
    
    // 隐藏弹窗
    els.draftModal.classList.remove('active');
    
    // 检查羁绊
    checkSynergyInUI();
    
    updateResources();
    
    // 继续流程
    if (runManager.session && !runManager.session.isFinished) {
        const stage = runManager.session.currentStage;
        
        if (stage > 10 || runManager.session.isFinished) {
            handleRunEnd();
        } else if (battleEngine) {
            startBattle();
        } else {
            startBattle();
        }
    }
}

function rerollDraft() {
    if (metaManager.metaState.gold < 50) {
        showToast('💰 金币不足!');
        return;
    }
    
    metaManager.metaState.gold -= 50;
    updateResources();
    
    // 重新生成选项
    if (runManager.session) {
        currentChoices = runManager.generateDraft();
        renderChoices(currentChoices);
    }
}

function checkSynergyInUI() {
    if (!runManager.session) return;
    
    const player = runManager.session.player;
    
    // 检查是否有进化后的技能
    const ultimateSkills = player.skills.filter(s => s.isUltimateForm) || [];
    const passiveSkills = player.passiveSkills?.filter(s => s.isUltimateForm) || [];
    
    if (ultimateSkills.length > 0 || passiveSkills.length > 0) {
        showSynergyBanner();
    }
}

function showSynergyBanner() {
    els.synergyBanner.style.display = 'block';
    setTimeout(() => {
        els.synergyBanner.style.display = 'none';
    }, 5000);
}

// ========== 战斗日志 ==========
function clearBattleLog() {
    els.battleLog.innerHTML = '';
}

function addBattleLog(msg: string) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    if (msg.includes('伤害')) entry.classList.add('log-damage');
    else if (msg.includes('恢复') || msg.includes('吸血')) entry.classList.add('log-heal');
    else if (msg.includes('技能') || msg.includes('释放')) entry.classList.add('log-skill');
    else if (msg.includes('召唤')) entry.classList.add('log-summon');
    else if (msg.includes('被动') || msg.includes('效果')) entry.classList.add('log-passive');
    
    entry.textContent = msg;
    els.battleLog.appendChild(entry);
    els.battleLog.scrollTop = els.battleLog.scrollHeight;
}

// ========== 工具 ==========
function showToast(msg: string) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// ========== 事件绑定 ==========
function bindEvents() {
    els.btnOpenChest.addEventListener('click', openChest);
    els.btnStartRun.addEventListener('click', startRun);
    els.btnReroll.addEventListener('click', rerollDraft);
    els.btnReturnHome.addEventListener('click', returnHome);
    
    // 挂机产出按钮
    els.btnIdle.addEventListener('click', () => {
        const power = workstation.calculateYield();
        updateResources();
        showToast(`⏳ 挂机产出 +${power} 金币!`);
    });
}

// ========== 启动 ==========
initGame();
