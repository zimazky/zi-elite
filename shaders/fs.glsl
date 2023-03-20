#version 300 es

//precision mediump float;
precision lowp float;

uniform vec2 uResolution;
uniform vec2 uTime;
uniform sampler2D uTexture;

uniform vec4 uCameraPosition;
uniform vec3 uCameraVelocity;
uniform vec3 uCameraRotationSpeed;
uniform vec4 uCameraQuaternion;
uniform float uCameraViewAngle;

uniform float uCameraInShadow;
uniform float uSunDiscAngleSin;
uniform vec3 uSunDirection;
uniform vec3 uSunDiscColor;
uniform vec3 uSkyColor;

uniform vec2 uScreenMode;
uniform float uMapScale;

in vec3 vRay;

out vec4 fragColor;



// ----------------------------------------------------------------------------
// Atmosphere scattering constants
// ----------------------------------------------------------------------------

const vec3 LIGHT_INTENSITY = vec3(12.); // Интенсивность света
const vec3 PLANET_POS = vec3(0.);   // Положение планеты
const float PLANET_RADIUS = 6371e3; // Радиус планеты
const float PLANET_RADIUS_SQR = PLANET_RADIUS*PLANET_RADIUS; // Квадрат радиуса планеты
const float ATM_RADIUS = 6471e3;  // Радиус атмосферы
const float ATM_RADIUS_SQR = ATM_RADIUS*ATM_RADIUS; // Квадрат радиуса атмосферы

const vec3 RAY_BETA = vec3(5.5e-6, 13.0e-6, 22.4e-6); // rayleigh, affects the color of the sky
const vec3 MIE_BETA = vec3(2e-7);     // mie, affects the color of the blob around the sun
const vec3 AMBIENT_BETA = vec3(0.0);  // ambient, affects the scattering color when there is no lighting from the sun
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

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const float PI = 3.14159265358979;
const float _16_PI = 50.2654824574;   // 16.0*PI
const float _8_PI = 25.1327412287;    // 8.0*PI
const float SQRT2 = sqrt(2.);
const mat3  IDENTITY = mat3(vec3(1,0,0),vec3(0,1,0),vec3(0,0,1));

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;



// ----------------------------------------------------------------------------
// Операции с расчета атмосферного рассеяния
// ----------------------------------------------------------------------------

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
    if(OT < 0.) return ResultScattering(vec3(1), vec3(0)); // направление от планеты
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
    + optDepth.x*AMBIENT_BETA
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
    + optDepth.x*AMBIENT_BETA
    )/(4.*PI);
  return ResultScattering(transmittance, inScatter);
}

// ----------------------------------------------------------------------------
// Операции с кватернионами
// ----------------------------------------------------------------------------
vec4 qInvert(vec4 q) { return vec4(-q.xyz, q.w)/dot(q, q); }

vec4 qMul(vec4 a, vec4 b) { 
  return vec4(
    a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    a.w*b.y + a.y*b.w + a.z*b.x - a.x*b.z,
    a.w*b.z + a.z*b.w + a.x*b.y - a.y*b.x,
    a.w*b.w - dot(a.xyz, b.xyz)
  ); 
}

vec3 qRotate(vec4 q, vec3 p) { return qMul(qMul(q, vec4(p, 0.)), qInvert(q)).xyz; }

mat3 qMat3(vec4 q) { return mat3(qRotate(q, vec3(1,0,0)), qRotate(q, vec3(0,1,0)), qRotate(q, vec3(0,0,1))); }

vec4 qAngle(vec3 axis, float angle) { return vec4(normalize(axis)*sin(angle/2.), cos(angle/2.)); }

vec4 qYyawPitchRoll(float yaw, float pitch, float roll)
{ return qMul(qAngle(vec3(1,0,0), pitch), qMul(qAngle(vec3(0,1,0),yaw), qAngle(vec3(0,0,1),roll))); }


// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------

