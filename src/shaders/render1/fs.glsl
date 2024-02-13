#version 300 es

precision highp float;

/** Разрешение экрана */
uniform vec2 uResolution;
uniform vec2 uTime;
uniform uint uFrame;

uniform mat3 uTransformMat;
/** 
 * Насколько камера попадает под солнце:
 * 1. - полностью на солнце, 0. - полностью в тени
 */
uniform float uCameraInShadow;
/** Синус половины углового размера солнца */
uniform float uSunDiscAngleSin;
/** Направление на солнце */
uniform vec3 uSunDirection;
/** Цвет и интенсивность света от солнца при виде из камеры */
uniform vec3 uSunDiscColor;
/** Направление на луну */
uniform vec3 uMoonDirection;
/** Цвет и интенсивность света от луны */
uniform vec3 uMoonDiscColor;

/** Положение камеры */
uniform vec3 uCameraPosition;

/** Цвет и интенсивность света фар: vec3(0.) - выключен */
uniform vec3 uHeadLight;

/** Положение сигнальных ракет */
uniform vec3 uFlarePositions[2];
/** Цвет и интенсивность света сигнальных ракет */
uniform vec3 uFlareLights[2];

/** Текстура программы A */
uniform sampler2D uTextureADepth;
/** Глубина программы B */
uniform sampler2D uTextureBDepth;
/** Нормали программы B */
uniform sampler2D uTextureBNormal;
/** Значения альбедо программы B */
uniform sampler2D uTextureBAlbedo;
/** Нормали и глубина программы C */
uniform sampler2D uTextureCNormalDepth;

/** 
* Таблица цвета солнца от косинуса угла высоты солнца
* индекс 0 - косинус = -1
* индекс 1 - косинус = 1
*/
uniform sampler2D uTextureSunColor;
/** 
* Таблица цвета неба от косинуса угла высоты солнца
* индекс 0 - косинус = -1
* индекс 1 - косинус = 1
*/
uniform sampler2D uTextureSkyColor;


uniform vec2 uTextureBResolution;
uniform sampler2D uTextureBlueNoise;

uniform sampler2D uTextureSSAONoise;

/** Луч в системе координат планеты */
in vec3 vRay;
in vec3 vRaySky;
in vec3 vRayScreen;
in float vAspect;
in float vAspectB;

/**
 * Режим отображения
 * x - режим экрана: 
 *   FRONT_VIEW - вид камеры,
 *   MAP_VIEW - вид карты,
 *   DEPTH_VIEW - вид карты глубины (режим отключен)
 * y - опции отображения карты: 
 *   MAP_ONLY - только карта,
 *   MAP_GRID - показывать сетку,
 *   MAP_HEIGHTS - показывать изолинии высот
 */
uniform vec2 uScreenMode;
/** Масштаб карты */
uniform float uMapScale;

out vec4 fragColor;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "src/shaders/common/constants.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета пересечения луча с поверхностью
// ----------------------------------------------------------------------------
#ifndef RAYCAST_MODULE
#include "src/shaders/common/raycasting/Raycast.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета затенения окружающего освещения
// ----------------------------------------------------------------------------
#ifndef SSAO_MODULE
#include "./ssao.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета атмосферного рассеивания
// ----------------------------------------------------------------------------
#ifndef ATM_MODULE
#include "./atmosphere.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функции отображения ночного неба
// ----------------------------------------------------------------------------
#ifndef SKY_MODULE
#include "./sky.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций постобработки
// ----------------------------------------------------------------------------
#ifndef POSTPROC_MODULE
#include "../common/postprocess.glsl";
#endif

/** 
 * Функция неламбертового диффузного рассеивания.
 * Среднее законов Lambert и Lommel-Seeliger
 *   omega - альбедо
 *   omega_0 - альбедо одиночного рассеивания
 *   mu - косинус угла между нормалью и направлением на камеру
 *   mu0 - косинус угла между нормалью и направлением на источник света
 */
vec3 lunar_lambert(vec3 omega, float mu, float mu_0) {
	vec3 omega_0 = 244. * omega/(184.*omega + 61.);
	return omega_0 * ( 0.5*omega*(1.+sqrt(mu*mu_0)) + .25/max(0.4, mu+mu_0) );
}

