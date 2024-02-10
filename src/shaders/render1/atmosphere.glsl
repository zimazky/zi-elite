
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

/** 
* Таблица оптической глубины
* x: индекс 0 - косинус = 1, индекс 1 - косинус = -1
* y: индекс 0 - h = 0, индекс 1 - h = 1
*/
uniform sampler2D uTextureOptDepth;


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
  vec3 i; // Аддитивная часть (in-scatter), цвет подсвечивания за счет рассеивания атмосферы
};




/** 
 * Функция вычисления атмосферного рассеивания для лучей не пересекающих поверхность планеты (табличная версия)
 *   ro - положение камеры
 *   rd - направление луча камеры
 *   ld - направление на источник света
 *   noise - случайное число в диапазоне 0...1 для смещения начальной точки чтобы избежать полос на сильных градиентах
 */
ResultScattering scatteringTable(vec3 ro, vec3 rd, vec3 ld, float noise) {
  // Положение относительно центра планеты
  vec3 start = terrainFromCenter(ro);//ro - uPlanetCenter;

  float PLANET_RADIUS_SQR = uPlanetRadius*uPlanetRadius;
  float ATM_RADIUS_SQR = uAtmRadius*uAtmRadius;
  float ATM_HEIGHT = uAtmRadius - uPlanetRadius;
  
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
  else rayLen = AT + OT; // пересчитываем длину луча с учетом нахождения внутри сферы атмосферы

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

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec2 optDepth = vec2(0.);
  vec3 totalRayleigh = vec3(0.);
  vec3 totalMie = vec3(0.);
  int stepsNumber = PRIMARY_STEPS;

  // Расчет расстояния до тени планеты
  //
  // (1) r^2 - dot(ld, r)^2 < R^2 – условие попадания точки в цилиндр тени планеты
  // (2) dot(ld, r) < 0 – условие что точка за планетой, в тени
  // r - произвольный вектор относительно центра планеты
  // ld - единичный вектор-направление на солнце
  // R - радиус планеты
  //
  // Граница цилиндра:
  // dot(OA+rd*t,OA+rd*t) - dot(ld,OA+rd*t)^2 = R^2        (3)
  // r = OA+rd*t, OA = ro-planetCenter
  // t - длина луча из камеры до границы тени
  //
  // dot(OA+rd*t,OA+rd*t) =
  // = OAx^2 + 2*OAx*rdx*t + rdx^2*t^2 + OAy^2 + 2*OAy*rdy*t + rdy^2*t^2 + OAz^2 + 2*OAz*rdz*t + rdz^2*t^2 =
  // = OA^2 + t^2 + 2*dot(rd,OA)*t
  //
  // dot(ld,OA+rd*t) = 
  // = ldx*(OAx + rdx*t) + ldy*(OAy + rdy*t) + ldz*(OAz + rdz*t) =
  // = ldx*OAx + ldx*rdx*t + ldy*OAy + ldy*rdy*t + ldz*OAz + ldz*rdz*t =
  // = dot(ld,OA) + dot(ld,rd)*t
  //
  // Подставляем в (3)
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA) + dot(ld,rd)*t)^2 = R^2
  //
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA)^2 + 2*dot(ld,OA)*dot(ld,rd)*t + dot(ld,rd)^2*t^2) = R^2
  //
  // t^2*(1 - dot(ld,rd)^2) + t*2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd)) + (OA^2 - R^2 - dot(ld,OA)^2) = 0
  //
  // Квадратное уравнение с коэффициентами:
  // a = 1 - dot(ld,rd)^2
  // b = 2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd))
  // c = OA^2 - R^2 - dot(ld,OA)^2
  //
  // Если a = 0 луч параллелен направлению на солнце и не пересекает тень
  // Дискриминант:
  // D = b^2-4ac
  // Если D<0, то луч уходит мимо цилиндра тени
  // 
  // Два корня:
  // t1 = 0.5*(-b + sqrt(D))/a
  // t2 = 0.5*(-b - sqrt(D))/a
  // Из них выбираем меньший положительный
  // Проверяем на условие, что точка за планетой по отношению к солнцу
  // dot(ld, OA+rd*t) < 0

  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
  noise = 0.5;

  vec3 OA = start;
  float LdotRd = mu;
  if(abs(LdotRd) < 1.) {
    // луч не параллелен направлению на солнце
    float a = 1. - LdotRd*LdotRd;
    float LdotOA = dot(ld,OA);
    float b = 2.*(dot(rd,OA) - LdotOA*LdotRd);
    float c = dot(OA,OA) - PLANET_RADIUS_SQR - LdotOA*LdotOA;
    float D = b*b - 4.*a*c;
    if(D > 0.) {
      // прямая луча пересекает цилиндр тени
      float sqrtD = sqrt(D);
      vec2 t12 = 0.5*(vec2(-b)+vec2(sqrtD,-sqrtD))/a;
      float t1 = min(t12.x, t12.y);
      float t2 = max(t12.x, t12.y);
      if(t1 > 0.) {
        // луч пересекает цилиндр тени два раза
        if(dot(ld, OA + rd*t1) < 0.) {
          // первое пересечение с цилиндром тени, является тенью (противоположная от солнца половина)
          t1 = min(t1, rayLen);
          // первый интеграл до тени
          float stepSize = t1/float(stepsNumber); // длина шага
          vec3 step = rd*stepSize; // шаг вдоль луча
          vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
          vec3 nextpos = start + step; // следующая точка
          vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);
          for (int i=0; i<stepsNumber; i++, nextpos += step, pos += step) {
            // определение оптической глубины вдоль луча камеры (считаем как среднее по краям сегмента)
            vec2 density = stepSize*exp(-(length(nextpos)-uPlanetRadius)/uScaleHeight);
            optDepth += 0.5*(density + fDensity);
            fDensity = density;
          
            // определение оптической глубины вдоль луча к солнцу (считаем из средней точки сегмента)
            vec3 normal = normalize(pos);
            // источник света виден из данной точки
            vec2 tableIndex = vec2((length(pos)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, ld));
            vec3 optDepth2 = texture(uTextureOptDepth, tableIndex).xyz;

            // ослабление света за счет рассеивания
            // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
            vec3 attn = optDepth2.z * exp(-uBetaRayleigh*(optDepth.x+optDepth2.x) - uBetaMie*(optDepth.y+optDepth2.y));

            // total += T(CP) * T(PA) * ρ(h) * ds
            totalRayleigh += density.x * attn;
            totalMie += density.y * attn;
          }

          // расчет оптической глубины в тени
          vec3 normal = normalize(nextpos);
          vec2 tableIndex = vec2((length(nextpos)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, rd));
          optDepth += texture(uTextureOptDepth, tableIndex).xy;
          // установка грениц для второго интеграла: от точки выхода из тени до границы атмосферы
          start += rd*t2;
          rayLen -= t2;
          if(rayLen > 0.) {
            // коррекция оптической глубины за счет длины луча за тенью
            normal = normalize(start);
            tableIndex = vec2((length(start)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, rd));
            optDepth -= texture(uTextureOptDepth, tableIndex).xy;
            stepsNumber /= 2; // второй интеграл с меньшим количеством шагов
          }
        }
      }
      else if(t2 > 0.) {
        // камера внутри цилиндра тени, луч пересекает цилиндр тени один раз
        OA += rd*t2;
        if(dot(ld, OA) < 0.) {
          // расчет оптической глубины в тени
          vec3 normal = normalize(start);
          vec2 tableIndex = vec2((length(start)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, rd));
          optDepth += texture(uTextureOptDepth, tableIndex).xy;
          // установка границ интегрирования: от выхода из тени до границы атмосферы
          start = OA;
          rayLen -= t2;
          if(rayLen > 0.) {
            // коррекция оптической глубины за счет длины луча за тенью
            normal = normalize(start);
            tableIndex = vec2((length(start)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, rd));
            optDepth -= texture(uTextureOptDepth, tableIndex).xy;
          }
        }
      }
    }
  }

  // если точка выхода из атмосферы ближе конца тени, то интегрировать не надо
  if(rayLen > 0.) {

    float stepSize = rayLen/float(stepsNumber); // длина шага
    vec3 step = rd*stepSize; // шаг вдоль луча
    vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
    vec3 nextpos = start + step; // следующая точка
    vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);

    for (int i=0; i<stepsNumber; i++, nextpos += step, pos += step) {
      // определение оптической глубины вдоль луча камеры (считаем как среднее по краям сегмента)
      vec2 density = stepSize*exp(-(length(nextpos)-uPlanetRadius)/uScaleHeight);
      optDepth += 0.5*(density + fDensity);
      fDensity = density;

      // ТЕНЬ ПЛАНЕТЫ ИСКЛЮЧЕНА, ПОЭТОМУ ИНТЕГРИРУЕМ ВСЕ ЛУЧИ
    
      // определение оптической глубины вдоль луча к солнцу (считаем из средней точки сегмента)
      vec3 normal = normalize(pos);
      // источник света виден из данной точки
      vec2 tableIndex = vec2((length(pos)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, ld));
      vec3 optDepth2 = texture(uTextureOptDepth, tableIndex).xyz;

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      vec3 attn = optDepth2.z * exp(-uBetaRayleigh*(optDepth.x+optDepth2.x) - uBetaMie*(optDepth.y+optDepth2.y));

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh += density.x * attn;
      totalMie += density.y * attn;
    }
  }
    
  vec3 inScatter = exp(-uBetaRayleigh*optDepth.x - uBetaMie*optDepth.y);

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = phaseRayleigh*uBetaRayleigh*totalRayleigh + phaseMie*uBetaMie*totalMie;
  return ResultScattering(transmittance, inScatter);
}








