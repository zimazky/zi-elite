import { rad } from "./mathutils";

interface IVectors<T> {
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
  /** Вектор с абсолютными значениями элементов */
  abs(): T;
  /** Вектор с целыми частями элементов */
  floor(): T;
  /** Вектор с дробными частями элементов */
  fract(): T;
  /** Получить компоненты в виде массива */
  getArray(): number[];
}

interface IMatrixes<T> {
  /** Произведение матрицы на вектор справа */
  mul(v: T): T;
  /** Произведение транспонированного вектора на матрицу (произведение матрицы на вектор слева) */
  mulLeft(v: T): T;
  /** Получить компоненты в виде массива */
  getArray(): number[];
}

/****************************************************************************** 
 * Класс четырехмерного вектора 
 * */
export class Vec4 implements IVectors<Vec4> {
  x: number; y: number; z: number; w: number;
  static ZERO = () => new Vec4(0.,0.,0.,0.);
  static ONE = () => new Vec4(1.,1.,1.,1.);
  static I = () => new Vec4(1.,0.,0.,0.);
  static J = () => new Vec4(0.,1.,0.,0.);
  static K = () => new Vec4(0.,0.,1.,0.);
  static L = () => new Vec4(0.,0.,0.,1.);
  
  constructor(x: number, y: number, z: number, w: number) {
    this.x = x; this.y = y; this.z = z; this.w = w;
  }

  get xy(): Vec2 { return new Vec2(this.x, this.y) }
  get yx(): Vec2 { return new Vec2(this.y, this.x) }
  get xz(): Vec2 { return new Vec2(this.x, this.z) }
  get zx(): Vec2 { return new Vec2(this.z, this.x) }
  get yz(): Vec2 { return new Vec2(this.y, this.z) }
  get zy(): Vec2 { return new Vec2(this.z, this.y) }
  get xx(): Vec2 { return new Vec2(this.x, this.x) }
  get yy(): Vec2 { return new Vec2(this.y, this.y) }
  get zz(): Vec2 { return new Vec2(this.z, this.z) }

  get xw(): Vec2 { return new Vec2(this.x, this.w) }
  get wx(): Vec2 { return new Vec2(this.w, this.x) }
  get yw(): Vec2 { return new Vec2(this.y, this.w) }
  get wy(): Vec2 { return new Vec2(this.w, this.y) }
  get zw(): Vec2 { return new Vec2(this.z, this.w) }
  get wz(): Vec2 { return new Vec2(this.w, this.z) }
  get ww(): Vec2 { return new Vec2(this.w, this.w) }

  get xyz(): Vec3 { return new Vec3(this.x, this.y, this.z) }
  get xzy(): Vec3 { return new Vec3(this.x, this.z, this.y) }
  get yzx(): Vec3 { return new Vec3(this.y, this.z, this.x) }
  get yxz(): Vec3 { return new Vec3(this.y, this.x, this.z) }
  get zxy(): Vec3 { return new Vec3(this.z, this.x, this.y) }
  get zyx(): Vec3 { return new Vec3(this.z, this.y, this.x) }
  get xxy(): Vec3 { return new Vec3(this.x, this.x, this.y) }
  get xyx(): Vec3 { return new Vec3(this.x, this.y, this.x) }
  get yxx(): Vec3 { return new Vec3(this.y, this.x, this.x) }
  get xyy(): Vec3 { return new Vec3(this.x, this.y, this.y) }
  get yxy(): Vec3 { return new Vec3(this.y, this.x, this.y) }
  get yyx(): Vec3 { return new Vec3(this.y, this.y, this.x) }
  get xxz(): Vec3 { return new Vec3(this.x, this.x, this.z) }
  get xzx(): Vec3 { return new Vec3(this.x, this.z, this.x) }
  get zxx(): Vec3 { return new Vec3(this.z, this.x, this.x) }
  get xzz(): Vec3 { return new Vec3(this.x, this.z, this.z) }
  get zxz(): Vec3 { return new Vec3(this.z, this.x, this.z) }
  get zzx(): Vec3 { return new Vec3(this.z, this.z, this.x) }
  get yyz(): Vec3 { return new Vec3(this.y, this.y, this.z) }
  get yzy(): Vec3 { return new Vec3(this.y, this.z, this.y) }
  get zyy(): Vec3 { return new Vec3(this.z, this.y, this.y) }
  get yzz(): Vec3 { return new Vec3(this.y, this.z, this.z) }
  get zyz(): Vec3 { return new Vec3(this.z, this.y, this.z) }
  get zzy(): Vec3 { return new Vec3(this.z, this.z, this.y) }
  get xxx(): Vec3 { return new Vec3(this.x, this.x, this.x) }
  get yyy(): Vec3 { return new Vec3(this.y, this.y, this.y) }
  get zzz(): Vec3 { return new Vec3(this.z, this.z, this.z) }

