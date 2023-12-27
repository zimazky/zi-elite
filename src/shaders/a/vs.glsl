#version 300 es

precision highp float;

/**
 * Шейдер для формирования буфера с данными глубины на основании
 * данных предыдущего кадра.
 * vTextureBData.w - значение глубины из вершинного шейдера.
 * Можно определять цвет из текстуры предыдущего кадра.
 */

/** Матрица проекции */
uniform mat4 uProjectMatrix;
/** Разрешение текстуры предыдущего кадра */
uniform vec2 uTextureBResolution;
/** Разрешение полигональной сетки моделирующей глубину кадра */
uniform vec2 uNetResolution;
/** Угол обзора камеры (по горизонтали) */
uniform float uCameraViewAngle;
/** Матрица трансформации предыдущего кадра */
uniform mat3 uTransformMatrixPrev;
/** Матрица трансформации текущего кадра */
uniform mat3 uTransformMatrix;
/** Смещение позиции камеры между кадрами */
uniform vec3 uPositionDelta;
/** Максимальная дистанция по которой обрезается область отрисовки (входит в матрицу проекции) */
uniform float uMaxDistance;
/** Текстура NormalDepth предыдущего кадра */
uniform sampler2D uTextureBDepth;
/** Текстура Albedo предыдущего кадра */
//uniform sampler2D uTextureRenderColor;

/** Положение узла полигональной сетки моделирующей глубину кадра */
in vec3 aVertexPosition;

/** Данные по узлу сетки, vTextureBData.w - глубина узла */
out float vTextureBDepth;
//out vec4 vTextureRenderColor;

void main() {
  vec2 duv = vec2(1.5)/uNetResolution;
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);

  //vTextureRenderColor = texture(uTextureRenderColor, uv).w;
  float buf = texture(uTextureBDepth, uv).x;

  // находим мнинмальную глубину по 9-ти точкам (коррекция на разрывах глубины)
  float wmin = texture(uTextureBDepth, uv+vec2(duv.x, 0)).x;
  wmin = min(wmin, texture(uTextureBDepth, uv-vec2(duv.x, 0)).x);
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(0, duv.y)).x);
  wmin = min(wmin, texture(uTextureBDepth, uv-vec2(0, duv.y)).x);

  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(duv.x, duv.y)).x);
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(-duv.x, -duv.y)).x);
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(duv.x, -duv.y)).x);
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(-duv.x, duv.y)).x);

  buf = min(buf, wmin);
  vTextureBDepth = buf;

  float t = tan(0.5*uCameraViewAngle);
  vec3 rd = normalize(vec3(aVertexPosition.xy*uTextureBResolution*t/uTextureBResolution.x, -1.));
  vec3 pos = rd*buf;

  pos = pos*transpose(uTransformMatrixPrev);
  pos = (pos - uPositionDelta)*uTransformMatrix;

  vTextureBDepth = length(pos);

  // при движении назад по краям устанавливаем глубину 0
  vec3 deltaPos = uPositionDelta*uTransformMatrix;
  if(deltaPos.z > 0. && (uv.y <= duv.y || uv.y >= 1.-duv.y || uv.x <= duv.x || uv.x >= 1.-duv.x)) vTextureBDepth = 0.;
  //if(pos.z <= -uMaxDistance) pos *= -uMaxDistance/pos.z;
  gl_Position = uProjectMatrix*vec4(pos, 1);
  //if(gl_Position.z >= uMaxDistance) gl_Position.z *= uMaxDistance/gl_Position.z;

}
