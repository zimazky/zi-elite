
#define ATM_MODULE
// ----------------------------------------------------------------------------
// Модуль расчета атмосферного рассеяния
// ----------------------------------------------------------------------------

// Коэффициенты рассеивания Релея для трех частот спектра (rgb) на уровне моря 
uniform vec3 uBetaRayleigh;
// Коэффициенты рассеивания Ми для трех частот спектра (rgb) на уровне моря 
uniform vec3 uBetaMie;
// Коэффициент фазового рассеивания Ми
uniform float uGMie;
// Масштабная высота (высота 50% плотности молекул воздуха)
// x - для рассеивания Релея
// y - для рассеивания Ми
uniform vec2 uScaleHeight;
// Радиус атмосферы
uniform float uAtmRadius;
// Радиус планеты
//uniform float uPlanetRadius;
// Положение центра планеты
//uniform vec3 uPlanetCenter;

const int PRIMARY_STEPS = 32; // primary steps, affects quality the most

const float SQRTPILN2HALF = 1.04345246;
// Приближение функции Чапмана, домноженная на exp(-x)
// функция возвращает оптическую глубину (интеграл плотности вдоль луча от указанной высоты до бесконечности)
// в двух каналах (x - Релея, y - Ми)
// X - референсная нормализованная высота (R/H), R - радиус планеты, H - характеристическая высота плотности атмосферы (высота 50% массы)
// x - нормализованная высота ((R+h)/H), h - высота над уровнем планеты
// cosTheta - косинус угла наклона луча к зениту
vec2 ChHold(vec2 X, vec2 x, float cosTheta) {
  vec2 R = X + x;
  vec2 c = SQRTPILN2HALF*sqrt(R);
  // theta выше горизонта
  if(cosTheta >= 0.) return c/(c*cosTheta + vec2(1.0)) * exp(-x);
  // theta ниже горизонта
  else {
      vec2 x0 = sqrt(vec2(1.0) - cosTheta*cosTheta) * R;
      vec2 c0 = SQRTPILN2HALF*sqrt(x0);
      return 2.0*c0*exp(X-x0) - c/(vec2(1.0) - c*cosTheta) * exp(-x);
  }
}

vec2 ChH(vec2 X, vec2 h, float cosTheta) {
  vec2 x = X+h;
  vec2 c = SQRTPILN2HALF * sqrt(x);
  vec2 cexp = c*exp(-h);
  // theta выше горизонта
  if(cosTheta >= 0.) return cexp/((c-vec2(1.))*cosTheta + vec2(1.));
  // theta ниже горизонта
  else {
    float sinTheta = sqrt(1.-cosTheta*cosTheta);
    return cexp/((c-vec2(1.))*cosTheta - vec2(1.)) + 2.*c*exp(X - x*sinTheta)*sqrt(sinTheta);
  }
}

const float ONE_DIV4PI = 1./(4.*PI);

struct ResultScattering {
  vec3 t; // Мультипликативная часть (transmittance), цвет поглощения
  vec3 i; //Аддитивная часть (in-scatter), цвет подсвечивания за счет рассеивания атмосферы
};

/** 
 * Функция вычисления атмосферного рассеивания
 *   ro - положение камеры
 *   rd - направление луча камеры
 *   ld - направление на источник света
 *   noise - случайное число в диапазоне 0...1 для смещения начальной точки чтобы избежать полос на сильных градиентах
 */
