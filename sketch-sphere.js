let isMobile = /iPhone|iPod|Android/i.test(navigator.userAgent);
let repel_radius; // distance from mouse at which repulsion starts
let radius_;
let angle = 0;
let points = [];
const attraction = 0.01; // pulled back to their rotating home
const damping = 0.9; // friction, keeps motion smooth
const repel_strength = 28;
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let canvas;

// Эталонные параметры дизайна (desktop)
const DESIGN_WIDTH = 900;
const DESIGN_HEIGHT = 700;
const DESIGN_RADIUS = 250;
const DESIGN_REPEL_RADIUS = 90;
const DESIGN_TEXT_SIZE = 4;
const DESIGN_PARTICLES = 8000;

// Мобильные параметры (fallback для очень маленьких экранов)
const MOBILE_WIDTH = 360;
const MOBILE_HEIGHT = 360;
const MOBILE_RADIUS = 160;
const MOBILE_REPEL_RADIUS = 60;
const MOBILE_TEXT_SIZE = 3;
const MOBILE_PARTICLES = 4000; // меньше для производительности

/**
 * Вычисляет адаптивные размеры канваса на основе доступного пространства контейнера
 * Возвращает объект с параметрами для создания канваса
 */
function calculateCanvasSize() {
  const container = document.getElementById("visual-sketch");
  if (!container) {
    // Fallback если контейнер не найден
    return {
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      scale: 1,
      radius: DESIGN_RADIUS,
      repelRadius: DESIGN_REPEL_RADIUS,
      textSize: DESIGN_TEXT_SIZE,
      particles: DESIGN_PARTICLES
    };
  }

  // Получаем доступную ширину контейнера (с учётом padding)
  const containerWidth = container.clientWidth;
  
  // Определяем целевую ширину канваса
  // Ограничиваем максимум эталонным размером, минимум — мобильным
  let targetWidth = Math.max(MOBILE_WIDTH, Math.min(DESIGN_WIDTH, containerWidth - 80)); // 80px для padding
  
  // Вычисляем масштаб относительно эталона
  let scale = targetWidth / DESIGN_WIDTH;
  
  // Вычисляем высоту пропорционально
  let targetHeight = DESIGN_HEIGHT * scale;
  
  // Для очень маленьких экранов используем мобильные параметры
  if (targetWidth <= MOBILE_WIDTH + 50) {
    return {
      width: MOBILE_WIDTH,
      height: MOBILE_HEIGHT,
      scale: MOBILE_WIDTH / DESIGN_WIDTH,
      radius: MOBILE_RADIUS,
      repelRadius: MOBILE_REPEL_RADIUS,
      textSize: MOBILE_TEXT_SIZE,
      particles: MOBILE_PARTICLES
    };
  }
  
  // Адаптивные параметры на основе масштаба
  return {
    width: Math.round(targetWidth),
    height: Math.round(targetHeight),
    scale: scale,
    radius: DESIGN_RADIUS * scale,
    repelRadius: DESIGN_REPEL_RADIUS * scale,
    textSize: Math.max(MOBILE_TEXT_SIZE, Math.min(DESIGN_TEXT_SIZE, DESIGN_TEXT_SIZE * Math.sqrt(scale))),
    particles: targetWidth < 600 ? MOBILE_PARTICLES : DESIGN_PARTICLES
  };
}

/**
 * Универсальная функция получения точки взаимодействия
 * Работает для мыши (десктоп) и touch (мобильные)
 * Возвращает null если нет активного взаимодействия
 */
function getInteractionPoint() {
  // Приоритет 1: активное касание (мобильные устройства)
  if (touches.length > 0) {
    return createVector(touches[0].x - width / 2, touches[0].y - height / 2);
  }
  
  // Приоритет 2: мышь (десктоп)
  // Проверяем, что мышь либо зажата, либо двигается
  if (mouseIsPressed || (mouseX !== pmouseX || mouseY !== pmouseY)) {
    return createVector(mouseX - width / 2, mouseY - height / 2);
  }
  
  // Нет активного взаимодействия
  return null;
}

