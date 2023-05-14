#version 300 es

/** 
 * Шейдер для рендеринга полигональных моделей.
 * Используются модель рассеивания Блинна-Фонга.
 */

/** Матрица трансформации объекта вместе со смещением */
uniform mat4 uTransformMatrix;
/** Матрица проекции */
uniform mat4 uProjectMatrix;

in vec3 aVertexPosition;
in vec3 aNormal;
//in vec3 aColor;
//in vec4 aSpecColor;

/** Данные вершины: xyz - нормаль, w - глубина */
out vec4 vNormalDepth;

void main() {
  //vec3 pos = aVertexPosition*uTransformMatrix;
  vec3 pos = aVertexPosition;
  pos.z -= 100.;
  gl_Position = uProjectMatrix*vec4(pos, 1);
  vNormalDepth = vec4(aNormal, -pos.z);
}
