#version 300 es

// положение камеры
uniform vec4 uCameraPosition;
// вектор направления камеры
uniform vec3 uCameraDirection;
// радиус планеты
uniform float uPlanetRadius;
// максимальное расстояние для формирования карты высот
uniform float uMaxDistance;

// Точка в полярных координатах для которой рассчитывается высота
// x - угол, считаем при x=0 направление на север 
// y - характеристическое расстояние, зависящее от высоты камеры
//     (пропорционально углу луча до пересечения с поверхностью)
//     расстояние определяем по формуле
//     r = h*tan(c(h)*y) - предел для плоской поверхности
//     c(h) - коэффициент пропорциональности, может тоже зависеть от высоты

// Для сферической поверхности:
//   OT = (R+h)*cos(a)
//   CT = sqrt((R+h)^2 - OT^2) = (R+h)*sin(a)
//   AT = sqrt(R*R - CT*CT)
//   OA = OT - AT
//   AB = OA*sin(a)
//   sin(b) = AB/R
//   b = asin(AB/R) = asin(OA*sin(a)/R) = asin((OT-AT)*sin(a)/R)
//     = asin( ((R+h)*cos(a) - sqrt(R*R-CT*CT))*sin(a)/R )
//     = asin( ( (R+h)*cos(a) - sqrt(R*R - ((R+h)*sin(a))^2) )*sin(a)/R )
// Максимальный угол при котором луч касается сферы
//   sin(aMax) = R/(R+h)
// Расстояние до пересечения с поверхностью сферы в зависимости от угла
//   OA = OT - AT = (R+h)*cos(a) - sqrt(R*R - (R+h)^2 + ((R+h)*cos(a))^2)
// Приращение расстояния от приращения угла (производная)
//   dOA/da = [(R+h)^2*cos(a)*sin(a) / sqrt(R*R - (R+h)^2 + ((R+h)*cos(a))^2)] - (R+h)*sin(a)
// Выбираем такие значения расстояний OA, чтобы приращения dOA/da * deltaA приблизительно были равны OA * deltaA
// Т.е. нужно чтобы приращения сетки в двух направлениях (по углу и по расстоянию) были примерно равны.
in vec2 vPolarCoordinates;

// Нормаль и высота
out vec4 fragHeightNormal;

void main(void) {
  float h = uCameraPosition.y;
  float R = uPlanetRadius;
  float Rh = R + h;
  float sinAmax = R/Rh;
  float cosAmax = sqrt(1.-sinAmax*sinAmax);
  float bMax = asin(Rh*cosAmax*sinAmax/R); // максимальный центральный угол видимой части планеты

  float d = vPolarCoordinates.y*vPolarCoordinates.y*bMax*R; // дистанция в полярных координатах
  float fi = vPolarCoordinates.x;

  // перевод в декартовы координаты
  vec2 coordinates = d * vec2(cos(fi), sin(fi));
  
  // Здесь рассчитываем карту высот 
}

