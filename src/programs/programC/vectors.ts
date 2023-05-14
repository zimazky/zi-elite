/*!

Модуль определения операций с векторами и матрицами 
@author Andrey Zimatskiy
@version 1.23.5.10


Mat4.lookAt на тестах дает большое расхождение по сравнению с библиотекой gl-matrix
Нужно проверить

*/

const EPSILON = 0.00001;

interface IVectors<T> {
  /** Проверка на равенство в пределах точности EPSILON */
  equals(v: T): boolean;
  /** Мутабельное сложение с вектором */
  addMutable(v: T): T;
  /** Мутабельное вычитание вектора */
  subMutable(v: T): T;
  /** Мутабельное произведение со скаляром */
  mulMutable(f: number): T;
  /** Мутабельное деление на скаляр */
  divMutable(f: number): T;
  /** Мутабельное поэлементное произведение векторов */
  mulElMutable(v: T): T;
  /** Мутабельное поэлементное деление */
  divElMutable(v: T): T;
  /** Мутабельная операция нормализации вектора */
  normalizeMutable(): T;
  /** Иммутабельное сложение с вектором */
  add(v: T): T;
  /** Иммутабельное вычитание вектора */
  sub(v: T): T;
  /** Иммутабельное произведение со скаляром */
  mul(f: number): T;
  /** Иммутабельное деление на скаляр */
  div(f: number): T;
  /** Иммутабельное поэлементное произведение векторов */
  mulEl(v: T): T;
  /** Иммутабельное поэлементное деление */
  divEl(v: T): T;
  /** Иммутабельная операция нормализации вектора */
  normalize(): T;
  /** Длина вектора */
  length(): number;
  /** Скалярное произведение векторов */
  dot(v: T): number;
  /** Копия вектора */
  copy(): T;
  /** Вектор с целыми частями элементов */
  floor(): T;
  /** Вектор с дробными частями элементов */
  fract(): T;
  /** Вектор с экспонентой элементов */
  exp(): T;
  /** Отрицательный вектор */
  negate(): T;
  /** Получить компоненты в виде массива */
  getArray(): number[];
  /** Получить компоненты в виде массива Float32Array */
  getFloat32Array(): Float32Array;
}

interface IMatrixes<TMat, TVec> {
  /** Проверка на равенство в пределах точности EPSILON */
  equals(v: TMat): boolean;
  /** Копия матрицы */
  copy(): TMat;
  /** Транспонированная матрица */
  transpose(): TMat;
  /** Мутабельное сложение матриц */
  addMatMutable(m: TMat): TMat;
  /** Иммутабельное сложение матриц */
  addMat(m: TMat): TMat;
  /** Мутабельное вычитание матрицы */
  subMatMutable(m: TMat): TMat;
  /** Иммутабельное вычитание матрицы */
  subMat(m: TMat): TMat;
  /** Мутабельное умножение на скаляр */
  mulMutable(n: number): TMat;
  /** Иммутабельное умножение на скаляр */
  mul(n: number): TMat;
  /** Мутабельное деление на скаляр */
  divMutable(n: number): TMat;
  /** Иммутабельное деление на скаляр */
  div(n: number): TMat;

  /** Иммутабельное произведение матриц */
  mulMat(m: TMat): TMat;
  /** Иммутабельное произведение матриц слева */
  mulMatLeft(m: TMat): TMat;
  /** Иммутабельное произведение матрицы на вектор справа */
  mulVec(v: TVec): TVec;
  /** 
   * Иммутабельное произведение транспонированного вектора на матрицу
   * (произведение матрицы на вектор слева) 
   * */
  mulVecLeft(v: TVec): TVec;
  /** Получить компоненты в виде массива */
  getArray(): number[];
  /** Получить компоненты в виде массива Float32Array */
  getFloat32Array(): Float32Array;
}


/******************************************************************************
 * Класс четырехмерного вектора 
 * */
export class Vec4 implements IVectors<Vec4> {
  x: number; y: number; z: number; w: number;

  constructor(x: number, y: number, z: number, w: number) {
    this.x = x; this.y = y; this.z = z; this.w = w;
  }

  // --------------------------------------------------------------------------
  // Статические методы

