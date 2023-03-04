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
}

export const VEC4_I: Vec4 = new Vec4(1.,0.,0.,0.);
export const VEC4_J: Vec4 = new Vec4(0.,1.,0.,0.);
export const VEC4_K: Vec4 = new Vec4(0.,0.,1.,0.);
export const VEC4_L: Vec4 = new Vec4(0.,0.,0.,1.);
export const VEC4_ZERO: Vec4 = new Vec4(0.,0.,0.,0.);


/****************************************************************************** 
 * Класс четырехмерной матрицы 
 * */
export class Mat4 implements IMatrixes<Vec4> {
  i: Vec4; j: Vec4; k: Vec4; l: Vec4;

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

export const MAT4_ID = new Mat4(VEC4_I, VEC4_J, VEC4_K, VEC4_L);
export const MAT4_ZERO = new Mat4(VEC4_ZERO, VEC4_ZERO, VEC4_ZERO, VEC4_ZERO);

/****************************************************************************** 
 * Класс трехмерного вектора 
 * */
export class Vec3 implements IVectors<Vec3> {
  x: number; y: number; z: number;

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

    /** Векторное произведение */
    cross(v: Vec3): Vec3 {
      return new Vec3(
        this.y*v.z - this.z*v.y,
        this.z*v.x - this.x*v.z,
        this.x*v.y - this.y*v.x
      );
    }
}

export const VEC3_I: Vec3 = new Vec3(1.,0.,0.);
export const VEC3_J: Vec3 = new Vec3(0.,1.,0.);
export const VEC3_K: Vec3 = new Vec3(0.,0.,1.);
export const VEC3_ZERO: Vec3 = new Vec3(0.,0.,0.);


/****************************************************************************** 
 * Класс трехмерной матрицы 
 * */
export class Mat3 implements IMatrixes<Vec3> {
  i: Vec3; j: Vec3; k: Vec3;

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

export const MAT3_ID = new Mat3(VEC3_I, VEC3_J, VEC3_K);
export const MAT3_ZERO = new Mat3(VEC3_ZERO, VEC3_ZERO, VEC3_ZERO);


/****************************************************************************** 
 * Класс двумерного вектора 
 * */
export class Vec2 implements IVectors<Vec2> {
  x: number; y: number;

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

  /** Векторное произведение */
  cross(v: Vec2): number { return this.x*v.y - this.y*v.x; }
}

export const VEC2_I: Vec2 = new Vec2(1.,0.);
export const VEC2_J: Vec2 = new Vec2(0.,1.);
export const VEC2_ZERO: Vec2 = new Vec2(0.,0.);

/****************************************************************************** 
 * Класс двумерной матрицы 
 * */
export class Mat2 implements IMatrixes<Vec2> {
  i: Vec2; j: Vec2;

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

export const MAT2_ID = new Mat2(VEC2_I, VEC2_J);
export const MAT2_ZERO = new Mat2(VEC2_ZERO, VEC2_ZERO);
