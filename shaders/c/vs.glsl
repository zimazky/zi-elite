#version 300 es

/** Матрица трансформации объекта вместе со смещением */
uniform mat4 uTransformMatrix;
/** Матрица проекции */
uniform mat4 uProjectMatrix;

in vec3 aVertexPosition;
in vec3 aNormal;
in vec3 aColor;
in vec4 aSpecColor;

/** Данные вершины: rgb - цвет, w - глубина */
out vec4 vVertexData;

void main() {
  vec3 pos = aVertexPosition*uTransformMatrix;
  gl_Position = uProjectMatrix*vec4(pos, 1);
  vVertexData = vec4(0.5, 0.5, 0.5, pos.z);
}