  // ДОПИСАТЬ С КОМПОНЕНТОМ W

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

  abs(): Vec4 { return new Vec4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w)); }

  floor(): Vec4 {
    return new Vec4(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), Math.floor(this.w));
  }

  fract(): Vec4 { return this.copy().subMutable(this.floor()); }

  getArray(): number[] { return [this.x, this.y, this.z, this.w]; }
}

/****************************************************************************** 
 * Класс четырехмерной матрицы 
 * */
export class Mat4 implements IMatrixes<Vec4> {
  i: Vec4; j: Vec4; k: Vec4; l: Vec4;
  static ID = () => new Mat4(Vec4.I(), Vec4.J(), Vec4.K(), Vec4.L());
  static ZERO = () => new Mat4(Vec4.ZERO(), Vec4.ZERO(), Vec4.ZERO(), Vec4.ZERO());


  constructor(i: Vec4, j: Vec4, k: Vec4, l: Vec4) {
    this.i = i.copy(); this.j = j.copy(); this.k = k.copy(); this.l = l.copy();
  }

  mulLeft(v: Vec4): Vec4 { return new Vec4(this.i.dot(v), this.j.dot(v), this.k.dot(v), this.l.dot(v)); }

  mul(v: Vec4): Vec4 {
    return new Vec4(
      v.x*this.i.x + v.y*this.j.x + v.z*this.k.x + v.w*this.l.x,
      v.x*this.i.y + v.y*this.j.y + v.z*this.k.y + v.w*this.l.y,
      v.x*this.i.z + v.y*this.j.z + v.z*this.k.z + v.w*this.l.z,
      v.x*this.i.w + v.y*this.j.w + v.z*this.k.w + v.w*this.l.w,
    );
  }

  getArray(): number[] {
    return [
      this.i.x, this.i.y, this.i.z, this.i.w,
      this.j.x, this.j.y, this.j.z, this.j.w,
      this.k.x, this.k.y, this.k.z, this.k.w,
      this.l.x, this.l.y, this.l.z, this.l.w,
    ]
  }

  /**
   * Получить матрицу ортогональной проекции
   * @param left - расстояние до левой плоскости отсечения
   * @param right - расстояние до правой плоскости отсечения
   * @param bottom - расстояние до нижней плоскости отсечения
   * @param top - расстояние до верхней плоскости отсечения
   * @param near - расстояние до ближней плоскости отсечения
   * @param far - расстояние до дальней плоскости отсечения
   * @returns матрица ортогональной проекции
   */
  static orthoProjectMatrix(
    left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    return new Mat4(
      new Vec4(2./(right-left), 0., 0., -(right+left)/(right-left)),
      new Vec4(0., 2./(top-bottom), 0., -(top+bottom)/(top-bottom)),
      new Vec4(0., 0., -2./(far-near),  -(far+near)/(far-near)),
      new Vec4(0., 0., 0., 1.)
    );
  }
  /**
   * Получить матрицу перспективной проекции
   * @param fov - величина угла поля зрения по горизонтали в радианах
   * @param aspect - соотношение сторон (ширина/высота)
   * @param near - расстояние до ближней плоскости отсечения, должно быть больше 0
   * @param far - расстояние до дальней плоскости отсечения, должно быть больше 0
   * @returns матрица перспективной проекции
   */
  static perspectiveProjectMatrix(fov: number, aspect: number, near: number, far: number): Mat4 {
    return new Mat4(
      new Vec4(1./Math.tan(0.5*fov), 0., 0., 0.),
      new Vec4(0., aspect/Math.tan(0.5*fov), 0., 0.),
      new Vec4(0., 0., -(far+near)/(far-near), -2.*far*near/(far-near)),
      new Vec4(0., 0., -1., 0.)
    );
  }
}

