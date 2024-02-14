#version 300 es

precision highp float;

/**
 * Шейдер для формирования буфера с данными глубины на основании
 * данных предыдущего кадра.
 * vTextureBData.w - значение глубины из вершинного шейдера.
 * Можно определять цвет из текстуры предыдущего кадра.
 */

/** Номер кадра */
uniform uint uFrame;
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
out vec4 vTextureBDepth;
/** Вектор движения пикселей между кадрами */
out vec2 vMotionVector;
//out vec4 vTextureRenderColor;

void main() {

  // начальное заполнение
  // надо оптимизировать, вынести в инициализацию буфера B
  if(uFrame <= 2u) {
    vTextureBDepth = vec4(0);
    gl_Position = vec4(aVertexPosition, 1);
    return;
  }

  vec2 duv = vec2(1.5)/uNetResolution;
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);

  //vTextureRenderColor = texture(uTextureRenderColor, uv).w;
  vec4 bufOrig = texture(uTextureBDepth, uv);

  // находим мнинмальную глубину по 9-ти точкам (коррекция на разрывах глубины)
  vec4 wmin = min(bufOrig, texture(uTextureBDepth, uv+vec2(duv.x, 0)));
  wmin = min(wmin, texture(uTextureBDepth, uv-vec2(duv.x, 0)));
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(0, duv.y)));
  wmin = min(wmin, texture(uTextureBDepth, uv-vec2(0, duv.y)));

  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(duv.x, duv.y)));
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(-duv.x, -duv.y)));
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(duv.x, -duv.y)));
  wmin = min(wmin, texture(uTextureBDepth, uv+vec2(-duv.x, duv.y)));

  float depthOrig = min(wmin.x, uMaxDistance);

  // TODO: Переделать везде длину луча на глубину z и использовать матрицу проекции для опеделения направляющего вектора
  float t = tan(0.5*uCameraViewAngle);
  vec3 rd = normalize(vec3(aVertexPosition.xy*uTextureBResolution*t/uTextureBResolution.x, -1.));
  vec3 posOrig = rd*depthOrig;

  vec3 pos = uTransformMatrixPrev*posOrig;
  pos = (pos - uPositionDelta)*uTransformMatrix;

  // motion-vector
  vMotionVector = pos.xy/pos.z - posOrig.xy/posOrig.z;

  vTextureBDepth = vec4(length(pos), bufOrig.x - wmin.x, wmin.zw);

  // при движении назад по краям устанавливаем глубину 0
  vec3 deltaPos = uPositionDelta*uTransformMatrix;
  if(deltaPos.z > 0.001 && (uv.y <= duv.y || uv.y >= 1.-duv.y || uv.x <= duv.x || uv.x >= 1.-duv.x)) vTextureBDepth.x = 0.;

  // TODO: Правильно вычислять позицию, вектор не должен быть нулевым
  gl_Position = uProjectMatrix*vec4(pos, 1);
}