// value noise, and its analytical derivatives
vec3 noised(vec2 x) {
  vec2 f = fract(x);
  //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    vec2 u = f*f*(3.0-2.0*f);
    vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTexture, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
  float b = textureLod(uTexture, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
  float c = textureLod(uTexture, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
  float d = textureLod(uTexture, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;

  return vec3((a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y),
               du*(u.yx*(a-b-c+d) + vec2(b,c) - a));
}

const mat2 im2 = mat2(0.8,-0.6,0.6,0.8);
const float W_SCALE = 3000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота
const float GRASS_HEIGHT_MAX = 600.;
const float SEA_LEVEL = 0.;

// Генерация высоты с эррозией без производных упрощенная
float terrainH(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<16; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}
float terrainM(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<9; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}
float terrainS(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<5; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}

vec3 calcNormalH(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainH(pos.xz-eps.xy) - terrainH(pos.xz+eps.xy),
    2.0*eps.x,
    terrainH(pos.xz-eps.yx) - terrainH(pos.xz+eps.yx)
  ));
}

vec3 calcNormalM(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainM(pos.xz-eps.xy) - terrainM(pos.xz+eps.xy),
    2.0*eps.x,
    terrainM(pos.xz-eps.yx) - terrainM(pos.xz+eps.yx)
  ));
}

// ----------------------------------------------------------------------------
// Материалы
// ----------------------------------------------------------------------------

struct Material {
  vec4 kd;  // rgb - diffuse color, a - opacity, a<0 для источника света
  vec4 ks;  // rgb - specular color, a - glossiness
};

Material matGrass = Material(vec4(0.15*vec3(0.30,.30,0.10),1.),vec4(0));
Material matRockDark = Material(vec4(vec3(0.08,0.05,0.03),1.),vec4(vec3(0.02),0.3));
Material matRockLight = Material(vec4(vec3(0.10,0.09,0.08),1.),vec4(vec3(0.02),0.3));
Material matSand = Material(vec4(0.20*vec3(0.45,.30,0.15),1.),vec4(0));
Material matSnow = Material(vec4(0.29*vec3(0.62,0.65,0.7),1.),vec4(vec3(0.2),0.3));



// ----------------------------------------------------------------------------
// Камера
// ----------------------------------------------------------------------------
struct Camera {
  vec3 pos;
  float angle; // полный угол камеры по x
  vec4 quat;   // кватернион, определяющий ориентацию
};

// Получение луча камеры
vec3 rayCamera(Camera c, vec2 uv) {
  float t = tan(0.5*c.angle);
  return qRotate(c.quat,normalize(vec3(uv*t,-1.)));
}

// ----------------------------------------------------------------------------
// Рендеринг
// ----------------------------------------------------------------------------

/** 
  * Функция определения пересечения луча с планетой
  *   ro - положение камеры
  *   rd - направление луча
  * Возвращает 0. если луч пересекается с планетой
  */
