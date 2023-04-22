#version 300 es

precision mediump float;

/** Разрешение экрана */
uniform vec2 uResolution;

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
/** Цвет и интенсивность света неба */
uniform vec3 uSkyColor;

/** Положение камеры */
uniform vec3 uCameraPosition;

/** Цвет и интенсивность света фар: vec3(0.) - выключен */
uniform vec3 uHeadLight;

/** Положение сигнальных ракет */
uniform vec3 uFlarePositions[2];
/** Цвет и интенсивность света сигнальных ракет */
uniform vec3 uFlareLights[2];

/** Текстура программы A */
uniform sampler2D uTextureProgramA;
/** Нормали и глубина */
uniform sampler2D uNormalDepthProgramB;
/** Значения альбедо */
uniform sampler2D uAlbedoProgramB;

uniform vec2 uTextureBResolution;
uniform sampler2D uTextureBlueNoise;

uniform sampler2D uTextureSSAONoise;

/** Луч в системе координат планеты */
in vec3 vRay;
in vec3 vRaySky;
in vec3 vRayScreen;
in mat3 vInverseTransformMat;

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
#include "common/constants.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета затенения окружающего освещения
// ----------------------------------------------------------------------------
#ifndef SSAO_MODULE
#include "render1/ssao.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций постобработки
// ----------------------------------------------------------------------------
#ifndef POSTPROC_MODULE
#include "common/postprocess.glsl"
#endif


void main() {
  float aspect = uResolution.x/uResolution.y;
  float aspectB = uTextureBResolution.x/uTextureBResolution.y;
  vec2 k = aspect > aspectB
    ? vec2(1, aspectB/aspect)// /uResolution.x // (1., 1./aspect)
    : vec2(aspect/aspectB, 1);// /uResolution.y; // (aspect, 1.)
  vec2 uv = vec2(0.5)+k*(gl_FragCoord.xy/uResolution-0.5);

  #ifdef DEPTH_ERROR_VIEW
  uv = gl_FragCoord.xy/uResolution;
  float depthA = texture(uTextureProgramA, uv).w;
  #endif

  vec4 albedoB = texture(uAlbedoProgramB, uv);
  vec4 normalDepthB = texture(uNormalDepthProgramB, uv);

  #ifdef DEPTH_ERROR_VIEW
  float derr = normalDepthB.w-depthA;
  vec3 col = derr<0. ? vec3(-derr,0,0) : vec3(derr/100.);
  col = pow(col, vec3(1./2.2));

  #else
  vec3 col = albedoB.rgb;
  float t = normalDepthB.w;
  vec3 rd = normalize(vRay);

  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

  vec3 rand = texture(uTextureSSAONoise, gl_FragCoord.xy/4.).xyz;

  vec3 posScreen;// normalize(vRayScreen)*t;
  //posScreen.z = -posScreen.z;
  vec3 normal;
  float ssao;
  if(uScreenMode.x == MAP_VIEW) {
    vec2 uv1 = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.y;
    vec4 normalDepthB1 = texture(uNormalDepthProgramB, gl_FragCoord.xy/uResolution);
    normal = normalDepthB1.xzy*vec3(1,-1,-1);
    posScreen = vec3(uMapScale*uv1.x, -uMapScale*uv1.y, normalDepthB1.w);
    //col = vec3(posScreen.z/5000.);
    //col = 0.5*vec3(1) + 0.5*col;
    //posScreen = normalize(vRayScreen)*(MAX_TRN_ELEVATION+t);
    //posScreen.z = -posScreen.z;
    //ssao = calcSSAO(posScreen, normal, rand, uNormalDepthProgramB, 300.);
    ssao = calcSSAOOrtho(posScreen, normal, vec3(1,0,0), uNormalDepthProgramB, vec2(1./uMapScale), 300.);
  }
  else {
    normal = vInverseTransformMat*normalDepthB.xyz;
    normal.z = -normal.z;
    posScreen = normalize(vRayScreen)*t;
    posScreen.z = -posScreen.z;
    ssao = calcSSAO(posScreen, normal, rand, uNormalDepthProgramB, 300.);
  }
  //col = (uSSAOSamples[int(mod(0.1*gl_FragCoord.x,64.))]);
  //col = vec3(ssao*ssao);
  //col = posScreen/1000.;
  //col = vec3(1);
  //col *= ssao;

  if(uScreenMode.x == MAP_VIEW) {
    //col *= clamp(0.5+0.5*normalDepthB.y, 0., 1.);
    col *= ssao;
  }
  else {
    col *= clamp(0.5+0.5*normalDepthB.y, 0., 1.);
    col *= ssao*ssao;
  }

  //col = posScreen/1000.;

  //col =  col*mat2sRGB; // Преобразование в sRGB
  col = pow(col, vec3(1./2.2));

  #endif

  fragColor = vec4(col, 1.);
}
 