  /** Получить нулевой вектор */
  static ZERO = () => new Vec4(0., 0., 0., 0.);
  /** Получить единичный вектор */
  static ONE = () => new Vec4(1., 1., 1., 1.);
  /** Получить i-вектор */
  static I = () => new Vec4(1., 0., 0., 0.);
  /** Получить j-вектор */
  static J = () => new Vec4(0., 1., 0., 0.);
  /** Получить k-вектор */
  static K = () => new Vec4(0., 0., 1., 0.);
  /** Получить l-вектор */
  static L = () => new Vec4(0., 0., 0., 1.);
  /** Получить вектор со случайными элкментами в диапазоне 0...1 */
  static RAND = () => new Vec4(Math.random(), Math.random(), Math.random(), Math.random());
  /** Получить вектор из массива чисел */
  static fromArray([x, y, z, w]: [number, number, number, number] | Float32Array): Vec4 { return new Vec4(x, y, z, w); }

  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Представление в виде строки */
  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)}, ${this.w.toFixed(2)})`;
  }

  // --------------------------------------------------------------------------
  // Методы интерфейса

  equals(v: Vec4): boolean {
    return Math.abs(this.x-v.x)<=EPSILON*Math.max(1., this.x, v.x)
    && Math.abs(this.y-v.y)<=EPSILON*Math.max(1., this.y, v.y)
    && Math.abs(this.z-v.z)<=EPSILON*Math.max(1., this.z, v.z)
    && Math.abs(this.w-v.w)<=EPSILON*Math.max(1., this.w, v.w);
  }

  addMutable(v: Vec4): Vec4 {
    this.x += v.x; this.y += v.y; this.z += v.z; this.w += v.w;
    return this;
  }

  subMutable(v: Vec4): Vec4 {
    this.x -= v.x; this.y -= v.y; this.z -= v.z; this.w -= v.w;
    return this;
  }

  mulMutable(f: number): Vec4 {
    this.x *= f; this.y *= f; this.z *= f; this.w *= f;
    return this;
  }

  divMutable(f: number): Vec4 {
    this.x /= f; this.y /= f; this.z /= f; this.w /= f;
    return this;
  }

  mulElMutable(v: Vec4): Vec4 {
    this.x *= v.x; this.y *= v.y; this.z *= v.z; this.w *= v.w;
    return this;
  }

  divElMutable(v: Vec4): Vec4 {
    this.x /= v.x; this.y /= v.y; this.z /= v.z; this.w /= v.w;
    return this;
  }

  normalizeMutable(): Vec4 { return this.divMutable(Math.sqrt(this.dot(this))); }

  add(v: Vec4): Vec4 { return this.copy().addMutable(v); }

  sub(v: Vec4): Vec4 { return this.copy().subMutable(v); }

  mul(f: number): Vec4 { return this.copy().mulMutable(f); }

  div(f: number): Vec4 { return this.copy().divMutable(f); }

  mulEl(v: Vec4): Vec4 { return this.copy().mulElMutable(v); }

  divEl(v: Vec4): Vec4 { return this.copy().divElMutable(v); }

  normalize(): Vec4 { return this.copy().normalizeMutable(); }
  
  length(): number { return Math.sqrt(this.dot(this)); }

  dot(v: Vec4): number { return this.x*v.x + this.y*v.y + this.z*v.z + this.w*v.w; }

  copy(): Vec4 { return new Vec4(this.x, this.y, this.z, this.w); }

  floor(): Vec4 {
    return new Vec4(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), Math.floor(this.w));
  }

  fract(): Vec4 { return this.copy().subMutable(this.floor()); }

  exp(): Vec4 { return new Vec4(Math.exp(this.x), Math.exp(this.y), Math.exp(this.z), Math.exp(this.w)); }

  negate(): Vec4 { return new Vec4(-this.x, -this.y, -this.z, -this.w); }

  getArray(): number[] { return [this.x, this.y, this.z, this.w]; }

  getFloat32Array(): Float32Array { return new Float32Array(this.getArray()); }

}

/****************************************************************************** 
 * Класс четырехмерной матрицы 
 * */
export class Mat4 implements IMatrixes<Mat4, Vec4> {
  i: Vec4; j: Vec4; k: Vec4; l: Vec4;

  constructor(i: Vec4, j: Vec4, k: Vec4, l: Vec4) {
    this.i = i.copy(); this.j = j.copy(); this.k = k.copy(); this.l = l.copy();
  }

  // --------------------------------------------------------------------------
  // Статические методы

  /** Получить Identity матрицу */
  static ID = () => new Mat4(Vec4.I(), Vec4.J(), Vec4.K(), Vec4.L());
  /** Получить нулевую матрицу */
  static ZERO = () => new Mat4(Vec4.ZERO(), Vec4.ZERO(), Vec4.ZERO(), Vec4.ZERO());
  /** Получить матрицу со случайными элементами */
  static RAND = () => new Mat4(Vec4.RAND(), Vec4.RAND(), Vec4.RAND(), Vec4.RAND());

  /** Получить матрицу из массива чисел */
  static fromArray([
    a00, a01, a02, a03,
    a10, a11, a12, a13,
    a20, a21, a22, a23,
    a30, a31, a32, a33
  ]: [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
  ] | Float32Array): Mat4 { 
    return new Mat4(
      new Vec4(a00, a01, a02, a03),
      new Vec4(a10, a11, a12, a13),
      new Vec4(a20, a21, a22, a23),
      new Vec4(a30, a31, a32, a33)
    );
  }

  /** Tested
   * Получить матрицу ортогональной проекции OpenGL/WebGL
   * соответствующую области отсечения по z в интервале -1...1
   * @param left - расстояние до левой плоскости отсечения
   * @param right - расстояние до правой плоскости отсечения
   * @param bottom - расстояние до нижней плоскости отсечения
   * @param top - расстояние до верхней плоскости отсечения
   * @param near - расстояние до ближней плоскости отсечения
   * @param far - расстояние до дальней плоскости отсечения
   * @returns матрица ортогональной проекции
   */
  static orthoGl(
    left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const lr = 1. / (left - right);
    const bt = 1. / (bottom - top);
    const nf = 1. / (near - far);
    return new Mat4(
      new Vec4(-2.*lr, 0., 0., 0.),
      new Vec4(0., -2.*bt, 0., 0.),
      new Vec4(0., 0., 2.*nf,  0.),
      new Vec4((left+right)*lr, (top+bottom)*bt, (far+near)*nf, 1.)
    );
  }
  /** Tested
   * Получить матрицу ортогональной проекции DirectX/WebGPU/Vulkan/Metal
   * соответствующую области отсечения по z в интервале 0...1
   * @param left - расстояние до левой плоскости отсечения
   * @param right - расстояние до правой плоскости отсечения
   * @param bottom - расстояние до нижней плоскости отсечения
   * @param top - расстояние до верхней плоскости отсечения
   * @param near - расстояние до ближней плоскости отсечения
   * @param far - расстояние до дальней плоскости отсечения
   * @returns матрица ортогональной проекции
   */
  static orthoDx(
    left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const lr = 1. / (left - right);
    const bt = 1. / (bottom - top);
    const nf = 1. / (near - far);
    return new Mat4(
      new Vec4(-2.*lr, 0., 0., 0.),
      new Vec4(0., -2.*bt, 0., 0.),
      new Vec4(0., 0., nf,  0.),
      new Vec4((left+right)*lr, (top+bottom)*bt, near*nf, 1.)
    );
  }
  /** Tested
   * Получить матрицу перспективной проекции OpenGL/WebGL
   * соответствующую области отсечения по z в интервале -1...1
   * @param fovy - величина угла поля зрения по вертикали в радианах
   * @param aspect - соотношение сторон (ширина/высота)
   * @param near - расстояние до ближней плоскости отсечения, должно быть больше 0
   * @param far - расстояние до дальней плоскости отсечения, должно быть больше 0
   * @returns матрица перспективной проекции
   */
  static perspectiveGl(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1./Math.tan(0.5*fovy);
    return new Mat4(
      new Vec4(f/aspect, 0., 0., 0.),
      new Vec4(0., f, 0., 0.),
      new Vec4(0., 0., -(far+near)/(far-near), -1.),
      new Vec4(0., 0., -2.*far*near/(far-near), 0.)
    );
  }
  /** Tested
   * Получить матрицу перспективной проекции DirectX/WebGPU/Vulkan/Metal
   * соответствующую области отсечения по z в интервале 0...1
   * @param fovy - величина угла поля зрения по горизонтали в радианах
   * @param aspect - соотношение сторон (ширина/высота)
   * @param near - расстояние до ближней плоскости отсечения, должно быть больше 0
   * @param far - расстояние до дальней плоскости отсечения, должно быть больше 0
   * @returns матрица перспективной проекции
   */
  static perspectiveDx(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1./Math.tan(0.5*fovy);
    let e10 = -1;
    let e14 = -near;
    if(far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      e10 = far * nf;
      e14 = far * near * nf;
    }
    return new Mat4(
      new Vec4(f/aspect, 0., 0., 0.),
      new Vec4(0., f, 0., 0.),
      new Vec4(0., 0., e10, -1.),
      new Vec4(0., 0., e14, 0.)
    );
  }
  /** Tested
   * Получить матрицу вида
   * @param from - точка наблюдения
   * @param to - точка направления взгляда
   * @param up - направление вверх
   * @returns 
   */
  static lookAt(from: Vec3, to: Vec3, up: Vec3): Mat4 { 
    const forward = from.sub(to).normalize();
    const right = up.cross(forward).normalize();
    const newup = forward.cross(right);
    return new Mat4(
      new Vec4(right.x, newup.x, forward.x, 0),
      new Vec4(right.y, newup.y, forward.y, 0),
      new Vec4(right.z, newup.z, forward.z, 0),
      new Vec4(-right.dot(from), -newup.dot(from), -forward.dot(from), 1.)
    );
  } 
  /** Tested
   * Получить матрицу вращения
   * @param axis - ось вращения
   * @param theta - угол поворота
   * @returns 
   */
  static fromAxisAngle(axis: Vec3, theta: number): Mat4 {
    const a = axis.normalize();
    const c = Math.cos(theta);
    const mc = 1 - c;
    const s = Math.sin(theta);
    return new Mat4(
      new Vec4(a.x*a.x*mc+c, a.x*a.y*mc+a.z*s, a.x*a.z*mc-a.y*s, 0),
      new Vec4(a.y*a.x*mc-a.z*s, a.y*a.y*mc+c, a.y*a.z*mc+a.x*s, 0),
      new Vec4(a.z*a.x*mc+a.y*s, a.z*a.y*mc-a.x*s, a.z*a.z*mc+c, 0),
      new Vec4(0, 0, 0, 1)
    );
  }
  /** 
   * Получить матрицу вращения из кватерниона
   * @param q - кватернион, определяющий вращение
   * */
  static fromQuat(q: Quaternion): Mat4 {
    const x2 = q.x + q.x;
    const y2 = q.y + q.y;
    const z2 = q.z + q.z;
    const xx = q.x * x2;
    const yx = q.y * x2;
    const yy = q.y * y2;
    const zx = q.z * x2;
    const zy = q.z * y2;
    const zz = q.z * z2;
    const wx = q.w * x2;
    const wy = q.w * y2;
    const wz = q.w * z2;
    return new Mat4(
      new Vec4(1 - yy - zz, yx + wz, zx - wy, 0),
      new Vec4(yx - wz, 1 - xx - zz, zy + wx, 0),
      new Vec4(zx + wy, zy - wx, 1 - xx - yy, 0),
      new Vec4(0, 0, 0, 1)
    );
  }
  /** 
   * Получить матрицу вида камеры по кватерниону и вектору положения
   * @param q - кватернион, определяющий вращение
   * @param p - положение камеры
   * */
  static cameraViewFromQuatPosition(q: Quaternion, p: Vec3): Mat4 {
    const x2 = q.x + q.x;
    const y2 = q.y + q.y;
    const z2 = q.z + q.z;
    const xx = q.x * x2;
    const yx = q.y * x2;
    const yy = q.y * y2;
    const zx = q.z * x2;
    const zy = q.z * y2;
    const zz = q.z * z2;
    const wx = q.w * x2;
    const wy = q.w * y2;
    const wz = q.w * z2;
    const i = new Vec4(1 - yy - zz, yx + wz, zx - wy, 0);
    const j = new Vec4(yx - wz, 1 - xx - zz, zy + wx, 0);
    const k = new Vec4(zx + wy, zy - wx, 1 - xx - yy, 0);
    const l = new Vec4(
      - i.x*p.x - j.x*p.y - k.x*p.z,
      - i.y*p.x - j.y*p.y - k.y*p.z,
      - i.z*p.x - j.z*p.y - k.z*p.z,
      1.
    );
    return new Mat4(i, j, k, l);
  }
  /** 
   * Получить матрицу модели по кватерниону и вектору положения
   * @param q - кватернион, определяющий вращение
   * @param p - положение модели
   * */
  static modelFromQuatPosition(q: Quaternion, p: Vec3): Mat4 {
    const x2 = q.x + q.x;
    const y2 = q.y + q.y;
    const z2 = q.z + q.z;
    const xx = q.x * x2;
    const yx = q.y * x2;
    const yy = q.y * y2;
    const zx = q.z * x2;
    const zy = q.z * y2;
    const zz = q.z * z2;
    const wx = q.w * x2;
    const wy = q.w * y2;
    const wz = q.w * z2;
    const i = new Vec4(1 - yy - zz, yx + wz, zx - wy, 0);
    const j = new Vec4(yx - wz, 1 - xx - zz, zy + wx, 0);
    const k = new Vec4(zx + wy, zy - wx, 1 - xx - yy, 0);
    const l = new Vec4(p.x, p.y, p.z, 1.);
    return new Mat4(i, j, k, l);
  }

  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Вектор-столбец x матрицы */
  cx(): Vec4 { return new Vec4(this.i.x, this.j.x, this.k.x, this.l.x); }
  /** Вектор-столбец y матрицы */
  cy(): Vec4 { return new Vec4(this.i.y, this.j.y, this.k.y, this.l.y); }
  /** Вектор-столбец z матрицы */
  cz(): Vec4 { return new Vec4(this.i.z, this.j.z, this.k.z, this.l.z); }
  /** Вектор-столбец w матрицы */
  cw(): Vec4 { return new Vec4(this.i.w, this.j.w, this.k.w, this.l.w); }
  
  /** Получить коэффициенты масштабирования из матрицы преобразования */
  getScalingVec3(): Vec3 {
    return new Vec3(
      Math.hypot(this.i.x, this.i.y, this.i.z),
      Math.hypot(this.j.x, this.j.y, this.j.z), 
      Math.hypot(this.k.x, this.k.y, this.k.z)
    );
  }

  /** Получить коэффициенты масштабирования из матрицы преобразования */
  getRotationMat3(): Mat3 {
    return new Mat3(
      new Vec3(this.i.x, this.i.y, this.i.z).normalizeMutable(),
      new Vec3(this.j.x, this.j.y, this.j.z).normalizeMutable(), 
      new Vec3(this.k.x, this.k.y, this.k.z).normalizeMutable()
    );
  }

  /** Tested
   * Получить кватернион из матрицы преобразования
   */
  getQuaternion(): Quaternion {
    const scaling = this.getScalingVec3();
    const isx = 1 / scaling.x;
    const isy = 1 / scaling.y;
    const isz = 1 / scaling.z;
    const sm11 = this.i.x * isx;
    const sm12 = this.i.y * isy;
    const sm13 = this.i.z * isz;
    const sm21 = this.j.x * isx;
    const sm22 = this.j.y * isy;
    const sm23 = this.j.z * isz;
    const sm31 = this.k.x * isx;
    const sm32 = this.k.y * isy;
    const sm33 = this.k.z * isz;
    const trace = sm11 + sm22 + sm33;
    var S = 0;

    if (trace > 0) {
      S = Math.sqrt(trace + 1.0) * 2;
      return new Quaternion((sm23 - sm32)/S, (sm31 - sm13)/S, (sm12 - sm21)/S, 0.25*S);
    } 
    if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
      return new Quaternion(0.25*S, (sm12 + sm21)/S, (sm31 + sm13)/S, (sm23 - sm32)/S);
    } 
    if (sm22 > sm33) {
      S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
      return new Quaternion((sm12 + sm21)/S, 0.25*S, (sm23 + sm32)/S, (sm31 - sm13)/S);
    }
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    return new Quaternion((sm31 + sm13)/S, (sm23 + sm32)/S, 0.25*S, (sm12 - sm21)/S);
  }

  /**
   * Операция перемещения над матрицей на данный вектор смещения
   * @param v - вектор смещения
   */
  translate(v: Vec3): Mat4 {
    const a = this.copy();
    a.l.x += a.i.x * v.x + a.j.x * v.y + a.k.x * v.z;
    a.l.y += a.i.y * v.x + a.j.y * v.y + a.k.y * v.z;
    a.l.z += a.i.z * v.x + a.j.z * v.y + a.k.z * v.z;
    return a;
  }
  /**
   * Получить матрицу после операции вращения над текущей матрицей
   * @param axis - ось вращения
   * @param rad - угол поворота
   */
  rotate(axis: Vec3, rad: number): Mat4 {
    const v = axis.normalize();
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;

    const b00 = v.x * v.x * t + c;
    const b01 = v.y * v.x * t + v.z * s;
    const b02 = v.z * v.x * t - v.y * s;
    const b10 = v.x * v.y * t - v.z * s;
    const b11 = v.y * v.y * t + c;
    const b12 = v.z * v.y * t + v.x * s;
    const b20 = v.x * v.z * t + v.y * s;
    const b21 = v.y * v.z * t - v.x * s;
    const b22 = v.z * v.z * t + c;

    return new Mat4(
      new Vec4(
        this.i.x*b00 + this.j.x*b01 + this.k.x*b02,
        this.i.y*b00 + this.j.y*b01 + this.k.y*b02,
        this.i.z*b00 + this.j.z*b01 + this.k.z*b02,
        this.i.w*b00 + this.j.w*b01 + this.k.w*b02
      ),
      new Vec4(
        this.i.x*b10 + this.j.x*b11 + this.k.x*b12,
        this.i.y*b10 + this.j.y*b11 + this.k.y*b12,
        this.i.z*b10 + this.j.z*b11 + this.k.z*b12,
        this.i.w*b10 + this.j.w*b11 + this.k.w*b12
      ),
      new Vec4(
        this.i.x*b20 + this.j.x*b21 + this.k.x*b22,
        this.i.y*b20 + this.j.y*b21 + this.k.y*b22,
        this.i.z*b20 + this.j.z*b21 + this.k.z*b22,
        this.i.w*b20 + this.j.w*b21 + this.k.w*b22
      ),
      this.l.copy()
    );
  }

  // --------------------------------------------------------------------------
  // Методы интерфейса

  equals(v: Mat4): boolean {
    return this.i.equals(v.i) && this.j.equals(v.j) && this.k.equals(v.k) && this.l.equals(v.l);
  }

  copy(): Mat4 {
    return new Mat4(this.i.copy(), this.j.copy(), this.k.copy(), this.l.copy());  
  }

  // tested
  transpose(): Mat4 { return new Mat4(this.cx(), this.cy(), this.cz(), this.cw()); }

  addMatMutable(m: Mat4): Mat4 {
    this.i.addMutable(m.i);
    this.j.addMutable(m.j);
    this.k.addMutable(m.k);
    this.l.addMutable(m.l);
    return this;
  }

  subMatMutable(m: Mat4): Mat4 {
    this.i.subMutable(m.i);
    this.j.subMutable(m.j);
    this.k.subMutable(m.k);
    this.l.subMutable(m.l);
    return this;
  }

  mulMutable(n: number): Mat4 {
    this.i.mulMutable(n);
    this.j.mulMutable(n);
    this.k.mulMutable(n);
    this.l.mulMutable(n);
    return this;
  }

  divMutable(n: number): Mat4 {
    this.i.divMutable(n);
    this.j.divMutable(n);
    this.k.divMutable(n);
    this.l.divMutable(n);
    return this;
  }

  addMat(m: Mat4): Mat4 { return this.copy().addMatMutable(m); }

  subMat(m: Mat4): Mat4 { return this.copy().subMatMutable(m); }

  mul(n: number): Mat4 { return this.copy().mulMutable(n); }

  div(n: number): Mat4 { return this.copy().divMutable(n); }

  // tested
  mulMat(m: Mat4): Mat4 {
    return new Mat4(
      new Vec4(this.cx().dot(m.i), this.cy().dot(m.i), this.cz().dot(m.i), this.cw().dot(m.i)),
      new Vec4(this.cx().dot(m.j), this.cy().dot(m.j), this.cz().dot(m.j), this.cw().dot(m.j)),
      new Vec4(this.cx().dot(m.k), this.cy().dot(m.k), this.cz().dot(m.k), this.cw().dot(m.k)),
      new Vec4(this.cx().dot(m.l), this.cy().dot(m.l), this.cz().dot(m.l), this.cw().dot(m.l))
    );
  }

  mulMatLeft(m: Mat4): Mat4 {
    return new Mat4(
      new Vec4(this.i.dot(m.cx()), this.i.dot(m.cy()), this.i.dot(m.cz()), this.i.dot(m.cw())),
      new Vec4(this.j.dot(m.cx()), this.j.dot(m.cy()), this.j.dot(m.cz()), this.j.dot(m.cw())),
      new Vec4(this.k.dot(m.cx()), this.k.dot(m.cy()), this.k.dot(m.cz()), this.k.dot(m.cw())),
      new Vec4(this.l.dot(m.cx()), this.l.dot(m.cy()), this.l.dot(m.cz()), this.l.dot(m.cw()))
    );
  }

  mulVec(v: Vec4): Vec4 {
    return new Vec4(this.cx().dot(v), this.cy().dot(v), this.cz().dot(v), this.cw().dot(v));
  }

  mulVecLeft(v: Vec4): Vec4 { return new Vec4(this.i.dot(v), this.j.dot(v), this.k.dot(v), this.l.dot(v)); }

  getArray(): number[] {
    return [
      this.i.x, this.i.y, this.i.z, this.i.w,
      this.j.x, this.j.y, this.j.z, this.j.w,
      this.k.x, this.k.y, this.k.z, this.k.w,
      this.l.x, this.l.y, this.l.z, this.l.w,
    ]
  }

  getFloat32Array(): Float32Array { return new Float32Array(this.getArray()); }

}

/****************************************************************************** 
 * Класс трехмерного вектора 
 * */
export class Vec3 implements IVectors<Vec3> {
  x: number; y: number; z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x; this.y = y; this.z = z;
  }

  // --------------------------------------------------------------------------
  // Статические методы

  /** Получить нулевой вектор */
  static ZERO = () => new Vec3(0.,0.,0.);
  /** Получить единичный вектор */
  static ONE = () => new Vec3(1.,1.,1.);
  /** Получить i-вектор */
  static I = () => new Vec3(1.,0.,0.);
  /** Получить j-вектор */
  static J = () => new Vec3(0.,1.,0.);
  /** Получить k-вектор */
  static K = () => new Vec3(0.,0.,1.);
  /** Получить вектор со случайными элементами в диапазоне 0...1 */
  static RAND = () => new Vec3(Math.random(),Math.random(),Math.random());
  /** Получить вектор из массива чисел */
  static fromArray([x, y, z]: [number, number, number] | Float32Array): Vec3 { return new Vec3(x, y, z); }

  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Представление в строковом виде */
  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
  }
  /** Векторное произведение tested */
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y*v.z - this.z*v.y,
      this.z*v.x - this.x*v.z,
      this.x*v.y - this.y*v.x
    );
  }
  /**
   * Получить трансформированный вектор по кватерниону вращения
   * @param q - кватернион
   * @returns новый вектор после трансформации
   */
  transformQuat(q: Quaternion) {
    const 
      uvx = q.y * this.z - q.z * this.y,
      uvy = q.z * this.x - q.x * this.z,
      uvz = q.x * this.y - q.y * this.x;
    const 
      uuvx = q.y * uvz - q.z * uvy,
      uuvy = q.z * uvx - q.x * uvz,
      uuvz = q.x * uvy - q.y * uvx;
    const w2 = q.w * 2;
    return new Vec3(
      this.x + w2*uvx + 2*uuvx,
      this.y + w2*uvy + 2*uuvy,
      this.z + w2*uvz + 2*uuvz
    );
  }

  // --------------------------------------------------------------------------
  // Методы интерфейса

  equals(v: Vec3): boolean {
    return Math.abs(this.x-v.x)<=EPSILON*Math.max(1., this.x, v.x)
    && Math.abs(this.y-v.y)<=EPSILON*Math.max(1., this.y, v.y)
    && Math.abs(this.z-v.z)<=EPSILON*Math.max(1., this.z, v.z)
  }

  addMutable(v: Vec3): Vec3 {
    this.x += v.x; this.y += v.y; this.z += v.z;
    return this;
  }

  subMutable(v: Vec3): Vec3 {
    this.x -= v.x; this.y -= v.y; this.z -= v.z;
    return this;
  }

  mulMutable(f: number): Vec3 {
    this.x *= f; this.y *= f; this.z *= f;
    return this;
  }

  divMutable(f: number): Vec3 {
    this.x /= f; this.y /= f; this.z /= f;
    return this;
  }

  mulElMutable(v: Vec3): Vec3 {
    this.x *= v.x; this.y *= v.y; this.z *= v.z;
    return this;
  }

  divElMutable(v: Vec3): Vec3 {
    this.x /= v.x; this.y /= v.y; this.z /= v.z;
    return this;
  }

  normalizeMutable(): Vec3 { return this.divMutable(Math.sqrt(this.dot(this))); }

  safeNormalize(): Vec3 { 
    const d = Math.sqrt(this.dot(this));
    if(d<Number.MIN_VALUE) return Vec3.ZERO();
    return this.div(d); 
  }

  colorNormalize(): Vec3 {
    const max = Math.max(this.x, this.y, this.z);
    if(max<Number.MIN_VALUE) return Vec3.ZERO();
    return this.div(max);
  }

  add(v: Vec3): Vec3 { return this.copy().addMutable(v); }

  sub(v: Vec3): Vec3 { return this.copy().subMutable(v); }

  mul(f: number): Vec3 { return this.copy().mulMutable(f); }

  div(f: number): Vec3 { return this.copy().divMutable(f); }

  mulEl(v: Vec3): Vec3 { return this.copy().mulElMutable(v); }

  divEl(v: Vec3): Vec3 { return this.copy().divElMutable(v); }

  normalize(): Vec3 { return this.copy().normalizeMutable(); }

  length(): number { return Math.sqrt(this.dot(this)); }

  dot(v: Vec3): number { return this.x*v.x + this.y*v.y + this.z*v.z; }

  copy(): Vec3 { return new Vec3(this.x, this.y, this.z); }

  floor(): Vec3 { return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z)); }

  fract(): Vec3 { return this.copy().subMutable(this.floor()); }

  exp(): Vec3 { return new Vec3(Math.exp(this.x), Math.exp(this.y), Math.exp(this.z)); }

  negate(): Vec3 { return new Vec3(-this.x, -this.y, -this.z); }

  getArray(): number[] { return [this.x, this.y, this.z]; }

  getFloat32Array(): Float32Array { return new Float32Array(this.getArray()); }

}

/****************************************************************************** 
 * Класс трехмерной матрицы 
 * */
export class Mat3 implements IMatrixes<Mat3, Vec3> {
  i: Vec3; j: Vec3; k: Vec3;

  constructor(i: Vec3, j: Vec3, k: Vec3) {
    this.i = i.copy(); this.j = j.copy(); this.k = k.copy();
  }

  // --------------------------------------------------------------------------
  // Статические методы

  /** Получить Identity матрицу */
  static ID = () => new Mat3(Vec3.I(), Vec3.J(), Vec3.K());
  /** Получить нулевую матрицу */
  static ZERO = () => new Mat3(Vec3.ZERO(), Vec3.ZERO(), Vec3.ZERO());

  /** Получить матрицу из массива чисел */
  static fromArray([
    a00, a01, a02,
    a10, a11, a12,
    a20, a21, a22
  ]: [
    number, number, number,
    number, number, number,
    number, number, number
  ] | Float32Array): Mat3 { 
    return new Mat3(
      new Vec3(a00, a01, a02),
      new Vec3(a10, a11, a12),
      new Vec3(a20, a21, a22)
    );
  }

    /**
   * Получить матрицу вращения
   * @param axis - ось вращения
   * @param theta - угол поворота
   * @returns 
   */
    static fromAxisAngle(axis: Vec3, theta: number): Mat3 {
      const a = axis.normalize();
      const c = Math.cos(theta);
      const mc = 1 - c;
      const s = Math.sin(theta);
      return new Mat3(
        new Vec3(a.x*a.x*mc+c, a.x*a.y*mc+a.z*s, a.x*a.z*mc-a.y*s),
        new Vec3(a.y*a.x*mc-a.z*s, a.y*a.y*mc+c, a.y*a.z*mc+a.x*s),
        new Vec3(a.z*a.x*mc+a.y*s, a.z*a.y*mc-a.x*s, a.z*a.z*mc+c)
      );
    }
  
    /** Получить матрицу вращения из кватерниона */
    static fromQuat(q: Quaternion): Mat3 {
      const x2 = q.x + q.x;
      const y2 = q.y + q.y;
      const z2 = q.z + q.z;
      const xx = q.x * x2;
      const yx = q.y * x2;
      const yy = q.y * y2;
      const zx = q.z * x2;
      const zy = q.z * y2;
      const zz = q.z * z2;
      const wx = q.w * x2;
      const wy = q.w * y2;
      const wz = q.w * z2;
      return new Mat3(
        new Vec3(1 - yy - zz, yx + wz, zx - wy),
        new Vec3(yx - wz, 1 - xx - zz, zy + wx),
        new Vec3(zx + wy, zy - wx, 1 - xx - yy)
      );
    }

  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Получить x-столбец */
  cx(): Vec3 { return new Vec3(this.i.x, this.j.x, this.k.x); }
  /** Получить y-столбец */
  cy(): Vec3 { return new Vec3(this.i.y, this.j.y, this.k.y); }
  /** Получить z-столбец */
  cz(): Vec3 { return new Vec3(this.i.z, this.j.z, this.k.z); }
  
  /** Получить коэффициенты масштабирования из матрицы преобразования */
  getScaling(): Vec3 {
    return new Vec3(
      Math.hypot(this.i.x, this.i.y, this.i.z),
      Math.hypot(this.j.x, this.j.y, this.j.z), 
      Math.hypot(this.k.x, this.k.y, this.k.z)
    );
  }

  /**
   * Получить кватернион из матрицы преобразования
   */
  getQuaternion(): Quaternion {
    const scaling = this.getScaling();
    const isx = 1 / scaling.x;
    const isy = 1 / scaling.y;
    const isz = 1 / scaling.z;
    const sm11 = this.i.x * isx;
    const sm12 = this.i.y * isy;
    const sm13 = this.i.z * isz;
    const sm21 = this.j.x * isx;
    const sm22 = this.j.y * isy;
    const sm23 = this.j.z * isz;
    const sm31 = this.k.x * isx;
    const sm32 = this.k.y * isy;
    const sm33 = this.k.z * isz;
    const trace = sm11 + sm22 + sm33;
    var S = 0;

    if (trace > 0) {
      S = Math.sqrt(trace + 1.0) * 2;
      return new Quaternion((sm23 - sm32)/S, (sm31 - sm13)/S, (sm12 - sm21)/S, 0.25*S);
    } 
    if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1.0 + sm11 - sm22 - sm33) * 2;
      return new Quaternion(0.25*S, (sm12 + sm21)/S, (sm31 + sm13)/S, (sm23 - sm32)/S);
    } 
    if (sm22 > sm33) {
      S = Math.sqrt(1.0 + sm22 - sm11 - sm33) * 2;
      return new Quaternion((sm12 + sm21)/S, 0.25*S, (sm23 + sm32)/S, (sm31 - sm13)/S);
    }
    S = Math.sqrt(1.0 + sm33 - sm11 - sm22) * 2;
    return new Quaternion((sm31 + sm13)/S, (sm23 + sm32)/S, 0.25*S, (sm12 - sm21)/S);
  }

  // --------------------------------------------------------------------------
  // Методы интерфейса

  equals(v: Mat3): boolean {
    return this.i.equals(v.i) && this.j.equals(v.j) && this.k.equals(v.k);
  }

  copy(): Mat3 {
    return new Mat3(this.i.copy(), this.j.copy(), this.k.copy());  
  }

  transpose(): Mat3 { return new Mat3(this.cx(), this.cy(), this.cz()); }

  addMatMutable(m: Mat3): Mat3 {
    this.i.addMutable(m.i);
    this.j.addMutable(m.j);
    this.k.addMutable(m.k);
    return this;
  }

  subMatMutable(m: Mat3): Mat3 {
    this.i.subMutable(m.i);
    this.j.subMutable(m.j);
    this.k.subMutable(m.k);
    return this;
  }

  mulMutable(n: number): Mat3 {
    this.i.mulMutable(n);
    this.j.mulMutable(n);
    this.k.mulMutable(n);
    return this;
  }

  divMutable(n: number): Mat3 {
    this.i.divMutable(n);
    this.j.divMutable(n);
    this.k.divMutable(n);
    return this;
  }

  addMat(m: Mat3): Mat3 { return this.copy().addMatMutable(m); }

  subMat(m: Mat3): Mat3 { return this.copy().subMatMutable(m); }

  mul(n: number): Mat3 { return this.copy().mulMutable(n); }

  div(n: number): Mat3 { return this.copy().divMutable(n); }

  mulMat(m: Mat3): Mat3 {
    return new Mat3(
      new Vec3(this.cx().dot(m.i), this.cy().dot(m.i), this.cz().dot(m.i)),
      new Vec3(this.cx().dot(m.j), this.cy().dot(m.j), this.cz().dot(m.j)),
      new Vec3(this.cx().dot(m.k), this.cy().dot(m.k), this.cz().dot(m.k))
    );
  }

  mulMatLeft(m: Mat3): Mat3 {
    return new Mat3(
      new Vec3(this.i.dot(m.cx()), this.i.dot(m.cy()), this.i.dot(m.cz())),
      new Vec3(this.j.dot(m.cx()), this.j.dot(m.cy()), this.j.dot(m.cz())),
      new Vec3(this.k.dot(m.cx()), this.k.dot(m.cy()), this.k.dot(m.cz()))
    );
  }

  mulVec(v: Vec3): Vec3 {
    return new Vec3(this.cx().dot(v), this.cy().dot(v), this.cz().dot(v));
  }

  mulVecLeft(v: Vec3): Vec3 { return new Vec3(this.i.dot(v), this.j.dot(v), this.k.dot(v)); }

  getArray(): number[] {
    return [
      this.i.x, this.i.y, this.i.z,
      this.j.x, this.j.y, this.j.z,
      this.k.x, this.k.y, this.k.z
    ]
  }

  getFloat32Array(): Float32Array { return new Float32Array(this.getArray()); }

}

/****************************************************************************** 
 * Класс двумерного вектора 
 * */
export class Vec2 implements IVectors<Vec2> {
  x: number; y: number;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
  }

  // --------------------------------------------------------------------------
  // Статические методы

  /** Получить нулевой вектор */
  static ZERO = () => new Vec2(0.,0.);
  /** Получить единичный вектор */
  static ONE = () => new Vec2(1.,1.);
  /** Получить i-вектор */
  static I = () => new Vec2(1.,0.);
  /** Получить j-вектор */
  static J = () => new Vec2(0.,1.);
  /** Получить вектор со случайными элементами в диапазоне 0...1 */
  static RAND = () => new Vec2(Math.random(),Math.random());
  /** Получить вектор из набора чисел */
  static fromValues(x: number, y: number): Vec2 { return new Vec2(x, y); }
  /** Получить вектор из массива чисел */
  static fromArray([x, y]: [number, number] | Float32Array): Vec2 { return new Vec2(x, y); }

  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Представление в строковом виде */
  toString(): string {
    return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
  /** Векторное произведение */
  cross(v: Vec2): number { return this.x*v.y - this.y*v.x; }

  // --------------------------------------------------------------------------
  // Методы интерфейса

  equals(v: Vec2): boolean {
    return Math.abs(this.x-v.x)<=EPSILON*Math.max(1., this.x, v.x)
    && Math.abs(this.y-v.y)<=EPSILON*Math.max(1., this.y, v.y)
  }

  addMutable(v: Vec2): Vec2 {
    this.x += v.x; this.y += v.y;
    return this;
  }

  subMutable(v: Vec2): Vec2 {
    this.x -= v.x; this.y -= v.y;
    return this;
  }

  mulMutable(f: number): Vec2 {
    this.x *= f; this.y *= f;
    return this;
  }

  divMutable(f: number): Vec2 {
    this.x /= f; this.y /= f;
    return this;
  }

  mulElMutable(v: Vec2): Vec2 {
    this.x *= v.x; this.y *= v.y;
    return this;
  }

  divElMutable(v: Vec2): Vec2 {
    this.x /= v.x; this.y /= v.y;
    return this;
  }

  normalizeMutable(): Vec2 { return this.divMutable(Math.sqrt(this.dot(this))); }

  add(v: Vec2): Vec2 { return this.copy().addMutable(v); }

  sub(v: Vec2): Vec2 { return this.copy().subMutable(v); }

  mul(f: number): Vec2 { return this.copy().mulMutable(f); }

  div(f: number): Vec2 { return this.copy().divMutable(f); }

  mulEl(v: Vec2): Vec2 { return this.copy().mulElMutable(v); }

  divEl(v: Vec2): Vec2 { return this.copy().divElMutable(v); }

  normalize(): Vec2 { return this.copy().normalizeMutable(); }

  length(): number { return Math.sqrt(this.dot(this)); }

  dot(v: Vec2): number { return this.x*v.x + this.y*v.y; }

  copy(): Vec2 { return new Vec2(this.x, this.y); }

  floor(): Vec2 { return new Vec2(Math.floor(this.x), Math.floor(this.y)); }

  fract(): Vec2 { return this.copy().subMutable(this.floor()); }

  exp(): Vec2 { return new Vec2(Math.exp(this.x), Math.exp(this.y)); }

  negate(): Vec2 { return new Vec2(-this.x, -this.y); }

  getArray(): number[] { return [this.x, this.y]; }

  getFloat32Array(): Float32Array { return new Float32Array(this.getArray()); }

}

/****************************************************************************** 
 * Класс двумерной матрицы 
 * */
export class Mat2 implements IMatrixes<Mat2, Vec2> {
  i: Vec2; j: Vec2;

  constructor(i: Vec2, j: Vec2) {
    this.i = i.copy(); this.j = j.copy();
  }

  // --------------------------------------------------------------------------
  // Статические методы

  /** Получить Identity матрицу */
  static ID = () => new Mat2(Vec2.I(), Vec2.J());
  /** Получить нулевую матрицу */
  static ZERO = () => new Mat2(Vec2.ZERO(), Vec2.ZERO());

  /** Получить матрицу из массива чисел */
  static fromArray([a00, a01, a10, a11]: [number, number, number, number] | Float32Array): Mat2 { 
    return new Mat2(new Vec2(a00, a01), new Vec2(a10, a11));
  }
  
  /**
   * Получить матрицу вращения
   * @param rad - угол поворота
   * @returns 
   */
  static fromRotation(rad: number): Mat2 {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    return new Mat2(new Vec2(c, s), new Vec2(-s, c));
  }

  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Получить x столбец */
  cx(): Vec2 { return new Vec2(this.i.x, this.j.x); }
  /** Получить у столбец */
  cy(): Vec2 { return new Vec2(this.i.y, this.j.y); }

  // --------------------------------------------------------------------------
  // Методы интерфейса

  equals(v: Mat2): boolean {
    return this.i.equals(v.i) && this.j.equals(v.j);
  }

  copy(): Mat2 {
    return new Mat2(this.i.copy(), this.j.copy());  
  }

  transpose(): Mat2 { return new Mat2(this.cx(), this.cy()); }

  addMatMutable(m: Mat2): Mat2 {
    this.i.addMutable(m.i);
    this.j.addMutable(m.j);
    return this;
  }

  subMatMutable(m: Mat2): Mat2 {
    this.i.subMutable(m.i);
    this.j.subMutable(m.j);
    return this;
  }

  mulMutable(n: number): Mat2 {
    this.i.mulMutable(n);
    this.j.mulMutable(n);
    return this;
  }

  divMutable(n: number): Mat2 {
    this.i.divMutable(n);
    this.j.divMutable(n);
    return this;
  }

  addMat(m: Mat2): Mat2 { return this.copy().addMatMutable(m); }

  subMat(m: Mat2): Mat2 { return this.copy().subMatMutable(m); }

  mul(n: number): Mat2 { return this.copy().mulMutable(n); }

  div(n: number): Mat2 { return this.copy().divMutable(n); }

  mulMat(m: Mat2): Mat2 {
    return new Mat2(
      new Vec2(this.cx().dot(m.i), this.cy().dot(m.i)),
      new Vec2(this.cx().dot(m.j), this.cy().dot(m.j))
    );
  }

  mulMatLeft(m: Mat2): Mat2 {
    return new Mat2(
      new Vec2(this.i.dot(m.cx()), this.i.dot(m.cy())),
      new Vec2(this.j.dot(m.cx()), this.j.dot(m.cy()))
    );
  }

  mulVec(v: Vec2): Vec2 {
    return new Vec2(this.cx().dot(v), this.cy().dot(v));
  }

  mulVecLeft(v: Vec2): Vec2 { return new Vec2(this.i.dot(v), this.j.dot(v)); }

  getArray(): number[] { return [this.i.x, this.i.y, this.j.x, this.j.y]; }

  getFloat32Array(): Float32Array { return new Float32Array(this.getArray()); }

}


/****************************************************************************** 
 *  Класс определяющий операции с кватернионом
 * */
export class Quaternion extends Vec4 {

  // --------------------------------------------------------------------------
  // Статические методы

  /** Кватернион не меняющий ориентацию */
  static Identity = () => new Quaternion(0.,0.,0.,1.);
  /** Получить случайный кватернион */
  static random(): Quaternion {
    var u1 = Math.random();
    var u2 = Math.random();
    var u3 = Math.random();
    var sqrt1MinusU1 = Math.sqrt(1 - u1);
    var sqrtU1 = Math.sqrt(u1);
    return new Quaternion(
      sqrt1MinusU1 * Math.sin(2.0 * Math.PI * u2),
      sqrt1MinusU1 * Math.cos(2.0 * Math.PI * u2),
      sqrtU1 * Math.sin(2.0 * Math.PI * u3),
      sqrtU1 * Math.cos(2.0 * Math.PI * u3)
    );
  }

  /** Получить кватернион, соответствующий повороту вокруг оси axis на угол rad */
  static fromAxisAngle(axis: Vec3, rad: number): Quaternion {
    const a = 0.5*rad;
    const p = axis.mul(Math.sin(a));
    return new Quaternion(p.x, p.y, p.z, Math.cos(a));
  }
  /**
   * Получить кватернион по заданным углам Эйлера x, y, z.
   * @param x - угол поворота вокруг оси X в градусах
   * @param y - угол поворота вокруг оси Y в градусах
   * @param z - угол поворота вокруг оси Z в градусах
   */
  static fromEuler(x: number, y: number, z: number): Quaternion {
    const halfToRad = 0.5 * Math.PI / 180.0;
    x *= halfToRad;
    y *= halfToRad;
    z *= halfToRad;
    const sx = Math.sin(x);
    const cx = Math.cos(x);
    const sy = Math.sin(y);
    const cy = Math.cos(y);
    const sz = Math.sin(z);
    const cz = Math.cos(z);
    return new Quaternion(
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
      cx * cy * cz + sx * sy * sz
    );
  }
  /** Получить кватернион из матрицы преобразования */
  static fromMat3(m: Mat3 | Mat4): Quaternion { return m.getQuaternion(); }
  
  /** Получить кватернион из направляющих точек вида */
  static fromLookAt(from: Vec3, to: Vec3, up: Vec3): Quaternion {
    return Mat4.lookAt(from, to, up).getQuaternion()
  }
  /** 
   * Кватернион, соответствующий повороту по трем осям на углы: Yaw, Pitch, Roll 
   *  @param roll - поворот вокруг продольной оси z (ось крена)
   *  @param pitch - поворот вокруг поперечной оси x (ось тангажа)
   *  @param yaw - поворот вокруг вертикальной оси y (ось рысканья)
  */
  static fromYawPitchRoll(pitch: number, yaw: number, roll: number): Quaternion {
    return new Quaternion(0,Math.sin(yaw),0,Math.cos(yaw))
      .qmul(new Quaternion(Math.sin(pitch),0,0,Math.cos(pitch))
      .qmul(new Quaternion(0,0,Math.sin(roll),Math.cos(roll))))
  }

  /**
   * Выполнить сферическую линейную интерполяцию между двумя кватернионами
   * @param a - первый кватернион
   * @param b - второй кватернион
   * @param t - коэффициент интерполяции в диапазоне [0-1]
   */
  static slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    var omega, cosom, sinom, scale0, scale1; // calc cosine
    var sign_cosom = 1;
    cosom = a.dot(b);
    if (cosom < 0.0) {
      cosom = -cosom;
      sign_cosom = -1;
    }
    if (1.0 - cosom > EPSILON) {
      // standard case (slerp)
      omega = Math.acos(cosom);
      sinom = Math.sin(omega);
      scale0 = Math.sin((1.0 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      // "from" and "to" quaternions are very close
      //  ... so we can do a linear interpolation
      scale0 = 1.0 - t;
      scale1 = t;
    }
    return a.mul(scale0).addMutable(b.mul(scale1*sign_cosom)) as Quaternion;
  }

  
  // --------------------------------------------------------------------------
  // Методы экземпляра

  /** Представление в виде строки */
  toStr() {
    return `quat(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)}, ${this.w.toFixed(3)})`;
  }

  /** Иммутабельный обратный кватернион */
  invert(): Quaternion {
    const dot = this.dot(this);
    const invDot = dot ? 1.0 / dot : 0;
    return new Quaternion(-this.x, -this.y, -this.z, this.w).mulMutable(invDot) as Quaternion;
  }
  /**
   * Сопряженный кватернион
   * Для нормализованных кватернионов можно использовать вместо инвертирования, работает быстрее
   */
  conjugate(): Quaternion { return new Quaternion(-this.x, -this.y, -this.z, this.w); } 

  /** Иммутабельное произведение двух кватернионов */
  qmul(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w*q.x + this.x*q.w + this.y*q.z - this.z*q.y,
      this.w*q.y + this.y*q.w + this.z*q.x - this.x*q.z,
      this.w*q.z + this.z*q.w + this.x*q.y - this.y*q.x,
      this.w*q.w - this.x*q.x - this.y*q.y - this.z*q.z
    );
  }

  /** Вращение 3-мерного вектора в соответствии с ориентацией кватерниона */
  rotate(v: Vec3): Vec3 {
    const q = new Quaternion(v.x, v.y, v.z, 0.);
    const r = this.qmul(q).qmul(this.invert());
    return new Vec3(r.x, r.y, r.z);
  }

  /** Получить угол поворота кватерниона */
  getAngle(): number { return Math.acos(this.w) * 2.; }

  /** Получить ось вращения кватерниона */
  getAxis(): Vec3 {
    const rad = Math.acos(this.w) * 2.;
    const s = Math.sin(0.5 * rad);
    if (s > EPSILON) return new Vec3(this.x / s, this.y / s, this.z / s);
    return Vec3.I();
  }
  /** Получить угол между текущим и заданным кватернионами */
  getAngleDelta(q: Quaternion): number {
    var dotproduct = this.dot(q);
    return Math.acos(2 * dotproduct * dotproduct - 1);
  }

  /** Получить кватернион, полученный поворотом вокруг оси X на угол rad */
  rotateX(rad: number): Quaternion {
    rad *= 0.5;
    var bx = Math.sin(rad), bw = Math.cos(rad);
    return new Quaternion(
      this.x * bw + this.w * bx,
      this.y * bw + this.z * bx,
      this.z * bw - this.y * bx,
      this.w * bw - this.x * bx
    );
  }

  /** Получить кватернион, полученный поворотом вокруг оси Y на угол rad */
  rotateY(rad: number): Quaternion {
    rad *= 0.5;
    var by = Math.sin(rad), bw = Math.cos(rad);
    return new Quaternion(
      this.x * bw - this.z * by,
      this.y * bw + this.w * by,
      this.z * bw + this.x * by,
      this.w * bw - this.y * by
    );
  }

  /** Получить кватернион, полученный поворотом вокруг оси Z на угол rad */
  rotateZ(rad: number): Quaternion {
    rad *= 0.5;
    var bz = Math.sin(rad), bw = Math.cos(rad);
    return new Quaternion(
      this.x * bw + this.y * bz,
      this.y * bw - this.x * bz,
      this.z * bw + this.w * bz,
      this.w * bw - this.z * bz
    );
  }

}
