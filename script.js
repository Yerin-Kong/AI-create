const state = {
  room: "garden",
  inventory: new Set(),
  selected: null,
  flags: {
    heardChime: false,
    foundNote: false,
    drawerUnlocked: false,
    plantedSeed: false,
    watered: false,
    flowerBloomed: false,
    gotKey: false,
    gateOpened: false,
    chestOpened: false,
    foundCharm: false,
  },
  timeLeft: 600,
  timerId: null,
};

const items = {
  seed: { label: "씨앗 주머니", icon: "assets/item-seed.svg" },
  stone: { label: "연못 돌", icon: "assets/item-stone.svg" },
  note: { label: "메모", icon: "assets/item-note.svg" },
  can: { label: "물뿌리개", icon: "assets/item-can.svg" },
  flower: { label: "달꽃", icon: "assets/item-flower.svg" },
  key: { label: "황금 열쇠", icon: "assets/item-key.svg" },
  charm: { label: "힐링 부적", icon: "assets/item-charm.svg" },
};

let journal = null;
let inventoryEl = null;
let modal = null;
let modalTitle = null;
let modalText = null;
let modalActions = null;
let timerEl = null;
let roomTitle = null;

const roomNames = {
  garden: "정원 휴식실",
  tea: "차실",
  loft: "다락 서재",
};

const journalEntries = [];

function startTimer() {
  state.timerId = window.setInterval(() => {
    state.timeLeft -= 1;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      updateTimer();
      endGame("시간이 다 되었습니다. 힐링 공간은 당신의 재방문을 기다립니다.");
      return;
    }
    updateTimer();
  }, 1000);
}

function updateTimer() {
  const minutes = String(Math.floor(state.timeLeft / 60)).padStart(2, "0");
  const seconds = String(state.timeLeft % 60).padStart(2, "0");
  timerEl.textContent = `${minutes}:${seconds}`;
}

function endGame(message) {
  window.clearInterval(state.timerId);
  showModal("엔딩", message, [
    { label: "다시 시작", action: () => window.location.reload() },
  ]);
}

function showModal(title, text, actions = []) {
  if (!modal || !modalTitle || !modalText || !modalActions) {
    return;
  }
  modalTitle.textContent = title;
  modalText.textContent = text;
  modalActions.innerHTML = "";
  actions.forEach((item) => {
    const button = document.createElement("button");
    button.textContent = item.label;
    if (item.secondary) {
      button.classList.add("secondary");
    }
    button.addEventListener("click", () => {
      closeModal();
      if (item.action) {
        item.action();
      }
    });
    modalActions.appendChild(button);
  });
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modal) {
    return;
  }
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

function addJournal(entry) {
  if (!journal) {
    return;
  }
  if (journalEntries.includes(entry)) {
    return;
  }
  journalEntries.push(entry);
  const li = document.createElement("li");
  li.textContent = entry;
  journal.appendChild(li);
}

function addItem(key) {
  if (state.inventory.has(key)) {
    return;
  }
  state.inventory.add(key);
  renderInventory();
}

function removeItem(key) {
  if (state.selected === key) {
    state.selected = null;
  }
  state.inventory.delete(key);
  renderInventory();
}

function renderInventory() {
  if (!inventoryEl) {
    return;
  }
  inventoryEl.innerHTML = "";
  if (state.inventory.size === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "아직 찾은 아이템이 없습니다.";
    inventoryEl.appendChild(empty);
    return;
  }
  Array.from(state.inventory).forEach((key) => {
    const button = document.createElement("button");
    button.dataset.item = key;
    if (state.selected === key) {
      button.classList.add("selected");
    }
    const img = document.createElement("img");
    img.src = items[key].icon;
    img.alt = items[key].label;
    const label = document.createElement("span");
    label.textContent = items[key].label;
    button.appendChild(img);
    button.appendChild(label);
    button.addEventListener("click", () => {
      state.selected = state.selected === key ? null : key;
      renderInventory();
    });
    inventoryEl.appendChild(button);
  });
}

