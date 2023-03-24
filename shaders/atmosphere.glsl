
#define ATM_MODULE
// ----------------------------------------------------------------------------
// Модуль расчета атмосферного рассеяния
// ----------------------------------------------------------------------------

const vec3 LIGHT_INTENSITY = vec3(12.); // Интенсивность света
const vec3 PLANET_POS = vec3(0.);   // Положение планеты
const float PLANET_RADIUS = 6371e3; // Радиус планеты
const float PLANET_RADIUS_SQR = PLANET_RADIUS*PLANET_RADIUS; // Квадрат радиуса планеты
const float ATM_RADIUS = 6471e3;  // Радиус атмосферы
const float ATM_RADIUS_SQR = ATM_RADIUS*ATM_RADIUS; // Квадрат радиуса атмосферы

const vec3 RAY_BETA = vec3(5.5e-6, 13.0e-6, 22.4e-6); // rayleigh, affects the color of the sky
const vec3 MIE_BETA = vec3(2e-7);     // mie, affects the color of the blob around the sun
const vec3 ABSORPTION_BETA = vec3(2.04e-5, 4.97e-5, 1.95e-6); // what color gets absorbed by the atmosphere (Due to things like ozone)
const float G = 0.996; // mie scattering direction, or how big the blob around the sun is
// and the heights (how far to go up before the scattering has no effect)
const float HEIGHT_RAY = 8e3;        // rayleigh height
const float HEIGHT_MIE = 1.2e3;      // and mie
const float HEIGHT_ABSORPTION = 30e3; // at what height the absorption is at it's maximum
const float ABSORPTION_FALLOFF = 4e3; // how much the absorption decreases the further away it gets from the maximum height
// and the steps (more looks better, but is slower)
// the primary step has the most effect on looks
const int PRIMARY_STEPS = 32; // primary steps, affects quality the most


// Приближение функции Чапмана, домноженная на exp(-x)
// функция возвращает оптическую глубину (интеграл плотности вдоль луча от указанной высоты до бесконечности)
// в двух каналах (x - Релея, y - Ми)
// X - референсная нормализованная высота (R/H), R - радиус планеты, H - характеристическая высота плотности атмосферы (высота 50% массы)
// x - нормализованная высота ((R+h)/H), h - высота над уровнем планеты
// cosTheta - косинус угла наклона луча к зениту
vec2 ChH(vec2 X, vec2 x, float cosTheta) {
  vec2 c = 1.2533*sqrt(X + x);
  // theta выше горизонта
  if(cosTheta >= 0.0) return c/(c*cosTheta + vec2(1.0)) * exp(-x);
  // theta ниже горизонта
  else {
      vec2 x0 = sqrt(vec2(1.0) - cosTheta*cosTheta) * (X+x);
      vec2 c0 = 1.2533*sqrt(x0);
      return 2.0*c0*exp(X-x0) - c/(vec2(1.0) - c*cosTheta) * exp(-x);
  }
}

struct ResultScattering {
  vec3 t; // Мультипликативная часть (transmittance), цвет поглощения
  vec3 i; //Аддитивная часть (in-scatter), цвет подсвечивания за счет рассеивания атмосферы
};

/** 
  * Функция вычисления атмосферного рассеивания
  *   ro - положение камеры
  *   rd - направление луча камеры
  *   ld - направление на источник света
  */
ResultScattering scattering(vec3 ro, vec3 rd, vec3 ld) {
  // Положение относительно центра планеты
  //vec3 start = ro - PLANET_POS;
  vec3 start = vec3(0, ro.y+PLANET_RADIUS, 0);
  
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
  bool isPlanetIntersect = false;
  if(NdotD < 0.) {
    // Поиск длины луча в случае попадания в поверхность планеты
    if(CT2 < PLANET_RADIUS_SQR) {
      rayLen = OT - sqrt(PLANET_RADIUS_SQR - CT2);
      isPlanetIntersect = true;
    }
  }
  
  // Расчет фазовой функции
  // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
  // Для рассеяния Ми g принимают 0,76 ... 0,999.
  // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
  float mu = dot(rd, ld);
  float mu2 = mu * mu;
  float g2 = G * G;
  float phaseRayleigh = 0.75 * (1. + mu2);
  float phaseMie = isPlanetIntersect ? 0. : 1.5*(1.-g2)/(2.+g2) * (1.+mu2)/pow(1.+g2-2.*mu*G, 1.5);
    
  float stepSize = rayLen/float(PRIMARY_STEPS); // длина шага
  vec3 step = rd*stepSize; // шаг вдоль луча
  vec3 pos = start + 0.5*step; // начальное смещение на половину шага для более точного интегрирования по серединам отрезков

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec3 optDepth = vec3(0.);
  vec3 totalRayleigh = vec3(0.);
  vec3 totalMie = vec3(0.);

  vec2 scale_height = vec2(HEIGHT_RAY, HEIGHT_MIE);
    
  for (int i=0; i<PRIMARY_STEPS; i++) {
    float height = length(pos) - PLANET_RADIUS;
    /////////////////////////////////////////////////////////////
    // TODO: плотность нужно линейно аппроксимировать на отрезке
    vec3 density = stepSize*vec3(exp(-height/scale_height), 0.);

    // плотность частиц поглощения (озона)
    // масштабная высота поглощения соответствует высоте частиц Релея, но поглощение выражено на определенной высоте
    // использование sech функции хорошо имитирует кривую плотности частиц поглощения
    float d = (HEIGHT_ABSORPTION-height)/ABSORPTION_FALLOFF;
    density.z = density.x/(d*d + 1.);
    /////////////////////////////////////////////////////////////

    // определение оптической глубины вдоль луча
    optDepth += density;
    
    // определение виден ли источник света из данной точки
    float OT = dot(pos, ld); // расстояния вдоль направления на свет до точки минимального расстояния до центра планеты
    float CT2 = dot(pos, pos) - OT*OT; // квадрат минимального расстояния от луча до центра планеты
    if(OT>0. || CT2 > PLANET_RADIUS_SQR)  {
      // источник света виден из данной точки
      vec3 normal = normalize(pos);
      // косинус угла луча света к зениту
      float NdotL = dot(normal, ld);
      vec3 optDepth2 = vec3(0);
      optDepth2.xy = scale_height * ChH(PLANET_RADIUS/scale_height, (length(pos)-PLANET_RADIUS)/scale_height, NdotL);
      //////////////////////////////////////////////////////////////////////////////
      // TODO: определить optDepth2.z (optAbsorption2)

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      vec3 attn = exp(
        - RAY_BETA*(optDepth.x+optDepth2.x) 
        - MIE_BETA*(optDepth.y+optDepth2.y)
        - ABSORPTION_BETA*(optDepth.z+optDepth2.z)
        );

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh += density.x * attn;
      totalMie += density.y * attn;
    }
    pos += step;
  }
  vec3 inScatter = isPlanetIntersect 
    ?
    exp(-(RAY_BETA*optDepth.x + ABSORPTION_BETA*optDepth.z))
    :
    exp(-(MIE_BETA*optDepth.y + RAY_BETA*optDepth.x + ABSORPTION_BETA*optDepth.z));

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = (
    phaseRayleigh*RAY_BETA*totalRayleigh 
    + phaseMie*MIE_BETA*totalMie
    )/(4.*PI);
  return ResultScattering(transmittance, inScatter);
}