/****************************************************************************** 
 * Класс трехмерного вектора 
 * */
export class Vec3 implements IVectors<Vec3> {
  x: number; y: number; z: number;
  static ZERO = () => new Vec3(0.,0.,0.);
  static ONE = () => new Vec3(1.,1.,1.);
  static I = () => new Vec3(1.,0.,0.);
  static J = () => new Vec3(0.,1.,0.);
  static K = () => new Vec3(0.,0.,1.);

  constructor(x: number, y: number, z: number) {
    this.x = x; this.y = y; this.z = z;
  }

  get xy(): Vec2 { return new Vec2(this.x, this.y) }
  get yx(): Vec2 { return new Vec2(this.y, this.x) }
  get xz(): Vec2 { return new Vec2(this.x, this.z) }
  get zx(): Vec2 { return new Vec2(this.z, this.x) }
  get yz(): Vec2 { return new Vec2(this.y, this.z) }
  get zy(): Vec2 { return new Vec2(this.z, this.y) }
  get xx(): Vec2 { return new Vec2(this.x, this.x) }
  get yy(): Vec2 { return new Vec2(this.y, this.y) }
  get zz(): Vec2 { return new Vec2(this.z, this.z) }

  get xyz(): Vec3 { return new Vec3(this.x, this.y, this.z) }
  get xzy(): Vec3 { return new Vec3(this.x, this.z, this.y) }
  get yzx(): Vec3 { return new Vec3(this.y, this.z, this.x) }
  get yxz(): Vec3 { return new Vec3(this.y, this.x, this.z) }
  get zxy(): Vec3 { return new Vec3(this.z, this.x, this.y) }
  get zyx(): Vec3 { return new Vec3(this.z, this.y, this.x) }
  get xxy(): Vec3 { return new Vec3(this.x, this.x, this.y) }
  get xyx(): Vec3 { return new Vec3(this.x, this.y, this.x) }
  get yxx(): Vec3 { return new Vec3(this.y, this.x, this.x) }
  get xyy(): Vec3 { return new Vec3(this.x, this.y, this.y) }
  get yxy(): Vec3 { return new Vec3(this.y, this.x, this.y) }
  get yyx(): Vec3 { return new Vec3(this.y, this.y, this.x) }
  get xxz(): Vec3 { return new Vec3(this.x, this.x, this.z) }
  get xzx(): Vec3 { return new Vec3(this.x, this.z, this.x) }
  get zxx(): Vec3 { return new Vec3(this.z, this.x, this.x) }
  get xzz(): Vec3 { return new Vec3(this.x, this.z, this.z) }
  get zxz(): Vec3 { return new Vec3(this.z, this.x, this.z) }
  get zzx(): Vec3 { return new Vec3(this.z, this.z, this.x) }
  get yyz(): Vec3 { return new Vec3(this.y, this.y, this.z) }
  get yzy(): Vec3 { return new Vec3(this.y, this.z, this.y) }
  get zyy(): Vec3 { return new Vec3(this.z, this.y, this.y) }
  get yzz(): Vec3 { return new Vec3(this.y, this.z, this.z) }
  get zyz(): Vec3 { return new Vec3(this.z, this.y, this.z) }
  get zzy(): Vec3 { return new Vec3(this.z, this.z, this.y) }
  get xxx(): Vec3 { return new Vec3(this.x, this.x, this.x) }
  get yyy(): Vec3 { return new Vec3(this.y, this.y, this.y) }
  get zzz(): Vec3 { return new Vec3(this.z, this.z, this.z) }

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

