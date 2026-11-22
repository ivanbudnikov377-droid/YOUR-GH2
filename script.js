// ============================================================
// YOUR GC - LINE ASSISTANT (HMI SCRIPT)
// ============================================================

let calculatedNozzles = [];

// ============================================================
// 1. ЗАСТАВКА (SPLASH SCREEN) И ЧАСТИЦЫ
// ============================================================
function dismissSplash() {
    const splash = document.getElementById('splash-screen');
    const mainApp = document.getElementById('main-app');
    
    if (splash && !splash.classList.contains('fade-out')) {
        splash.classList.add('fade-out');
        
        setTimeout(() => {
            splash.style.display = 'none';
            mainApp.classList.remove('hidden');
        }, 600);
    }
}

function createParticles() {
    const container = document.getElementById('splash-particles');
    if (!container) return;
    
    const particleCount = 40;
    for (let i = 0; i < particleCount; i++) {
        const p = document.createElement('div');
        p.classList.add('splash-particle');
        
        const size = Math.random() * 4 + 2;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 5 + 3) + 's';
        p.style.animationDelay = (Math.random() * 3) + 's';
        
        container.appendChild(p);
    }
}

// ============================================================
// 2. ЖИВЫЕ ЧАСЫ
// ============================================================
function updateClock() {
    const now = new Date();
    const dateEl = document.getElementById('hmi-date');
    const timeEl = document.getElementById('hmi-time');
    
    if (dateEl && timeEl) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        dateEl.textContent = `${day}.${month}.${year}`;
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// ============================================================
// 3. НАВИГАЦИЯ, ГЛОБАЛЬНАЯ ЛИНИЯ И МОДУЛИ
// ============================================================
const LINE_OPTIONS = {
    line1: {
        label: '1 линия · 21w кольцо',
        short: '1 ЛИНИЯ · 21W',
        footer: '1 ЛИНИЯ · 21W КОЛЬЦО'
    },
    line2: {
        label: '2 линия · 22w прямая',
        short: '2 ЛИНИЯ · 22W',
        footer: '2 ЛИНИЯ · 22W ПРЯМАЯ'
    },
    line3: {
        label: '3 линия · прямая АЛР цех 5',
        short: '3 ЛИНИЯ · АЛР',
        footer: '3 ЛИНИЯ · ПРЯМАЯ АЛР ЦЕХ 5'
    }
};

let currentModule = 'hub';
let selectedGlobalLine = 'line1';

function getLineLabel(lineId = selectedGlobalLine) {
    return (LINE_OPTIONS[lineId] || LINE_OPTIONS.line1).label;
}

function getLineShort(lineId = selectedGlobalLine) {
    return (LINE_OPTIONS[lineId] || LINE_OPTIONS.line1).short;
}

function selectGlobalLine(lineId) {
    if (!LINE_OPTIONS[lineId]) return;
    selectedGlobalLine = lineId;

    const option = LINE_OPTIONS[lineId];
    document.querySelectorAll('.hmi-line-option').forEach(btn => {
        const isActive = btn.getAttribute('data-line') === lineId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const headerLine = document.getElementById('hmi-global-line');
    if (headerLine) {
        headerLine.textContent = option.short;
        headerLine.title = option.label;
    }

    ['fill_line_readout', 'capper_line_readout', 'labeler_line_readout'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = option.label;
    });

    const footerLine = document.getElementById('hub_footer_line');
    if (footerLine) footerLine.textContent = option.footer;

    const hiddenLine = document.getElementById('input_line');
    if (hiddenLine) hiddenLine.value = lineId;

    // Строки линии в телеметрии модулей обновляются сразу
    setCapperText('capper_line_result', option.label);
    setCapperText('labeler_line_result', option.label);

    try {
        localStorage.setItem('gc_selected_line', lineId);
    } catch (e) {
        // localStorage может быть недоступен в file:// — выбор всё равно живёт в сессии
    }
}

function switchTab(tabName, event) {
    if (event && event.currentTarget) {
        document.querySelectorAll('.hmi-nav-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    const targetScreen = document.getElementById(`screen-${tabName}`);
    if (!targetScreen) return;

    document.querySelectorAll('.hmi-screen').forEach(screen => {
        if (screen === targetScreen) return;
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });

    targetScreen.classList.remove('hidden');
    // Принудительный reflow, чтобы анимация экрана запускалась заново
    void targetScreen.offsetWidth;
    targetScreen.classList.add('active');
}

function showHub() {
    currentModule = 'hub';
    clearSimTimer();

    const mainApp = document.getElementById('main-app');
    if (mainApp) mainApp.classList.add('hub-mode');

    const hubBtn = document.getElementById('btn-hub');
    if (hubBtn) hubBtn.classList.add('active');

    document.querySelectorAll('.hmi-nav-btn').forEach(btn => btn.classList.remove('active'));
    closeNozzleSettings();
    switchTab('hub');
}

function openModule(moduleName) {
    clearSimTimer();
    const mainApp = document.getElementById('main-app');
    const sidebar = document.getElementById('hmi-sidebar');
    const fillNav = document.getElementById('fill-nav');
    const capperNav = document.getElementById('capper-nav');
    const labelerNav = document.getElementById('labeler-nav');
    if (!mainApp || !sidebar) return;

    mainApp.classList.remove('hub-mode');
    sidebar.classList.remove('hidden');

    const hubBtn = document.getElementById('btn-hub');
    if (hubBtn) hubBtn.classList.remove('active');

    if (moduleName === 'fill') {
        currentModule = 'fill';
        if (fillNav) fillNav.classList.remove('hidden');
        if (capperNav) capperNav.classList.add('hidden');
        if (labelerNav) labelerNav.classList.add('hidden');
        switchTab('inputs', { currentTarget: document.getElementById('nav-fill-inputs') });
    } else if (moduleName === 'capper') {
        currentModule = 'capper';
        if (fillNav) fillNav.classList.add('hidden');
        if (capperNav) capperNav.classList.remove('hidden');
        if (labelerNav) labelerNav.classList.add('hidden');
        switchTab('capper-inputs', { currentTarget: document.getElementById('nav-capper-inputs') });
        updateCapperPreview();
        updateCapperPressureStatus();
    } else if (moduleName === 'labeler') {
        currentModule = 'labeler';
        if (fillNav) fillNav.classList.add('hidden');
        if (capperNav) capperNav.classList.add('hidden');
        if (labelerNav) labelerNav.classList.remove('hidden');
        switchTab('labeler-inputs', { currentTarget: document.getElementById('nav-labeler-inputs') });
        updateLabelerPreview();
    }
}

// ============================================================
// 4. АВТОРАСЧЕТ ОБЪЕМА
// ============================================================
function updateVolumePreview() {
    const weight = parseFloat(document.getElementById('input_weight').value) || 0;
    const density = parseFloat(document.getElementById('input_density').value) || 1;
    if (density <= 0) return;
    
    const volume = weight / density;
    const resultEl = document.getElementById('calc_volume_result');
    if (resultEl) resultEl.textContent = volume.toFixed(1) + ' мл';
}

// ============================================================
// 5. ФИЗИЧЕСКОЕ ЯДРО: ПНЕВМАТИЧЕСКАЯ ЛИНИЯ ПАККА
//    1 линия · 21w кольцо · 12 форсунок
// ============================================================

// Калибровка потерь трассы. На эталоне (880 г, 1.034 г/мл, 1957 сП,
// высота 238 мм, жиклёр 6 мм) даёт ровно 2.3 Атм и 7.36 с налива.
const GEOMETRY_LOSS_FACTOR = 0.4830;

const PHYSICS = {
    // Магистраль/шланг всегда 16 мм, сменный наконечник на выходе — 25 мм
    HOSE_D: 0.016,
    TIP_L: 0.025,

    // Индивидуальные длины подводящих шлангов 12 форсунок, м
    HOSE_LENGTHS: [1.75, 1.80, 1.85, 1.90, 1.78, 1.82, 1.65, 1.80, 1.70, 2.05, 1.88, 1.80],
    NOZZLE_COUNT: 12,

    // Калибровочный коэффициент потерь трассы
    GEOMETRY_LOSS_FACTOR,

    // Снятые с ПЛК поправки форсунок №1..12
    NOZZLE_TRIM: [0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.03, 0.00, 0.02, -0.04, -0.01, 0.00],

    // Безопасный диапазон давления ПЛК, Атм
    PRESSURE_MIN_ATM: 0.6,
    PRESSURE_MAX_ATM: 2.8,
    PRESSURE_MAX_FOAM_ATM: 1.6,
    FOAM_VISCOSITY_CP: 250,

    // Коэффициент кинетического напора на выходе из жиклёра
    KINETIC_COEFF: 1.2,

    // Показатель степенной связи скорости истечения и вязкости
    FLOW_VISCOSITY_EXPONENT: 0.35,

    // Эталон для калибровки
    REFERENCE: {
        weight: 880,
        density: 1.034,
        viscosity: 1957,
        height: 238,
        nozzle_D: 0.006,
        fillTime: 7.36,
        pressureAtm: 2.3
    },

    // Сервомеханика штоков
    STEM_ZERO_MM: 498,
    STEM_TRAVEL_MM: 43,
    STEM_SPEED_DIVISOR: 3.68
};

PHYSICS.HOSE_LENGTH_AVG = PHYSICS.HOSE_LENGTHS.reduce((sum, l) => sum + l, 0) / PHYSICS.NOZZLE_COUNT;

const REFERENCE_AREA = Math.PI * Math.pow(PHYSICS.REFERENCE.nozzle_D / 2, 2);
const REFERENCE_VOLUME_ML = PHYSICS.REFERENCE.weight / PHYSICS.REFERENCE.density;

// Скорость истечения на эталоне: 851.06 мл за 7.36 с через жиклёр 6 мм
const REFERENCE_VELOCITY = (REFERENCE_VOLUME_ML * 1e-6 / PHYSICS.REFERENCE.fillTime) / REFERENCE_AREA;

// Закон Пуазейля: R = 128·μ·L / (π·D⁴), Па·с/м³
function poiseuilleResistance(viscosity_PaS, length_m, diameter_m) {
    return (128 * viscosity_PaS * length_m) / (Math.PI * Math.pow(diameter_m, 4));
}

// Кинетический напор: ΔP = K·Q², где K = 1.2·ρ/A²
function kineticCoefficient(density_kg_m3, area_m2) {
    return (PHYSICS.KINETIC_COEFF * density_kg_m3) / Math.pow(area_m2, 2);
}

// Прямая задача: P = Q·R + K·Q²
function pressureDropPa(flow_m3_s, resistance, kineticK) {
    return flow_m3_s * resistance + kineticK * flow_m3_s * flow_m3_s;
}

// Обратная задача: K·Q² + R·Q − P = 0 (устойчивая форма без вычитания близких чисел)
function flowFromPressure(pressure_Pa, resistance, kineticK) {
    const discriminant = resistance * resistance + 4 * kineticK * pressure_Pa;
    return (2 * pressure_Pa) / (resistance + Math.sqrt(discriminant));
}

// Эталонный расчёт налива для тренажёра и проверки рецептов.
// Использует те же константы и формулы, что generateRecipeFromInputs().
function computeFillReference(params) {
    const weight = params.weight;
    const density = params.density;
    const viscosity = params.viscosity;
    const height = params.height;
    const nozzle_D = params.nozzleD;

    const targetVolume_ml = weight / density;
    const targetVolume_m3 = targetVolume_ml * 1e-6;
    const viscosity_PaS = viscosity * 0.001;
    const density_kg_m3 = density * 1000;

    const nozzle_A = Math.PI * Math.pow(nozzle_D / 2, 2);
    const kineticK = kineticCoefficient(density_kg_m3, nozzle_A);

    const targetVelocity = REFERENCE_VELOCITY *
        Math.pow(viscosity / PHYSICS.REFERENCE.viscosity, PHYSICS.FLOW_VISCOSITY_EXPONENT);
    const Q_target = targetVelocity * nozzle_A;

    const R_hose_avg = poiseuilleResistance(viscosity_PaS, PHYSICS.HOSE_LENGTH_AVG, PHYSICS.HOSE_D);
    const R_tip = poiseuilleResistance(viscosity_PaS, PHYSICS.TIP_L, nozzle_D);
    const R_avg_raw = R_hose_avg + R_tip;
    const R_avg = R_avg_raw * GEOMETRY_LOSS_FACTOR;

    const P_required_Pa = pressureDropPa(Q_target, R_avg, kineticK);
    let pressureAtm = P_required_Pa / 100000;
    const maxPressureAtm = viscosity < PHYSICS.FOAM_VISCOSITY_CP
        ? PHYSICS.PRESSURE_MAX_FOAM_ATM
        : PHYSICS.PRESSURE_MAX_ATM;

    pressureAtm = Math.min(maxPressureAtm, Math.max(PHYSICS.PRESSURE_MIN_ATM, pressureAtm));
    pressureAtm = Math.round(pressureAtm * 10) / 10;
    pressureAtm = Math.min(maxPressureAtm, Math.max(PHYSICS.PRESSURE_MIN_ATM, pressureAtm));

    const P_actual_Pa = pressureAtm * 100000;
    const Q_actual = flowFromPressure(P_actual_Pa, R_avg, kineticK);
    const actualFillTime = targetVolume_m3 / Q_actual;

    const stemOnSteps = Math.round(PHYSICS.STEM_ZERO_MM - height);
    const stemCycleSteps = Math.round(height - PHYSICS.STEM_TRAVEL_MM);
    let stemCycleSpeed = stemCycleSteps / (PHYSICS.STEM_SPEED_DIVISOR * actualFillTime);
    stemCycleSpeed = Math.min(100, Math.max(0.1, stemCycleSpeed));
    const kpBase = 1.15 + 0.51 * Math.min(1.15, Math.pow(viscosity / 1957, 0.35));

    return {
        targetVolume_ml,
        pressureAtm,
        actualFillTime,
        stemOnSteps,
        stemCycleSteps,
        stemCycleSpeed,
        kpBase
    };
}

function generateRecipeFromInputs() {
    // Линия выбирается глобально на хабе и действует во всех модулях
    const selectedLineText = getLineLabel();

    const diameterSelect = document.getElementById('input_nozzle_diameter');
    const rawNozzleDiameter = parseFloat(diameterSelect.value);
    // Поддержка метров (0.006) и миллиметров (6)
    const nozzle_D = rawNozzleDiameter >= 1 ? rawNozzleDiameter / 1000 : rawNozzleDiameter;
    const selectedDiameterText = diameterSelect.options[diameterSelect.selectedIndex].text;

    const bottleVolume = parseFloat(document.getElementById('input_bottle_volume').value);
    const height = parseFloat(document.getElementById('input_height').value);

    const weight = parseFloat(document.getElementById('input_weight').value);
    const density = parseFloat(document.getElementById('input_density').value);
    const viscosity = parseFloat(document.getElementById('input_viscosity').value);

    if (!(bottleVolume > 0) || !(height > 0) || !(weight > 0) || !(density > 0) || !(viscosity > 0) || !(nozzle_D > 0)) {
        alert("Ошибка: Проверьте правильность ввода замеров. Все значения должны быть больше нуля.");
        return;
    }

    const targetVolume_ml = weight / density;
    const targetVolume_m3 = targetVolume_ml * 1e-6;
    const viscosity_PaS = viscosity * 0.001;
    const density_kg_m3 = density * 1000;

    const nozzle_A = Math.PI * Math.pow(nozzle_D / 2, 2);
    const kineticK = kineticCoefficient(density_kg_m3, nozzle_A);

    // 1. Целевая скорость истечения (защита от пены), привязана к эталону 7.36 с
    const targetVelocity = REFERENCE_VELOCITY *
        Math.pow(viscosity / PHYSICS.REFERENCE.viscosity, PHYSICS.FLOW_VISCOSITY_EXPONENT);
    const Q_target = targetVelocity * nozzle_A;

    // 2. Геометрия трассы: 16-мм шланг + сменный наконечник 25 мм
    const R_hose_avg = poiseuilleResistance(viscosity_PaS, PHYSICS.HOSE_LENGTH_AVG, PHYSICS.HOSE_D);
    const R_tip = poiseuilleResistance(viscosity_PaS, PHYSICS.TIP_L, nozzle_D);
    const R_avg_raw = R_hose_avg + R_tip;
    // Калиброванные потери трассы для формулы давления
    const R_avg = R_avg_raw * GEOMETRY_LOSS_FACTOR;

    // 3. Требуемое давление: вязкие потери + кинетический напор
    const P_required_Pa = pressureDropPa(Q_target, R_avg, kineticK);
    let pressureAtm = P_required_Pa / 100000;

    const maxPressureAtm = viscosity < PHYSICS.FOAM_VISCOSITY_CP
        ? PHYSICS.PRESSURE_MAX_FOAM_ATM
        : PHYSICS.PRESSURE_MAX_ATM;

    let isPressureLimited = false;
    let pressureLimitNote = "";

    if (pressureAtm > maxPressureAtm) {
        pressureAtm = maxPressureAtm;
        isPressureLimited = true;
        pressureLimitNote = `Давление ограничено безопасным максимумом ${maxPressureAtm.toFixed(1)} Атм — налив будет медленнее расчётного.`;
    } else if (pressureAtm < PHYSICS.PRESSURE_MIN_ATM) {
        pressureAtm = PHYSICS.PRESSURE_MIN_ATM;
        isPressureLimited = true;
        pressureLimitNote = `Расчётное давление ниже минимума ПЛК — поднято до ${PHYSICS.PRESSURE_MIN_ATM.toFixed(1)} Атм.`;
    }

    // Шаг ПЛК 0.1 Атм, затем повторная проверка границ
    pressureAtm = Math.round(pressureAtm * 10) / 10;
    pressureAtm = Math.min(maxPressureAtm, Math.max(PHYSICS.PRESSURE_MIN_ATM, pressureAtm));

    // 4. Обратное решение: фактический расход, чистое время налива, производительность
    const P_actual_Pa = pressureAtm * 100000;
    const Q_actual = flowFromPressure(P_actual_Pa, R_avg, kineticK);
    const Q_ml_s = Q_actual * 1e6;
    const actualFillTime = targetVolume_m3 / Q_actual;
    const flowLpm = Q_actual * 60000;
    const bottlesPerHour = Math.round(PHYSICS.NOZZLE_COUNT * 3600 / actualFillTime);

    // 5. Индивидуальные настройки 12 форсунок
    const kp_base = 1.15 + 0.51 * Math.min(1.15, Math.pow(viscosity / 1957, 0.35));
    const ki = viscosity > 1000 ? 0.08 : 0.15;
    const basePreAct = targetVolume_ml * 0.02;

    calculatedNozzles = [];

    for (let i = 0; i < PHYSICS.NOZZLE_COUNT; i++) {
        const hoseLength = PHYSICS.HOSE_LENGTHS[i];
        const R_total_i = poiseuilleResistance(viscosity_PaS, hoseLength, PHYSICS.HOSE_D) + R_tip;
        const R_branch = R_total_i * GEOMETRY_LOSS_FACTOR;

        const Q_branch = flowFromPressure(P_actual_Pa, R_branch, kineticK);
        const Q_ml_s_i = Q_branch * 1e6;

        // Множитель сопротивления конкретной ветки (R_total_i / R_avg),
        // где R_avg — среднее по 12 веткам до калибровки
        const resistanceFactor = R_total_i / R_avg_raw;
        const kp = (kp_base + PHYSICS.NOZZLE_TRIM[i]) * resistanceFactor;
        const preAct_ml = Q_ml_s_i * 0.02 + viscosity / 500 + basePreAct;

        calculatedNozzles.push({
            id: i + 1,
            dose: targetVolume_ml.toFixed(1),
            preAct: preAct_ml.toFixed(1),
            kp: kp.toFixed(2),
            ki: ki.toFixed(2),
            resistanceFactor: resistanceFactor.toFixed(3),
            theoreticalTime: (targetVolume_ml / Q_ml_s_i).toFixed(2)
        });
    }

    // 6. Сервомеханика штоков
    // Опускание до дна: 498 − высота флакона (238 мм → 260 мм)
    const stemOnSteps = Math.round(PHYSICS.STEM_ZERO_MM - height);
    // Подъём во время налива: высота − 43 мм (238 мм → 195 мм)
    const stemCycleSteps = Math.round(height - PHYSICS.STEM_TRAVEL_MM);
    // Сопло ведёт мениск: 195 / (3.68 · 7.36) = 7.2 %
    let stemCycleSpeed = stemCycleSteps / (PHYSICS.STEM_SPEED_DIVISOR * actualFillTime);
    stemCycleSpeed = Math.min(100, Math.max(0.1, stemCycleSpeed));

    // 7. Задержка подъёма сопел (погружение ~20 мм в горловину)
    const bottleAreaMlPerMm = bottleVolume / height;
    const volumeToSubmergeMl = bottleAreaMlPerMm * 20;
    const averageFlowRate = targetVolume_ml / actualFillTime;
    const submergeDelay = Math.max(0.01, volumeToSubmergeMl / averageFlowRate);

    // 8. Запись настроек в поля ПЛК
    document.getElementById('set_tank_on').value = "0.10";
    document.getElementById('set_tank_off').value = "0.10";
    document.getElementById('set_tank_time').value = "90.00";
    document.getElementById('set_pressure').value = pressureAtm.toFixed(2);
    document.getElementById('set_sensitivity').value = (viscosity > 1000) ? "0.1" : "0.15";

    document.getElementById('set_stem_on_sec').value = "0.02";
    document.getElementById('set_stem_on_speed').value = "100.0";
    document.getElementById('set_stem_on_steps').value = stemOnSteps;

    document.getElementById('set_stem_cycle_sec').value = "0.50";
    document.getElementById('set_stem_cycle_speed').value = stemCycleSpeed.toFixed(1);
    document.getElementById('set_stem_cycle_steps').value = stemCycleSteps;

    document.getElementById('set_stem_off_sec').value = "0.02";
    document.getElementById('set_stem_off_speed').value = "120.0";

    document.getElementById('set_drop_on').value = "0.01";
    document.getElementById('set_drop_off').value = "0.01";
    document.getElementById('set_gate_on').value = "0.02";
    document.getElementById('set_gate_off').value = "0.01";

    document.getElementById('set_cutter_in_on').value = "0.01";
    document.getElementById('set_cutter_in_off').value = (actualFillTime + 2.5).toFixed(2);
    document.getElementById('set_cutter_out_on').value = "0.01";
    document.getElementById('set_cutter_out_off').value = "0.02";

    document.getElementById('set_conv_on').value = "0.01";
    document.getElementById('set_conv_off').value = "0.01";

    document.getElementById('bottle_input_dose').value = targetVolume_ml.toFixed(1);
    document.getElementById('bottle_max_time').value = (actualFillTime + 5).toFixed(1);
    document.getElementById('bottle_delay').value = submergeDelay.toFixed(2);

    // Показываем рассчитанный Kp прямо на кнопках форсунок
    renderNozzleButtons();

    const bottleBtn = document.getElementById('nav-fill-bottle');
    switchTab('bottle', { currentTarget: bottleBtn });

    let report = `АВТОМАТИЧЕСКИЙ РАСЧЕТ ЗАВЕРШЕН\n\n`;
    report += `Линия: ${selectedLineText}\n`;
    report += `Сопла: ${selectedDiameterText}\n`;
    report += `Флакон: ${bottleVolume} мл, ${height} мм\n\n`;
    report += `Целевой объем дозы: ${targetVolume_ml.toFixed(1)} мл\n`;
    report += `Давление в баке: ${pressureAtm.toFixed(2)} Атм\n`;
    report += `Расход через сопло: ${Q_ml_s.toFixed(1)} мл/с (${flowLpm.toFixed(2)} л/мин)\n`;
    report += `Чистое время налива (Цикл): ${actualFillTime.toFixed(2)} с\n`;
    report += `Производительность: ~${bottlesPerHour} бут/час (${PHYSICS.NOZZLE_COUNT} сопел)\n`;
    report += `Скорость истечения: ${targetVelocity.toFixed(2)} м/с\n`;
    report += `Базовый Kp: ${kp_base.toFixed(2)}\n`;
    report += `Штоки: опускание ${stemOnSteps} мм, подъём ${stemCycleSteps} мм, пауза 0.50 с\n`;
    report += `Скорость подъёма в цикле: ${stemCycleSpeed.toFixed(1)} %\n`;
    report += `Задержка подъёма (погружение): ${submergeDelay.toFixed(2)} с\n\n`;

    if (isPressureLimited) {
        report += `⚠️ ${pressureLimitNote}`;
    } else {
        report += `✅ Настройки безопасны. Риск пены и брызг минимален.`;
    }

    alert(report);
}

// ============================================================
// 6. РАБОТА С ФОРСУНКАМИ
// ============================================================
let currentNozzleId = null;

// Рассчитанное значение Kp выводится прямо на кнопках списка форсунок
function renderNozzleButtons() {
    const container = document.getElementById('nozzles-list-container');
    if (!container) return;

    const buttons = container.querySelectorAll('.hmi-nozzle-btn');
    buttons.forEach((btn, i) => {
        const data = calculatedNozzles[i];
        const label = `<span>Форсунка ${i + 1}</span>`;

        // Выравниваем название и Kp по краям кнопки, не меняя её стиль
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'space-between';

        if (data) {
            const kpLabel = Number(data.kp).toFixed(2);
            btn.innerHTML = `${label}<span style="color:var(--hmi-accent); font-family:var(--hmi-mono); font-weight:700;">Kp ${kpLabel}</span>`;
            btn.title = `Ветка ${i + 1}: Kp ${kpLabel}, Ki ${data.ki}, доза ${data.dose} мл`;
        } else {
            btn.innerHTML = `${label}<span style="color:var(--hmi-text-dim); font-family:var(--hmi-mono);">Kp —</span>`;
            btn.title = 'Нажмите «Сгенерировать настройки»';
        }
    });
}

function openNozzleSettings(nozzleId) {
    currentNozzleId = nozzleId;
    const data = calculatedNozzles[nozzleId - 1];

    document.getElementById('modal-nozzle-title').textContent = `Форсунка №${nozzleId}`;
    document.getElementById('modal-input-dose').value = data ? data.dose : "851";
    document.getElementById('modal-input-kp').value = data ? data.kp : "1.66";
    document.getElementById('modal-input-ki').value = data ? data.ki : "0.10";
    document.getElementById('hmi-modal-nozzle').classList.remove('hidden');
}

function closeNozzleSettings() {
    document.getElementById('hmi-modal-nozzle').classList.add('hidden');
    currentNozzleId = null;
}

function saveNozzleSettings() {
    if (!currentNozzleId) return;
    const newKp = parseFloat(document.getElementById('modal-input-kp').value);
    const newKi = parseFloat(document.getElementById('modal-input-ki').value);

    if (calculatedNozzles[currentNozzleId - 1]) {
        calculatedNozzles[currentNozzleId - 1].kp = newKp;
        calculatedNozzles[currentNozzleId - 1].ki = newKi;
        renderNozzleButtons();
    }

    const saveBtn = document.querySelector('.hmi-btn-save');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '✓ Сохранено';
    saveBtn.style.background = '#00ff00';
    
    setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.background = 'var(--hmi-accent)';
        closeNozzleSettings();
    }, 600);
}

// ============================================================
// 7. МОДУЛЬ УКУПОРА: РОЛИКОВЫЙ СЕРВО-УКУПОР ПАККА
//    Pneumatic clamps Camozzi + Delta HMI
// ============================================================

const CAPPER_PROFILES = {
    standard: 'Стандартная винтовая',
    ring: 'С контрольным кольцом (перфорация)',
    flip: 'Флип-топ / Пуш-пул',
    trigger: 'Триггер / Дозатор'
};

let lastCapperRecipe = null;

function clampCapper(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function roundCapper(value) {
    return Math.round(value * 100) / 100;
}

// Чистая математика укупора. Возвращает все тайминги и прогноз цикла.
function computeCapperRecipe(params) {
    const capDiameter = clampCapper(params.capDiameter, 10, 100);
    const bottleDiameter = clampCapper(params.bottleDiameter, 20, 200);
    const bottleHeight = clampCapper(params.bottleHeight, 40, 600);
    const rate = clampCapper(params.rate, 50, 30000);
    const capType = CAPPER_PROFILES[params.capType] ? params.capType : 'standard';

    const isRing = capType === 'ring';
    const isFlip = capType === 'flip';
    const isTrigger = capType === 'trigger';

    // Вращение голов: 0.25 с для 28 мм, 0.32–0.45 с для крупных/кольцевых крышек.
    let rotation = 0.25 + Math.max(0, capDiameter - 28) * 0.007;
    if (isRing) {
        rotation = Math.max(0.32, rotation + 0.03);
    } else if (isTrigger) {
        rotation += 0.03;
    } else if (isFlip) {
        rotation += 0.02;
    }
    rotation = roundCapper(clampCapper(rotation, 0.25, 0.45));

    // Сведение голов: 0.20 с; высокие триггеры/дозаторы — 0.25 с.
    const closure = isTrigger ? 0.25 : 0.20;

    // Окно прохода тары: база 0.70 с при 2220 бут/ч и Ø85 мм.
    const windowTime = roundCapper(clampCapper(
        0.70 * (2220 / rate) * (bottleDiameter / 85),
        0.20,
        3.00
    ));

    // Фиксатор пробки нужен только для высоких дозаторов/триггеров.
    const lock = isTrigger ? 0.05 : 0.00;

    // Фильтр затора на выходе масштабируется от длины флакона и темпа линии.
    const jamScale = clampCapper((bottleHeight / 238) * (2220 / rate), 0.40, 4.00);
    const jamOutOn = roundCapper(0.80 * jamScale);
    const jamOutOff = roundCapper(1.00 * jamScale);

    // Прогноз цикла: вращение + сведение + серво/индексация.
    const cycle = roundCapper(clampCapper(rotation + closure + 0.10, 0.53, 0.85));

    return {
        capDiameter,
        bottleDiameter,
        bottleHeight,
        rate,
        capType,
        profile: CAPPER_PROFILES[capType],
        line: params.line || selectedGlobalLine,
        lineLabel: getLineLabel(params.line || selectedGlobalLine),
        rotation,
        closure,
        windowTime,
        lock,
        jamOutOn,
        jamOutOff,
        cycle,
        lineTact: roundCapper(3600 / rate)
    };
}

function readCapperInputs() {
    return {
        capDiameter: parseFloat(document.getElementById('capper_cap_diameter').value),
        capType: document.getElementById('capper_cap_type').value,
        bottleDiameter: parseFloat(document.getElementById('capper_bottle_diameter').value),
        bottleHeight: parseFloat(document.getElementById('capper_bottle_height').value),
        rate: parseFloat(document.getElementById('capper_rate').value),
        pressure: parseFloat(document.getElementById('capper_pneu_pressure').value),
        line: selectedGlobalLine
    };
}

function validateCapperInputs(params) {
    const numbers = [params.capDiameter, params.bottleDiameter, params.bottleHeight, params.rate];
    if (!numbers.every(value => Number.isFinite(value) && value > 0)) {
        alert('Ошибка: все замеры укупора должны быть числовыми и больше нуля.');
        return false;
    }

    if (params.capDiameter < 10 || params.capDiameter > 100 ||
        params.bottleDiameter < 20 || params.bottleDiameter > 200 ||
        params.bottleHeight < 40 || params.bottleHeight > 600 ||
        params.rate < 50 || params.rate > 30000) {
        alert('Ошибка: проверьте диапазоны.\n\nКрышка: 10–100 мм\nФлакон: 20–200 мм\nВысота: 40–600 мм\nТемп: 50–30000 бут/ч');
        return false;
    }
    return true;
}

function setCapperValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function setCapperText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function applyCapperRecipe(recipe) {
    lastCapperRecipe = recipe;

    // Головы
    setCapperValue('capper_head_rot_on', recipe.rotation.toFixed(2));
    setCapperValue('capper_head_rot_off', recipe.rotation.toFixed(2));
    setCapperValue('capper_head_on', recipe.closure.toFixed(2));
    setCapperValue('capper_head_off', recipe.closure.toFixed(2));

    // Отсекатели и фиксатор
    setCapperValue('capper_cutter_in_on', '0.03');
    setCapperValue('capper_cutter_in_off', recipe.windowTime.toFixed(2));
    setCapperValue('capper_cutter_on', '0.01');
    setCapperValue('capper_cutter_off', '0.02');
    setCapperValue('capper_lock_on', recipe.lock.toFixed(2));
    setCapperValue('capper_lock_off', recipe.lock.toFixed(2));

    // Фильтры датчиков
    setCapperValue('capper_sensor_zone_on', '0.10');
    setCapperValue('capper_sensor_zone_off', '0.10');
    setCapperValue('capper_sensor_jam_out_on', recipe.jamOutOn.toFixed(2));
    setCapperValue('capper_sensor_jam_out_off', recipe.jamOutOff.toFixed(2));
    setCapperValue('capper_sensor_jam_in_on', '0.05');
    setCapperValue('capper_sensor_jam_in_off', '0.05');
    setCapperValue('capper_sensor_hit_on', '0.05');
    setCapperValue('capper_sensor_hit_off', '0.05');
    setCapperValue('capper_sensor_cutter_on', '0.05');
    setCapperValue('capper_sensor_cutter_off', '0.05');

    // Телеметрия
    setCapperText('capper_cycle_result', recipe.cycle.toFixed(2));
    setCapperText('capper_window_result', `${recipe.windowTime.toFixed(2)} с`);
    setCapperText('capper_rotation_result', `${recipe.rotation.toFixed(2)} с`);
    setCapperText('capper_closure_result', `${recipe.closure.toFixed(2)} с`);
    setCapperText('capper_profile_result', recipe.profile);
    setCapperText('capper_cap_result', `Ø${recipe.capDiameter} / ${recipe.bottleDiameter} мм`);
    setCapperText('capper_line_result', recipe.lineLabel);
    setCapperText('capper_rate_result', `${Math.round(recipe.rate)} бут/ч`);
    setCapperText('capper_tact_result', `${recipe.lineTact.toFixed(2)} с`);
    setCapperText('capper_bottle_result_sensor', `Ø${recipe.bottleDiameter} × ${recipe.bottleHeight} мм`);
    setCapperText('capper_clamp_hint', `Прижимы подстроить под Ø${recipe.bottleDiameter} мм; траверса ${recipe.bottleHeight} мм.`);

    // Напоминания наладчику
    setCapperText('capper_reminder_roller_value', String(Math.round(recipe.capDiameter)));
    setCapperText('capper_reminder_height_value', String(Math.round(recipe.bottleHeight)));

    // Превью на экране замеров
    setCapperText('capper_preview_cycle', `${recipe.cycle.toFixed(2)} с`);
    setCapperText('capper_preview_window', `${recipe.windowTime.toFixed(2)} с`);
}

function calculateCapperRecipe() {
    const params = readCapperInputs();
    if (!validateCapperInputs(params)) return;

    const recipe = computeCapperRecipe(params);
    applyCapperRecipe(recipe);
    updateCapperPressureStatus();

    switchTab('capper-timings', { currentTarget: document.getElementById('nav-capper-timings') });
}

function updateCapperPreview() {
    const cycleEl = document.getElementById('capper_preview_cycle');
    const windowEl = document.getElementById('capper_preview_window');
    if (!cycleEl || !windowEl) return;

    const params = readCapperInputs();
    const numbers = [params.capDiameter, params.bottleDiameter, params.bottleHeight, params.rate];
    if (!numbers.every(value => Number.isFinite(value) && value > 0)) {
        cycleEl.textContent = '—';
        windowEl.textContent = '—';
        return;
    }

    const recipe = computeCapperRecipe(params);
    cycleEl.textContent = `${recipe.cycle.toFixed(2)} с`;
    windowEl.textContent = `${recipe.windowTime.toFixed(2)} с`;

    setCapperText('capper_height_hint', `Траверса: ${Math.round(params.bottleHeight)} мм — ориентир по центральному маховику.`);
    setCapperText('capper_reminder_roller_value', String(Math.round(params.capDiameter)));
    setCapperText('capper_reminder_height_value', String(Math.round(params.bottleHeight)));
    setCapperText('capper_clamp_hint', `Прижимы подстроить под Ø${Math.round(params.bottleDiameter)} мм; траверса ${Math.round(params.bottleHeight)} мм.`);
    setCapperText('capper_bottle_result_sensor', `Ø${Math.round(params.bottleDiameter)} × ${Math.round(params.bottleHeight)} мм`);
}

function updateCapperPressureStatus() {
    const pressureEl = document.getElementById('capper_pneu_pressure');
    if (!pressureEl) return;

    let pressure = parseFloat(pressureEl.value);
    if (!Number.isFinite(pressure)) pressure = 5.0;

    const statusEl = document.getElementById('capper_pressure_status');
    const isOk = pressure >= 4.0 && pressure <= 6.0;

    if (statusEl) {
        statusEl.classList.remove('is-ok', 'is-warn');
        statusEl.classList.add(isOk ? 'is-ok' : 'is-warn');
        statusEl.textContent = isOk ? '4–6 бар · НОРМА' : (pressure < 4 ? 'НИЖЕ НОРМЫ' : 'ВЫШЕ НОРМЫ');
    }

    setCapperText('capper_pressure_value', pressure.toFixed(1));
    refreshCapperWarnings(pressure);
}

function refreshCapperWarnings(pressure) {
    const box = document.getElementById('capper_warning');
    if (!box) return;

    const messages = [];
    if (pressure < 4.0 || pressure > 6.0) {
        messages.push(`Давление Camozzi ${pressure.toFixed(1)} бар вне рабочего диапазона 4–6 бар — отрегулировать пневмозажимы.`);
    }
    if (lastCapperRecipe && lastCapperRecipe.cycle > lastCapperRecipe.lineTact) {
        messages.push(`Цикл укупора ${lastCapperRecipe.cycle.toFixed(2)} с превышает такт линии ${lastCapperRecipe.lineTact.toFixed(2)} с — снизить темп.`);
    }

    if (messages.length) {
        box.textContent = messages.join(' ');
        box.classList.remove('hidden');
    } else {
        box.textContent = '';
        box.classList.add('hidden');
    }
}

// ============================================================
// 8. МОДУЛЬ ЭТИКЕТИРОВЩИКА: СИКОМ / GREEN SERIES / KINCO
// ============================================================

const LABELER_MODES = {
    wrap: 'Круговая обкатка (1 аппликатор + ремень)',
    both: 'Двухсторонняя оклейка (2 аппликатора + лопатки)'
};

const LABELER_MATERIALS = {
    pp: 'Полипропилен (ПП)',
    paper: 'Бумага'
};

let lastLabelerRecipe = null;

function computeLabelerRecipe(params) {
    const mode = params.mode === 'both' ? 'both' : 'wrap';
    const material = params.material === 'paper' ? 'paper' : 'pp';
    const wrapScheme = params.wrapScheme === 'belt' ? 'belt' : 'rollers';

    const tachometerSpeed = clampCapper(params.tachometerSpeed, 1, 100);
    const diamBottom = clampCapper(params.diamBottom, 20, 200);
    const diamTop = clampCapper(params.diamTop, 20, 200);
    const labelHeight = clampCapper(params.labelHeight, 20, 400);
    const labelLength = clampCapper(params.labelLength, 20, 500);
    const twoRolls = !!params.twoRolls;

    // Уставка скорости на панели Kinco (эталон 455 при 27.5 м/мин).
    const speedSetpoint = Math.round(tachometerSpeed * (mode === 'wrap' ? 16.55 : 16.20));

    // Завал аппликатора от конусности флакона.
    const inclinometerDeg = (Math.atan((diamBottom - diamTop) / (2 * labelHeight)) * 180 / Math.PI).toFixed(1);

    // Угол атаки отделительного ножа.
    let knifeAngle;
    if (mode === 'wrap') {
        knifeAngle = material === 'pp' ? 12.0 : 14.5;
    } else {
        knifeAngle = material === 'pp' ? 18.5 : 20.5;
    }

    const lineSpeedMmS = tachometerSpeed * 1000 / 60;

    // Тайминги Kinco.
    const startDelay = Math.round((85 / lineSpeedMmS) * 540);
    const stopDelay = Math.round(70 + (labelLength / 10));
    const cutterDelay = Math.round(140 * (27.5 / tachometerSpeed));
    const gripDelay = Math.round(44 * (27.5 / tachometerSpeed));
    const start2 = mode === 'both'
        ? Math.round((diamBottom + 45) / lineSpeedMmS * 1000)
        : (twoRolls ? 140 : 0);

    // Обкатка: 3 ролика (+4–6%) или ремень (+5–8%).
    const beltSpeedMin = tachometerSpeed * 1.05;
    const beltSpeedMax = tachometerSpeed * 1.08;
    const rollerSpeedMin = tachometerSpeed * 1.04;
    const rollerSpeedMax = tachometerSpeed * 1.06;

    const isWrap = mode === 'wrap';
    const useRollers = isWrap && wrapScheme === 'rollers';
    const wrapSpeedMin = isWrap ? (useRollers ? rollerSpeedMin : beltSpeedMin) : tachometerSpeed;
    const wrapSpeedMax = isWrap ? (useRollers ? rollerSpeedMax : beltSpeedMax) : tachometerSpeed;
    const wrapSpeedCaption = !isWrap ? 'Прижимные лопатки' : (useRollers ? 'Ведущий ролик' : 'Обкаточный ремень');
    const wrapSpeedNote = !isWrap ? '2 аппликатора' : (useRollers ? '+4–6% к конвейеру' : '+5–8% к конвейеру');
    const wrapSchemeLabel = !isWrap ? 'Двухсторонняя оклейка' : (useRollers ? '3 ролика (1 ведущий + 2 прижимных)' : 'Обкаточный ремень');

    // Зазор/ход прижимной каретки двух ответных роликов: D − 3…2 мм.
    const carriageGapMin = Math.max(0, diamBottom - 3);
    const carriageGapMax = Math.max(0, diamBottom - 2);

    return {
        mode,
        material,
        wrapScheme,
        tachometerSpeed,
        diamBottom,
        diamTop,
        labelHeight,
        labelLength,
        twoRolls,
        speedSetpoint,
        inclinometerDeg,
        knifeAngle,
        startDelay,
        stopDelay,
        cutterDelay,
        gripDelay,
        start2,
        beltSpeedMin,
        beltSpeedMax,
        rollerSpeedMin,
        rollerSpeedMax,
        wrapSpeedMin,
        wrapSpeedMax,
        wrapSpeedCaption,
        wrapSpeedNote,
        wrapSchemeLabel,
        carriageGapMin,
        carriageGapMax,
        line: params.line || selectedGlobalLine,
        lineLabel: getLineLabel(params.line || selectedGlobalLine)
    };
}

function readLabelerInputs() {
    return {
        mode: document.getElementById('labeler_mode').value,
        wrapScheme: document.getElementById('labeler_wrap_scheme').value,
        tachometerSpeed: parseFloat(document.getElementById('labeler_tach').value),
        diamBottom: parseFloat(document.getElementById('labeler_diam_bottom').value),
        diamTop: parseFloat(document.getElementById('labeler_diam_top').value),
        labelHeight: parseFloat(document.getElementById('labeler_label_height').value),
        labelLength: parseFloat(document.getElementById('labeler_label_length').value),
        material: document.getElementById('labeler_material').value,
        twoRolls: !!document.getElementById('labeler_two_rolls').checked,
        line: selectedGlobalLine
    };
}

function validateLabelerInputs(params) {
    const numbers = [params.tachometerSpeed, params.diamBottom, params.diamTop, params.labelHeight, params.labelLength];
    if (!numbers.every(value => Number.isFinite(value) && value > 0)) {
        alert('Ошибка: все замеры этикетировщика должны быть числовыми и больше нуля.');
        return false;
    }

    if (params.tachometerSpeed < 1 || params.tachometerSpeed > 100 ||
        params.diamBottom < 20 || params.diamBottom > 200 ||
        params.diamTop < 20 || params.diamTop > 200 ||
        params.labelHeight < 20 || params.labelHeight > 400 ||
        params.labelLength < 20 || params.labelLength > 500) {
        alert('Ошибка: проверьте диапазоны.\n\nТахометр: 1–100 м/мин\nДиаметры: 20–200 мм\nВысота этикетки: 20–400 мм\nДлина этикетки: 20–500 мм');
        return false;
    }
    return true;
}

function applyLabelerRecipe(recipe) {
    lastLabelerRecipe = recipe;

    // Поля панели Kinco Green Series
    setCapperValue('labeler_k_speed', String(recipe.speedSetpoint));
    setCapperValue('labeler_k_start', String(recipe.startDelay));
    setCapperValue('labeler_k_stop', String(recipe.stopDelay));
    setCapperValue('labeler_k_cutter', String(recipe.cutterDelay));
    setCapperValue('labeler_k_grip', String(recipe.gripDelay));
    setCapperValue('labeler_k_start2', String(recipe.start2));

    // Крупная инструментальная сводка
    setCapperText('labeler_tach_result', recipe.tachometerSpeed.toFixed(1));
    setCapperText('labeler_belt_result', `${recipe.wrapSpeedMin.toFixed(1)}–${recipe.wrapSpeedMax.toFixed(1)}`);
    setCapperText('labeler_wrap_speed_caption', recipe.wrapSpeedCaption);
    setCapperText('labeler_wrap_speed_note', recipe.wrapSpeedNote);
    setCapperText('labeler_carriage_gap_result', `${recipe.carriageGapMin}–${recipe.carriageGapMax}`);
    setCapperText('labeler_inclinometer_result', recipe.inclinometerDeg);
    setCapperText('labeler_angle_result', recipe.knifeAngle.toFixed(1));

    const wrapSpeedCard = document.getElementById('labeler_wrap_speed_card');
    const gapCard = document.getElementById('labeler_carriage_gap_card');
    if (wrapSpeedCard) wrapSpeedCard.classList.toggle('hidden', recipe.mode === 'both');
    if (gapCard) gapCard.classList.toggle('hidden', recipe.mode === 'both');
    const schemeSelect = document.getElementById('labeler_wrap_scheme');
    if (schemeSelect) schemeSelect.disabled = recipe.mode === 'both';
    const gapRow = document.getElementById('labeler_preview_gap_row');
    if (gapRow) gapRow.classList.toggle('hidden', recipe.mode === 'both');

    // Детализация в боковой панели
    setCapperText('labeler_tape_target', `${recipe.tachometerSpeed.toFixed(1)} м/мин`);
    setCapperText('labeler_wrap_speed_aside_caption', `${recipe.wrapSpeedCaption} ${recipe.wrapSpeedNote.replace(' к конвейеру', '')}`);
    setCapperText('labeler_belt_result_aside', `${recipe.wrapSpeedMin.toFixed(1)}–${recipe.wrapSpeedMax.toFixed(1)} м/мин`);
    setCapperText('labeler_wrap_scheme_result', recipe.wrapSchemeLabel);
    setCapperText('labeler_carriage_gap_aside', `${recipe.carriageGapMin}–${recipe.carriageGapMax} мм`);
    setCapperText('labeler_parallel_result', '≤ 0.1 мм');
    setCapperText('labeler_inclinometer_aside', `${recipe.inclinometerDeg}°`);
    setCapperText('labeler_angle_aside', `${recipe.knifeAngle.toFixed(1)}°`);
    setCapperText('labeler_mode_result', LABELER_MODES[recipe.mode]);
    setCapperText('labeler_material_result', `${LABELER_MATERIALS[recipe.material]}${recipe.mode === 'wrap' && recipe.twoRolls ? ' · 2 рулона' : ''}`);
    setCapperText('labeler_line_result', recipe.lineLabel);
    setCapperText('labeler_start2_result', `${recipe.start2} мс`);

    // Превью на экране замеров
    setCapperText('labeler_preview_speed', String(recipe.speedSetpoint));
    setCapperText('labeler_preview_inclinometer', `${recipe.inclinometerDeg}°`);
    setCapperText('labeler_preview_angle', `${recipe.knifeAngle.toFixed(1)}°`);
    setCapperText('labeler_preview_gap', `${recipe.carriageGapMin}–${recipe.carriageGapMax} мм`);
}

function calculateLabelerRecipe() {
    const params = readLabelerInputs();
    if (!validateLabelerInputs(params)) return;

    const recipe = computeLabelerRecipe(params);
    applyLabelerRecipe(recipe);

    switchTab('labeler-panel', { currentTarget: document.getElementById('nav-labeler-panel') });
}

function updateLabelerPreview() {
    const speedEl = document.getElementById('labeler_preview_speed');
    const inclEl = document.getElementById('labeler_preview_inclinometer');
    const angleEl = document.getElementById('labeler_preview_angle');
    const gapEl = document.getElementById('labeler_preview_gap');
    if (!speedEl || !inclEl || !angleEl) return;

    const params = readLabelerInputs();
    const schemeSelect = document.getElementById('labeler_wrap_scheme');
    if (schemeSelect) schemeSelect.disabled = params.mode === 'both';
    const gapRow = document.getElementById('labeler_preview_gap_row');
    if (gapRow) gapRow.classList.toggle('hidden', params.mode === 'both');

    const numbers = [params.tachometerSpeed, params.diamBottom, params.diamTop, params.labelHeight, params.labelLength];
    if (!numbers.every(value => Number.isFinite(value) && value > 0)) {
        speedEl.textContent = '—';
        inclEl.textContent = '—';
        angleEl.textContent = '—';
        if (gapEl) gapEl.textContent = '—';
        return;
    }

    const recipe = computeLabelerRecipe(params);
    speedEl.textContent = String(recipe.speedSetpoint);
    inclEl.textContent = `${recipe.inclinometerDeg}°`;
    angleEl.textContent = `${recipe.knifeAngle.toFixed(1)}°`;
    if (gapEl) gapEl.textContent = `${recipe.carriageGapMin}–${recipe.carriageGapMax} мм`;
}

// ============================================================
// 9. ЧЕК-ЛИСТЫ НАЛАДЧИКА
// ============================================================
function updateChecklistProgress(moduleName) {
    const boxes = document.querySelectorAll(`input[data-checklist="${moduleName}"]`);
    let done = 0;

    boxes.forEach(box => {
        if (box.checked) done++;
        const item = box.closest ? box.closest('.hmi-check-item') : null;
        if (item) item.classList.toggle('is-checked', box.checked);
    });

    const total = boxes.length;
    const textEl = document.getElementById(`${moduleName}_checklist_progress`);
    if (textEl) textEl.textContent = `${done} / ${total}`;

    const barEl = document.getElementById(`${moduleName}_checklist_bar`);
    if (barEl) barEl.style.width = total ? `${(done / total) * 100}%` : '0%';
}

function resetChecklist(moduleName) {
    document.querySelectorAll(`input[data-checklist="${moduleName}"]`).forEach(box => {
        box.checked = false;
    });
    updateChecklistProgress(moduleName);
}

// ============================================================
// 10. БИБЛИОТЕКА РЕЦЕПТОВ
// ============================================================
const RECIPES_STORAGE_KEY = 'gc_recipes_v1';
const RECIPE_MODULE_LABELS = { fill: 'Налив', capper: 'Укупор', labeler: 'Этикетировщик' };
let savedRecipes = [];
let recipesFilter = 'all';
let toastTimer = null;

function showToast(message, isError = false) {
    const toast = document.getElementById('hmi-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.toggle('is-error', !!isError);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function formatRecipeDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function loadRecipesFromStorage() {
    try {
        const raw = localStorage.getItem(RECIPES_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        savedRecipes = Array.isArray(parsed) ? parsed.filter(item => item && item.id && item.module && item.state) : [];
    } catch (e) {
        savedRecipes = [];
    }
}

function persistRecipes() {
    try {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(savedRecipes));
    } catch (e) {
        showToast('Не удалось сохранить рецепты на устройстве', true);
    }
}

function collectModuleValues(moduleName) {
    const prefixes = moduleName === 'fill'
        ? ['input_', 'set_', 'bottle_']
        : moduleName === 'capper'
            ? ['capper_']
            : ['labeler_'];

    const values = {};
    prefixes.forEach(prefix => {
        document.querySelectorAll(`input[id^="${prefix}"], select[id^="${prefix}"]`).forEach(el => {
            values[el.id] = el.type === 'checkbox' ? el.checked : el.value;
        });
    });
    return values;
}

function captureModuleState(moduleName) {
    const state = { values: collectModuleValues(moduleName) };
    if (moduleName === 'fill') {
        state.calculatedNozzles = JSON.parse(JSON.stringify(calculatedNozzles));
    } else if (moduleName === 'capper') {
        state.capperRecipe = lastCapperRecipe ? JSON.parse(JSON.stringify(lastCapperRecipe)) : null;
    } else if (moduleName === 'labeler') {
        state.labelerRecipe = lastLabelerRecipe ? JSON.parse(JSON.stringify(lastLabelerRecipe)) : null;
    }
    return state;
}

function saveCurrentRecipe(moduleName) {
    const nameInput = document.getElementById(`recipe_name_${moduleName}`);
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        showToast('Введите название продукта перед сохранением', true);
        if (nameInput) nameInput.focus();
        return;
    }

    const recipe = {
        id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        version: 1,
        name,
        module: moduleName,
        line: selectedGlobalLine,
        lineLabel: getLineLabel(),
        date: new Date().toISOString(),
        state: captureModuleState(moduleName)
    };

    savedRecipes.unshift(recipe);
    if (savedRecipes.length > 80) savedRecipes.length = 80;
    persistRecipes();
    updateRecipePanels();
    if (recipesFilter === 'all' || recipesFilter === moduleName) renderRecipesList();
    showToast(`Рецепт «${name}» сохранён`);
}

function updateRecipePanels() {
    const counts = { fill: 0, capper: 0, labeler: 0 };
    savedRecipes.forEach(recipe => {
        if (counts[recipe.module] !== undefined) counts[recipe.module]++;
    });

    ['fill', 'capper', 'labeler'].forEach(moduleName => {
        const el = document.getElementById(`${moduleName}_recipes_count`);
        if (el) el.textContent = String(counts[moduleName]);
    });

    const hubCount = document.getElementById('hub_recipes_count');
    if (hubCount) hubCount.textContent = String(savedRecipes.length);

    const preview = document.getElementById('hub_recipes_preview');
    if (preview) {
        if (!savedRecipes.length) {
            preview.textContent = 'Пока нет сохранённых рецептов';
        } else {
            preview.textContent = savedRecipes.slice(0, 3).map(recipe =>
                `${RECIPE_MODULE_LABELS[recipe.module] || recipe.module}: ${recipe.name}`
            ).join(' · ');
            preview.title = savedRecipes.slice(0, 5).map(recipe => recipe.name).join('\n');
        }
    }
}

function openRecipesModal(filter = 'all') {
    recipesFilter = filter;
    const modal = document.getElementById('recipes-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setRecipesFilter(filter);
}

function closeRecipesModal() {
    const modal = document.getElementById('recipes-modal');
    if (modal) modal.classList.add('hidden');
}

function setRecipesFilter(filter) {
    recipesFilter = filter || 'all';
    document.querySelectorAll('.hmi-recipes-filter').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === recipesFilter);
    });
    renderRecipesList();
}

function renderRecipesList() {
    const list = document.getElementById('recipes-list');
    if (!list) return;

    const filtered = recipesFilter === 'all'
        ? savedRecipes
        : savedRecipes.filter(recipe => recipe.module === recipesFilter);

    if (!filtered.length) {
        list.innerHTML = '<div class="hmi-recipes-empty">В этой категории пока нет рецептов.<br>Сохраните настройки из нужного модуля.</div>';
        return;
    }

    list.innerHTML = filtered.map(recipe => {
        const moduleLabel = RECIPE_MODULE_LABELS[recipe.module] || recipe.module;
        const lineLabel = recipe.lineLabel || getLineLabel(recipe.line);
        return `
            <div class="hmi-recipe-row">
                <div class="hmi-recipe-info">
                    <div class="hmi-recipe-row-name">${escapeHtml(recipe.name)} <span class="hmi-recipe-badge">${escapeHtml(moduleLabel)}</span></div>
                    <div class="hmi-recipe-row-meta">${escapeHtml(lineLabel)} · ${escapeHtml(formatRecipeDate(recipe.date))}</div>
                </div>
                <div class="hmi-recipe-row-actions">
                    <button type="button" class="hmi-recipe-load" onclick="loadRecipe('${escapeHtml(recipe.id)}')">Загрузить</button>
                    <button type="button" class="hmi-recipe-del" title="Удалить рецепт" onclick="deleteRecipe('${escapeHtml(recipe.id)}')">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadRecipe(recipeId) {
    const recipe = savedRecipes.find(item => item.id === recipeId);
    if (!recipe) {
        showToast('Рецепт не найден', true);
        return;
    }

    selectGlobalLine(recipe.line || 'line1');
    openModule(recipe.module);

    const values = (recipe.state && recipe.state.values) || {};
    Object.keys(values).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!values[id];
        else el.value = values[id];
    });

    if (recipe.module === 'fill') {
        calculatedNozzles = Array.isArray(recipe.state.calculatedNozzles)
            ? recipe.state.calculatedNozzles
            : [];
        updateVolumePreview();
        renderNozzleButtons();
        if (calculatedNozzles.length) {
            switchTab('bottle', { currentTarget: document.getElementById('nav-fill-bottle') });
        }
    } else if (recipe.module === 'capper') {
        if (recipe.state.capperRecipe) {
            applyCapperRecipe(recipe.state.capperRecipe);
            updateCapperPreview();
            updateCapperPressureStatus();
            switchTab('capper-timings', { currentTarget: document.getElementById('nav-capper-timings') });
        } else {
            updateCapperPreview();
            updateCapperPressureStatus();
            switchTab('capper-inputs', { currentTarget: document.getElementById('nav-capper-inputs') });
        }
    } else if (recipe.module === 'labeler') {
        if (recipe.state.labelerRecipe) {
            applyLabelerRecipe(recipe.state.labelerRecipe);
            updateLabelerPreview();
            switchTab('labeler-panel', { currentTarget: document.getElementById('nav-labeler-panel') });
        } else {
            updateLabelerPreview();
            switchTab('labeler-inputs', { currentTarget: document.getElementById('nav-labeler-inputs') });
        }
    }

    const nameInput = document.getElementById(`recipe_name_${recipe.module}`);
    if (nameInput) nameInput.value = recipe.name;

    closeRecipesModal();
    showToast(`Рецепт «${recipe.name}» загружен`);
}

function deleteRecipe(recipeId) {
    const recipe = savedRecipes.find(item => item.id === recipeId);
    if (!recipe) return;
    if (!confirm(`Удалить рецепт «${recipe.name}»?`)) return;

    savedRecipes = savedRecipes.filter(item => item.id !== recipeId);
    persistRecipes();
    updateRecipePanels();
    renderRecipesList();
    showToast('Рецепт удалён');
}

function exportRecipes() {
    const payload = {
        app: 'YOUR GC - Line Assistant',
        version: 1,
        exportedAt: new Date().toISOString(),
        recipes: savedRecipes
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `your-gc-recipes-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Экспортировано рецептов: ${savedRecipes.length}`);
}

function triggerRecipeImport() {
    const input = document.getElementById('recipes-import-file');
    if (input) input.click();
}

function importRecipes(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            const incoming = Array.isArray(parsed) ? parsed : parsed.recipes;
            if (!Array.isArray(incoming)) throw new Error('bad format');

            let added = 0;
            incoming.forEach(item => {
                if (!item || !['fill', 'capper', 'labeler'].includes(item.module) || !item.state) return;
                savedRecipes.unshift({
                    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    version: 1,
                    name: item.name || 'Импортированный рецепт',
                    module: item.module,
                    line: item.line || selectedGlobalLine,
                    lineLabel: item.lineLabel || getLineLabel(item.line || selectedGlobalLine),
                    date: item.date || new Date().toISOString(),
                    state: item.state
                });
                added++;
            });

            if (savedRecipes.length > 80) savedRecipes.length = 80;
            persistRecipes();
            updateRecipePanels();
            renderRecipesList();
            showToast(added ? `Импортировано рецептов: ${added}` : 'В файле не найдено рецептов', !added);
        } catch (e) {
            showToast('Ошибка импорта JSON: проверьте формат файла', true);
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// ============================================================
// 11. СИМУЛЯТОР / ТРЕНАЖЁР НАЛАДЧИКА
// ============================================================
const SIM_MODULE_LABELS = {
    fill: 'Налив · 21w кольцо',
    capper: 'Укупор · ПАККА',
    labeler: 'Этикетировщик · СИКОМ'
};

const SIM_MODE_LABELS = {
    beginner: 'Новичок / Оператор',
    master: 'Мастер-наладчик',
    accident: 'Авария / Поиск косяка'
};

const SIM_TIMERS = { beginner: 0, master: 180, accident: 120 };

const SIM_FILL_SCENARIOS = [
    { product: 'Шампунь-концентрат', volume: 1000, weight: 1000, density: 1.0, viscosity: 300, height: 210, nozzleD: 0.006, bottle: '1.0 л · Ø75' },
    { product: 'Гель-концентрат', volume: 1000, weight: 880, density: 1.034, viscosity: 1957, height: 238, nozzleD: 0.006, bottle: '1.0 л · Ø85' },
    { product: 'Технический концентрат', volume: 5000, weight: 5000, density: 1.0, viscosity: 800, height: 300, nozzleD: 0.014, bottle: '5 л · канистра' },
    { product: 'ПАВ-средство', volume: 1000, weight: 1034, density: 1.034, viscosity: 120, height: 230, nozzleD: 0.008, bottle: '1.0 л · Ø90' },
    { product: 'Индустриальное масло', volume: 1000, weight: 900, density: 0.9, viscosity: 2500, height: 250, nozzleD: 0.008, bottle: '1.0 л · Ø80' }
];

const SIM_CAPPER_SCENARIOS = [
    { capDiameter: 28, capType: 'standard', bottleDiameter: 85, bottleHeight: 238, rate: 2220, product: 'Стандартная винтовая 28 мм' },
    { capDiameter: 38, capType: 'ring', bottleDiameter: 90, bottleHeight: 245, rate: 2100, product: 'Крышка с контрольным кольцом 38 мм' },
    { capDiameter: 28, capType: 'trigger', bottleDiameter: 80, bottleHeight: 230, rate: 2400, product: 'Триггер-дозатор 28 мм' },
    { capDiameter: 45, capType: 'standard', bottleDiameter: 100, bottleHeight: 280, rate: 1800, product: 'Стандартная винтовая 45 мм' },
    { capDiameter: 60, capType: 'ring', bottleDiameter: 110, bottleHeight: 300, rate: 1500, product: 'Крышка с кольцом 60 мм' }
];

const SIM_LABELER_SCENARIOS = [
    { mode: 'wrap', wrapScheme: 'rollers', material: 'pp', tachometerSpeed: 27.5, diamBottom: 85, diamTop: 78, labelHeight: 140, labelLength: 220, product: 'Шампунь 1 л, ПП' },
    { mode: 'wrap', wrapScheme: 'belt', material: 'paper', tachometerSpeed: 24, diamBottom: 90, diamTop: 84, labelHeight: 150, labelLength: 180, product: 'Стекло 0.7 л, бумага' },
    { mode: 'both', wrapScheme: 'rollers', material: 'pp', tachometerSpeed: 22, diamBottom: 90, diamTop: 85, labelHeight: 130, labelLength: 200, product: 'Флакон 1 л, две этикетки' }
];

let currentSimMode = null;
let currentSimTask = null;
let simTimerId = null;
let simTimeLeft = 0;

function simPick(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function simField(key, label, unit, reference, decimals, step, explanation, extra = {}) {
    return Object.assign({
        key, label, unit,
        ref: Number(reference),
        decimals, step,
        explanation,
        type: 'number'
    }, extra);
}

function simFormatNumber(value, decimals) {
    return Number(value).toFixed(decimals);
}

function simBriefHeader() {
    return `Линия: ${getLineLabel()}.`;
}

function buildSimFillTask(isMaster) {
    const s = simPick(SIM_FILL_SCENARIOS);
    const ref = computeFillReference({
        volume: s.volume, weight: s.weight, density: s.density,
        viscosity: s.viscosity, height: s.height, nozzleD: s.nozzleD
    });

    const fields = [
        simField('pressure', 'Давление в баке', 'Атм', ref.pressureAtm, 1, 0.1,
            'При заниженном давлении продукт не дойдёт до дозы, при завышенном — перелив, пена и забрызгивание горловины.'),
        simField('stemOn', 'Ход штоков вниз', 'мм', ref.stemOnSteps, 0, 1,
            'Сопло либо не погрузится в горлышко (пена и недолив), либо ударит в дно флакона.'),
        simField('stemSpeed', 'Скорость подъёма штоков', '%', Number(ref.stemCycleSpeed.toFixed(1)), 1, 0.1,
            'Сопло не будет вести мениск: продукт вспенится, пойдёт недолив или разбрызгивание.'),
        simField('fillTime', 'Чистое время налива', 'с', Number(ref.actualFillTime.toFixed(2)), 2, 0.01,
            'Неверный цикл даёт перелив/недолив и сбивает производительность линии.'),
        simField('kp', 'Базовый Kp форсунок', '', Number(ref.kpBase.toFixed(2)), 2, 0.01,
            'Неверный Kp уведёт дозу за допуск: форсунка будет перерегулировать или недоливать.')
    ];

    if (isMaster) {
        fields.push(simField('stemCycle', 'Ход штоков вверх', 'мм', ref.stemCycleSteps, 0, 1,
            'Несогласованный подъём штоков ломает синхронизацию с мениском и вызывает пену/перелив.'));
    }

    return {
        module: 'fill',
        mode: isMaster ? 'master' : 'beginner',
        title: 'Налив · 21w кольцо',
        brief: `${simBriefHeader()} Флакон ${s.volume} мл (${s.bottle}), высота ${s.height} мм. Продукт «${s.product}»: плотность ${s.density} г/мл, вязкость ${s.viscosity} сП. Жиклёр ${Math.round(s.nozzleD * 1000)} мм. Рассчитайте ключевые уставки налива.`,
        fields
    };
}

function buildSimCapperTask(isMaster) {
    const s = simPick(SIM_CAPPER_SCENARIOS);
    const ref = computeCapperRecipe({
        capDiameter: s.capDiameter,
        capType: s.capType,
        bottleDiameter: s.bottleDiameter,
        bottleHeight: s.bottleHeight,
        rate: s.rate,
        line: selectedGlobalLine
    });

    const fields = [
        simField('rotation', 'Голова вращение', 'с', ref.rotation, 2, 0.01,
            'Малое вращение не дотянет кольцо, чрезмерное — сорвёт резьбу и сомнёт крышку.'),
        simField('closure', 'Голова сведение', 'с', ref.closure, 2, 0.01,
            'Ролики либо не достанут крышку, либо раздавят её при сведении.'),
        simField('window', 'Окно прохода тары', 'с', ref.windowTime, 2, 0.01,
            'Флакон не успеет встать под головку: затор, удар или пропуск бутылки.'),
        simField('cycle', 'Цикл укупора', 'с', ref.cycle, 2, 0.01,
            'Цикл не согласован с темпом линии — очередь бутылок или простой узла.')
    ];

    if (isMaster) {
        fields.push(simField('jamOn', 'Фильтр затора (Выход) On', 'с', ref.jamOutOn, 2, 0.01,
            'Слишком короткий фильтр даёт ложные остановки, слишком длинный пропускает затор.'));
        fields.push(simField('jamOff', 'Фильтр затора (Выход) Off', 'с', ref.jamOutOff, 2, 0.01,
            'Неверная задержка фильтра скрывает затор или останавливает линию без причины.'));
    }

    return {
        module: 'capper',
        mode: isMaster ? 'master' : 'beginner',
        title: 'Укупор · ПАККА',
        brief: `${simBriefHeader()} Крышка: ${s.product}. Флакон Ø${s.bottleDiameter} × ${s.bottleHeight} мм, темп ${s.rate} бут/ч, пневмозажимы Camozzi. Рассчитайте тайминги голов и отсекателя.`,
        fields
    };
}

function buildSimLabelerTask(isMaster) {
    const s = simPick(SIM_LABELER_SCENARIOS);
    const ref = computeLabelerRecipe({
        mode: s.mode,
        wrapScheme: s.wrapScheme,
        material: s.material,
        tachometerSpeed: s.tachometerSpeed,
        diamBottom: s.diamBottom,
        diamTop: s.diamTop,
        labelHeight: s.labelHeight,
        labelLength: s.labelLength,
        twoRolls: false,
        line: selectedGlobalLine
    });

    const fields = [
        simField('speed', 'Скорость Kinco', 'у.е.', ref.speedSetpoint, 0, 1,
            'Уставка не соответствует тахометру: этикетка растянется, сместится или порвётся.'),
        simField('inclinometer', 'Завал аппликатора', '°', Number(ref.inclinometerDeg), 1, 0.1,
            'На конусе неверный завал даёт морщины, пузыри и перекос этикетки.'),
        simField('knife', 'Угол атаки ножа', '°', ref.knifeAngle, 1, 0.1,
            'Неверный угол не отделит этикетку от подложки: задиры, разрыв или пропуск.'),
        simField('start', 'Задержка старта', 'мс', ref.startDelay, 0, 1,
            'Старт не в фазе: этикетка ляжет со смещением или наложится на соседнюю.'),
        simField('stop', 'Задержка остановки', 'мс', ref.stopDelay, 0, 1,
            'Остановка не в фазе: этикетка не дойдёт до кромки или вылетит с задиром.')
    ];

    if (isMaster) {
        if (s.mode === 'wrap') {
            const gap = (ref.carriageGapMin + ref.carriageGapMax) / 2;
            fields.push(simField('gap', 'Зазор каретки роликов', 'мм', gap, 1, 0.1,
                'Слабый прижим даёт пузыри, сильный — замятие роликов и флакона.'));
        } else {
            fields.push(simField('start2', 'Задержка старта 2', 'мс', ref.start2, 0, 1,
                'Второй аппликатор начнёт не в фазе: нахлёст, пропуск или перекос второй этикетки.'));
        }
    }

    const schemeText = s.mode === 'wrap'
        ? `схема: ${ref.wrapSchemeLabel}`
        : 'двухсторонняя оклейка, 2 аппликатора';

    return {
        module: 'labeler',
        mode: isMaster ? 'master' : 'beginner',
        title: 'Этикетировщик · СИКОМ',
        brief: `${simBriefHeader()} Режим: ${LABELER_MODES[s.mode]}; ${schemeText}. Материал: ${LABELER_MATERIALS[s.material]}. Тахометр ${s.tachometerSpeed} м/мин, флакон Ø${s.diamBottom}/${s.diamTop} мм, этикетка ${s.labelHeight}×${s.labelLength} мм. Рассчитайте приборы и тайминги Kinco.`,
        fields
    };
}

function buildSimAccidentTask() {
    const accidentType = simPick(['fill', 'capper', 'labeler']);

    if (accidentType === 'fill') {
        const ref = computeFillReference({
            volume: 5000, weight: 5000, density: 1.0,
            viscosity: 120, height: 300, nozzleD: 0.014
        });
        return {
            module: 'fill',
            mode: 'accident',
            title: 'Авария · Налив 5 л',
            brief: `${simBriefHeader()} 5-л канистра пенящегося ПАВ (120 сП). В текущем рецепте стоит жиклёр 6 мм и давление 2.8 Атм: линия идёт с пеной и переливом. Исправьте жиклёр, давление, ход и скорость штоков.`,
            accidentNote: 'Опасность: давление 2.8 Атм на пенящейся среде и жиклёр 6 мм на 5 л дают перелив, пену и забрызгивание горловины. Верхний безопасный предел для вязкости < 250 сП — 1.6 Атм.',
            fields: [
                simField('nozzle', 'Диаметр жиклёра', 'мм', 14, 0, 1,
                    'На 5-л канистру нужен жиклёр 14 мм: 6 мм не обеспечит расход и создаст избыточное давление.',
                    { type: 'select', options: [{ value: '6', label: '6 мм' }, { value: '8', label: '8 мм' }, { value: '14', label: '14 мм' }], badValue: '6' }),
                simField('pressure', 'Давление в баке', 'Атм', ref.pressureAtm, 1, 0.1,
                    'Завышенное давление на ПАВ вызывает пену и перелив; для этой среды давление должно быть минимальным.',
                    { badValue: '2.8' }),
                simField('stemOn', 'Ход штоков вниз', 'мм', ref.stemOnSteps, 0, 1,
                    'Неверный ход штоков не погрузит сопло в горловину или ударит в дно канистры.',
                    { badValue: '350' }),
                simField('stemSpeed', 'Скорость подъёма штоков', '%', Number(ref.stemCycleSpeed.toFixed(1)), 1, 0.1,
                    'При неверной скорости сопло не ведёт мениск: пена, недолив, разбрызгивание.',
                    { badValue: '15.0' })
            ]
        };
    }

    if (accidentType === 'capper') {
        const ref = computeCapperRecipe({
            capDiameter: 38, capType: 'ring', bottleDiameter: 85,
            bottleHeight: 238, rate: 2220, line: selectedGlobalLine
        });
        return {
            module: 'capper',
            mode: 'accident',
            title: 'Авария · Укупор 38 мм',
            brief: `${simBriefHeader()} Крышка 38 мм с контрольным кольцом не дотягивается, ролики срывают резьбу. В рецепте вращение 0.25 с и сведение 0.15 с. Исправьте вращение, сведение и цикл.`,
            accidentNote: 'Опасность: короткое вращение оставляет кольцо недотянутым, малое сведение не даёт роликам достать крышку, а срыв резьбы приводит к браку и остановке линии.',
            fields: [
                simField('rotation', 'Голова вращение', 'с', ref.rotation, 2, 0.01,
                    'Для крышки с контрольным кольцом нужно больше времени вращения, иначе кольцо не дотянется и резьба сорвётся.',
                    { badValue: '0.25' }),
                simField('closure', 'Голова сведение', 'с', ref.closure, 2, 0.01,
                    'Ролики не успевают сойтись и достать крышку — затяжка неполная.',
                    { badValue: '0.15' }),
                simField('cycle', 'Цикл укупора', 'с', ref.cycle, 2, 0.01,
                    'Неверный цикл рассинхронизирует укупор с конвейером: заторы и пропуски.',
                    { badValue: '0.55' })
            ]
        };
    }

    const ref = computeLabelerRecipe({
        mode: 'wrap', wrapScheme: 'rollers', material: 'pp',
        tachometerSpeed: 27.5, diamBottom: 90, diamTop: 80,
        labelHeight: 140, labelLength: 220, twoRolls: false,
        line: selectedGlobalLine
    });
    return {
        module: 'labeler',
        mode: 'accident',
        title: 'Авария · Этикетировщик',
        brief: `${simBriefHeader()} Конусный флакон Ø90/80 мм, этикетка 140×220 мм, ПП, трёхроликовая обкатка. Выставлен завал 8.5° и угол ножа 20.5°: этикетка морщинится и рвётся. Исправьте инклинометр, угломер и скорость Kinco.`,
        accidentNote: 'Опасность: на конусе неверный завал аппликатора даёт морщины и пузыри, а угол ножа 20.5° вместо 12.0° для ПП приводит к задирам и разрыву этикетки.',
        fields: [
            simField('inclinometer', 'Завал аппликатора', '°', Number(ref.inclinometerDeg), 1, 0.1,
                'Неверный завал на конусе: этикетка пойдёт морщинами, пузырями и перекосом.',
                { badValue: '8.5' }),
            simField('knife', 'Угол атаки ножа', '°', ref.knifeAngle, 1, 0.1,
                'Для ПП при обкатке нужен угол 12.0°: иначе нож задирает и рвёт этикетку.',
                { badValue: '20.5' }),
            simField('speed', 'Скорость Kinco', 'у.е.', ref.speedSetpoint, 0, 1,
                'Неверная уставка скорости растянет или сместит этикетку.',
                { badValue: '500' })
        ]
    };
}

function generateSimTask(mode) {
    if (mode === 'accident') return buildSimAccidentTask();
    const isMaster = mode === 'master';
    const moduleName = simPick(['fill', 'capper', 'labeler']);
    if (moduleName === 'fill') return buildSimFillTask(isMaster);
    if (moduleName === 'capper') return buildSimCapperTask(isMaster);
    return buildSimLabelerTask(isMaster);
}

function renderSimTask(task) {
    const titleEl = document.getElementById('sim-task-title');
    const briefEl = document.getElementById('sim-task-brief');
    const noteEl = document.getElementById('sim-accident-note');
    const fieldsEl = document.getElementById('sim-task-fields');
    if (!titleEl || !briefEl || !fieldsEl) return;

    titleEl.textContent = task.title;
    briefEl.textContent = task.brief;

    if (task.accidentNote) {
        noteEl.textContent = task.accidentNote;
        noteEl.classList.remove('hidden');
    } else {
        noteEl.textContent = '';
        noteEl.classList.add('hidden');
    }

    fieldsEl.innerHTML = task.fields.map(field => {
        const value = field.badValue !== undefined ? field.badValue : '';
        let inputHtml;
        if (field.type === 'select') {
            inputHtml = `<select id="sim_input_${field.key}" class="hmi-sim-input">${field.options.map(opt =>
                `<option value="${escapeHtml(opt.value)}"${String(opt.value) === String(value) ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`
            ).join('')}</select>`;
        } else {
            inputHtml = `<input type="number" id="sim_input_${field.key}" class="hmi-sim-input" step="${field.step}" inputmode="decimal" autocomplete="off" value="${escapeHtml(value)}">`;
        }
        return `
            <div class="hmi-sim-field" id="sim_field_${field.key}">
                <label for="sim_input_${field.key}">${escapeHtml(field.label)}</label>
                <div class="hmi-sim-input-row">${inputHtml}<span class="hmi-sim-unit">${escapeHtml(field.unit)}</span></div>
                <div class="hmi-sim-field-feedback" id="sim_feedback_${field.key}"></div>
            </div>
        `;
    }).join('');
}

function startSimMode(mode) {
    if (!SIM_MODE_LABELS[mode]) return;
    currentSimMode = mode;
    currentSimTask = generateSimTask(mode);

    document.getElementById('sim-modes').classList.add('hidden');
    document.getElementById('sim-result').classList.add('hidden');
    document.getElementById('sim-round').classList.remove('hidden');
    document.getElementById('sim-mode-label').textContent = SIM_MODE_LABELS[mode];

    renderSimTask(currentSimTask);
    startSimTimer(SIM_TIMERS[mode] || 0);
}

function simShowModes() {
    clearSimTimer();
    currentSimTask = null;
    currentSimMode = null;
    document.getElementById('sim-round').classList.add('hidden');
    document.getElementById('sim-result').classList.add('hidden');
    document.getElementById('sim-modes').classList.remove('hidden');
}

function openSimulator() {
    clearSimTimer();
    currentModule = 'simulator';
    const mainApp = document.getElementById('main-app');
    if (mainApp) mainApp.classList.add('hub-mode');
    document.querySelectorAll('.hmi-nav-btn').forEach(btn => btn.classList.remove('active'));
    const hubBtn = document.getElementById('btn-hub');
    if (hubBtn) hubBtn.classList.remove('active');
    switchTab('simulator');
    simShowModes();
}

function formatSimTime(seconds) {
    const safe = Math.max(0, seconds);
    const mm = String(Math.floor(safe / 60)).padStart(2, '0');
    const ss = String(safe % 60).padStart(2, '0');
    return `${mm}:${ss}`;
}

function updateSimTimerDisplay() {
    const timerEl = document.getElementById('sim-timer');
    const wrapEl = document.getElementById('sim-timer-wrap');
    if (!timerEl || !wrapEl) return;
    timerEl.textContent = formatSimTime(simTimeLeft);
    wrapEl.classList.toggle('is-danger', simTimeLeft <= 30);
}

function startSimTimer(seconds) {
    clearSimTimer();
    const wrapEl = document.getElementById('sim-timer-wrap');
    if (!wrapEl) return;

    if (!seconds) {
        wrapEl.classList.add('hidden');
        return;
    }

    simTimeLeft = seconds;
    wrapEl.classList.remove('hidden');
    updateSimTimerDisplay();
    simTimerId = setInterval(() => {
        simTimeLeft--;
        updateSimTimerDisplay();
        if (simTimeLeft <= 0) {
            clearSimTimer();
            checkSimAnswer(true);
        }
    }, 1000);
}

function clearSimTimer() {
    if (simTimerId) {
        clearInterval(simTimerId);
        simTimerId = null;
    }
}

function simStatusFromField(field, user) {
    if (!Number.isFinite(user)) return { status: 'fail', rel: Infinity };
    const absRef = Math.abs(field.ref);
    const rel = absRef > 1e-9 ? Math.abs(user - field.ref) / absRef : Math.abs(user - field.ref);
    if (rel <= 0.05) return { status: 'perfect', rel };
    if (rel <= 0.20) return { status: 'pass', rel };
    return { status: 'fail', rel };
}

function simFeedbackText(field, result) {
    const refText = simFormatNumber(field.ref, field.decimals);
    const unitText = field.unit ? ` ${field.unit}` : '';
    if (result.status === 'perfect') {
        return `ИДЕАЛЬНО · 100% точность · эталон ${refText}${unitText}`;
    }
    if (result.status === 'pass') {
        return `В ДОПУСКЕ · линия пойдёт без брака · отклонение ${(result.rel * 100).toFixed(1)}% · эталон ${refText}${unitText}`;
    }
    const deviation = Number.isFinite(result.rel) ? `отклонение ${(result.rel * 100).toFixed(1)}%` : 'параметр не введён';
    return `БРАК / АВАРИЯ ЛИНИИ · ${deviation} · эталон ${refText}${unitText}. ${field.explanation}`;
}

function simRankForScore(score) {
    if (score >= 95) return 'Инженер-технолог';
    if (score >= 80) return 'Старший наладчик';
    if (score >= 60) return 'Оператор';
    return 'Стажёр';
}

function checkSimAnswer(timeExpired = false) {
    if (!currentSimTask) return;
    clearSimTimer();

    const points = { perfect: 100, pass: 70, fail: 0 };
    const results = currentSimTask.fields.map(field => {
        const input = document.getElementById(`sim_input_${field.key}`);
        const raw = input ? input.value : '';
        const user = parseFloat(raw);
        const result = simStatusFromField(field, user);
        const fieldEl = document.getElementById(`sim_field_${field.key}`);
        if (fieldEl) {
            fieldEl.classList.remove('is-perfect', 'is-pass', 'is-fail');
            fieldEl.classList.add(`is-${result.status}`);
        }
        const feedbackEl = document.getElementById(`sim_feedback_${field.key}`);
        if (feedbackEl) feedbackEl.textContent = simFeedbackText(field, result);
        return { field, result, raw };
    });

    const score = Math.round(results.reduce((sum, item) => sum + points[item.result.status], 0) / results.length);
    const perfectCount = results.filter(item => item.result.status === 'perfect').length;
    const passCount = results.filter(item => item.result.status === 'pass').length;
    const failCount = results.filter(item => item.result.status === 'fail').length;

    document.getElementById('sim-round').classList.add('hidden');
    document.getElementById('sim-result').classList.remove('hidden');
    document.getElementById('sim-score').textContent = String(score);

    const scoreEl = document.getElementById('sim-score');
    scoreEl.classList.remove('is-perfect', 'is-pass', 'is-fail');
    scoreEl.classList.add(score >= 95 ? 'is-perfect' : score >= 60 ? 'is-pass' : 'is-fail');

    document.getElementById('sim-rank').textContent = simRankForScore(score);
    const timeText = timeExpired ? 'Время истекло. ' : '';
    document.getElementById('sim-result-sub').textContent =
        `${timeText}${SIM_MODE_LABELS[currentSimTask.mode]} · идеально: ${perfectCount} · в допуске: ${passCount} · брак: ${failCount}`;

    document.getElementById('sim-breakdown').innerHTML = results.map(item => `
        <div class="hmi-sim-breakdown-row is-${item.result.status}">
            <div>
                <div class="hmi-sim-breakdown-name">${escapeHtml(item.field.label)}</div>
                <div class="hmi-sim-breakdown-detail">${escapeHtml(simFeedbackText(item.field, item.result))}</div>
            </div>
            <b>${escapeHtml(simFormatNumber(item.field.ref, item.field.decimals))} ${escapeHtml(item.field.unit)}</b>
        </div>
    `).join('');
}

// ============================================================
// 12. ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    
    const splash = document.getElementById('splash-screen');
    if (splash) splash.addEventListener('click', dismissSplash);

    setInterval(updateClock, 1000);
    updateClock();

    const listContainer = document.getElementById('nozzles-list-container');
    if (listContainer) {
        for (let i = 1; i <= PHYSICS.NOZZLE_COUNT; i++) {
            const btn = document.createElement('button');
            btn.className = 'hmi-nozzle-btn';
            btn.textContent = `Форсунка ${i}`;
            btn.onclick = () => openNozzleSettings(i);
            listContainer.appendChild(btn);
        }
        renderNozzleButtons();
    }

    updateVolumePreview();

    // Восстанавливаем выбранную линию и синхронизируем шапку/модули
    try {
        const savedLine = localStorage.getItem('gc_selected_line');
        if (savedLine && LINE_OPTIONS[savedLine]) selectedGlobalLine = savedLine;
    } catch (e) {
        // localStorage может быть недоступен — используем линию по умолчанию
    }
    selectGlobalLine(selectedGlobalLine);

    // Библиотека рецептов с этого устройства
    loadRecipesFromStorage();
    updateRecipePanels();

    // Стартуем с выбора узла линии; превью модулей готовим заранее
    showHub();
    updateCapperPreview();
    updateCapperPressureStatus();
    updateLabelerPreview();
    updateChecklistProgress('fill');
    updateChecklistProgress('capper');
    updateChecklistProgress('labeler');
});

// ============================================================
// 13. PWA: УСТАНОВКА И ОФЛАЙН-КЭШ
// ============================================================
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const installBtn = document.getElementById('btn-install');
    if (installBtn) installBtn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const installBtn = document.getElementById('btn-install');
    if (installBtn) installBtn.classList.add('hidden');
    showToast('YOUR GC установлен на экран');
});

async function installPwa() {
    const installBtn = document.getElementById('btn-install');
    if (!deferredInstallPrompt) {
        showToast('Установка недоступна: откройте приложение по HTTPS или через локальный сервер', true);
        return;
    }

    try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
            showToast('Установка начата');
        } else {
            showToast('Установка отменена');
        }
    } catch (e) {
        showToast('Не удалось запустить установку', true);
    }

    deferredInstallPrompt = null;
    if (installBtn) installBtn.classList.add('hidden');
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(error => {
            console.warn('Service Worker не зарегистрирован:', error);
        });
    });
}