float planetIntersection(vec3 ro, vec3 rd) {
  //const pos = ro.sub(PLANET_POS);
  vec3 pos = vec3(0, ro.y+PLANET_RADIUS, 0);
  float OT = dot(pos, rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
  float CT2 = dot(pos, pos) - OT*OT; // минимальное расстоянии от луча до центра планеты
  if(OT>0. || CT2>PLANET_RADIUS_SQR) return 1.;
  return 0.;
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
  //const pos = ro.sub(PLANET_POS);
  vec3 pos = vec3(0, ro.y+PLANET_RADIUS, 0);
  float OT = dot(pos, rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
  float CT = sqrt(dot(pos, pos) - OT*OT); // минимальное расстоянии от луча до центра планеты
  if(OT>0.) return 1.;
  float d = (PLANET_RADIUS-CT)/OT;
  return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, d);
}

// функция определения затененности
float softShadow(vec3 ro, vec3 rd, float dis) {
  float planetShadow = softPlanetShadow(ro, rd);
  if(planetShadow<=0.001) return 0.;
  float minStep = clamp(0.01*dis,10.,500.);
  float cosA = sqrt(1.-rd.z*rd.z); // косинус угла наклона луча от камеры к горизонтали

  float res = 1.;
  float t = 0.01*dis;
  for(int i=0; i<100; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	  vec3 p = ro + t*rd;
    if(p.y>MAX_TRN_ELEVATION) break;
    float h = p.y - terrainM(p.xz);
	  res = min(res, cosA*h/t);
    if(res<-uSunDiscAngleSin) break;
    t += max(minStep, abs(1.*h)); // коэффициент устраняет полосатость при плавном переходе тени
  }
  return planetShadow*smoothstep(-uSunDiscAngleSin,uSunDiscAngleSin,res);
}

float raycast(vec3 ro, vec3 rd, float tmin, float tmax) {
  float t = tmin;
  for(int i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = pos.y - terrainM(pos.xz);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  return t;
}

const mat2 m2 = mat2(0.8,-0.6,0.6,0.8);
float fbm(vec2 p)
{
  float f = 0.0;
  f += 0.5000*texture(uTexture, p/256.0 ).x; p = m2*p*2.02;
  f += 0.2500*texture(uTexture, p/256.0 ).x; p = m2*p*2.03;
  f += 0.1250*texture(uTexture, p/256.0 ).x; p = m2*p*2.01;
  f += 0.0625*texture(uTexture, p/256.0 ).x;
  return f/0.9375;
}


// определение цвета пикселя
Material terrain_color(vec3 pos, vec3 nor) {
  // мелкий шум в текстуре
  float r = texture(uTexture, 400.0*pos.xz/W_SCALE ).x;
  // полосы на скалах
  vec3 kd = (r*0.25+0.75)*0.9*mix( vec3(0.08,0.05,0.03),
                 vec3(0.10,0.09,0.08), 
                 texture(uTexture, vec2(0.0077*pos.x/W_SCALE,0.3*pos.y/H_SCALE)).x);
  //kd = vec3(0.05);
  // песок
  float sn = smoothstep(0.7,0.9,nor.y);
  kd = mix(kd, 0.20*vec3(0.45,.30,0.15)*(0.50+0.50*r),sn);
  // трава
  float gh = 1.-smoothstep(500.,600.,pos.y);
  float gn = smoothstep(0.60,1.0,nor.y);
  kd = mix(kd,0.15*vec3(0.30,.30,0.10)*(0.25+0.75*r),gh*gn);
  
  // мелкие и крупные пятна на скалах и траве
  kd *= 0.1+1.6*sqrt(fbm(pos.xz*1.1)*fbm(pos.xz*0.03));
  float ks = 0.02*(1.-gh*gn);
  float spec = 0.3*(1.-gh*gn*sn);

  // снег на высоте от 800 м 
  float h = smoothstep(800.0,1000.0,pos.y + 250.0*fbm(pos.xz/W_SCALE));
  // угол уклона
  float e = smoothstep(1.0-0.5*h,1.0-0.1*h,nor.y);
  // северное направление
  float o = 0.3 + 0.7*smoothstep(0.,0.1,-nor.z+h*h);
  float s = h*e*o;
  ks = mix(ks,0.2,s);
  spec = mix(spec,0.3,s);
  kd = mix(kd, 0.29*vec3(0.62,0.65,0.7), smoothstep(0.1, 0.9, s));
  return Material(vec4(kd,1.),vec4(vec3(ks),spec));
}


vec3 lambert(vec3 omega, float mu, float mu_0) {
	return omega;
}

vec3  lommel_seeliger(vec3 omega, float mu, float mu_0) {
 	return omega / max( 0.01, mu + mu_0 );
}

// omega - альбедо
// omega_0 - альбедо одиночного рассеивания
// mu - косинус угла между нормалью и направлением на камеру
// mu0 - косинус угла между нормалью и направлением на источник света
vec3 lunar_lambert(vec3 omega, float mu, float mu_0) {
	// non-lambertian diffuse shading used for terrain land masses
	// mix Lambert and Lommel-Seeliger based on single scattering albedo omega_0,

	//return omega / max( 0.0001, mu + mu_0 );
	// return omega;

	/*
	vec3 omega_0 = 4. * omega / ( 3. * omega + 1. );
	return omega_0 * ( omega + .25 * ( 1. - omega ) / max( 0.0001, mu + mu_0 ) );
	*/
	vec3 omega_0 = 244. * omega/(184.*omega + 61.);
	return omega_0 * ( 0.5*omega*(1.+sqrt(mu*mu_0)) + .25/max(0.4, mu+mu_0) );
}


const float kMaxT = 30000.0;
//const vec3 AMBIENT_LIGHT = vec3(0.3,0.5,0.85);
//const vec3 SUN_LIGHT = vec3(8.00,5.00,3.00);

vec4 render(vec3 ro, vec3 rd, float initDist)
{

  vec3 light1 = uSunDirection;
  // bounding plane
  float tmin = initDist;
  float tmax = kMaxT;
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,light1),0.,1.);
  vec3 col;
  float t = raycast(ro, rd, tmin, tmax);
  //t = tmax+1.;
  if(t>tmax) {
    // небо
    float sunsin = sqrt(1.-sundot*sundot);
    col = sunsin<uSunDiscAngleSin ? vec3(1.,0.8,0.6)*planetIntersection(ro,rd) : vec3(0);
    ResultScattering rs = scattering(ro, rd, light1);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
    t = -1.0;
  }
  else {
    // mountains		
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormalH(pos, max(200.,t));
    vec3 hal = normalize(light1-rd);
        
    // цвет
    Material mat = terrain_color(pos, nor);
    vec3 kd = mat.kd.rgb;

    // lighting		
    
    // ambient
    float amb = clamp(0.5+0.5*nor.y, 0., 1.);
	  float LdotN = dot(light1, nor);
    float RdotN = clamp(-dot(rd, nor), 0., 1.);
    float xmin = 6.*uSunDiscAngleSin; //3.*0.01745; // синус половины углового размера солнца (считаем 1 градус), задает границу плавного перехода
    float shd = LdotN<-xmin ? 0. : softShadow(pos, light1, t);
    float dx = clamp(0.5*(xmin-LdotN)/xmin, 0., 1.);
    float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
    LdotN = clamp(xmin*dx*dx + LdotN, 0., 1.);

	  //vec3 lamb = 2.*AMBIENT_LIGHT*amb*lambert(kd, RdotN, amb) + SUN_LIGHT*LdotN*shd*lambert(kd, RdotN, LdotN);
	  //vec3 lomm = 2.*AMBIENT_LIGHT*amb*lommel_seeliger(kd, RdotN, amb) + SUN_LIGHT*LdotN*shd*lommel_seeliger(kd, RdotN, LdotN);
	  vec3 lunar = uSkyColor*amb*lunar_lambert(kd, RdotN, amb) + uSunDiscColor*LdotN*shd*lunar_lambert(kd, RdotN, LdotN);
    col = lunar;//mix(lomm, lunar, LvsR);
    
    // specular
    /*
    float n = exp2(12.*mat.ks.a);
    vec3 ks = mat.ks.rgb;
    ks *= 0.5*(n+1.)/PI;
    float RdotV = clamp(dot(reflect(light1, nor), rd), 0., 1.);
    col += (1.-LvsR)*ks*(SUN_LIGHT*shd*LdotN*pow(RdotV,n) + AMBIENT_LIGHT*pow(amb,n));
    */

////////////////////
/*
	col = kd;
    float bac = clamp(0.2 + 0.8*dot(normalize(vec3(-light1.x, 0.0, light1.z)), nor), 0.0, 1.0);

    vec3 lin  = vec3(0.0);
    // цветной ореол у тени
    lin += dif*vec3(8.00,5.00,3.00)*1.3*vec3(shd, shd*shd*0.5+0.5*shd, shd*shd*0.8+0.2*shd);
    lin += amb*vec3(0.40,0.60,1.00)*1.2;
    //lin += bac*vec3(0.40,0.50,0.60);
	col *= lin;


    vec3 ref = reflect( rd, nor );
    float fre = clamp( 1.0+dot(rd,nor), 0.0, 1.0 );

    float h = smoothstep(800.0,1000.0,pos.y + 250.0*fbm(pos.xz/W_SCALE) );
    float e = smoothstep(1.0-0.5*h,1.0-0.1*h,nor.y);
    float o = 0.3 + 0.7*smoothstep(0.0,0.1,nor.x+h*h);

    float s = h*e*o;
    float gh = smoothstep(500.,600.,pos.y);

    //specular
    
    col += (0.+0.2*gh)*(0.04+0.96*pow(clamp(1.0+dot(hal,rd),0.0,1.0),5.0))*
               vec3(7.0,5.0,3.0)*dif*shd*
               pow( clamp(dot(nor,hal), 0.0, 1.0),16.0);
       
    col += s*0.65*pow(fre,4.0)*vec3(0.3,0.5,0.6)*smoothstep(0.0,0.6,ref.y);
*/
//////////////////
	  // fog
    //float fo = 1.0-exp(-pow(0.00009*t,1.5) );
    //col = mix(col, FOG_COLOR, fo );

    ResultScattering rs = calculate_scattering2(ro,rd,light1,t);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;

	}
  // sun scatter
  col += uCameraInShadow*0.3*uSunDiscColor*pow(sundot, 8.0)/LIGHT_INTENSITY;

  return vec4(col, t);
}