/** 
 * Функция вычисления атмосферного рассеивания для лучей не пересекающих поверхность планеты
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

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec2 optDepth = vec2(0.);
  vec3 totalRayleigh = vec3(0.);
  vec3 totalMie = vec3(0.);
  int stepsNumber = PRIMARY_STEPS;

  // Расчет расстояния до тени планеты
  //
  // (1) r^2 - dot(ld, r)^2 < R^2 – условие попадания точки в цилиндр тени планеты
  // (2) dot(ld, r) < 0 – условие что точка за планетой, в тени
  // r - произвольный вектор относительно центра планеты
  // ld - единичный вектор-направление на солнце
  // R - радиус планеты
  //
  // Граница цилиндра:
  // dot(OA+rd*t,OA+rd*t) - dot(ld,OA+rd*t)^2 = R^2        (3)
  // r = OA+rd*t, OA = ro-planetCenter
  // t - длина луча из камеры до границы тени
  //
  // dot(OA+rd*t,OA+rd*t) =
  // = OAx^2 + 2*OAx*rdx*t + rdx^2*t^2 + OAy^2 + 2*OAy*rdy*t + rdy^2*t^2 + OAz^2 + 2*OAz*rdz*t + rdz^2*t^2 =
  // = OA^2 + t^2 + 2*dot(rd,OA)*t
  //
  // dot(ld,OA+rd*t) = 
  // = ldx*(OAx + rdx*t) + ldy*(OAy + rdy*t) + ldz*(OAz + rdz*t) =
  // = ldx*OAx + ldx*rdx*t + ldy*OAy + ldy*rdy*t + ldz*OAz + ldz*rdz*t =
  // = dot(ld,OA) + dot(ld,rd)*t
  //
  // Подставляем в (3)
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA) + dot(ld,rd)*t)^2 = R^2
  //
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA)^2 + 2*dot(ld,OA)*dot(ld,rd)*t + dot(ld,rd)^2*t^2) = R^2
  //
  // t^2*(1 - dot(ld,rd)^2) + t*2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd)) + (OA^2 - R^2 - dot(ld,OA)^2) = 0
  //
  // Квадратное уравнение с коэффициентами:
  // a = 1 - dot(ld,rd)^2
  // b = 2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd))
  // c = OA^2 - R^2 - dot(ld,OA)^2
  //
  // Если a = 0 луч параллелен направлению на солнце и не пересекает тень
  // Дискриминант:
  // D = b^2-4ac
  // Если D<0, то луч уходит мимо цилиндра тени
  // 
  // Два корня:
  // t1 = 0.5*(-b + sqrt(D))/a
  // t2 = 0.5*(-b - sqrt(D))/a
  // Из них выбираем меньший положительный
  // Проверяем на условие, что точка за планетой по отношению к солнцу
  // dot(ld, OA+rd*t) < 0

  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

  vec3 OA = start;
  float LdotRd = dot(ld,rd);
  if(abs(LdotRd) < 1.) {
    // луч не параллелен направлению на солнце
    float a = 1. - LdotRd*LdotRd;
    float LdotOA = dot(ld,OA);
    float b = 2.*(dot(rd,OA) - LdotOA*LdotRd);
    float c = dot(OA,OA) - PLANET_RADIUS_SQR - LdotOA*LdotOA;
    float D = b*b - 4.*a*c;
    if(D > 0. && LvsR>0.5) {
      // прямая луча пересекает цилиндр тени
      float sqrtD = sqrt(D);
      vec2 t12 = 0.5*(vec2(-b)+vec2(sqrtD,-sqrtD))/a;
      float t1 = min(t12.x, t12.y);
      float t2 = max(t12.x, t12.y);
      if(t1 > 0.) {
        // луч пересекает цилиндр тени два раза
        if(dot(ld, OA+rd*t1) < 0.) {
          // часть цилиндра тени, которая за планетой (сама тень)
          if(t2 < rayLen) {
            // луч пересекает цилиндр тени впереди дважды до выхода из атмосферы
            // НЕОБХОДИМО ИНТЕГРИРОВАТЬ ДВА УЧАСТКА: ПЕРЕД И ЗА ТЕНЬЮ

            // первый интеграл до тени
            stepsNumber = stepsNumber/2;
            float stepSize = t1/float(stepsNumber); // длина шага
            vec3 step = rd*stepSize; // шаг вдоль луча
            vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
            vec3 nextpos = pos + step; // следующая точка
            vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);
            for (int i=0; i<stepsNumber; i++, nextpos += step, pos += step) {
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

            // расчет оптической глубины в тени
            //vec3 normal = normalize(nextpos);
            //optDepth += uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(nextpos)-uPlanetRadius)/uScaleHeight, dot(normal, ld));
            // установка грениц для второго интеграла: от точки выхода из тени до границы атмосферы
            start += rd*t2;
            rayLen = 0.;//-= t2;
            // коррекция оптической глубины за счет длины луча за тенью
            //normal = normalize(start);
            //optDepth -= uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(start)-uPlanetRadius)/uScaleHeight, dot(normal, ld));
          }
          else {
            // луч пересекает цилиндр тени впереди один раз до выхода из атмосферы
            // НЕОБХОДИМО ИНТЕГРИРОВАТЬ ОДИН УЧАСТОК: ПЕРЕД ТЕНЬЮ
            rayLen = min(t1, rayLen);
          }
        }
      }
      else if(t2 > 0.) {
        // камера внутри цилиндра тени, луч пересекает тень один раз
        OA += rd*t2;
        if(dot(ld, OA) < 0.) {
          // расчет оптической глубины в тени
          //vec3 normal = normalize(start);
          //optDepth += uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(start)-uPlanetRadius)/uScaleHeight, dot(normal, ld));
          // установка границ интегрирования: от выхода из тени до границы атмосферы
          start = OA;
          rayLen -= t2;
          // коррекция оптической глубины за счет длины луча за тенью
          //normal = normalize(start);
          //optDepth -= uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(start)-uPlanetRadius)/uScaleHeight, dot(normal, ld));
        }
      }
    }
  }

  // если точка выхода из атмосферы ближе конца тени, то интегрировать не надо
  if(rayLen < 0.) return ResultScattering(vec3(0), vec3(1));

/*
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
*/

    
  float stepSize = rayLen/float(stepsNumber); // длина шага
  vec3 step = rd*stepSize; // шаг вдоль луча
  //vec3 nextpos = currentpos + step; // следующая точка
  vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
  vec3 nextpos = pos + step; // следующая точка


  vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);

  //float maxR = uPlanetRadius + MAX_TRN_ELEVATION;
  // расстояние вдоль направления на солнце, где продолжение цилиндра тени пересекается со сферой MAX_TRN_ELEVATION
  //float x = sqrt(maxR*maxR - PLANET_RADIUS_SQR);

  for (int i=0; i<stepsNumber; i++, nextpos += step, pos += step) {
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
  vec3 inScatter = exp(-uBetaRayleigh*optDepth.x - uBetaMie*optDepth.y);

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = phaseRayleigh*uBetaRayleigh*totalRayleigh + phaseMie*uBetaMie*totalMie;
  return ResultScattering(transmittance, inScatter);
}


