/**
 * Bluey: Vamos Brincar! — Educational Web Edition
 * Uses 100% original extracted Unity sprites, rooms, characters, colouring pages, dress-up items, and BBQ assets.
 */

(function () {
  const DATA = window.BLUEY_GAME_DATA || { characters: [], rooms: [], props: [], colouring: [], dressup: [], bbq: [] };

  // Image Cache
  const imgCache = new Map();
  function getImg(src) {
    if (!src) return null;
    if (imgCache.has(src)) return imgCache.get(src);
    const img = new Image();
    img.src = src;
    imgCache.set(src, img);
    return img;
  }

  // Web Audio Synthesizer (Theme Melody, Xylophone, Pop, Sizzle, Cheer)
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.musicEnabled = true;
      this.musicTimer = null;
      this.step = 0;
    }
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    playTone(freq, dur = 0.18, type = 'triangle', vol = 0.18, slideTo = null) {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    }
    playPop() {
      this.playTone(380, 0.11, 'sine', 0.22, 760);
    }
    playMagicFreeze(frozen) {
      const notes = frozen ? [880, 659, 523, 392] : [392, 523, 659, 880];
      notes.forEach((n, i) => setTimeout(() => this.playTone(n, 0.18, 'sine', 0.22), i * 70));
    }
    playCheer() {
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((n, i) => setTimeout(() => this.playTone(n, 0.28, 'triangle', 0.2), i * 85));
    }
    playXyloNote(idx) {
      const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
      this.playTone(scale[idx % scale.length], 0.35, 'sine', 0.28);
    }
    startMusic() {
      if (this.musicTimer) return;
      // Cheerful Bluey-inspired playful melody (major pentatonic bounce)
      const melody = [
        659.25, 587.33, 523.25, 587.33, 659.25, 783.99, 659.25, 0,
        587.33, 523.25, 440.00, 523.25, 587.33, 659.25, 523.25, 0,
        659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25, 587.33,
        659.25, 523.25, 587.33, 493.88, 523.25, 0, 0, 0
      ];
      this.musicTimer = setInterval(() => {
        if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
        const note = melody[this.step % melody.length];
        if (note > 0) {
          this.playTone(note, 0.18, 'triangle', 0.055);
        }
        this.step++;
      }, 240);
    }
    toggleMusic() {
      this.init();
      this.musicEnabled = !this.musicEnabled;
      if (this.musicEnabled) this.startMusic();
      return this.musicEnabled;
    }
  }

  const sfx = new SoundEngine();
  window.addEventListener('pointerdown', () => {
    sfx.init();
    sfx.startMusic();
  }, { once: true });

  // Global Game State
  const state = {
    view: 'menu',
    stars: 0,
    longdogsFound: 0,
    currentRoom: null,
    camX: 0,
    maxCamX: 500,
    entities: [], // characters and props in the active room
    balloon: null,
    balloonScore: 0,
    dragTarget: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isPanning: false,
    panStartX: 0,
    panStartCamX: 0,
    longdogHidden: null,
    activeMission: null
  };

  function addStar(count = 1, msg = null) {
    state.stars += count;
    document.getElementById('star-count').textContent = state.stars;
    sfx.playCheer();
    if (msg) showToast(msg);
  }

  let toastTimeout = null;
  function showToast(text) {
    const el = document.getElementById('speech-toast');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.add('hidden'), 4200);
  }

  // Character dialogue & educational quotes
  const CHAR_QUOTES = {
    Bluey: ['"Por vida real! Vamos inventar uma brincadeira nova?"', '"Que tal tocarmos o Xilofone Mágico?"', '"Não deixe o balão tocar no chão!"'],
    Bingo: ['"Oba! Eu adoro brincar com a minha irmã Bluey!"', '"Olha um inseto pequenininho! Vamos cuidar dele!"', '"Modo Dança ativado!"'],
    Bandit: ['"Haha! Quem quer brincar de cavalinho ou fazer churrasco?"', '"Eu não vou receber conselhos de um desenho animado!"', '"Hora de contar os ingredientes!"'],
    Chilli: ['"Respire fundo... e vamos organizar o nosso espaço!"', '"Trabalhar em equipe deixa tudo mais divertido!"', '"Que desenho lindo vocês fizeram!"'],
    Muffin: ['"EU SOU UMA LHAMA COMENDO BANANA!"', '"É a minha vez de usar a coroa!"'],
    Calypso: ['"Toda brincadeira ensina uma história especial..."', '"O que vocês acham que acontece se trabalharmos juntos?"']
  };

  // Switch active view
  function switchView(viewName) {
    state.view = viewName;
    document.querySelectorAll('.view-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('active');

    const isRoom = viewName === 'room';
    document.getElementById('btn-keepy-uppy').classList.toggle('hidden', !isRoom);
    document.getElementById('btn-xylophone').classList.toggle('hidden', !isRoom);

    if (viewName === 'menu') {
      document.getElementById('current-room-title').textContent = 'Mapa da Vizinhança dos Heeler';
      document.getElementById('current-room-edu').textContent = 'Todos os 30 cenários, 41 personagens e minijogos estão desbloqueados!';
      document.getElementById('mission-text').textContent = 'Missão: Escolha um cenário ou minijogo!';
    }
    sfx.playPop();
  }

  // =========================================================================
  // 1. MAIN MENU (BUBBLE MAP + MINIGAMES)
  // =========================================================================
  const MINIGAME_BUBBLES = [
    {
      id: 'mg-colouring',
      title: '🎨 Livro de Colorir Oficial',
      bubble: 'assets/bubbles/UI_BubbleIcons_Colouring.png',
      fallbackBubble: 'assets/props/SP_UI_ColoringButton@1x_@1x_0.png',
      cat: 'minigames',
      action: () => openColouringMinigame()
    },
    {
      id: 'mg-dressup',
      title: '👑 Estúdio de Fantasias (Dress-Up)',
      bubble: 'assets/bubbles/UI_ButtonMM_Bubble_MG_01_B.png',
      cat: 'minigames',
      action: () => openDressUpMinigame()
    },
    {
      id: 'mg-bbq',
      title: '🍖 Churrasco e Contagem do Bandit',
      bubble: 'assets/bubbles/UI_ButtonMM_Bubble_MG_03_B.png',
      cat: 'minigames',
      action: () => openBBQMinigame()
    },
    {
      id: 'mg-dance',
      title: '🕺 Modo Dança & Xilofone Musical',
      bubble: 'assets/bubbles/UI_ButtonMM_Bubble_MG_06_B.png',
      cat: 'minigames',
      action: () => openDanceMinigame()
    }
  ];

  function getRoomCategory(roomId) {
    if (roomId.includes('christmas') || roomId.includes('halloween') || roomId.includes('night') || roomId.includes('dawn')) {
      return 'special';
    }
    const houseIds = ['kitchen', 'playroom', 'backyard', 'kids-bedroom', 'lounge', 'central-room', 'bathroom', 'office', 'deck', 'frontyard', 'front-door', 'garden', 'cubby', 'kitchen-omelette'];
    if (houseIds.includes(roomId)) return 'house';
    return 'town';
  }

  function renderMainMenu(filter = 'all') {
    const container = document.getElementById('bubbles-container');
    container.innerHTML = '';

    if (filter === 'all' || filter === 'minigames') {
      MINIGAME_BUBBLES.forEach(mg => {
        const card = document.createElement('div');
        card.className = 'bubble-card minigame-card';
        card.innerHTML = `
          <span class="bubble-badge">MINIJOGO</span>
          <div class="bubble-img-wrap">
            <img class="bubble-thumb" src="${mg.bubble}" onerror="this.src='assets/bubbles/UI_ButtonMM_Bubble_MG_01_B.png'" alt="${mg.title}" />
          </div>
          <div class="bubble-title">${mg.title}</div>
        `;
        card.addEventListener('click', mg.action);
        container.appendChild(card);
      });
    }

    DATA.rooms.forEach(room => {
      const cat = getRoomCategory(room.id);
      if (filter !== 'all' && filter !== cat) return;
      const card = document.createElement('div');
      card.className = 'bubble-card';
      card.innerHTML = `
        <span class="bubble-badge">ABERTO</span>
        <div class="bubble-img-wrap">
          <img class="bubble-thumb" src="${room.bubble}" onerror="this.src='${room.bg}'" alt="${room.title}" />
        </div>
        <div class="bubble-title">${room.title}</div>
      `;
      card.addEventListener('click', () => openRoom(room));
      container.appendChild(card);
    });
  }

  document.querySelectorAll('.menu-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.menu-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMainMenu(btn.dataset.filter);
      sfx.playPop();
    });
  });

  // =========================================================================
  // 2. DOLLHOUSE 2.5D ROOM ENGINE (30 ROOMS + 41 CHARACTERS + 2.5D DEPTH + SURFACES)
  // =========================================================================
  const roomCanvas = document.getElementById('room-canvas');
  const roomCtx = roomCanvas.getContext('2d');

  // Helper: map a floor Y position (around floorY..530) to a 2.5D depth Z value
  // In Unity rooms, back wall is around z=2400, middle furniture is around z=1100..1800, foreground is around z=500..900.
  function computeFloorZ(y, floorY) {
    const room = state.currentRoom;
    if (room && room.wallY !== undefined) return Math.round(room.zRef - (y - room.wallY) / room.zK);
    const rel = y - (floorY || 435);
    return Math.round(1450 - rel * 11);
  }

  // Evaluate best landing target (2.5D surface, chair seat, or floor) for a given (x, footY)
  function findBestLanding(room, ent, x, footY) {
    if (!room) return { groundY: 450, z: 1200, surfaceName: null };
    const floorY = room.floorY || 440;

    // 1. If character, check nearby chair/sofa/stool Seat Anchors first!
    if (ent && ent.kind === 'char' && room.seats && room.seats.length > 0) {
      let bestSeat = null;
      let bestDist = 52;
      for (const seat of room.seats) {
        const d = Math.hypot(x - seat.x, footY - seat.y);
        if (d < bestDist) {
          bestDist = d;
          bestSeat = seat;
        }
      }
      if (bestSeat) {
        return {
          snapX: bestSeat.x,
          groundY: bestSeat.y,
          z: bestSeat.z,
          surfaceName: bestSeat.name,
          isSeat: true
        };
      }
    }

    // 2. Check 2.5D Surfaces (Tables, Counters, Shelves, Fridge Shelves, Beds, Desks)
    // Only consider active surfaces (e.g. if fridge door is closed, skip fridge internal shelves unless door is open)
    if (room.surfaces && room.surfaces.length > 0) {
      let bestSurf = null;
      let bestDy = 54; // vertical snap window around surface top
      for (const surf of room.surfaces) {
        if (x >= surf.x0 - 8 && x <= surf.x1 + 8) {
          const dy = Math.abs(footY - surf.y);
          // Allow snapping if dropped near the surface top
          if (dy < bestDy) {
            bestDy = dy;
            bestSurf = surf;
          }
        }
      }
      if (bestSurf) {
        return {
          groundY: bestSurf.y,
          z: bestSurf.z - (ent && ent.kind === 'prop' ? 4 : 6),
          surfaceName: bestSurf.name,
          surfaceRect: bestSurf
        };
      }
    }

    // 3. Otherwise land on the Floor Depth Band!
    // Players can place characters/items slightly further back on the floor or closer to the foreground
    const minFloorY = Math.max(380, floorY - 22);
    const maxFloorY = Math.min((room.h || 540) - 14, floorY + 65);
    const clampedFloorY = Math.max(minFloorY, Math.min(maxFloorY, footY >= minFloorY ? footY : floorY + 8));
    return {
      groundY: clampedFloorY,
      z: computeFloorZ(clampedFloorY, floorY),
      surfaceName: null
    };
  }

  function openRoom(room) {
    state.currentRoom = room;
    switchView('room');
    document.getElementById('current-room-title').textContent = room.title;
    document.getElementById('current-room-edu').textContent = room.eduNote;

    // Preload room background
    getImg(room.bg);

    const floorY = room.floorY || 440;
    state.entities = [];
    state.roomFurniture = [];
    state.hoveredSurface = null;
    state.selectedCharUid = null;

    // Load 2.5D Room Objects (separated from backdrop!)
    if (room.objects && room.objects.length > 0) {
      room.objects.forEach(obj => {
        getImg(obj.sprite);
        const clone = Object.assign({}, obj);
        if (clone.role === 'draggable') {
          // Convert scene draggable into a live interactive 2.5D prop entity at its exact original position!
          const left = clone.x - (clone.flipX ? (clone.w - clone.pivX) : clone.pivX);
          const top = clone.y - clone.pivY;
          const centerX = left + clone.w / 2;
          const bottomY = top + clone.h;
          state.entities.push({
            uid: clone.id,
            kind: 'prop',
            id: clone.prefab,
            name: clone.name,
            sprite: clone.sprite,
            x: centerX,
            y: bottomY,
            groundY: bottomY,
            z: clone.z - 8,
            w: clone.w,
            h: clone.h,
            vy: 0,
            flipX: !!clone.flipX
          });
        } else {
          state.roomFurniture.push(clone);
        }
      });
    }

    // Center camera in logical room coordinates
    const vw = roomCanvas.clientWidth || window.innerWidth;
    const vh = roomCanvas.clientHeight || window.innerHeight;
    const viewScale = vh / (room.h || 540);
    const visibleRoomW = vw / viewScale;
    state.maxCamX = Math.max(0, room.w - visibleRoomW);
    state.camX = state.maxCamX * 0.45;

    // Populate default family characters standing firmly on the floor!
    const defaultChars = ['Bluey', 'Bingo', 'Bandit', 'Chilli'];
    defaultChars.forEach((cid, idx) => {
      const cdata = DATA.characters.find(c => c.id === cid) || DATA.characters[idx];
      if (cdata) {
        const cx = state.camX + visibleRoomW * 0.22 + idx * 145;
        const cy = floorY + (idx % 2) * 14;
        spawnCharacterInRoom(cdata, cx, cy);
      }
    });

    // Fallback hidden Longdog if room didn't have a dedicated Longdog prefab
    const hasSceneLongdog = state.roomFurniture.some(o => o.role === 'longdog');
    state.longdogHidden = hasSceneLongdog ? null : {
      x: 180 + Math.random() * (room.w - 360),
      y: floorY - 40 - Math.random() * 140,
      found: false
    };

    generateRoomMission(room);
    renderDockTray('chars');
    showToast(`Bem-vindo(a) a: ${room.title}! Arraste objetos para mesas, prateleiras ou abra portas! 🐾`);
  }

  function generateRoomMission(room) {
    const missions = [
      { text: `Pegue uma fruta, prato ou brinquedo e coloque em cima de uma mesa ou bancada!`, type: 'surface' },
      { text: `Encontre o Cachorro Comprido (🌭 Longdog) escondido em ${room.title}!`, type: 'longdog' },
      { text: `Traga mais 2 amigos da bandeja de personagens para brincar juntos!`, type: 'friends', target: 6 },
      { text: `Brinque de Balão (🎈 Keepy Uppy) e faça 5 toques sem deixar cair!`, type: 'balloon', target: 5 },
      { text: `Coloque um chapéu ou fantasia em qualquer personagem!`, type: 'hat' }
    ];
    state.activeMission = missions[Math.floor(Math.random() * missions.length)];
    document.getElementById('mission-text').textContent = `Missão: ${state.activeMission.text}`;
  }

  function spawnCharacterInRoom(charData, x, y) {
    // Character poses were exported at out_scale=0.75 (same as room scale!), so 0.88 gives authentic screen proportions!
    const scale = charData.poses ? 0.88 : 0.48;
    const w = Math.round(charData.w * scale);
    const h = Math.round(charData.h * scale);
    const landing = findBestLanding(state.currentRoom, { kind: 'char' }, x, y);
    const ent = {
      uid: 'c_' + Date.now() + '_' + Math.random(),
      kind: 'char',
      id: charData.id,
      name: charData.name,
      sprite: charData.sprite,
      poses: charData.poses || null,
      rawW: charData.w,
      rawH: charData.h,
      pivX: (charData.pivX !== undefined ? charData.pivX : charData.w / 2) * scale,
      pivY: (charData.pivY !== undefined ? charData.pivY : charData.h) * scale,
      sitPivY: (charData.sitPivY !== undefined ? charData.sitPivY : charData.h * 0.78) * scale,
      eyeX: (charData.eyeX !== undefined ? charData.eyeX : charData.w / 2) * scale,
      eyeY: (charData.eyeY !== undefined ? charData.eyeY : charData.h * 0.34) * scale,
      hatX: (charData.hatX !== undefined ? charData.hatX : charData.w / 2) * scale,
      hatY: (charData.hatY !== undefined ? charData.hatY : charData.h * 0.14) * scale,
      outfitX: (charData.outfitX !== undefined ? charData.outfitX : charData.w / 2) * scale,
      outfitY: (charData.outfitY !== undefined ? charData.outfitY : charData.h * 0.58) * scale,
      x: landing.snapX !== undefined ? landing.snapX : x,
      y: landing.groundY,
      groundY: landing.groundY,
      z: landing.z,
      isSitting: !!landing.isSeat,
      w: w,
      h: h,
      vy: 0,
      walkPhase: 0,
      isMoving: false,
      lastMoveTime: 0,
      blinkSeed: Math.random() * 4000,
      frozen: false,
      flipX: false,
      hat: null,
      face: null,
      outfit: null
    };
    getImg(charData.sprite);
    if (charData.poses) {
      Object.values(charData.poses).forEach(src => getImg(src));
    }
    state.entities.push(ent);
    state.selectedCharUid = ent.uid;
    sfx.playPop();

    if (state.activeMission && state.activeMission.type === 'friends') {
      const charCount = state.entities.filter(e => e.kind === 'char').length;
      if (charCount >= state.activeMission.target) {
        addStar(1, '⭐ Parabéns! Você reuniu os amigos para brincar!');
        generateRoomMission(state.currentRoom);
      }
    }
    return ent;
  }

  function spawnPropInRoom(propData, x, y, startAbove = false) {
    const maxDim = Math.max(propData.w || 72, propData.h || 72);
    const scale = maxDim > 115 ? 95 / maxDim : 1.0;
    const w = Math.round((propData.w || 72) * scale);
    const h = Math.round((propData.h || 72) * scale);
    const landing = findBestLanding(state.currentRoom, { kind: 'prop' }, x, y);
    const ent = {
      uid: 'p_' + Date.now() + '_' + Math.random(),
      kind: 'prop',
      id: propData.id || propData.prefab || propData.name,
      name: (propData.name || propData.prefab || 'Item').replace(/^[A-Z]{2,4}_/, '').replace(/_/g, ' '),
      sprite: propData.sprite,
      dressupItem: propData.dressupItem || null,
      x: x,
      y: startAbove ? y - 45 : landing.groundY,
      groundY: landing.groundY,
      z: landing.z,
      w: w,
      h: h,
      vy: startAbove ? -3 : 0,
      flipX: false
    };
    getImg(propData.sprite);
    state.entities.push(ent);
    sfx.playPop();
    return ent;
  }

  function equipAccessoryOnChar(charEnt, d) {
    if (!charEnt || !d) return;
    if (d.kind === 'face') {
      charEnt.face = (charEnt.face && charEnt.face.id === d.id) ? null : d;
    } else if (d.kind === 'outfit') {
      charEnt.outfit = (charEnt.outfit && charEnt.outfit.id === d.id) ? null : d;
    } else {
      charEnt.hat = (charEnt.hat && charEnt.hat.id === d.id) ? null : d;
    }
    getImg(d.sprite);
    sfx.playCheer();
    showToast(`${charEnt.name} vestiu: ${d.name}! 👑 (Você também pode arrastar acessórios até o personagem!)`);
    if (state.activeMission && state.activeMission.type === 'hat') {
      addStar(1, '⭐ Missão concluída! Que fantasia incrível!');
      generateRoomMission(state.currentRoom);
    }
  }

  // Render Bottom Dock Tray
  function renderDockTray(mode) {
    document.querySelectorAll('.dock-tab[data-tray]').forEach(t => {
      t.classList.toggle('active', t.dataset.tray === mode);
    });
    const tray = document.getElementById('tray-items');
    tray.innerHTML = '';

    if (mode === 'chars') {
      DATA.characters.forEach(c => {
        const div = document.createElement('div');
        div.className = 'tray-card';
        div.innerHTML = `<img src="${c.sprite}" alt="${c.name}" /><span>${c.name}</span>`;
        div.addEventListener('click', () => {
          const room = state.currentRoom;
          const floorY = (room && room.floorY) || 440;
          const spawnX = state.camX + 260 + Math.random() * 320;
          const ent = spawnCharacterInRoom(c, spawnX, floorY + 8);
          ent.y = floorY - 55; // drop gently onto floor
          ent.vy = -4;
          showToast(`${c.name} entrou na brincadeira!`);
        });
        tray.appendChild(div);
      });
    } else if (mode === 'props') {
      const roomCatalog = (state.currentRoom && state.currentRoom.catalog) ? state.currentRoom.catalog : [];
      const allProps = [...roomCatalog, ...DATA.props];
      allProps.forEach(p => {
        const cleanName = (p.name || p.prefab || 'Brinquedo').replace(/^[A-Z]{2,4}_/, '').replace(/_/g, ' ');
        const div = document.createElement('div');
        div.className = 'tray-card';
        div.innerHTML = `<img src="${p.sprite}" alt="${cleanName}" /><span>${cleanName}</span>`;
        div.addEventListener('click', () => {
          const room = state.currentRoom;
          const floorY = (room && room.floorY) || 440;
          const spawnX = state.camX + 280 + Math.random() * 280;
          spawnPropInRoom(p, spawnX, floorY + 6, true);
          showToast(`Objeto adicionado: ${cleanName}! Arraste para colocar sobre mesas ou bancadas!`);
        });
        tray.appendChild(div);
      });
    } else if (mode === 'costumes') {
      DATA.dressup.slice(0, 60).forEach(d => {
        const div = document.createElement('div');
        div.className = 'tray-card';
        div.innerHTML = `<img src="${d.sprite}" alt="${d.name}" /><span>${d.name}</span>`;
        div.addEventListener('click', () => {
          // Equip on currently selected character (or spawn as draggable accessory in room if user wants to drag it!)
          const chars = state.entities.filter(e => e.kind === 'char');
          const target = chars.find(c => c.uid === state.selectedCharUid) || chars[chars.length - 1];
          if (target) {
            equipAccessoryOnChar(target, d);
          } else {
            const floorY = (state.currentRoom && state.currentRoom.floorY) || 440;
            spawnPropInRoom({ id: d.id, name: d.name, sprite: d.sprite, w: d.w * 0.55, h: d.h * 0.55, dressupItem: d }, state.camX + 320, floorY, true);
          }
        });
        tray.appendChild(div);
      });
    }
  }

  document.querySelectorAll('.dock-tab[data-tray]').forEach(btn => {
    btn.addEventListener('click', () => {
      renderDockTray(btn.dataset.tray);
      sfx.playPop();
    });
  });

  document.getElementById('btn-clear-room').addEventListener('click', () => {
    if (state.currentRoom) openRoom(state.currentRoom);
  });

  // Pan buttons
  document.getElementById('pan-left').addEventListener('click', () => {
    state.camX = Math.max(0, state.camX - 240);
  });
  document.getElementById('pan-right').addEventListener('click', () => {
    state.camX = Math.min(state.maxCamX, state.camX + 240);
  });

  // Keepy Uppy Balloon Minigame inside any room!
  document.getElementById('btn-keepy-uppy').addEventListener('click', () => {
    if (state.balloon) {
      state.balloon = null;
      showToast('Balão guardado!');
    } else {
      state.balloonScore = 0;
      document.getElementById('balloon-score').textContent = '0';
      state.balloon = {
        x: state.camX + 420,
        y: 140,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -2,
        r: 36
      };
      sfx.playPop();
      showToast('🎈 Não deixe o balão cair no chão! Clique nele ou encoste os personagens!');
    }
  });

  // Magic Xylophone Freeze Toggle
  document.getElementById('btn-xylophone').addEventListener('click', () => {
    const chars = state.entities.filter(e => e.kind === 'char');
    const anyUnfrozen = chars.some(c => !c.frozen);
    chars.forEach(c => (c.frozen = anyUnfrozen));
    sfx.playMagicFreeze(anyUnfrozen);
    showToast(anyUnfrozen ? '❄️ ESTÁTUA! O Xilofone Mágico congelou todo mundo!' : '🎵 DESCONGELAR! Todo mundo voltou a se mexer!');
  });

  // Convert pointer event into logical 2.5D room coordinates (matching room.w x room.h = 540)
  function getRoomCoords(e) {
    const rect = roomCanvas.getBoundingClientRect();
    const roomH = (state.currentRoom && state.currentRoom.h) || 540;
    const viewScale = rect.height / roomH;
    const sx = (e.clientX - rect.left) / viewScale;
    const sy = (e.clientY - rect.top) / viewScale;
    return { sx, sy, wx: sx + state.camX, wy: sy };
  }

  // Toggle interactive doors/appliances (Fridge, Cupboards, Oven, etc.)
  function triggerSceneToggle(clickedObj) {
    const p = clickedObj.prefab;
    let counterpart = null;
    if (p.includes('Closed')) {
      const targetA = p.replace('DoorClosed', 'DoorOpened');
      const targetB = p.replace('DoorClosed', 'Door');
      const targetC = p.replace('Closed', 'Opened');
      counterpart = state.roomFurniture.find(o => o.prefab === targetA || o.prefab === targetB || o.prefab === targetC);
    } else if (p.includes('Opened')) {
      const targetA = p.replace('DoorOpened', 'DoorClosed');
      const targetB = p.replace('Opened', 'Closed');
      counterpart = state.roomFurniture.find(o => o.prefab === targetA || o.prefab === targetB);
    } else if (p.includes('Door_01')) {
      const targetA = p.replace('Door_01', 'DoorClosed_01');
      counterpart = state.roomFurniture.find(o => o.prefab === targetA);
    }

    if (counterpart) {
      clickedObj.hidden = true;
      counterpart.hidden = false;
      sfx.playPop();
      showToast(` Porta / Armário aberto ou fechado!`);
    } else {
      // Visual bounce feedback for appliances like Oven, Sink tap, Toaster
      clickedObj.pulseTime = performance.now();
      sfx.playPop();
      showToast(`✨ Interagindo com: ${clickedObj.name}!`);
    }
  }

  roomCanvas.addEventListener('pointerdown', e => {
    // Ensure smooth pointer capture across Android browsers
    if (e.pointerId !== undefined && roomCanvas.setPointerCapture) {
      try { roomCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
    const { sx, sy, wx, wy } = getRoomCoords(e);

    // 1. Check Keepy Uppy balloon tap
    if (state.balloon) {
      const dx = wx - state.balloon.x;
      const dy = wy - state.balloon.y;
      if (Math.hypot(dx, dy) <= state.balloon.r + 25) {
        state.balloon.vy = -6.8;
        state.balloon.vx = (wx - state.balloon.x) * -0.15 + (Math.random() - 0.5) * 2.5;
        state.balloonScore++;
        document.getElementById('balloon-score').textContent = state.balloonScore;
        sfx.playPop();
        if (state.activeMission && state.activeMission.type === 'balloon' && state.balloonScore >= state.activeMission.target) {
          addStar(1, '⭐ Campeão de Keepy Uppy! 5 toques sem deixar o balão cair!');
          generateRoomMission(state.currentRoom);
        }
        return;
      }
    }

    // 2. Check Fallback Hidden Longdog tap
    if (state.longdogHidden && !state.longdogHidden.found) {
      if (Math.hypot(wx - state.longdogHidden.x, wy - state.longdogHidden.y) < 38) {
        state.longdogHidden.found = true;
        state.longdogsFound++;
        document.getElementById('longdog-count').textContent = state.longdogsFound;
        addStar(1, '🌭 UAU! Você encontrou o Cachorro Comprido (Longdog) escondido!');
        if (state.activeMission && state.activeMission.type === 'longdog') {
          generateRoomMission(state.currentRoom);
        }
        return;
      }
    }

    // 3. Check front-most movable Entity (Character or Draggable Prop) sorted by front Z first!
    const sortedEntities = [...state.entities].sort((a, b) => a.z - b.z);
    for (const ent of sortedEntities) {
      const activePivY = (ent.kind === 'char' && ent.isSitting) ? (ent.sitPivY || ent.h * 0.78) : (ent.pivY || ent.h);
      const topY = ent.y - activePivY;
      const botY = topY + ent.h;
      if (wx >= ent.x - ent.w / 2 - 8 && wx <= ent.x + ent.w / 2 + 8 && wy >= topY - 8 && wy <= botY + 8) {
        state.dragTarget = ent;
        state.dragOffsetX = wx - ent.x;
        state.dragOffsetY = wy - ent.y;
        ent.vy = 0;
        sfx.playPop();

        if (ent.kind === 'char') {
          state.selectedCharUid = ent.uid;
          const quotes = CHAR_QUOTES[ent.id] || [`"${ent.name} diz: Vamos brincar!"`];
          showToast(`${ent.name} selecionado(a): ${quotes[Math.floor(Math.random() * quotes.length)]}`);
        }
        return;
      }
    }

    // 4. Check interactive 2.5D Room Objects (Longdog, Spawners like FruitBowl/PlateSpawner, Toggles like Fridge/Cupboard doors)
    const interactiveFurn = state.roomFurniture
      .filter(o => !o.hidden && (o.role === 'longdog' || o.role === 'spawner' || o.role === 'toggle'))
      .sort((a, b) => a.z - b.z);

    for (const obj of interactiveFurn) {
      const left = obj.x - (obj.flipX ? (obj.w - obj.pivX) : obj.pivX);
      const top = obj.y - obj.pivY;
      if (wx >= left && wx <= left + obj.w && wy >= top && wy <= top + obj.h) {
        if (obj.role === 'longdog') {
          obj.hidden = true;
          state.longdogsFound++;
          document.getElementById('longdog-count').textContent = state.longdogsFound;
          addStar(1, '🌭 UAU! Você encontrou o Cachorro Comprido (Longdog) original escondido no cenário!');
          if (state.activeMission && state.activeMission.type === 'longdog') {
            generateRoomMission(state.currentRoom);
          }
          return;
        }
        if (obj.role === 'spawner' && obj.spawns && obj.spawns.length > 0) {
          const itemDef = obj.spawns[Math.floor(Math.random() * obj.spawns.length)];
          const newEnt = spawnPropInRoom(itemDef, wx, wy, false);
          state.dragTarget = newEnt;
          state.dragOffsetX = 0;
          state.dragOffsetY = -newEnt.h * 0.3;
          showToast(`✨ Você pegou: ${newEnt.name}! Coloque na mesa, bancada ou onde quiser!`);
          return;
        }
        if (obj.role === 'toggle') {
          triggerSceneToggle(obj);
          return;
        }
      }
    }

    // 5. Otherwise pan the room camera
    state.isPanning = true;
    state.panStartX = sx;
    state.panStartCamX = state.camX;
  });

  window.addEventListener('pointermove', e => {
    if (state.view !== 'room' || !state.currentRoom) return;
    const { sx, wx, wy } = getRoomCoords(e);
    if (state.dragTarget) {
      const ent = state.dragTarget;
      const prevX = ent.x;
      ent.x = Math.max(40, Math.min(state.currentRoom.w - 40, wx - state.dragOffsetX));
      ent.y = Math.max(70, Math.min((state.currentRoom.h || 540) - 10, wy - state.dragOffsetY));
      const dxMove = ent.x - prevX;
      if (Math.abs(dxMove) > 1.2 && ent.kind === 'char') {
        ent.flipX = dxMove < 0;
        ent.walkPhase = (ent.walkPhase || 0) + Math.abs(dxMove) * 0.14;
        ent.lastMoveTime = performance.now();
      }
      // Preview landing target (surface, seat, or floor) and dynamically update Z while dragging!
      const preview = findBestLanding(state.currentRoom, ent, ent.x, ent.y);
      ent.groundY = preview.groundY;
      ent.isSitting = !!preview.isSeat;
      ent.z = preview.z - 15; // slightly in front of target surface while held
      state.hoveredSurface = preview.surfaceRect || null;
    } else if (state.isPanning) {
      const dx = sx - state.panStartX;
      state.camX = Math.max(0, Math.min(state.maxCamX, state.panStartCamX - dx));
    }
  });

  function endPointerDrag(e) {
    if (e && e.pointerId !== undefined && roomCanvas.releasePointerCapture) {
      try { roomCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    if (state.dragTarget && state.currentRoom) {
      const ent = state.dragTarget;
      // If dragging a dress-up accessory prop over a character, equip it directly onto that character!
      if (ent.kind === 'prop' && ent.dressupItem) {
        const targetChar = state.entities.find(c => c.kind === 'char' && Math.hypot(ent.x - c.x, ent.y - (c.y - c.h * 0.5)) < 65);
        if (targetChar) {
          equipAccessoryOnChar(targetChar, ent.dressupItem);
          state.entities = state.entities.filter(x => x.uid !== ent.uid);
          state.dragTarget = null;
          state.hoveredSurface = null;
          state.isPanning = false;
          return;
        }
      }

      const landing = findBestLanding(state.currentRoom, ent, ent.x, ent.y);
      if (landing.snapX !== undefined) ent.x = landing.snapX;
      ent.groundY = landing.groundY;
      ent.z = landing.z;
      if (ent.kind === 'char') {
        ent.isSitting = !!landing.isSeat;
      }

      // If dropped near a surface or seat within snap range, snap cleanly or let gravity drop it onto groundY
      if (Math.abs(ent.y - ent.groundY) < 42) {
        ent.y = ent.groundY;
        ent.vy = 0;
        sfx.playPop();
      } else if (ent.y > ent.groundY) {
        // Below target surface -> snap up onto it
        ent.y = ent.groundY;
        ent.vy = 0;
      }

      if (landing.surfaceRect && state.activeMission && state.activeMission.type === 'surface' && ent.kind === 'prop') {
        addStar(1, '⭐ Muito bem! Você colocou o objeto em cima da superfície 2.5D!');
        generateRoomMission(state.currentRoom);
      }
    }
    state.dragTarget = null;
    state.hoveredSurface = null;
    state.isPanning = false;
  }

  window.addEventListener('pointerup', endPointerDrag);
  window.addEventListener('pointercancel', endPointerDrag);

  // Main 2.5D Room Render Loop
  function updateAndDrawRoom(time) {
    if (state.view === 'room' && state.currentRoom) {
      const room = state.currentRoom;
      const vw = roomCanvas.clientWidth;
      const vh = roomCanvas.clientHeight;
      if (roomCanvas.width !== vw || roomCanvas.height !== vh) {
        roomCanvas.width = vw;
        roomCanvas.height = vh;
      }

      const roomH = room.h || 540;
      const viewScale = vh / roomH;
      const visibleRoomW = vw / viewScale;
      state.maxCamX = Math.max(0, room.w - visibleRoomW);
      state.camX = Math.max(0, Math.min(state.camX, state.maxCamX));

      roomCtx.clearRect(0, 0, vw, vh);
      roomCtx.save();
      roomCtx.scale(viewScale, viewScale);
      roomCtx.translate(-state.camX, 0);

      // 1. Draw clean Room Backdrop (walls, floor, sky, windows)
      const bgImg = getImg(room.bg);
      if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
        roomCtx.drawImage(bgImg, 0, 0, room.w, roomH);
      }

      // 2. Apply continuous Gravity to any entity above its target groundY (Floor, Table, Counter, Shelf, Chair)
      state.entities.forEach(ent => {
        if (state.dragTarget !== ent) {
          if (ent.groundY === undefined) {
            const l = findBestLanding(room, ent, ent.x, ent.y);
            ent.groundY = l.groundY;
            ent.z = l.z;
          }
          if (ent.y < ent.groundY) {
            ent.vy = (ent.vy || 0) + 0.68;
            ent.y += ent.vy;
            if (ent.y >= ent.groundY) {
              ent.y = ent.groundY;
              ent.vy = 0;
            }
          } else if (ent.y > ent.groundY) {
            ent.y = ent.groundY;
            ent.vy = 0;
          }
        }
      });

      // 3. Build unified 2.5D Depth-Sorted Render Queue (Furniture + Interactive Doors/Spawners + Characters + Props)
      const renderQueue = [];

      state.roomFurniture.forEach(furn => {
        if (!furn.hidden) {
          renderQueue.push({ type: 'furn', z: furn.z, y: furn.y, obj: furn });
        }
      });

      state.entities.forEach(ent => {
        renderQueue.push({ type: 'ent', z: ent.z, y: ent.y, obj: ent });
      });

      // Sort back-to-front: larger Z is further back (drawn first); tie-break by smaller Y first
      renderQueue.sort((a, b) => {
        if (Math.abs(b.z - a.z) > 0.5) return b.z - a.z;
        return a.y - b.y;
      });

      // 4. Draw all 2.5D layers in back-to-front depth order!
      for (const item of renderQueue) {
        if (item.type === 'furn') {
          const f = item.obj;
          const img = getImg(f.sprite);
          if (img && img.complete && img.naturalWidth > 0) {
            roomCtx.save();
            const drawLeft = f.x - (f.flipX ? (f.w - f.pivX) : f.pivX);
            const drawTop = f.y - f.pivY;
            if (f.pulseTime && time - f.pulseTime < 300) {
              const p = Math.sin(((time - f.pulseTime) / 300) * Math.PI) * 0.05;
              roomCtx.translate(drawLeft + f.w / 2, drawTop + f.h / 2);
              roomCtx.scale((f.flipX ? -1 : 1) * (1 + p), 1 - p * 0.5);
              roomCtx.drawImage(img, -f.w / 2, -f.h / 2, f.w, f.h);
            } else if (f.flipX) {
              roomCtx.translate(drawLeft + f.w / 2, drawTop + f.h / 2);
              roomCtx.scale(-1, 1);
              roomCtx.drawImage(img, -f.w / 2, -f.h / 2, f.w, f.h);
            } else {
              roomCtx.drawImage(img, drawLeft, drawTop, f.w, f.h);
            }
            roomCtx.restore();
          }
        } else {
          const ent = item.obj;

          // Contact shadow right on the surface or floor (groundY)
          const shadowY = state.dragTarget === ent ? ent.groundY : ent.y;
          const heightAboveGround = Math.max(0, ent.groundY - ent.y);
          const shadowScale = Math.max(0.45, 1 - heightAboveGround / 220);
          roomCtx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          roomCtx.beginPath();
          roomCtx.ellipse(ent.x, shadowY, ent.w * 0.34 * shadowScale, 6.5 * shadowScale, 0, 0, Math.PI * 2);
          roomCtx.fill();

          if (ent.kind === 'char') {
            // Select animated character pose: sit, walk1/walk2, blink, or stand!
            let activeSprite = ent.sprite;
            if (ent.poses) {
              const isWalkingNow = (state.dragTarget === ent && (time - (ent.lastMoveTime || 0) < 160)) || Math.abs(ent.y - ent.groundY) > 6;
              if (ent.isSitting && !isWalkingNow) {
                activeSprite = ent.poses.sit || ent.poses.stand;
              } else if (isWalkingNow && !ent.frozen) {
                activeSprite = (Math.floor(ent.walkPhase || (time * 0.012)) % 2 === 0) ? (ent.poses.walk1 || ent.poses.stand) : (ent.poses.walk2 || ent.poses.stand);
              } else if (!ent.frozen && ((time + (ent.blinkSeed || 0)) % 3600 < 170)) {
                activeSprite = ent.poses.blink || ent.poses.stand;
              } else {
                activeSprite = ent.poses.stand;
              }
            }

            const img = getImg(activeSprite);
            if (img && img.complete && img.naturalWidth > 0) {
              // Anchor character feet (pivY) or sitting hips (sitPivY) firmly on ent.y without vertical floating!
              const anchorY = ent.isSitting ? (ent.sitPivY || ent.h * 0.78) : (ent.pivY || ent.h);
              const anchorX = ent.pivX || ent.w / 2;
              // Gentle breathing squash/stretch anchored at the feet so feet NEVER leave the floor!
              const breath = (!ent.frozen && state.dragTarget !== ent && Math.abs(ent.y - ent.groundY) < 2)
                ? Math.sin(time * 0.0038 + (ent.blinkSeed || 0)) * 0.012
                : 0;

              roomCtx.save();
              roomCtx.translate(ent.x, ent.y);
              if (ent.flipX) roomCtx.scale(-1, 1);
              roomCtx.scale(1 - breath * 0.5, 1 + breath);
              if (ent.frozen) {
                roomCtx.filter = 'hue-rotate(170deg) saturate(1.4) brightness(1.1)';
              }

              // Draw character so (anchorX, anchorY) is at (0, 0) (which is ent.x, ent.y on the floor/seat!)
              const left = -anchorX;
              const top = -anchorY;
              roomCtx.drawImage(img, left, top, ent.w, ent.h);

              // 1. Equipped Outfit (centered on torso anchor)
              if (ent.outfit) {
                const oImg = getImg(ent.outfit.sprite);
                if (oImg && oImg.complete && oImg.naturalWidth > 0) {
                  const ow = ent.w * 0.92;
                  const oh = ow * (ent.outfit.h / ent.outfit.w);
                  const ox = left + (ent.outfitX || ent.w / 2);
                  const oy = top + (ent.outfitY || ent.h * 0.58);
                  roomCtx.drawImage(oImg, ox - ow / 2, oy - oh / 2, ow, oh);
                }
              }

              // 2. Equipped Glasses / Face Accessory (centered on exact MiddleEyeTransform eyeX, eyeY!)
              if (ent.face) {
                const fImg = getImg(ent.face.sprite);
                if (fImg && fImg.complete && fImg.naturalWidth > 0) {
                  const fw = ent.w * 0.64;
                  const fh = fw * (ent.face.h / ent.face.w);
                  const fx = left + (ent.eyeX || ent.w / 2);
                  const fy = top + (ent.eyeY || ent.h * 0.34);
                  roomCtx.drawImage(fImg, fx - fw / 2, fy - fh * 0.48, fw, fh);
                }
              }

              // 3. Equipped Hat / Crown (centered on head top anchor hatX, hatY!)
              if (ent.hat) {
                const hImg = getImg(ent.hat.sprite);
                if (hImg && hImg.complete && hImg.naturalWidth > 0) {
                  const hw = ent.w * 0.72;
                  const hh = hw * (ent.hat.h / ent.hat.w);
                  const hx = left + (ent.hatX || ent.w / 2);
                  const hy = top + (ent.hatY || ent.h * 0.14);
                  roomCtx.drawImage(hImg, hx - hw / 2, hy - hh * 0.65, hw, hh);
                }
              }

              roomCtx.restore();
            }
          } else {
            // Standard 2.5D Prop rendering
            const img = getImg(ent.sprite);
            if (img && img.complete && img.naturalWidth > 0) {
              roomCtx.save();
              roomCtx.translate(ent.x, ent.y - ent.h / 2);
              if (ent.flipX) roomCtx.scale(-1, 1);
              roomCtx.drawImage(img, -ent.w / 2, -ent.h / 2, ent.w, ent.h);
              roomCtx.restore();
            }
          }
        }
      }

      // 5. Subtle highlight on hovered 2.5D Surface (Table / Counter / Shelf) while dragging an item!
      if (state.dragTarget && state.hoveredSurface) {
        const s = state.hoveredSurface;
        roomCtx.save();
        roomCtx.strokeStyle = 'rgba(255, 224, 102, 0.9)';
        roomCtx.lineWidth = 4;
        roomCtx.beginPath();
        roomCtx.moveTo(s.x0, s.y);
        roomCtx.lineTo(s.x1, s.y);
        roomCtx.stroke();
        roomCtx.restore();
      }

      // 6. Draw Fallback Hidden Longdog if applicable
      if (state.longdogHidden && !state.longdogHidden.found) {
        roomCtx.save();
        roomCtx.font = '28px sans-serif';
        roomCtx.textAlign = 'center';
        roomCtx.textBaseline = 'middle';
        roomCtx.fillText('🌭', state.longdogHidden.x, state.longdogHidden.y);
        roomCtx.restore();
      }

      // 7. Update & Draw Keepy Uppy Balloon in logical room space
      if (state.balloon) {
        const b = state.balloon;
        b.vy += 0.085;
        b.x += b.vx;
        b.y += b.vy;

        state.entities.forEach(ent => {
          if (ent.kind === 'char') {
            const headX = ent.x;
            const headY = ent.y - ent.h * 0.8;
            if (Math.hypot(b.x - headX, b.y - headY) < b.r + 32 && b.vy > 0) {
              b.vy = -6.2;
              b.vx = (b.x - headX) * 0.12;
              state.balloonScore++;
              document.getElementById('balloon-score').textContent = state.balloonScore;
              sfx.playPop();
            }
          }
        });

        const floorLimit = (room.floorY || 440) + 25;
        if (b.y > floorLimit) {
          b.y = floorLimit;
          b.vy = -5.2;
          if (state.balloonScore > 0) {
            showToast(`🎈 Ops! O balão tocou no chão após ${state.balloonScore} toques! Tente bater seu recorde!`);
            state.balloonScore = 0;
            document.getElementById('balloon-score').textContent = '0';
          }
        }

        roomCtx.save();
        roomCtx.fillStyle = '#ef4444';
        roomCtx.beginPath();
        roomCtx.ellipse(b.x, b.y, b.r * 0.85, b.r, 0, 0, Math.PI * 2);
        roomCtx.fill();
        roomCtx.strokeStyle = '#fff';
        roomCtx.lineWidth = 2.5;
        roomCtx.stroke();
        roomCtx.fillStyle = 'rgba(255,255,255,0.45)';
        roomCtx.beginPath();
        roomCtx.ellipse(b.x - 10, b.y - 12, 6, 11, -0.4, 0, Math.PI * 2);
        roomCtx.fill();
        roomCtx.strokeStyle = '#fef08a';
        roomCtx.beginPath();
        roomCtx.moveTo(b.x, b.y + b.r);
        roomCtx.lineTo(b.x + Math.sin(time * 0.01) * 7, b.y + b.r + 24);
        roomCtx.stroke();
        roomCtx.restore();
      }

      roomCtx.restore();
    }

    if (state.view === 'dressup') drawDressUpStage(time);
    if (state.view === 'bbq') drawBBQStage(time);
    if (state.view === 'dance') drawDanceStage(time);

    requestAnimationFrame(updateAndDrawRoom);
  }

  // =========================================================================
  // 3. COLOURING BOOK MINIGAME
  // =========================================================================
  const colCanvas = document.getElementById('colouring-canvas');
  const colCtx = colCanvas.getContext('2d');
  const paintLayer = document.createElement('canvas');
  paintLayer.width = 768;
  paintLayer.height = 768;
  const paintCtx = paintLayer.getContext('2d');

  let activeLineArtImg = null;
  let brushColor = '#4f90c6';
  let brushSize = 24;
  let isPainting = false;

  const PALETTE_COLORS = [
    '#4f90c6', '#88d8f7', '#283c66', '#f59f42',
    '#ffd147', '#ef4444', '#ec4899', '#a855f7',
    '#22c55e', '#10b981', '#8b5a2b', '#111827'
  ];

  function openColouringMinigame() {
    switchView('colouring');
    document.getElementById('current-room-title').textContent = '🎨 Livro de Colorir Oficial da Bluey';
    document.getElementById('current-room-edu').textContent = 'Expresse sua criatividade pintando cenas originais da série!';

    const list = document.getElementById('colouring-pages-list');
    list.innerHTML = '';
    DATA.colouring.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'thumb-item' + (idx === 0 ? ' active' : '');
      item.innerHTML = `<img src="${p.sprite}" alt="${p.name}" /><span>${p.name}</span>`;
      item.addEventListener('click', () => {
        document.querySelectorAll('#colouring-pages-list .thumb-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        loadColouringPage(p);
      });
      list.appendChild(item);
    });

    const pal = document.getElementById('color-palette');
    pal.innerHTML = '';
    PALETTE_COLORS.forEach((c, idx) => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch' + (idx === 0 ? ' active' : '');
      sw.style.background = c;
      sw.addEventListener('click', () => {
        brushColor = c;
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        sfx.playPop();
      });
      pal.appendChild(sw);
    });

    if (DATA.colouring.length > 0) loadColouringPage(DATA.colouring[0]);
  }

  function loadColouringPage(page) {
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, 768, 768);
    activeLineArtImg = new Image();
    activeLineArtImg.onload = () => compositeColouringCanvas();
    activeLineArtImg.src = page.sprite;
    sfx.playPop();
  }

  function compositeColouringCanvas() {
    colCtx.globalCompositeOperation = 'source-over';
    colCtx.fillStyle = '#ffffff';
    colCtx.fillRect(0, 0, 768, 768);
    colCtx.drawImage(paintLayer, 0, 0);
    if (activeLineArtImg && activeLineArtImg.complete) {
      // Multiply blend keeps the black line-art crisp on top of user's paint strokes!
      colCtx.globalCompositeOperation = 'multiply';
      colCtx.drawImage(activeLineArtImg, 0, 0, 768, 768);
      colCtx.globalCompositeOperation = 'source-over';
    }
  }

  function paintStroke(e) {
    const rect = colCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (768 / rect.width);
    const y = (e.clientY - rect.top) * (768 / rect.height);
    paintCtx.fillStyle = brushColor;
    paintCtx.beginPath();
    paintCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    paintCtx.fill();
    compositeColouringCanvas();
  }

  colCanvas.addEventListener('pointerdown', e => {
    if (e.pointerId !== undefined && colCanvas.setPointerCapture) {
      try { colCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
    isPainting = true;
    paintStroke(e);
  });
  colCanvas.addEventListener('pointermove', e => {
    if (isPainting) paintStroke(e);
  });
  const endPainting = (e) => {
    if (e && e.pointerId !== undefined && colCanvas.releasePointerCapture) {
      try { colCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    isPainting = false;
  };
  window.addEventListener('pointerup', endPainting);
  window.addEventListener('pointercancel', endPainting);

  document.querySelectorAll('.brush-sizes .size-btn[data-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.brush-sizes .size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      brushSize = parseInt(btn.dataset.size, 10);
      if (brushColor === '#ffffff') brushColor = PALETTE_COLORS[0];
    });
  });

  document.getElementById('btn-eraser').addEventListener('click', function () {
    document.querySelectorAll('.brush-sizes .size-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    brushColor = '#ffffff';
    brushSize = 36;
  });

  document.getElementById('btn-clear-paint').addEventListener('click', () => {
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, 768, 768);
    compositeColouringCanvas();
    sfx.playPop();
  });

  document.getElementById('btn-save-paint').addEventListener('click', () => {
    addStar(1, '⭐ Pintura concluída!');
    showPhotoSnapshot(colCanvas.toDataURL('image/png'));
  });

  const customColInput = document.getElementById('input-custom-colouring');
  if (customColInput) {
    customColInput.addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      files.forEach((file, idx) => {
        const url = URL.createObjectURL(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        const newPage = {
          id: 'custom_' + Date.now() + '_' + idx,
          name: cleanName,
          category: 'Personalizado',
          sprite: url
        };
        DATA.colouring.unshift(newPage);
      });
      openColouringMinigame();
      showToast(`🎨 ${files.length} desenho(s) adicionado(s) para colorir!`);
      customColInput.value = '';
    });
  }

  // =========================================================================
  // 4. DRESS-UP STUDIO MINIGAME
  // =========================================================================
  const duCanvas = document.getElementById('dressup-canvas');
  const duCtx = duCanvas.getContext('2d');
  let duState = {
    char: null,
    hat: null,
    face: null,
    outfit: null,
    jumpTime: 0
  };

  function openDressUpMinigame() {
    switchView('dressup');
    document.getElementById('current-room-title').textContent = '👑 Estúdio de Fantasias (Dress-Up)';
    document.getElementById('current-room-edu').textContent = 'Combine chapéus, óculos e fantasias nos 41 personagens da série!';

    duState.char = DATA.characters[0];
    const charList = document.getElementById('dressup-char-list');
    charList.innerHTML = '';
    DATA.characters.forEach((c, idx) => {
      const div = document.createElement('div');
      div.className = 'thumb-item' + (idx === 0 ? ' active' : '');
      div.innerHTML = `<img src="${c.sprite}" alt="${c.name}" /><span>${c.name}</span>`;
      div.addEventListener('click', () => {
        document.querySelectorAll('#dressup-char-list .thumb-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');
        duState.char = c;
        duState.jumpTime = performance.now();
        sfx.playPop();
      });
      charList.appendChild(div);
    });

    renderWardrobeItems('all');
  }

  function renderWardrobeItems(kindFilter) {
    const grid = document.getElementById('dressup-items-list');
    grid.innerHTML = '';
    DATA.dressup.forEach(item => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) return;
      const div = document.createElement('div');
      div.className = 'thumb-item';
      div.innerHTML = `<img src="${item.sprite}" alt="${item.name}" /><span>${item.name}</span>`;
      div.addEventListener('click', () => {
        duState[item.kind] = item;
        getImg(item.sprite);
        duState.jumpTime = performance.now();
        sfx.playCheer();
      });
      grid.appendChild(div);
    });
  }

  document.querySelectorAll('.w-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.w-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderWardrobeItems(tab.dataset.wkind);
    });
  });

  document.getElementById('btn-du-random').addEventListener('click', () => {
    const hats = DATA.dressup.filter(d => d.kind === 'hat');
    const faces = DATA.dressup.filter(d => d.kind === 'face');
    const outfits = DATA.dressup.filter(d => d.kind === 'outfit');
    duState.hat = hats[Math.floor(Math.random() * hats.length)] || null;
    duState.face = Math.random() > 0.4 ? faces[Math.floor(Math.random() * faces.length)] : null;
    duState.outfit = Math.random() > 0.3 ? outfits[Math.floor(Math.random() * outfits.length)] : null;
    duState.jumpTime = performance.now();
    addStar(1);
  });

  document.getElementById('btn-du-clear').addEventListener('click', () => {
    duState.hat = null;
    duState.face = null;
    duState.outfit = null;
    sfx.playPop();
  });

  document.getElementById('btn-du-pose').addEventListener('click', () => {
    duState.jumpTime = performance.now();
    sfx.playCheer();
  });

  function drawDressUpStage(time) {
    const w = duCanvas.width;
    const h = duCanvas.height;
    duCtx.clearRect(0, 0, w, h);

    // Stage backdrop
    const grad = duCtx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.7, '#bae6fd');
    grad.addColorStop(0.7, '#fcd34d');
    grad.addColorStop(1, '#f59e0b');
    duCtx.fillStyle = grad;
    duCtx.fillRect(0, 0, w, h);

    if (!duState.char) return;
    const chData = duState.char;
    const cImg = getImg(chData.sprite);
    const elapsed = time - duState.jumpTime;
    const jumpOffset = elapsed < 500 ? -Math.sin((elapsed / 500) * Math.PI) * 55 : 0;

    const cx = w / 2;
    const cy = h * 0.82 + jumpOffset;
    const ch = 340;
    const scale = ch / (chData.h || 200);
    const cw = (chData.w || 110) * scale;
    const left = cx - cw / 2;
    const top = cy - ch;

    if (cImg && cImg.complete) {
      duCtx.drawImage(cImg, left, top, cw, ch);
    }

    // Draw Outfit, Face (Glasses), Hat using exact extracted character anchors!
    if (duState.outfit) {
      const oImg = getImg(duState.outfit.sprite);
      if (oImg && oImg.complete) {
        const ow = cw * 0.92;
        const oh = ow * (duState.outfit.h / duState.outfit.w);
        const ox = left + (chData.outfitX !== undefined ? chData.outfitX * scale : cw / 2);
        const oy = top + (chData.outfitY !== undefined ? chData.outfitY * scale : ch * 0.58);
        duCtx.drawImage(oImg, ox - ow / 2, oy - oh / 2, ow, oh);
      }
    }
    if (duState.face) {
      const fImg = getImg(duState.face.sprite);
      if (fImg && fImg.complete) {
        const fw = cw * 0.64;
        const fh = fw * (duState.face.h / duState.face.w);
        const fx = left + (chData.eyeX !== undefined ? chData.eyeX * scale : cw / 2);
        const fy = top + (chData.eyeY !== undefined ? chData.eyeY * scale : ch * 0.34);
        duCtx.drawImage(fImg, fx - fw / 2, fy - fh * 0.48, fw, fh);
      }
    }
    if (duState.hat) {
      const hImg = getImg(duState.hat.sprite);
      if (hImg && hImg.complete) {
        const hw = cw * 0.72;
        const hh = hw * (duState.hat.h / duState.hat.w);
        const hx = left + (chData.hatX !== undefined ? chData.hatX * scale : cw / 2);
        const hy = top + (chData.hatY !== undefined ? chData.hatY * scale : ch * 0.14);
        duCtx.drawImage(hImg, hx - hw / 2, hy - hh * 0.65, hw, hh);
      }
    }
  }

  // =========================================================================
  // 5. BANDIT'S BBQ & MATHS COUNTING MINIGAME
  // =========================================================================
  const bbqCanvas = document.getElementById('bbq-canvas');
  const bbqCtx = bbqCanvas.getContext('2d');
  const BBQ_ITEMS = [
    { id: 'sausage', name: 'Salsicha', raw: 'assets/bbq/SP_BBQ_SpawnerSausage.png', color: '#dc2626' },
    { id: 'steak', name: 'Bife', raw: 'assets/bbq/SP_BBQ_SpawnerSteak.png', color: '#991b1b' },
    { id: 'bacon', name: 'Bacon', raw: 'assets/bbq/SP_BBQ_Bacon_Raw_A.png', cooked: 'assets/bbq/SP_BBQ_Bacon_Cooked_A.png', color: '#ef4444' },
    { id: 'patty', name: 'Hambúrguer', raw: 'assets/bbq/SP_BBQ_BeefPatty_Raw_A.png', cooked: 'assets/bbq/SP_BBQ_BeefPatty_Cooked_A.png', color: '#78350f' },
    { id: 'asparagus', name: 'Aspargo', raw: 'assets/bbq/SP_BBQ_Asparagus_Raw_A.png', cooked: 'assets/bbq/SP_BBQ_Asparagus_Cooked_A.png', color: '#16a34a' },
    { id: 'cheese', name: 'Queijo', raw: 'assets/bbq/Cheese_01.png', color: '#facc15' }
  ];

  let bbqState = {
    order: {},
    plate: {},
    grillSlots: [],
    served: 0
  };

  function openBBQMinigame() {
    switchView('bbq');
    document.getElementById('current-room-title').textContent = '🍖 Churrasco Educativo do Bandit';
    document.getElementById('current-room-edu').textContent = 'Pratique contagem matemática e ponto de cozimento preparando o pedido da família!';
    BBQ_ITEMS.forEach(i => { getImg(i.raw); if (i.cooked) getImg(i.cooked); });
    getImg('assets/bbq/SP_BBQ_Barbecue_A.png');
    newBBQOrder();
  }

  function newBBQOrder() {
    bbqState.order = {};
    bbqState.plate = {};
    bbqState.grillSlots = [];
    const pick1 = BBQ_ITEMS[Math.floor(Math.random() * 3)];
    const pick2 = BBQ_ITEMS[3 + Math.floor(Math.random() * 3)];
    const c1 = 1 + Math.floor(Math.random() * 3);
    const c2 = 1 + Math.floor(Math.random() * 2);
    bbqState.order[pick1.id] = c1;
    bbqState.order[pick2.id] = c2;
    document.getElementById('bbq-order-text').textContent =
      `Pedido do Bandit: Prepare ${c1}x ${pick1.name} e ${c2}x ${pick2.name}! (Clique nos ingredientes na bancada para pôr na grelha, e clique quando estiverem ASSADOS para servir!)`;
  }

  document.getElementById('btn-bbq-new-order').addEventListener('click', newBBQOrder);

  bbqCanvas.addEventListener('pointerdown', e => {
    const rect = bbqCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (bbqCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (bbqCanvas.height / rect.height);

    // Check ingredient spawners along bottom row (y > 400)
    if (y > 390) {
      const idx = Math.floor((x - 70) / 160);
      if (idx >= 0 && idx < BBQ_ITEMS.length && bbqState.grillSlots.length < 6) {
        const item = BBQ_ITEMS[idx];
        bbqState.grillSlots.push({
          item,
          x: 200 + (bbqState.grillSlots.length % 3) * 145,
          y: 165 + Math.floor(bbqState.grillSlots.length / 3) * 105,
          cookProgress: 0
        });
        sfx.playPop();
      }
      return;
    }

    // Check grill items to move to plate
    for (let i = bbqState.grillSlots.length - 1; i >= 0; i--) {
      const g = bbqState.grillSlots[i];
      if (Math.hypot(x - g.x, y - g.y) < 55) {
        if (g.cookProgress >= 0.45) {
          bbqState.plate[g.item.id] = (bbqState.plate[g.item.id] || 0) + 1;
          bbqState.grillSlots.splice(i, 1);
          sfx.playPop();
          checkBBQOrderComplete();
        } else {
          showToast('Ainda está cru! Espere a barra ficar verde!');
        }
        return;
      }
    }
  });

  function checkBBQOrderComplete() {
    const complete = Object.entries(bbqState.order).every(([k, count]) => (bbqState.plate[k] || 0) >= count);
    if (complete) {
      bbqState.served++;
      document.getElementById('bbq-served-count').textContent = bbqState.served;
      addStar(1, '🍖 Pedido perfeito! Bandit adorou o churrasco!');
      setTimeout(newBBQOrder, 1200);
    }
  }

  function drawBBQStage(time) {
    const w = bbqCanvas.width;
    const h = bbqCanvas.height;
    bbqCtx.clearRect(0, 0, w, h);

    // Deck background
    bbqCtx.fillStyle = '#fef3c7';
    bbqCtx.fillRect(0, 0, w, h);

    // Grill Box (Left-Center)
    bbqCtx.fillStyle = '#1f2937';
    bbqCtx.beginPath();
    bbqCtx.roundRect(120, 80, 460, 260, 24);
    bbqCtx.fill();
    bbqCtx.strokeStyle = '#9ca3af';
    bbqCtx.lineWidth = 6;
    for (let gx = 150; gx < 560; gx += 28) {
      bbqCtx.beginPath();
      bbqCtx.moveTo(gx, 95);
      bbqCtx.lineTo(gx, 325);
      bbqCtx.stroke();
    }

    // Serving Plate (Right)
    bbqCtx.fillStyle = '#ffffff';
    bbqCtx.beginPath();
    bbqCtx.arc(820, 210, 130, 0, Math.PI * 2);
    bbqCtx.fill();
    bbqCtx.lineWidth = 8;
    bbqCtx.strokeStyle = '#60a5fa';
    bbqCtx.stroke();
    bbqCtx.fillStyle = '#1e3a8a';
    bbqCtx.font = 'bold 18px sans-serif';
    bbqCtx.textAlign = 'center';
    bbqCtx.fillText('PRATO DE SERVIR', 820, 62);

    // Draw items on Grill
    bbqState.grillSlots.forEach(g => {
      g.cookProgress = Math.min(1, g.cookProgress + 0.0028);
      const isCooked = g.cookProgress >= 0.5;
      const img = getImg(isCooked && g.item.cooked ? g.item.cooked : g.item.raw);
      if (img && img.complete) {
        bbqCtx.drawImage(img, g.x - 45, g.y - 35, 90, 70);
      }
      // Cook progress bar
      bbqCtx.fillStyle = '#374151';
      bbqCtx.fillRect(g.x - 35, g.y + 36, 70, 10);
      bbqCtx.fillStyle = isCooked ? '#22c55e' : '#f59e0b';
      bbqCtx.fillRect(g.x - 35, g.y + 36, 70 * g.cookProgress, 10);
    });

    // Draw Plate Counts vs Order
    let py = 155;
    Object.entries(bbqState.order).forEach(([id, needed]) => {
      const it = BBQ_ITEMS.find(x => x.id === id);
      const have = bbqState.plate[id] || 0;
      bbqCtx.fillStyle = have >= needed ? '#16a34a' : '#1e293b';
      bbqCtx.font = 'bold 22px sans-serif';
      bbqCtx.fillText(`${it.name}: ${have} / ${needed}`, 820, py);
      py += 44;
    });

    // Draw Bottom Spawner Tray
    BBQ_ITEMS.forEach((it, idx) => {
      const sx = 130 + idx * 160;
      const sy = 455;
      bbqCtx.fillStyle = '#ffffff';
      bbqCtx.beginPath();
      bbqCtx.roundRect(sx - 65, sy - 55, 130, 105, 16);
      bbqCtx.fill();
      bbqCtx.strokeStyle = '#fb923c';
      bbqCtx.lineWidth = 3;
      bbqCtx.stroke();
      const img = getImg(it.raw);
      if (img && img.complete) {
        bbqCtx.drawImage(img, sx - 42, sy - 46, 84, 64);
      }
      bbqCtx.fillStyle = '#1e293b';
      bbqCtx.font = 'bold 14px sans-serif';
      bbqCtx.fillText(it.name, sx, sy + 36);
    });
  }

  // =========================================================================
  // 6. DANCE MODE & MUSICAL MEMORY MINIGAME
  // =========================================================================
  const danceCanvas = document.getElementById('dance-canvas');
  const danceCtx = danceCanvas.getContext('2d');
  let danceState = {
    frozen: false,
    lastNote: 0,
    pulseTime: 0,
    simonMode: false,
    sequence: [],
    userStep: 0
  };

  function openDanceMinigame() {
    switchView('dance');
    document.getElementById('current-room-title').textContent = '🕺 Modo Dança & Xilofone Mágico';
    document.getElementById('current-room-edu').textContent = 'Desenvolva percepção musical, ritmo e memória auditiva com a família Heeler!';
  }

  function triggerDanceNote(noteIdx) {
    sfx.playXyloNote(noteIdx);
    danceState.lastNote = noteIdx;
    danceState.pulseTime = performance.now();

    const keyBtn = document.querySelector(`.xylo-key[data-note="${noteIdx}"]`);
    if (keyBtn) {
      keyBtn.classList.add('lit');
      setTimeout(() => keyBtn.classList.remove('lit'), 220);
    }

    if (danceState.simonMode && danceState.sequence.length > 0) {
      if (noteIdx === danceState.sequence[danceState.userStep]) {
        danceState.userStep++;
        if (danceState.userStep >= danceState.sequence.length) {
          addStar(1, `🎵 Sequência de ${danceState.sequence.length} notas perfeita!`);
          setTimeout(nextSimonRound, 900);
        }
      } else {
        document.getElementById('dance-status').textContent = 'Ops! Nota errada! Ouça novamente a sequência!';
        danceState.userStep = 0;
        setTimeout(playSimonSequence, 900);
      }
    }
  }

  document.querySelectorAll('.xylo-key').forEach(btn => {
    btn.addEventListener('pointerdown', () => triggerDanceNote(parseInt(btn.dataset.note, 10)));
  });

  function nextSimonRound() {
    danceState.sequence.push(Math.floor(Math.random() * 8));
    danceState.userStep = 0;
    document.getElementById('dance-status').textContent = `Ouça e repita a sequência de ${danceState.sequence.length} notas!`;
    playSimonSequence();
  }

  function playSimonSequence() {
    danceState.sequence.forEach((n, idx) => {
      setTimeout(() => {
        sfx.playXyloNote(n);
        const keyBtn = document.querySelector(`.xylo-key[data-note="${n}"]`);
        if (keyBtn) {
          keyBtn.classList.add('lit');
          setTimeout(() => keyBtn.classList.remove('lit'), 300);
        }
      }, idx * 520);
    });
  }

  document.getElementById('btn-dance-freestyle').addEventListener('click', function () {
    danceState.simonMode = false;
    danceState.sequence = [];
    this.classList.add('active');
    document.getElementById('btn-dance-simon').classList.remove('active');
    document.getElementById('dance-status').textContent = 'Modo Livre: Toque qualquer tecla do Xilofone para dançar!';
  });

  document.getElementById('btn-dance-simon').addEventListener('click', function () {
    danceState.simonMode = true;
    danceState.sequence = [];
    this.classList.add('active');
    document.getElementById('btn-dance-freestyle').classList.remove('active');
    nextSimonRound();
  });

  document.getElementById('btn-dance-freeze').addEventListener('click', () => {
    danceState.frozen = !danceState.frozen;
    sfx.playMagicFreeze(danceState.frozen);
  });

  function drawDanceStage(time) {
    const w = danceCanvas.width;
    const h = danceCanvas.height;
    danceCtx.clearRect(0, 0, w, h);

    // Disco floor
    const hue = (time * 0.05 + danceState.lastNote * 45) % 360;
    danceCtx.fillStyle = `hsl(${hue}, 70%, 22%)`;
    danceCtx.fillRect(0, 0, w, h);

    for (let i = 0; i < 8; i++) {
      danceCtx.fillStyle = `hsla(${(i * 45 + time * 0.1) % 360}, 85%, 60%, 0.28)`;
      danceCtx.fillRect(i * (w / 8), h - 90, w / 8 - 4, 90);
    }

    const dancers = ['Bluey', 'Bingo', 'Bandit', 'Chilli'];
    dancers.forEach((id, idx) => {
      const c = DATA.characters.find(x => x.id === id) || DATA.characters[idx];
      if (!c) return;
      const img = getImg(c.sprite);
      const dx = 190 + idx * 240;
      const bounce = danceState.frozen ? 0 : Math.abs(Math.sin(time * 0.008 + idx)) * 38;
      const tilt = danceState.frozen ? 0 : Math.sin(time * 0.008 + idx) * 0.12;
      const ch = 230;
      const cw = ch * (c.w / c.h);
      if (img && img.complete) {
        danceCtx.save();
        danceCtx.translate(dx, h - 55 - bounce - ch / 2);
        danceCtx.rotate(tilt);
        if (danceState.frozen) danceCtx.filter = 'hue-rotate(170deg) brightness(1.15)';
        danceCtx.drawImage(img, -cw / 2, -ch / 2, cw, ch);
        danceCtx.restore();
      }
    });
  }

  // =========================================================================
  // 7. TOP HUD BUTTONS (HOME, MUSIC, VIDEO, CAMERA SNAPSHOT)
  // =========================================================================
  document.getElementById('btn-home').addEventListener('click', () => switchView('menu'));

  document.getElementById('btn-music').addEventListener('click', function () {
    const on = sfx.toggleMusic();
    this.textContent = on ? '🎵 Música: ON' : '🔇 Música: OFF';
  });

  const videoModal = document.getElementById('video-modal');
  const promoVideo = document.getElementById('promo-video');
  document.getElementById('btn-video').addEventListener('click', () => {
    videoModal.classList.remove('hidden');
    promoVideo.play().catch(() => {});
  });
  document.getElementById('btn-close-video').addEventListener('click', () => {
    promoVideo.pause();
    videoModal.classList.add('hidden');
  });

  const photoModal = document.getElementById('photo-modal');
  function showPhotoSnapshot(dataUrl) {
    document.getElementById('snapshot-preview').src = dataUrl;
    document.getElementById('btn-download-photo').href = dataUrl;
    photoModal.classList.remove('hidden');
    sfx.playCheer();
  }

  document.getElementById('btn-camera').addEventListener('click', () => {
    let activeCanvas = roomCanvas;
    if (state.view === 'colouring') activeCanvas = colCanvas;
    else if (state.view === 'dressup') activeCanvas = duCanvas;
    else if (state.view === 'bbq') activeCanvas = bbqCanvas;
    else if (state.view === 'dance') activeCanvas = danceCanvas;
    showPhotoSnapshot(activeCanvas.toDataURL('image/png'));
  });

  document.getElementById('btn-close-photo').addEventListener('click', () => {
    photoModal.classList.add('hidden');
  });

  document.getElementById('btn-edu-mission').addEventListener('click', () => {
    if (state.view === 'room' && state.currentRoom) {
      generateRoomMission(state.currentRoom);
      showToast(`Nova Missão: ${state.activeMission.text}`);
    } else {
      showToast('Clique em qualquer bolha de cenário para iniciar uma missão educativa!');
    }
  });

  // Initialize!
  renderMainMenu('all');
  requestAnimationFrame(updateAndDrawRoom);
})();