float grid(float x, float st) {
  float s = 2.*x/st;
  float a = fract(s);
  s = floor(mod(s,2.));
  return pow(mix(a,1.-a,s),.2);
}

vec2 grid(vec2 x, float st) {
  vec2 s = 2.*x/st;
  vec2 a = fract(s);
  s = floor(mod(s,2.));
  return mix(a,1.-a,s);
}

const float INIT_MAP_SCALE = 5000.; //начальный масштаб карты в м на ширину карты
vec4 showMap(Camera c, vec2 uv, int mode) {
  float mapScale = uMapScale;
  mapScale *= INIT_MAP_SCALE;
  vec2 p = c.pos.xz + vec2(1,-1)*mapScale*uv;
  float h = terrainM(p);
  vec3 nor = calcNormalM(vec3(p.x,h,p.y), 100.);
  Material mat = terrain_color(vec3(p.x,h,p.y), nor);
  vec3 col = 0.3+0.6*vec3(dot(nor.xyz,normalize(vec3(-1,1,-1))))*10.*mat.kd.rgb;
  // положение камеры
  col *= smoothstep(.01,0.012,length(c.pos.xz-p)/mapScale);
  // направление камеры
  vec2 camdir = qRotate(c.quat,vec3(0,0,-1)).xz;
  vec2 rp = c.pos.xz-p;
  col *= dot(rp,camdir)<0. ? smoothstep(0.0,0.002,abs(camdir.x*rp.y-camdir.y*rp.x)/mapScale) : 1.;
  if((mode & MAP_GRID)!=0) {
    // координатная сетка, по 500м на линию
    vec2 gr = smoothstep(0.,0.06, grid(p,500.));
    col *= gr.x*gr.y;
  }
  // уровни высот, по 50м на уровень
  col *= (mode & MAP_HEIGHTS)!=0 ? smoothstep(0.,1., grid(h,50.)) : 1.;
  return vec4(col,-1.);
}