ResultScattering scattering(vec3 ro, vec3 rd, vec3 ld, float noise) {
  // Положение относительно центра планеты
  vec3 start = terrainFromCenter(ro);//ro - uPlanetCenter;

  float PLANET_RADIUS_SQR = uPlanetRadius*uPlanetRadius;
  float ATM_RADIUS_SQR = uAtmRadius*uAtmRadius;
  
  float r2 = dot(start,start); // квадрат расстояния до центра планеты
  float OT = -dot(start,rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
  float CT2 = r2 - OT*OT; // квадрат минимального расстояния от луча до центра планеты
  if(CT2 >= ATM_RADIUS_SQR) return ResultScattering(vec3(0), vec3(1)); // луч проходит выше атмосферы
  float AT = sqrt(ATM_RADIUS_SQR - CT2); // расстояние на луче от точки на поверхности атмосферы до точки минимального расстояния до центра планеты
  float rayLen = 2.*AT; // длина луча до выхода из атмосферы или до касания с планетой
  if(r2 > ATM_RADIUS_SQR) {
    // выше атмосферы
    if(OT < 0.) return ResultScattering(vec3(0), vec3(1)); // направление от планеты
    // камера выше атмосферы, поэтому переопределяем начальную точку как точку входа в атмосферу
    start += rd*(OT - AT);
    r2 = ATM_RADIUS_SQR;
    OT = AT;
  }
  else rayLen = AT - dot(start, rd); // пересчитываем длину луча с учетом нахождения внутри сферы атмосферы

  vec3 normal = normalize(start);
  float NdotD = dot(normal, rd);
  float isNotPlanetIntersect = 1.;
  if(NdotD < 0.) {
    // Поиск длины луча в случае попадания в поверхность планеты
    if(CT2 < PLANET_RADIUS_SQR) {
      rayLen = OT - sqrt(PLANET_RADIUS_SQR - CT2);
      isNotPlanetIntersect = 0.;
    }
  }
  
  // Расчет фазовой функции
  // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
  // Для рассеяния Ми g принимают 0,76 ... 0,999.
  // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
  float mu = dot(rd, ld);
  float mu2 = mu * mu;
  float g2 = uGMie * uGMie;
  float phaseRayleigh = 0.75 * (1. + mu2) * ONE_DIV4PI;
  float A = max(0., 1. + uGMie*(uGMie - 2.*mu));
  float phaseMie = 1.5 * (1. + mu2)*(1. - g2) / ((2. + g2)*sqrt(A*A*A)) * ONE_DIV4PI;
    
  float stepSize = rayLen/float(PRIMARY_STEPS); // длина шага
  vec3 step = rd*stepSize; // шаг вдоль луча
  vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
  vec3 nextpos = pos + step; // следующая точка

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec2 optDepth = vec2(0.);
  vec3 totalRayleigh = vec3(0.);
  vec3 totalMie = vec3(0.);

  vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);

  for (int i=0; i<PRIMARY_STEPS; i++, nextpos += step, pos += step) {
    // определение оптической глубины вдоль луча камеры (считаем как среднее по краям сегмента)
    vec2 density = stepSize*exp(-(length(nextpos)-uPlanetRadius)/uScaleHeight);
    optDepth += 0.5*(density + fDensity);
    fDensity = density;
   
    // определение оптической глубины вдоль луча к солнцу (считаем из средней точки сегмента)
    // определение виден ли источник света из данной точки
    float OT = dot(pos, ld); // расстояния вдоль направления на свет до точки минимального расстояния до центра планеты
    float CT2 = dot(pos, pos) - OT*OT; // квадрат минимального расстояния от луча до центра планеты
    if(OT>0. || CT2 > PLANET_RADIUS_SQR)  {
      vec3 normal = normalize(pos);
      // источник света виден из данной точки
      vec2 optDepth2 = uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(pos)-uPlanetRadius)/uScaleHeight, dot(normal, ld));

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      vec3 attn = exp(-uBetaRayleigh*(optDepth.x+optDepth2.x) - uBetaMie*(optDepth.y+optDepth2.y));

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh += density.x * attn;
      totalMie += density.y * attn;
    }
  }
  vec3 inScatter = exp(-uBetaRayleigh*optDepth.x - isNotPlanetIntersect*uBetaMie*optDepth.y);

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = phaseRayleigh*uBetaRayleigh*totalRayleigh + phaseMie*uBetaMie*totalMie;
  return ResultScattering(transmittance, inScatter);
}


const int PRIMARY_STEPS_INTERSECTION = 8;
/** 
 * Функция вычисления атмосферного рассеивания при известном пересечении с поверхностью
 *   ro - положение камеры
 *   rd - направление луча камеры
 *   ld - направление на источник света
 *   rayLen - дистанция до пересечения луча с поверхностью
 *   noise - случайное число в диапазоне 0...1 для смещения начальной точки чтобы избежать полос на сильных градиентах
 * В функции вырезано отраженное рассеивание Ми, т.к. невозможно учесть все пересечения лучей с ландшафтом 
 */