//Функция рассеивания при пересечении с поверхностью
ResultScattering calculate_scattering2(vec3 ro, vec3 rd, vec3 ld, float rayLen) {
  
  // Положение относительно центра планеты
  //vec3 start = ro - PLANET_POS;
  vec3 start = vec3(0, ro.y+PLANET_RADIUS, 0);
  
  // Расчет фазовой функции
  // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
  // Для рассеяния Ми g принимают 0,76 ... 0,999.
  // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
  float mu = dot(rd, ld);
  float mu2 = mu * mu;
  float g2 = G * G;
  float phaseRayleigh = 0.75 * (1. + mu2);
  float phaseMie = 0.; //1.5*(1.-g2)/(2.+g2) * (1.+mu2)/pow(1.+g2-2.*mu*G, 1.5);
    
  float stepSize = rayLen/float(PRIMARY_STEPS); // длина шага
  vec3 step = rd*stepSize; // шаг вдоль луча
  vec3 pos = start + 0.5*step; // начальное смещение на половину шага для более точного интегрирования по серединам отрезков

  // оптическая глубина x - Релея, y - Ми, z - озон
  vec3 optDepth = vec3(0.);
  vec3 totalRayleigh = vec3(0.);
  vec3 totalMie = vec3(0.);

  vec2 scale_height = vec2(HEIGHT_RAY, HEIGHT_MIE);
    
  for (int i=0; i<PRIMARY_STEPS; i++) {
    float height = length(pos) - PLANET_RADIUS;
    /////////////////////////////////////////////////////////////
    // TODO: плотность нужно линейно аппроксимировать на отрезке
    vec3 density = stepSize*vec3(exp(-height/scale_height), 0.);

    // плотность частиц поглощения (озона)
    // масштабная высота поглощения соответствует высоте частиц Релея, но поглощение выражено на определенной высоте
    // использование sech функции хорошо имитирует кривую плотности частиц поглощения
    float d = (HEIGHT_ABSORPTION-height)/ABSORPTION_FALLOFF;
    density.z = density.x/(d*d + 1.);
    /////////////////////////////////////////////////////////////

    // определение оптической глубины вдоль луча
    optDepth += density;
    
    // определение виден ли источник света из данной точки
    float OT = dot(pos, ld); // расстояния вдоль направления на свет до точки минимального расстояния до центра планеты
    float CT2 = dot(pos, pos) - OT*OT; // квадрат минимального расстояния от луча до центра планеты
    if(OT>0. || CT2 > PLANET_RADIUS_SQR)  {
      // источник света виден из данной точки
      vec3 normal = normalize(pos);
      // косинус угла луча света к зениту
      float NdotL = dot(normal, ld);
      vec3 optDepth2 = vec3(0);
      optDepth2.xy = scale_height * ChH(PLANET_RADIUS/scale_height, (length(pos)-PLANET_RADIUS)/scale_height, NdotL);
      //////////////////////////////////////////////////////////////////////////////
      // TODO: определить optDepth2.z (optAbsorption2)

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      vec3 attn = exp(
        - RAY_BETA*(optDepth.x+optDepth2.x) 
        - MIE_BETA*(optDepth.y+optDepth2.y)
        - ABSORPTION_BETA*(optDepth.z+optDepth2.z)
        );

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh += density.x * attn;
      totalMie += density.y * attn;
    }
    pos += step;
  }
  vec3 inScatter = exp(-(RAY_BETA*optDepth.x + ABSORPTION_BETA*optDepth.z));

  // I = I_S * β(λ) * γ(θ) * total
  vec3 transmittance = (
    phaseRayleigh*RAY_BETA*totalRayleigh 
    + phaseMie*MIE_BETA*totalMie
    )/(4.*PI);
  return ResultScattering(transmittance, inScatter);
}