function switchRoom(room) {
  state.room = room;
  if (roomTitle) {
    roomTitle.textContent = roomNames[room];
  }
  document.querySelectorAll(".room").forEach((el) => {
    el.classList.toggle("active", el.dataset.room === room);
  });
  document.querySelectorAll(".nav-button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.room === room);
  });
}

function handleHotspot(id) {
  switch (id) {
    case "windchime":
      state.flags.heardChime = true;
      addJournal("풍경 소리가 4-2-3-1 순서로 울렸다. 차실 서랍에 쓰일지 모른다.");
      showModal("풍경", "바람에 흔들리는 풍경이 4번, 2번, 3번, 1번 순서로 맑게 울립니다.");
      break;
    case "pond":
      if (!state.inventory.has("stone")) {
        addItem("stone");
        showModal("연못", "차가운 연못가에서 부드러운 돌을 발견했습니다.");
      } else {
        showModal("연못", "잔잔한 물결이 마음을 가라앉혀 줍니다.");
      }
      break;
    case "bench":
      if (!state.inventory.has("seed")) {
        addItem("seed");
        showModal("벤치", "벤치 아래에서 달꽃 씨앗 주머니를 찾았습니다.");
      } else {
        showModal("벤치", "햇살과 나무 향기가 느껴지는 벤치입니다.");
      }
      break;
    case "gate":
      if (state.flags.gateOpened) {
        showModal("정문", "문은 이미 열려 있습니다. 깊은 숨을 내쉬며 밖으로 나가세요.", [
          { label: "탈출하기", action: () => endGame("힐링 공간을 무사히 빠져나왔습니다. 평온함이 함께합니다.") },
        ]);
        return;
      }
      if (state.selected === "charm" && !state.inventory.has("key")) {
        showModal("정문", "부적이 따뜻하게 빛나지만, 아직 열쇠가 필요합니다.");
        return;
      }
      if (state.selected === "key" && state.inventory.has("charm")) {
        state.flags.gateOpened = true;
        removeItem("key");
        removeItem("charm");
        showModal("정문", "황금 열쇠와 부적의 빛이 어우러지며 문이 열립니다.");
      } else if (state.selected === "key") {
        showModal("정문", "열쇠가 맞지만, 부드러운 부적이 함께해야 열립니다.");
      } else {
        showModal("정문", "문은 잠겨 있습니다. 따뜻한 열쇠와 힐링 부적이 필요해 보입니다.");
      }
      break;
    case "cushion":
      if (!state.flags.foundNote) {
        state.flags.foundNote = true;
        addItem("note");
        addJournal("메모: " +
          "달꽃은 차분한 물과 서쪽의 소리에 반응한다. 서랍의 번호는 바람의 순서.");
        showModal("쿠션", "쿠션 밑에서 메모를 발견했습니다.");
      } else {
        showModal("쿠션", "폭신한 쿠션이 편안함을 줍니다.");
      }
      break;
    case "teatable":
      showModal("찻상", "따뜻한 찻잔에서 은은한 향이 퍼집니다.");
      break;
    case "window":
      showModal("창문", "서쪽 하늘이 잔잔하게 빛납니다.");
      break;
    case "drawer":
      if (state.flags.drawerUnlocked) {
        if (!state.inventory.has("can")) {
          addItem("can");
          showModal("서랍", "서랍 안에서 물뿌리개를 발견했습니다.");
        } else {
          showModal("서랍", "비어 있는 서랍입니다.");
        }
        return;
      }
      openDrawerLock();
      break;
    case "planter":
      handlePlanter();
      break;
    case "bookshelf":
      showModal("책장", "힐링 음악과 명상에 관한 책들이 정리되어 있습니다.");
      break;
    case "musicbox":
      if (state.flags.flowerBloomed && !state.flags.gotKey) {
        state.flags.gotKey = true;
        addItem("key");
        showModal("오르골", "달꽃의 빛이 오르골을 깨웠습니다. 황금 열쇠가 나타났습니다.");
      } else {
        showModal("오르골", "오르골은 아직 잠든 듯 조용합니다.");
      }
      break;
    case "desk":
      if (!state.flags.chestOpened) {
        openDeskBox();
      } else if (!state.flags.foundCharm) {
        state.flags.foundCharm = true;
        addItem("charm");
        showModal("책상", "부드러운 힐링 부적을 챙겼습니다.");
      } else {
        showModal("책상", "정돈된 책상이 마음을 차분하게 합니다.");
      }
      break;
    default:
      break;
  }
}

