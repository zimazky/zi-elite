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
  /** Скалярное произведение векторов */
  dot(v: T): number;
  /** Копия вектора */
  copy(): T;
  /** Вектор с целыми частями элементов */
  floor(): T;
  /** Вектор с дробными частями элементов */
  fract(): T;
}

interface IMatrixes<T> {
  /** Произведение матрицы на вектор справа */
  mul(v: T): T;
  /** Произведение транспонированного вектора на матрицу (произведение матрицы на вектор слева) */
  mulLeft(v: T): T;
}

/****************************************************************************** 
 * Класс четырехмерного вектора 
 * */
export class Vec4 implements IVectors<Vec4> {
  x: number; y: number; z: number; w: number;
  static ZERO = () => new Vec4(0.,0.,0.,0.);
  static I = () => new Vec4(1.,0.,0.,0.);
  static J = () => new Vec4(0.,1.,0.,0.);
  static K = () => new Vec4(0.,0.,1.,0.);
  static L = () => new Vec4(0.,0.,0.,1.);
  
  constructor(x: number, y: number, z: number, w: number) {
    this.x = x; this.y = y; this.z = z; this.w = w;
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

  normalizeMutable(): Vec4 { return this.divMutable(this.dot(this)); }

  add(v: Vec4): Vec4 { return this.copy().addMutable(v); }

  sub(v: Vec4): Vec4 { return this.copy().subMutable(v); }

  mul(f: number): Vec4 { return this.copy().mulMutable(f); }

  div(f: number): Vec4 { return this.copy().divMutable(f); }

  mulEl(v: Vec4): Vec4 { return this.copy().mulElMutable(v); }

  divEl(v: Vec4): Vec4 { return this.copy().divElMutable(v); }

  normalize(): Vec4 { return this.copy().normalizeMutable(); }

  dot(v: Vec4): number { return this.x*v.x + this.y*v.y + this.z*v.z + this.w*v.w; }

  copy(): Vec4 { return new Vec4(this.x, this.y, this.z, this.w); }

  floor(): Vec4 {
    return new Vec4(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), Math.floor(this.w));
  }

  fract(): Vec4 { return this.copy().subMutable(this.floor()); }
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

  mul(v: Vec4): Vec4 { return new Vec4(this.i.dot(v), this.j.dot(v), this.k.dot(v), this.j.dot(v)); }

  mulLeft(v: Vec4): Vec4 {
    return new Vec4(
      v.x*this.i.x + v.y*this.j.x + v.z*this.k.x + v.w*this.j.x,
      v.x*this.i.y + v.y*this.j.y + v.z*this.k.y + v.w*this.j.y,
      v.x*this.i.z + v.y*this.j.z + v.z*this.k.z + v.w*this.j.z,
      v.x*this.i.w + v.y*this.j.w + v.z*this.k.w + v.w*this.j.w,
    );
  }
}

/****************************************************************************** 
 * Класс трехмерного вектора 
 * */
export class Vec3 implements IVectors<Vec3> {
  x: number; y: number; z: number;
  static ZERO = () => new Vec3(0.,0.,0.);
  static I = () => new Vec3(1.,0.,0.);
  static J = () => new Vec3(0.,1.,0.);
  static K = () => new Vec3(0.,0.,1.);

  constructor(x: number, y: number, z: number) {
    this.x = x; this.y = y; this.z = z;
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

  normalizeMutable(): Vec3 { return this.divMutable(this.dot(this)); }

  add(v: Vec3): Vec3 { return this.copy().addMutable(v); }

  sub(v: Vec3): Vec3 { return this.copy().subMutable(v); }

  mul(f: number): Vec3 { return this.copy().mulMutable(f); }

  div(f: number): Vec3 { return this.copy().divMutable(f); }

  mulEl(v: Vec3): Vec3 { return this.copy().mulElMutable(v); }

  divEl(v: Vec3): Vec3 { return this.copy().divElMutable(v); }

  normalize(): Vec3 { return this.copy().normalizeMutable(); }

  dot(v: Vec3): number { return this.x*v.x + this.y*v.y + this.z*v.z; }

  copy(): Vec3 { return new Vec3(this.x, this.y, this.z); }

  floor(): Vec3 { return new Vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z)); }

  fract(): Vec3 { return this.copy().subMutable(this.floor()); }

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

  mul(v: Vec3): Vec3 { return new Vec3(this.i.dot(v), this.j.dot(v), this.k.dot(v)); }

  mulLeft(v: Vec3): Vec3 {
    return new Vec3(
      v.x*this.i.x + v.y*this.j.x + v.z*this.k.x,
      v.x*this.i.y + v.y*this.j.y + v.z*this.k.y,
      v.x*this.i.z + v.y*this.j.z + v.z*this.k.z
    );
  }
}

/****************************************************************************** 
 * Класс двумерного вектора 
 * */
export class Vec2 implements IVectors<Vec2> {
  x: number; y: number;
  static ZERO = () => new Vec2(0.,0.);
  static I = () => new Vec2(1.,0.);
  static J = () => new Vec2(0.,1.);

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
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

  normalizeMutable(): Vec2 { return this.divMutable(this.dot(this)); }

  add(v: Vec2): Vec2 { return this.copy().addMutable(v); }

  sub(v: Vec2): Vec2 { return this.copy().subMutable(v); }

  mul(f: number): Vec2 { return this.copy().mulMutable(f); }

  div(f: number): Vec2 { return this.copy().divMutable(f); }

  mulEl(v: Vec2): Vec2 { return this.copy().mulElMutable(v); }

  divEl(v: Vec2): Vec2 { return this.copy().divElMutable(v); }

  normalize(): Vec2 { return this.copy().normalizeMutable(); }

  dot(v: Vec2): number { return this.x*v.x + this.y*v.y; }

  copy(): Vec2 { return new Vec2(this.x, this.y); }

  floor(): Vec2 { return new Vec2(Math.floor(this.x), Math.floor(this.y)); }

  fract(): Vec2 { return this.copy().subMutable(this.floor()); }

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

  mul(v: Vec2): Vec2 { return new Vec2(this.i.dot(v), this.j.dot(v)); }

  mulLeft(v: Vec2): Vec2 {
    return new Vec2(
      v.x*this.i.x + v.y*this.j.x,
      v.x*this.i.y + v.y*this.j.y,
    );
  }
}