ResultScattering scatteringWithIntersection(vec3 ro, vec3 rd, vec3 ld, float rayLen, float noise) {
  
  // Положение относительно центра планеты
  vec3 start = terrainFromCenter(ro);// ro - uPlanetCenter;

  float PLANET_RADIUS_SQR = uPlanetRadius*uPlanetRadius;
  float ATM_RADIUS_SQR = uAtmRadius*uAtmRadius;

  float r2 = dot(start,start); // квадрат расстояния до центра планеты
  if(r2 > ATM_RADIUS_SQR) {
    float OT = -dot(start,rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
    float CT2 = r2 - OT*OT; // квадрат минимального расстояния от луча до центра планеты
    if(CT2 >= ATM_RADIUS_SQR) return ResultScattering(vec3(0), vec3(1)); // луч проходит выше атмосферы
    float AT = sqrt(ATM_RADIUS_SQR - CT2); // расстояние на луче от точки на поверхности атмосферы до точки минимального расстояния до центра планеты

    // выше атмосферы
    if(OT < 0.) return ResultScattering(vec3(0), vec3(1)); // направление от планеты
    // камера выше атмосферы, поэтому переопределяем начальную точку как точку входа в атмосферу
    float d = OT - AT;
    start += rd*d;
    r2 = ATM_RADIUS_SQR;
    // корректировка дальности пересечения с поверхностью с учетом переопределения начальной точки
    rayLen -= d;
  }
/*
  // Расчет расстояния до тени планеты
  float BO = dot(ld, start);
  float BO2 = BO*BO;
  float AS = sqrt(r2-BO2)-uPlanetRadius;
  float RdotL = dot(rd,ld);
  float AX = AS/sqrt(1.-RdotL*RdotL);
  float AD = sqrt(AS*AS+BO2);
  if((AX-AD)*BO > 0.) { // проверка на попадание в теневую часть
    rayLen = min(rayLen, AX);
  }
*/
  // Расчет фазовой функции
  // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
  // Для рассеяния Ми g принимают 0,76 ... 0,999.
  // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
  float mu = dot(rd, ld);
  float phaseRayleigh = 0.75 * (1. + mu*mu) * ONE_DIV4PI;
    
  float stepSize = rayLen/float(PRIMARY_STEPS_INTERSECTION); // длина шага
  vec3 step = rd*stepSize; // шаг вдоль луча
  vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
  vec3 nextpos = start + step; // следующая точка

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec2 optDepth = vec2(0.);
  vec3 totalRayleigh = vec3(0.);

  vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);

  for (int i=0; i<PRIMARY_STEPS_INTERSECTION; i++, nextpos += step, pos += step) {
    // определение оптической глубины вдоль луча камеры (считаем как среднее по краям сегмента)
    vec2 density = stepSize*exp(-(length(nextpos)-uPlanetRadius)/uScaleHeight);
    optDepth += 0.5*(density + fDensity);
    fDensity = density;
   
    // определение оптической глубины вдоль луча к солнцу (считаем из средней точки сегмента)
    // определение виден ли источник света из данной точки
    float OT = dot(pos, ld); // расстояния вдоль направления на свет до точки минимального расстояния до центра планеты
    float CT2 = dot(pos, pos) - OT*OT; // квадрат минимального расстояния от луча до центра планеты
    if(OT>0. || CT2 > PLANET_RADIUS_SQR)  {
      vec3 normal = normalize(pos);
      // источник света виден из данной точки
      vec2 optDepth2 = uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(pos)-uPlanetRadius)/uScaleHeight, dot(normal, ld));

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      vec3 attn = exp(-uBetaRayleigh*(optDepth.x+optDepth2.x) - uBetaMie*(optDepth.y+optDepth2.y));

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh += density.x * attn;
    }
  }
  vec3 inScatter = exp(-uBetaRayleigh*optDepth.x);

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = phaseRayleigh*uBetaRayleigh*totalRayleigh;
  return ResultScattering(transmittance, inScatter);
}

/** 
  * Функция определения пересечения луча с планетой
  *   ro - положение камеры
  *   rd - направление луча
  * Возвращает 0. если луч пересекается с планетой
  */
float planetIntersection(vec3 ro, vec3 rd) {
  vec3 pos = terrainFromCenter(ro);//ro - uPlanetCenter;
  //vec3 pos = vec3(0, ro.y+uPlanetRadius, 0);
  
  float OT = dot(pos, rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
  if(OT > 0.) return 1.;
  float CT2 = dot(pos, pos)-OT*OT; // минимальное расстоянии от луча до центра планеты
  float R2 = uPlanetRadius*uPlanetRadius;
  return step(R2,CT2);
  //if(OT>0. || CT2>(uPlanetRadius*uPlanetRadius)) return 1.;
  //return 0.;
}

/** 
  * Функция определения мягкой тени от сферической поверхности планеты
  *   ro - положение точки, для которой производится рассчет
  *   rd - направление луча на солнце
  * Возвращает значения от 0. до 1.
  *   0. - если солнце полностью скрыто планетой
  *   1. - если солнце полностью видно
  */
float softPlanetShadow(vec3 ro, vec3 rd) {
  vec3 pos = terrainFromCenter(ro);//ro - uPlanetCenter;
  //vec3 pos = vec3(0, ro.y+uPlanetRadius, 0);

  float OT = dot(pos, rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
  float CT = sqrt(dot(pos, pos) - OT*OT); // минимальное расстоянии от луча до центра планеты
  if(OT>0.) return 1.;
  float d = (uPlanetRadius-CT)/OT;
  return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, d);
}