  abs(): Vec3 { return new Vec3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z)); }

  floor(): Vec3 { return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z)); }

  fract(): Vec3 { return this.copy().subMutable(this.floor()); }

  exp(): Vec3 {
    return new Vec3(Math.exp(this.x), Math.exp(this.y), Math.exp(this.z));
  }

  getArray(): number[] { return [this.x, this.y, this.z]; }

/** Векторное произведение */
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y*v.z - this.z*v.y,
      this.z*v.x - this.x*v.z,
      this.x*v.y - this.y*v.x
    );
  }
}

/****************************************************************************** 
 * Класс трехмерной матрицы 
 * */
export class Mat3 implements IMatrixes<Vec3> {
  i: Vec3; j: Vec3; k: Vec3;
  static ID = () => new Mat3(Vec3.I(), Vec3.J(), Vec3.K());
  static ZERO = () => new Mat3(Vec3.ZERO(), Vec3.ZERO(), Vec3.ZERO());

  constructor(i: Vec3, j: Vec3, k: Vec3) {
    this.i = i.copy(); this.j = j.copy(); this.k = k.copy();
  }

  mulLeft(v: Vec3): Vec3 { return new Vec3(this.i.dot(v), this.j.dot(v), this.k.dot(v)); }

  mul(v: Vec3): Vec3 {
    return new Vec3(
      v.x*this.i.x + v.y*this.j.x + v.z*this.k.x,
      v.x*this.i.y + v.y*this.j.y + v.z*this.k.y,
      v.x*this.i.z + v.y*this.j.z + v.z*this.k.z
    );
  }

  getArray(): number[] {
    return [
      this.i.x, this.i.y, this.i.z,
      this.j.x, this.j.y, this.j.z,
      this.k.x, this.k.y, this.k.z
    ]
  }
}

/****************************************************************************** 
 * Класс двумерного вектора 
 * */
export class Vec2 implements IVectors<Vec2> {
  x: number; y: number;
  static ZERO = () => new Vec2(0.,0.);
  static ONE = () => new Vec2(1.,1.);
  static I = () => new Vec2(1.,0.);
  static J = () => new Vec2(0.,1.);

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
  }

  get xy(): Vec2 { return new Vec2(this.x, this.y) }
  get yx(): Vec2 { return new Vec2(this.y, this.x) }
  get xx(): Vec2 { return new Vec2(this.x, this.x) }
  get yy(): Vec2 { return new Vec2(this.y, this.y) }

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

  abs(): Vec2 { return new Vec2(Math.abs(this.x), Math.abs(this.y)) }

  floor(): Vec2 { return new Vec2(Math.floor(this.x), Math.floor(this.y)); }

  fract(): Vec2 { return this.copy().subMutable(this.floor()); }

  getArray(): number[] { return [this.x, this.y]; }

  /** Векторное произведение */
  cross(v: Vec2): number { return this.x*v.y - this.y*v.x; }
}

/****************************************************************************** 
 * Класс двумерной матрицы 
 * */
export class Mat2 implements IMatrixes<Vec2> {
  i: Vec2; j: Vec2;
  static ID = () => new Mat2(Vec2.I(), Vec2.J());
  static ZERO = () => new Mat2(Vec2.ZERO(), Vec2.ZERO());

  constructor(i: Vec2, j: Vec2) {
    this.i = i.copy(); this.j = j.copy();
  }

  mulLeft(v: Vec2): Vec2 { return new Vec2(this.i.dot(v), this.j.dot(v)); }

  mul(v: Vec2): Vec2 {
    return new Vec2(
      v.x*this.i.x + v.y*this.j.x,
      v.x*this.i.y + v.y*this.j.y,
    );
  }

  getArray(): number[] {
    return [
      this.i.x, this.i.y,
      this.j.x, this.j.y
    ]
  }
}