// Матрица преобразования цветового пространства из базиса (615,535,445) в sRGB
mat3 mat2sRGB = mat3(
   1.6218, -0.4493,  0.0325,
  -0.0374,  1.0598, -0.0742,
  -0.0283, -0.1119,  1.0491
);

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.y;
  //vec2 m = iMouse.xy-0.5*iResolution.xy;
  
  //vec2 uv2 = fragCoord/iResolution.xy;
  // значение на предыдущем кадре
  //vec4 data = texture(iChannel2, uv2);
  //float zbuf = data.w;

  
  vec4 pos = uCameraPosition;
  float angle = uCameraViewAngle;
  Camera c = Camera(pos.xyz, angle, uCameraQuaternion);// memload(iChannel0,CAMERA_QUATERNION));
  vec3 rd = normalize(vRay);

  vec2 screen = uScreenMode;
  vec4 col = vec4(0.);
  if(screen.x==MAP_VIEW) col = showMap(c, uv, int(screen.y));
  else 
    col = render(c.pos, rd, 1.);
  //if(screen.x == DEPTH_VIEW) fragColor = vec4(1.-vec3(pow(col.w/500.,0.1)), col.w);
  //else 

  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

  vec3 color =  mix(col.rgb*mat2sRGB,col.rgb,LvsR); // Преобразование в sRGB
  color = pow(color, vec3(1./2.2)); // Gamma correction
  //color = color*mat2sRGB; // Преобразование в sRGB

  fragColor = vec4( color, 1. );
}
