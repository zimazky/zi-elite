#version 300 es

precision mediump float;

/** Разрешение экрана */
uniform vec2 uResolution;
uniform vec2 uTime;
uniform uint uFrame;

/** 
 * Насколько камера попадает под солнце:
 * 1. - полностью на солнце, 0. - полностью в тени
 */
uniform float uCameraInShadow;
/** Синус половины углового размера солнца */
uniform float uSunDiscAngleSin;
/** Направление на солнце */
uniform vec3 uSunDirection;
/** Цвет и интенсивность света от солнца */
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
/** Нормали и глубина программы B */
uniform sampler2D uTextureBNormalDepth;
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
in mat3 vInverseTransformMat;
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


vec3 render(vec3 ro, float t, vec3 rd, vec3 nor, vec3 albedo, float ssao, vec3 light1, vec3 light2) {
  // косинус угла между лучем и солнцем 
  vec3 col = vec3(0);
  vec3 pos = vec3(0);
  int shadowIterations = 0;
  float shadowDistance = 0.;
  pos = ro + t*rd;
  // цвет
  vec3 kd = albedo;
  // ambient
  vec3 zenith = terrainZenith(pos);
  float amb = clamp(0.5+0.5*dot(nor,zenith), 0., 1.);
  vec3 light = light1;
  float LdotZ = dot(zenith, light1);
  vec3 lightcolor = texture(uTextureSunColor, vec2((LdotZ+1.)/2., 0.5)).xyz;//uSunDiscColor;
  vec3 skycolor = texture(uTextureSkyColor, vec2((LdotZ+1.)/2., 0.5)).xyz;
  if(LdotZ < 0.) {
    light = light2;
    lightcolor = uMoonDiscColor;
    //skycolor = vec3(0);
  }
  //vec3 hal = normalize(light-rd);

  float LdotN = dot(light, nor);
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

  float xmin = 6.*uSunDiscAngleSin; // синус половины углового размера солнца (здесь увеличен в 6 раз для мягкости), задает границу плавного перехода
  float shd = 0.;
  if(LdotN>-xmin) {
    shd = softPlanetShadow(pos, light);
    if(shd>0.001) shd *= softShadow(pos, light, t, shadowIterations, shadowDistance);
    if(shd>=1.) shadowDistance = 2.*MAX_TERRAIN_DISTANCE;
  }
  float dx = clamp(0.5*(xmin-LdotN)/xmin, 0., 1.);
  LdotN = clamp(xmin*dx*dx + LdotN, 0., 1.);

  vec3 lunar = skycolor*amb*ssao*lunar_lambert(kd, RdotN, amb)     // свет от неба
    + lightcolor*LdotN*shd*lunar_lambert(kd, RdotN, LdotN)  // свет солнца или луны
    + uHeadLight*RdotN*lunar_lambert(kd, RdotN, RdotN)/(t*t)   // свет фар
    + uFlareLights[0]*F0dotN*lunar_lambert(kd, RdotN, F0dotN)/(fdist0sqr)  // свет 1-ой сигнальной ракеты
    + uFlareLights[1]*F1dotN*lunar_lambert(kd, RdotN, F1dotN)/(fdist1sqr);  // свет 2-ой сигнальной ракеты
  col = lunar;//mix(lomm, lunar, LvsR);
  
  //////////////////
  // fog
  //float fo = 1.0-exp(-pow(0.00009*t,1.5) );
  //col = mix(col, FOG_COLOR, fo );

  #ifdef SHADOWS_ITERATIONS_VIEW
  col = vec3(shadowIterations)/100.;
  #endif

  #ifdef SHADOW_DISTANCE_VIEW
  col = shadowDistance==0. ? vec3(1,0,0) : shadowDistance>MAX_TERRAIN_DISTANCE ? vec3(0,0,1) : vec3(shadowDistance)/3000.;
  #endif

  return col;
}