function setup() {
  describe(
    "A rotating sphere-like cloud of white letters on a black background," +
      " scatters and reforms when interacted with by the mouse or touch," +
      " creating a circular repulsion effect around the cursor."
  );

  // Вычисляем адаптивные размеры
  const canvasConfig = calculateCanvasSize();

  // Создаём канвас с вычисленными размерами
  canvas = createCanvas(canvasConfig.width, canvasConfig.height);

  // Применяем вычисленные параметры
  radius_ = canvasConfig.radius;
  repel_radius = canvasConfig.repelRadius;

  const container = document.getElementById("visual-sketch");
  if (container && canvas) {
    canvas.parent(container);
  }

  pixelDensity(1);
  // настройки текста 1в1 с исходным скетчем
  textAlign(CENTER, CENTER);
  textFont("monospace");
  textStyle(NORMAL);
  noStroke();
  fill(255);
  textSize(canvasConfig.textSize);

  // fill points array с адаптивным количеством
  const numParticles = canvasConfig.particles;
  for (let i = 0; i < numParticles; i++) {
    points.push({
      index: i,
      pos: createVector(0, 0),
      vel: createVector(0, 0),
      char: letters.charAt(Math.floor(Math.random() * letters.length)),
    });
  }
  // initiate them at angle = 0
  angle = 0;
  updateTargets();
  for (let p of points) p.vel.set(0, 0);

  // Предотвращаем прокрутку страницы при касании канваса
  if (canvas && canvas.elt) {
    // Обработчики для touch событий
    canvas.elt.addEventListener('touchstart', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    canvas.elt.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });
    
    canvas.elt.addEventListener('touchend', (e) => {
      e.preventDefault();
    }, { passive: false });
  }
}

function draw() {
  background(0);
  translate(width / 2, height / 2);

  // Получаем точку взаимодействия (может быть null)
  let interactionPoint = getInteractionPoint();

  for (let p of points) {
    let i = p.index;

    // compute the rotating “home” position
    let homeX = sin(i + angle) * sin(i * i) * radius_;
    let homeY = cos(i * i) * radius_;
    let home = createVector(homeX, homeY);

    // spring force toward home ----
    let toHome = p5.Vector.sub(home, p.pos);
    let spring = toHome.mult(attraction);
    p.vel.add(spring);

    // interaction repulsion (только если есть активное взаимодействие)
    if (interactionPoint !== null) {
      let awayFromInteraction = p5.Vector.sub(p.pos, interactionPoint);
      let distSq = awayFromInteraction.magSq();
      if (distSq > 0.1 && distSq < repel_radius * repel_radius) {
        let distance = sqrt(distSq);
        awayFromInteraction.normalize();
        // natural falloff
        let repel = repel_strength * (1 - distance / repel_radius);
        awayFromInteraction.mult(repel);
        p.vel.add(awayFromInteraction);
      }
    }

    // damping and move
    p.vel.mult(damping);
    p.pos.add(p.vel);

    // вместо точки рисуем букву
    text(p.char, p.pos.x, p.pos.y);
  }
  angle += 0.01;
}

// put the initial positions right
function updateTargets() {
  for (let p of points) {
    let i = p.index;
    let x = sin(i + angle) * sin(i * i) * radius_;
    let y = cos(i * i) * radius_;
    p.pos.set(x, y);
  }
}

function windowResized() {
  const container = document.getElementById("visual-sketch");
  if (!container || !canvas) return;

  // Вычисляем новые размеры
  const canvasConfig = calculateCanvasSize();

  // Изменяем размер канваса
  resizeCanvas(canvasConfig.width, canvasConfig.height);

  // Обновляем параметры
  radius_ = canvasConfig.radius;
  repel_radius = canvasConfig.repelRadius;
  textSize(canvasConfig.textSize);

  // Обновляем позиции частиц под новый масштаб
  updateTargets();
}

