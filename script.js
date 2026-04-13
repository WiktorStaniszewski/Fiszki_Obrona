/* script.js */
const savedKnown = localStorage.getItem('fiszki_known');
const known = savedKnown ? new Set(JSON.parse(savedKnown)) : new Set();
let activeCards = [];
let activeIndex = 0;

let isFlipped = false;
let isTransitioning = false;

function buildActive() {
    activeCards = [];
    for(let i=0; i<cards.length; i++) {
        if(!known.has(i)) activeCards.push(i);
    }
    if(activeIndex >= activeCards.length) {
        activeIndex = 0;
    }
}

function saveProgress() {
    localStorage.setItem('fiszki_known', JSON.stringify(Array.from(known)));
    if(activeCards.length > 0 && activeIndex < activeCards.length) {
        localStorage.setItem('fiszki_idx', activeCards[activeIndex].toString());
    }
}

function init() {
    buildActive();
    let savedGlobal = parseInt(localStorage.getItem('fiszki_idx'));
    if (!isNaN(savedGlobal) && !known.has(savedGlobal)) {
        activeIndex = activeCards.indexOf(savedGlobal);
        if (activeIndex === -1) activeIndex = 0;
    } else {
        activeIndex = 0;
    }
    render();
}

function render() {
    const pct = (known.size / cards.length * 100).toFixed(0);
    document.getElementById('pbar').style.width = pct + '%';
    document.getElementById('meta-right').textContent = `✓ Znane: ${known.size} / ${cards.length}`;

    if (activeCards.length === 0) {
        document.getElementById('qnum').textContent = "Koniec!";
        document.getElementById('qtext').textContent = "Gratulacje! Opanowałeś wszystkie pytania z tej puli.";
        document.getElementById('qtag').innerHTML = "";
        document.getElementById('atext').innerHTML = "Zresetuj progres, aby zacząć od nowa i przywrócić wszystkie fiszki.";
        document.getElementById('cur').textContent = "-";
        document.getElementById('main-controls').style.display = 'none';
        document.getElementById('nav-controls').style.display = 'none';
        return;
    }

    document.getElementById('main-controls').style.display = 'flex';
    document.getElementById('nav-controls').style.display = 'flex';

    const globalIdx = activeCards[activeIndex];
    const c = cards[globalIdx];
    
    document.getElementById('qnum').textContent = `Pytanie ${globalIdx + 1} / ${cards.length} (Zostało: ${activeCards.length})`;
    document.getElementById('qtext').textContent = c.q;
    document.getElementById('qtag').innerHTML = `<span class="tag">${c.tag}</span>`;
    document.getElementById('atext').innerHTML = c.a;
    document.getElementById('cur').textContent = globalIdx + 1;
}

function flip() {
    if (isTransitioning || activeCards.length === 0) return;
    isFlipped = !isFlipped;
    document.getElementById('inner').classList.toggle('flipped', isFlipped);
}

function mark(type) {
    if(activeCards.length === 0) return;
    const globalIdx = activeCards[activeIndex];
    
    if (type === 'know') {
        known.add(globalIdx);
        saveProgress();
        buildActive();
    } else {
        known.delete(globalIdx);
        activeIndex++;
        if (activeIndex >= activeCards.length) activeIndex = 0;
        saveProgress();
    }
    resetCardPosition();
}

function resetCardPosition() {
    const inner = document.getElementById('inner');
    inner.style.transition = 'none';
    inner.classList.remove('flipped');
    isFlipped = false;
    inner.style.transform = '';
    render();
    
    void inner.offsetWidth;
    
    inner.style.transition = 'transform 0.6s cubic-bezier(.4,0,.2,1)';
    isTransitioning = false;
}

function goActive(d) {
    if(activeCards.length === 0 || isTransitioning) return;
    activeIndex = (activeIndex + d + activeCards.length) % activeCards.length;
    saveProgress();
    resetCardPosition();
}

function swipeLeft() {
    if(activeCards.length === 0 || isTransitioning) return;
    isTransitioning = true;
    const inner = document.getElementById('inner');
    inner.style.transition = 'transform 0.4s cubic-bezier(.4,0,.2,1)';
    let transformStr = `translateX(-150%) rotate(-15deg)`;
    if (isFlipped) transformStr += ' rotateY(180deg)';
    inner.style.transform = transformStr;
    setTimeout(() => {
        mark('dont_know');
    }, 400);
}

function swipeRight() {
    if(activeCards.length === 0 || isTransitioning) return;
    isTransitioning = true;
    const inner = document.getElementById('inner');
    inner.style.transition = 'transform 0.4s cubic-bezier(.4,0,.2,1)';
    let transformStr = `translateX(150%) rotate(15deg)`;
    if (isFlipped) transformStr += ' rotateY(180deg)';
    inner.style.transform = transformStr;
    setTimeout(() => {
        mark('know');
    }, 400);
}

function shuffleActive() {
    if(activeCards.length <= 1 || isTransitioning) return;
    for (let i = activeCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [activeCards[i], activeCards[j]] = [activeCards[j], activeCards[i]];
    }
    activeIndex = 0;
    saveProgress();
    resetCardPosition();
}

function jumpTo() {
    const v = parseInt(document.getElementById('jumpinput').value);
    if (v >= 1 && v <= cards.length) { 
        const globalIdx = v - 1;
        if(known.has(globalIdx)) {
            known.delete(globalIdx);
            buildActive();
        }
        activeIndex = activeCards.indexOf(globalIdx);
        saveProgress();
        resetCardPosition();
    }
}

function resetAll() { 
    known.clear(); 
    saveProgress();
    buildActive();
    activeIndex = 0; 
    resetCardPosition();
}

// Swipe logic
let startX = 0, startY = 0, currentX = 0;
let isDragging = false;
let isDragAction = false;
const scene = document.getElementById('scene');
const inner = document.getElementById('inner');

scene.addEventListener('pointerdown', e => {
    if(activeCards.length === 0 || isTransitioning) return;
    startX = e.clientX;
    startY = e.clientY;
    currentX = 0;
    isDragging = true;
    isDragAction = false;
    inner.style.transition = 'none';
});

scene.addEventListener('pointermove', e => {
    if (!isDragging) return;
    let deltaX = e.clientX - startX;
    let deltaY = e.clientY - startY;

    if (!isDragAction) {
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
            isDragAction = true;
        } else if (Math.abs(deltaY) > 10) {
            isDragging = false;
            inner.style.transform = ''; 
            return;
        } else {
            return;
        }
    }

    currentX = deltaX;
    let rotate = currentX * 0.05;
    let transformStr = `translateX(${currentX}px) rotate(${rotate}deg)`;
    if (isFlipped) transformStr += ' rotateY(180deg)';
    inner.style.transform = transformStr;
});

function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    inner.style.transition = 'transform 0.4s cubic-bezier(.4,0,.2,1)';

    if (currentX > 80) {
        swipeRight();
    } else if (currentX < -80) {
        swipeLeft();
    } else {
        inner.style.transform = ''; 
        if (!isDragAction && e.target && e.target.closest && e.target.closest('#scene')) {
            flip();
        }
    }
    currentX = 0;
}

window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

init();