void main() {
  vec2 k = vAspect > vAspectB
    ? vec2(1, vAspectB/vAspect)
    : vec2(vAspect/vAspectB, 1);
  vec2 uv = vec2(0.5)+k*(gl_FragCoord.xy/uResolution-0.5);

  vec4 albedoB = texture(uTextureBAlbedo, uv);
  vec4 normalDepthB = texture(uTextureBNormalDepth, uv);
  vec4 normalDepthC = texture(uTextureCNormalDepth, uv);

#ifdef DEPTH_ERROR_VIEW
  uv = gl_FragCoord.xy/uResolution;
  float derr = normalDepthB.w - texture(uTextureADepth, uv).r;
  vec3 col = derr<0. ? vec3(-derr,0,0) : vec3(derr/100.);
  col = pow(col, vec3(1./2.2));
#else

  vec3 col = albedoB.rgb;
  //vec3 normal = normalDepthB.xyz;
  float t = normalDepthB.w;
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
  col = render(uCameraPosition, t, rd, normalDepthB.xyz, col, 1., uSunDirection, uMoonDirection);
#else

  uint mframe = uFrame - 1024u * (uFrame/1024u);
  uvec2 nshift = uvec2(1000, 15)*mframe;
 	//float noise = texture(uTextureBlueNoise, (gl_FragCoord.xy+vec2(nshift))/1024.).x;
  float noise = texelFetch(uTextureBlueNoise, ivec2(gl_FragCoord.xy + vec2(nshift)) & (1024 - 1), 0).r;

  vec3 rand = vec3(1,0,0);//texture(uTextureSSAONoise, gl_FragCoord.xy/4.).xyz;

  vec3 posScreen;
  vec3 normal;
  float ssao;
  if(uScreenMode.x == MAP_VIEW) {
    normal = normalDepthB.xzy*vec3(1, 1, -1);
    vec2 uv1 = uMapScale*vec2(1, 1./vAspectB)*(gl_FragCoord.xy/uResolution-0.5);
    posScreen = vec3(uv1.x, uv1.y, t);
    ssao = 1.;//calcSSAOOrtho(posScreen, normal, rand, uTextureBNormalDepth, 2.*vec2(1, vAspectB)*k/uMapScale, 300.);
  }
  else {
    normal = vInverseTransformMat*normalDepthB.xyz;
    normal.z = -normal.z;
    posScreen = normalize(vRayScreen)*t;
    posScreen.z = -posScreen.z;
    ssao = 1.;//calcSSAO(posScreen, normal, rand, uTextureBNormalDepth, 300.);
  }
  //col = (uSSAOSamples[int(mod(0.1*gl_FragCoord.x,64.))]);
  //col = vec3(ssao*ssao);
  //col = posScreen/1000.;
  //col = vec3(1);
  //col *= ssao;
  if(uScreenMode.x == MAP_VIEW) {
    //col *= clamp(0.5+0.5*dot(normalDepthB,zenith), 0., 1.);
    col *= ssao; //*ssao;
  }
  else {
    
    //col *= clamp(0.5+0.5*dot(normalDepthB,zenith), 0., 1.);
    //col = vec3(ssao*ssao);

    // косинус угла между лучем и солнцем 
    float sundot = clamp(dot(rd,uSunDirection),0.,1.);
    float moondot = clamp(dot(rd,uMoonDirection),0.,1.);
    if(t>MAX_TERRAIN_DISTANCE) {
      // небо из текстуры
      col = 0.5*nightSky(normalize(vRaySky));
      // диск солнца
      float sunsin =  1. - smoothstep(uSunDiscAngleSin-0.001,uSunDiscAngleSin+0.001,sqrt(1.-sundot*sundot));
      //sqrt(1.-sundot*sundot);
      col += sunsin*vec3(1.,0.8,0.6);
      // диск луны
      float moonsin = 1. - smoothstep(uSunDiscAngleSin-0.001,uSunDiscAngleSin+0.001,sqrt(1.-moondot*moondot));
      col += moonsin;
      // горизонт планеты
      col *= planetIntersection(uCameraPosition, rd);
      // атмосферное рассеивание
      ResultScattering rs;
      rs = scattering(uCameraPosition, rd, uSunDirection, mix(0.,1.,noise));
      col = rs.t*LIGHT_INTENSITY + rs.i*col;
    }
    else {
      col = render(uCameraPosition, t, rd, normalDepthB.xyz, col, ssao*ssao, uSunDirection, uMoonDirection);
      ResultScattering rs = scatteringWithIntersection(uCameraPosition, rd, uSunDirection, t, mix(0.,1.,noise));
      // считаем, что средняя длина дени равна max(MAX_TRN_ELEVATION*(tan(alpha)-tan(phi)),0.)
      // alpha - угол направления на солнце к зениту
      // phi - среднестатистический угол наклона склонов к зениту (принимаем 45 градусов, tan(phi)=1.)
      float tanAlpha = sqrt(1. - uSunDirection.z*uSunDirection.z) / max(0.01, uSunDirection.z);
      float shDist = max(MAX_TRN_ELEVATION*(tanAlpha-1.),0.);
      shDist = clamp(shDist, MAX_TRN_ELEVATION, 5000.);
      float scatDist = max(0., t-shDist); // примерная средняя дистанция на которой происходит рассеивание
      //scatDist = mix(scatDist, t, uCameraInShadow*shd);

      col = scatDist/t * rs.t*LIGHT_INTENSITY + rs.i*col; // добавлен коэффициент учитывающий луч в тени
    }

    // 1-ая световая ракета
    vec3 fd = uFlarePositions[0] - uCameraPosition;
    float fdist2 = dot(fd, fd);
    float fdist = sqrt(fdist2);
    fd /= fdist;
    float f = dot(fd, rd);
    if(f>=0.999999 && fdist<t) {
      col = uFlareLights[0];
      t = fdist;
    }
    // 2-ая световая ракета
    fd = uFlarePositions[1] - uCameraPosition;
    fdist2 = dot(fd, fd);
    fdist = sqrt(fdist2);
    fd /= fdist;
    f = dot(fd, rd);
    if(f>=0.999999 && fdist<t) {
      col = uFlareLights[1];
      t = fdist;
    }

    float exposure = 2.;
    // тональная компрессия с экспозицией
    col = vec3(1.) - exp(-col * exposure);
    // засвечивание солнцем
    col += 0.2*uCameraInShadow*uSunDiscColor*pow(sundot, 8.0);
  }
#endif

  //col = posScreen/1000.;
  //col = quantize_and_dither(col.rgb, 1./255., gl_FragCoord.xy);

  //col = linearToSRGB(col);

  col = mix(quantizeDitherToSRGB(col, 1./255., gl_FragCoord.xy), linearToSRGB(col), LvsR);
#endif
  
#endif

  fragColor = vec4(col, 1.);
}
 