//vec3 lunar_lambert(vec3 omega, float mu, float mu_0) {
//	return omega;
//}


vec3 render(vec3 ro, float t, vec3 rd, vec3 nor, vec3 albedo, float ssao, vec3 sundir, float sunshd) {
  // косинус угла между лучем и солнцем 
  vec3 col = vec3(0);
  vec3 pos = vec3(0);
  pos = ro + t*rd;
  // цвет
  vec3 kd = albedo;
  // ambient
  vec3 zenith = terrainZenith(pos);
  float amb = clamp(0.5+0.5*dot(nor, zenith), 0., 1.);
  //vec3 light = sundir;
  float LdotZ = dot(zenith, sundir);
  vec2 colorIndex = 0.5*vec2((LdotZ + 1.), 0.5);
  // цвет солнца и неба в зависимости от высоты солнца из предварительно рассчитанной текстуры
  vec3 suncolor = texture(uTextureSunColor, colorIndex).xyz;
  vec3 skycolor = texture(uTextureSkyColor, colorIndex).xyz;
  
  /*
  if(LdotZ < -15.*uSunDiscAngleSin) {
    // включаем свет луны, если солнце зашло
    light = moondir;
    lightcolor = uMoonDiscColor;
  }
  */

  //vec3 hal = normalize(light-rd);

  float LdotN = dot(sundir, nor);
  float RdotN = clamp(-dot(rd, nor), 0., 1.);

  // 1-ая световая ракета
  vec3 fd0 = uFlarePositions[0]-pos;
  float fdist0sqr = dot(fd0,fd0);
  fd0 /= sqrt(fdist0sqr);
  float F0dotN = clamp(dot(fd0, nor), 0., 1.);
  // 2-ая световая ракета
  vec3 fd1 = uFlarePositions[1]-pos;
  float fdist1sqr = dot(fd1,fd1);
  fd1 /= sqrt(fdist1sqr);
  float F1dotN = clamp(dot(fd1, nor), 0., 1.);

  float xmin = uSunDiscAngleSin; // синус половины углового размера солнца (здесь увеличен в 6 раз для мягкости), задает границу плавного перехода
  float dx = clamp(0.5*(xmin-LdotN)/xmin, 0., 1.);
  LdotN = clamp(xmin*dx*dx + LdotN, 0., 1.);

  vec3 lunar = 2.*skycolor*amb*ssao*lunar_lambert(kd, RdotN, amb)     // свет от неба
    + suncolor*LdotN*sunshd*lunar_lambert(kd, RdotN, LdotN)  // свет солнца или луны
    + uHeadLight*RdotN*lunar_lambert(kd, RdotN, RdotN)/(t*t)   // свет фар
    + uFlareLights[0]*F0dotN*lunar_lambert(kd, RdotN, F0dotN)/(fdist0sqr)  // свет 1-ой сигнальной ракеты
    + uFlareLights[1]*F1dotN*lunar_lambert(kd, RdotN, F1dotN)/(fdist1sqr);  // свет 2-ой сигнальной ракеты
  col = lunar;//mix(lomm, lunar, LvsR);
  
  return col;
}

