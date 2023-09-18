#version 300 es

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

/** Текстура предыдущего кадра */
uniform sampler2D uTextureProgramB;

/** Положение узла полигональной сетки моделирующей глубину кадра */
in vec3 aVertexPosition;

/** Данные по узлу сетки, vTextureBData.w - глубина узла */
out vec4 vTextureBData;

void main() {
  vec2 duv = vec2(1.5)/uNetResolution;
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);
  vec4 buf = texture(uTextureProgramB, uv);

  // находим мнинмальную глубину по 9-ти точкам (коррекция на разрывах глубины)
  float wmin = texture(uTextureProgramB, uv+vec2(duv.x, 0)).w;
  wmin = min(wmin, texture(uTextureProgramB, uv-vec2(duv.x, 0)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(0, duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv-vec2(0, duv.y)).w);

  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(duv.x, duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(-duv.x, -duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(duv.x, -duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(-duv.x, duv.y)).w);

  buf.w = min(buf.w, wmin);
  vTextureBData = buf;

  float t = tan(0.5*uCameraViewAngle);
  vec3 rd = normalize(vec3(aVertexPosition.xy*uTextureBResolution*t/uTextureBResolution.x, -1.));
  vec3 pos = rd*exp2(buf.w);

  pos = pos*transpose(uTransformMatrixPrev);
  pos = (pos - uPositionDelta)*uTransformMatrix;

  vTextureBData.w = length(pos);

  // при движении назад по краям устанавливаем глубину 0
  vec3 deltaPos = uPositionDelta*uTransformMatrix;
  if(deltaPos.z > 0. && (uv.y <= duv.y || uv.y >= 1.-duv.y || uv.x <= duv.x || uv.x >= 1.-duv.x)) vTextureBData.w = 0.;

  gl_Position = uProjectMatrix*vec4(pos, 1);
}