function handlePlanter() {
  if (!state.flags.plantedSeed) {
    if (state.selected === "seed") {
      state.flags.plantedSeed = true;
      removeItem("seed");
      addJournal("씨앗을 심었다. 이제 차분한 물이 필요하다.");
      showModal("화분", "씨앗을 심었습니다. 촉촉한 물을 기다립니다.");
    } else {
      showModal("화분", "아직 텅 비어 있습니다. 씨앗이 필요합니다.");
    }
    return;
  }
  if (!state.flags.watered) {
    if (state.selected === "can") {
      state.flags.watered = true;
      removeItem("can");
      addJournal("달꽃이 피기 시작했다. 오르골이 반응할지도 모른다.");
      showModal("화분", "부드러운 물을 주자 달꽃이 은은하게 피어납니다.");
    } else {
      showModal("화분", "촉촉한 물을 주면 꽃이 자랄 것 같습니다.");
    }
    return;
  }
  if (!state.flags.flowerBloomed) {
    state.flags.flowerBloomed = true;
    addItem("flower");
    showModal("화분", "달꽃이 활짝 피었습니다. 은은한 빛이 오르골로 흐릅니다.");
  } else {
    showModal("화분", "달꽃이 잔잔한 빛을 뿜고 있습니다.");
  }
}

function openDrawerLock() {
  showModal("서랍", "은은한 숫자 자물쇠가 달려 있습니다.", [
    {
      label: "번호 입력",
      action: () => {
        const code = window.prompt("서랍 번호 (4자리)");
        if (code === null) {
          return;
        }
        if (code.trim() === "4231") {
          state.flags.drawerUnlocked = true;
          addJournal("서랍의 번호는 4-2-3-1 이었다.");
          showModal("서랍", "자물쇠가 풀렸습니다.");
        } else {
          showModal("서랍", "번호가 맞지 않습니다. 바람의 순서를 떠올려 보세요.");
        }
      },
    },
    { label: "닫기", secondary: true },
  ]);
}

function openDeskBox() {
  if (state.selected !== "stone") {
    showModal("책상", "책상 위 상자는 부드러운 돌로 눌러야 열리는 듯합니다.");
    return;
  }
  state.flags.chestOpened = true;
  removeItem("stone");
  showModal("책상", "돌을 올려두자 상자가 열립니다. 안에 힐링 부적이 있습니다.");
}

function attachListeners() {
  document.querySelectorAll(".hotspot").forEach((hotspot) => {
    hotspot.addEventListener("click", () => handleHotspot(hotspot.dataset.id));
  });
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => switchRoom(button.dataset.room));
  });
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
}

function init() {
  journal = document.getElementById("journal");
  inventoryEl = document.getElementById("inventory");
  modal = document.getElementById("modal");
  modalTitle = document.getElementById("modal-title");
  modalText = document.getElementById("modal-text");
  modalActions = document.getElementById("modal-actions");
  timerEl = document.getElementById("timer");
  roomTitle = document.getElementById("room-title");
  if (!journal || !inventoryEl || !modal || !modalTitle || !modalText || !modalActions || !timerEl || !roomTitle) {
    return;
  }
  switchRoom("garden");
  renderInventory();
  addJournal("정문은 잠겨 있다. 힐링 부적과 열쇠가 필요해 보인다.");
  startTimer();
  attachListeners();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