void main() {
  vec2 k = vAspect > vAspectB
    ? vec2(1, vAspectB/vAspect)
    : vec2(vAspect/vAspectB, 1);
  vec2 uv = vec2(0.5)+k*(gl_FragCoord.xy/uResolution-0.5);


#ifdef DEPTH_ERROR_VIEW
  uv = gl_FragCoord.xy/uResolution;
  float derr = texture(uTextureBDepth, uv).y;
  vec3 col = derr<0. ? vec3(-derr,0,0) : vec3(2.*derr);
  col = pow(col, vec3(1./2.2));
#else //DEPTH_ERROR_VIEW

#ifdef SHADOW_DISTANCE_VIEW
  uv = gl_FragCoord.xy/uResolution;
  vec4 shd = texture(uTextureBDepth, uv);
  vec3 col = shd.z == -1. ? vec3(1,0,0) : shd.w>MAX_TERRAIN_DISTANCE ? vec3(0,0,1) : vec3(shd.w)/300.;
  col = pow(col, vec3(1./2.2));
#else //SHADOW_DISTANCE_VIEW

  vec4 albedoB = texture(uTextureBAlbedo, uv);
  vec3 normalB = texture(uTextureBNormal, uv).xyz;
  vec4 depthShadowB = texture(uTextureBDepth, uv);
  float depthB = depthShadowB.x;
  //vec4 normalDepthC = texture(uTextureCNormalDepth, uv);

  vec3 col = albedoB.rgb;
  float t = depthB;
  /*
  if(normalDepthC.w < t) {
    col = normalDepthC.xyz;//vec3(0.5);
    t = normalDepthC.w;
    //normal = normalDepthC.xyz;
  }
  */
  vec3 rd = normalize(vRay);
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

#ifndef RAYCAST_ITERATIONS_VIEW
#ifdef TEST_VIEW
  col = render(uCameraPosition, t, rd, normalB, col, 1., uSunDirection, depthShadowB.z);
#else //TEST_VIEW

  uint mframe = uFrame - 1024u * (uFrame/1024u);
  // сдвиг текстуры шума в зависимости от времени (номера кадра)
  uvec2 nshift = uvec2(1000, 15)*mframe;
  float noise = texelFetch(uTextureBlueNoise, ivec2(gl_FragCoord.xy + vec2(nshift)) & (1024 - 1), 0).r;

  vec3 rand = vec3(1,0,0);//texture(uTextureSSAONoise, gl_FragCoord.xy/4.).xyz;

  // перевод в систему координат относительно камеры для вычисления SSAO
  vec3 normal = normalB*uTransformMat;
  normal.z = -normal.z;
  vec3 posScreen = normalize(vRayScreen)*t;
  posScreen.z = -posScreen.z;
  float ssao = calcSSAO(posScreen, normal, rand, uTextureBDepth, 300.);

  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,uSunDirection),0.,1.);
  float sundot2 = sundot*sundot;
  float moondot = clamp(dot(rd,uMoonDirection),0.,1.);
  if(t>MAX_TERRAIN_DISTANCE) {
    // небо из текстуры
    col = 0.5*nightSky(normalize(vRaySky));
    // диск солнца
    float sunsin =  1. - smoothstep(uSunDiscAngleSin-0.001,uSunDiscAngleSin+0.001,sqrt(1.-sundot2));
    col += sunsin*vec3(1.,0.8,0.6);
    // диск луны
    float moonsin = 1. - smoothstep(uSunDiscAngleSin-0.001,uSunDiscAngleSin+0.001,sqrt(1.-moondot*moondot));
    col += moonsin;
    // горизонт планеты
    col *= planetIntersection(uCameraPosition, rd);
    // атмосферное рассеивание
    ResultScattering rs;
    rs = scatteringTable(uCameraPosition, rd, uSunDirection, mix(0.,1.,noise));
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
  }
  else {
    float shd = clamp(depthShadowB.z, 0., 1.);
    col = render(uCameraPosition, t, rd, normalB, col, ssao*ssao, uSunDirection, shd);
    ResultScattering rs = scatteringWithIntersectionTable(uCameraPosition, rd, uSunDirection, t, mix(0.,1.,noise));
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
  }

  // 1-ая световая ракета
  vec3 fd = uFlarePositions[0] - uCameraPosition;
  float fdist = length(fd);
  if(fdist < t && dot(fd, rd) >= 0.999999*fdist) {
    col = uFlareLights[0];
    t = fdist;
  }
  // 2-ая световая ракета
  fd = uFlarePositions[1] - uCameraPosition;
  fdist = length(fd);
  if(fdist < t && dot(fd, rd) >= 0.999999*fdist) {
    col = uFlareLights[1];
    t = fdist;
  }

  // засвечивание солнцем
  sundot2 *= sundot2; //4
  sundot2 *= sundot2; //8
  sundot2 *= sundot2; //16
  col += 0.2*uCameraInShadow*uSunDiscColor*sundot2;
  // тональная компрессия с экспозицией
  //float exposure = 2.;
  //col = vec3(1.) - exp(-col * exposure);

#endif //TEST_VIEW
  col = quantizeDitherToSRGB(col, 1./255., gl_FragCoord.xy);
#endif //RAYCAST_ITERATIONS_VIEW
#endif //SHADOW_DISTANCE_VIEW
#endif //DEPTH_ERROR_VIEW
  fragColor = vec4(col, 1.);
}
 