const int PRIMARY_STEPS_INTERSECTION = 16;

/** 
 * Функция вычисления атмосферного рассеивания при известном пересечении с поверхностью (табличная версия)
 *   ro - положение камеры
 *   rd - направление луча камеры
 *   ld - направление на источник света
 *   rayLen - дистанция до пересечения луча с поверхностью
 *   noise - случайное число в диапазоне 0...1 для смещения начальной точки чтобы избежать полос на сильных градиентах
 * В функции вырезано отраженное рассеивание Ми, т.к. невозможно учесть все пересечения лучей с ландшафтом 
 */
ResultScattering scatteringWithIntersectionTable(vec3 ro, vec3 rd, vec3 ld, float rayLen, float noise) {
  
  // Положение относительно центра планеты
  vec3 start = terrainFromCenter(ro);// ro - uPlanetCenter;

  float PLANET_RADIUS_SQR = uPlanetRadius*uPlanetRadius;
  float ATM_RADIUS_SQR = uAtmRadius*uAtmRadius;
  float ATM_HEIGHT = uAtmRadius - uPlanetRadius;

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

  // Расчет фазовой функции
  // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
  // Для рассеяния Ми g принимают 0,76 ... 0,999.
  // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
  float mu = dot(rd, ld);
  float phaseRayleigh = 0.75 * (1. + mu*mu) * ONE_DIV4PI;

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec2 optDepth = vec2(0.);
  vec3 totalRayleigh = vec3(0.);

  // Расчет расстояния до тени планеты
  //
  // (1) r^2 - dot(ld, r)^2 < R^2 – условие попадания точки в цилиндр тени планеты
  // (2) dot(ld, r) < 0 – условие что точка за планетой, в тени
  // r - произвольный вектор относительно центра планеты
  // ld - единичный вектор-направление на солнце
  // R - радиус планеты
  //
  // Граница цилиндра:
  // dot(OA+rd*t,OA+rd*t) - dot(ld,OA+rd*t)^2 = R^2        (3)
  // r = OA+rd*t, OA = ro-planetCenter
  // t - длина луча из камеры до границы тени
  //
  // dot(OA+rd*t,OA+rd*t) =
  // = OAx^2 + 2*OAx*rdx*t + rdx^2*t^2 + OAy^2 + 2*OAy*rdy*t + rdy^2*t^2 + OAz^2 + 2*OAz*rdz*t + rdz^2*t^2 =
  // = OA^2 + t^2 + 2*dot(rd,OA)*t
  //
  // dot(ld,OA+rd*t) = 
  // = ldx*(OAx + rdx*t) + ldy*(OAy + rdy*t) + ldz*(OAz + rdz*t) =
  // = ldx*OAx + ldx*rdx*t + ldy*OAy + ldy*rdy*t + ldz*OAz + ldz*rdz*t =
  // = dot(ld,OA) + dot(ld,rd)*t
  //
  // Подставляем в (3)
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA) + dot(ld,rd)*t)^2 = R^2
  //
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA)^2 + 2*dot(ld,OA)*dot(ld,rd)*t + dot(ld,rd)^2*t^2) = R^2
  //
  // t^2*(1 - dot(ld,rd)^2) + t*2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd)) + (OA^2 - R^2 - dot(ld,OA)^2) = 0
  //
  // Квадратное уравнение с коэффициентами:
  // a = 1 - dot(ld,rd)^2
  // b = 2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd))
  // c = OA^2 - R^2 - dot(ld,OA)^2
  //
  // Если a = 0 луч параллелен направлению на солнце и не пересекает тень
  // Дискриминант:
  // D = b^2-4ac
  // Если D<0, то луч уходит мимо цилиндра тени
  // 
  // Два корня:
  // t1 = 0.5*(-b + sqrt(D))/a
  // t2 = 0.5*(-b - sqrt(D))/a
  // Из них выбираем меньший положительный
  // Проверяем на условие, что точка за планетой по отношению к солнцу
  // dot(ld, OA+rd*t) < 0
  
  vec3 OA = start;
  float rayLenShadow = rayLen;
  vec3 end = start + rayLen*rd;
  float LdotRd = mu;
  if(abs(LdotRd) < 1.) {
    // луч не параллелен направлению на солнце
    float a = 1. - LdotRd*LdotRd;
    float LdotOA = dot(ld,OA);
    float b = 2.*(dot(rd,OA) - LdotOA*LdotRd);
    float c = dot(OA,OA) - PLANET_RADIUS_SQR - LdotOA*LdotOA;
    float D = b*b - 4.*a*c;
    if(D >= 0.) {
      // луч пересекает цилиндр тени
      float sqrtD = sqrt(D);
      vec2 t12 = 0.5*(vec2(-b)+vec2(sqrtD,-sqrtD))/a;
      float t1 = min(t12.x, t12.y);
      float t2 = max(t12.x, t12.y);
      if(t1 > 0.) {
        // находимся вне тени, луч пересекает тень впереди
        if(dot(ld, OA + rd*t1) < 0.) rayLen = min(t1, rayLen);
      }
      else // находимся в тени, устанавливаем отрицательный rayLen для пропуска интегрирования
        if(t2 > 0. && LdotOA < 0.) rayLen = min(t1, rayLen);
    }
  }

  //float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
  noise = 0.5;


  if (rayLen > 0.) {
    float stepSize = rayLen/float(PRIMARY_STEPS_INTERSECTION); // длина шага
    vec3 step = rd*stepSize; // шаг вдоль луча
    vec3 pos = start + noise*step; // смещение на случайную долю шага для избежания выраженных полос
    vec3 nextpos = start + step; // следующая точка
    vec2 fDensity = stepSize*exp(-(length(start)-uPlanetRadius)/uScaleHeight);

    float maxR = uPlanetRadius + MAX_TRN_ELEVATION;
    // расстояние вдоль направления на солнце, где продолжение цилиндра тени пересекается со сферой MAX_TRN_ELEVATION
    float x = sqrt(maxR*maxR - PLANET_RADIUS_SQR);

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
        // коэффициент ослабления рассеивания у границы тени
        float k = clamp(0.5*(sqrt(CT2)-uPlanetRadius)/MAX_TRN_ELEVATION, clamp(OT/x, 0., 1.), 1.);
        k *= k;

        vec3 normal = normalize(pos);
        // источник света виден из данной точки
        vec2 tableIndex = vec2((length(pos)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, ld));
        vec2 optDepth2 = texture(uTextureOptDepth, tableIndex).xy;

        // ослабление света за счет рассеивания
        // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
        vec3 attn = exp(-uBetaRayleigh*(optDepth.x+optDepth2.x) - uBetaMie*(optDepth.y+optDepth2.y));

        // total += T(CP) * T(PA) * ρ(h) * ds
        totalRayleigh += k * density.x * attn;
      }
    }
    start = nextpos;
  }

  if(rayLenShadow > rayLen) {
    // расчет оптической глубины в тени
    vec3 normal = normalize(start);
    vec2 tableIndex = vec2((length(start)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, -rd));
    optDepth -= texture(uTextureOptDepth, tableIndex).xy;
    // коррекция оптической глубины за счет длины луча за тенью
    normal = normalize(end);
    tableIndex = vec2((length(end)-uPlanetRadius)/ATM_HEIGHT, 0.5 - 0.5*dot(normal, -rd));
    optDepth += texture(uTextureOptDepth, tableIndex).xy;
  }

  vec3 inScatter = exp(-uBetaRayleigh*optDepth.x);

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = phaseRayleigh*uBetaRayleigh*totalRayleigh;
  return ResultScattering(transmittance, inScatter);
}








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

  // Расчет расстояния до тени планеты
  //
  // (1) r^2 - dot(ld, r)^2 < R^2 – условие попадания точки в цилиндр тени планеты
  // (2) dot(ld, r) < 0 – условие что точка за планетой, в тени
  // r - произвольный вектор относительно центра планеты
  // ld - единичный вектор-направление на солнце
  // R - радиус планеты
  //
  // Граница цилиндра:
  // dot(OA+rd*t,OA+rd*t) - dot(ld,OA+rd*t)^2 = R^2        (3)
  // r = OA+rd*t, OA = ro-planetCenter
  // t - длина луча из камеры до границы тени
  //
  // dot(OA+rd*t,OA+rd*t) =
  // = OAx^2 + 2*OAx*rdx*t + rdx^2*t^2 + OAy^2 + 2*OAy*rdy*t + rdy^2*t^2 + OAz^2 + 2*OAz*rdz*t + rdz^2*t^2 =
  // = OA^2 + t^2 + 2*dot(rd,OA)*t
  //
  // dot(ld,OA+rd*t) = 
  // = ldx*(OAx + rdx*t) + ldy*(OAy + rdy*t) + ldz*(OAz + rdz*t) =
  // = ldx*OAx + ldx*rdx*t + ldy*OAy + ldy*rdy*t + ldz*OAz + ldz*rdz*t =
  // = dot(ld,OA) + dot(ld,rd)*t
  //
  // Подставляем в (3)
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA) + dot(ld,rd)*t)^2 = R^2
  //
  // OA^2 + t^2 + 2*dot(rd,OA)*t – (dot(ld,OA)^2 + 2*dot(ld,OA)*dot(ld,rd)*t + dot(ld,rd)^2*t^2) = R^2
  //
  // t^2*(1 - dot(ld,rd)^2) + t*2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd)) + (OA^2 - R^2 - dot(ld,OA)^2) = 0
  //
  // Квадратное уравнение с коэффициентами:
  // a = 1 - dot(ld,rd)^2
  // b = 2*(dot(rd,OA) - dot(ld,OA)*dot(ld,rd))
  // c = OA^2 - R^2 - dot(ld,OA)^2
  //
  // Если a = 0 луч параллелен направлению на солнце и не пересекает тень
  // Дискриминант:
  // D = b^2-4ac
  // Если D<0, то луч уходит мимо цилиндра тени
  // 
  // Два корня:
  // t1 = 0.5*(-b + sqrt(D))/a
  // t2 = 0.5*(-b - sqrt(D))/a
  // Из них выбираем меньший положительный
  // Проверяем на условие, что точка за планетой по отношению к солнцу
  // dot(ld, OA+rd*t) < 0
  
  vec3 OA = start;
  float LdotRd = dot(ld,rd);
  if(abs(LdotRd) < 1.) {
    // луч не параллелен направлению на солнце
    float a = 1. - LdotRd*LdotRd;
    float LdotOA = dot(ld,OA);
    float b = 2.*(dot(rd,OA) - LdotOA*LdotRd);
    float c = dot(OA,OA) - PLANET_RADIUS_SQR - LdotOA*LdotOA;
    float D = b*b - 4.*a*c;
    if(D >= 0.) {
      // луч пересекает цилиндр тени
      float sqrtD = sqrt(D);
      vec2 t12 = 0.5*(vec2(-b)+vec2(sqrtD,-sqrtD))/a;
      float t = min(t12.x, t12.y);
      t = t<0. ? max(t12.x, t12.y) : t;
      if(t > 0.) {
        // луч пересекает цилиндр тени впереди
        float LdotR = dot(ld, OA+rd*t);
        // за планетой
        if(LdotR < 0. && t < rayLen) rayLen = t;
      }
    }
  }

  //float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

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

  float maxR = uPlanetRadius + MAX_TRN_ELEVATION;
  // расстояние вдоль направления на солнце, где продолжение цилиндра тени пересекается со сферой MAX_TRN_ELEVATION
  float x = sqrt(maxR*maxR - PLANET_RADIUS_SQR);

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
      // коэффициент ослабления рассеивания у границы тени
      float k = clamp(0.5*(sqrt(CT2)-uPlanetRadius)/MAX_TRN_ELEVATION, clamp(OT/x, 0., 1.), 1.);
      k *= k;

      vec3 normal = normalize(pos);
      // источник света виден из данной точки
      vec2 optDepth2 = uScaleHeight * ChH(uPlanetRadius/uScaleHeight, (length(pos)-uPlanetRadius)/uScaleHeight, dot(normal, ld));

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      vec3 attn = exp(-uBetaRayleigh*(optDepth.x+optDepth2.x) - uBetaMie*(optDepth.y+optDepth2.y));

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh += k * density.x * attn;
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
  vec3 pos = terrainFromCenter(ro);
  float OT = dot(pos, rd); // расстояние в обратном направлении луча до точки минимального расстояния до центра планеты
  if(OT > 0.) return 1.; // луч к солнцу уходит выше планеты
  float OT2 = OT*OT;
  float CT = sqrt(dot(pos, pos) - OT2); // минимальное расстоянии от луча до центра планеты
  float d = 0.;
  float a = CT - uPlanetRadius;
  float b = sqrt(a*a + OT2);
  if(b > 0.001) d = a/b;
  return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, d);
}
