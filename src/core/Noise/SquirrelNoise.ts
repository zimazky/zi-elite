import { AutoDiff2 } from "src/shared/libs/AutoDiff";
import { Vec2, Vec3, Vec4 } from "src/shared/libs/vectors";


// большие простые числа
const BIT_NOISE1 = 0x68E31DA4n;
const BIT_NOISE2 = 0xB5297A4Dn;
const BIT_NOISE3 = 0x1B56C4E9n;
const PRIME1 = 198491317n;
const PRIME2 = 6542989n;
const PRIME3 = 357239n;

const MAX_UINT = 0xFFFFFFFF;
const MAX_UINT_N = 0xFFFFFFFFn;

/** Класс для выборки шума из текстуры */
export class NoiseSampler {

  /**
   * шум для значения p
   */
  squirrel(p: bigint, seed: number = 0): number {
    // сохранение 32 бит
    var mangled = p & MAX_UINT_N;
    mangled *= BIT_NOISE1;
    mangled += BigInt(seed);

    // сохранение 32 бит
    mangled &= MAX_UINT_N;
    mangled ^= mangled >> 8n;
    mangled += BIT_NOISE2;
    mangled ^= mangled << 8n;
    
    // сохранение 32 бит
    mangled &= MAX_UINT_N;
    mangled *= BIT_NOISE3;
    
    // сохранение 32 бит
    mangled &= MAX_UINT_N;
    mangled ^= mangled >> 8n;

    // сохранение 32 бит
    return Number(mangled & MAX_UINT_N);
  }

  squirrel2D(p: Vec2, seed: number = 0): number {
    const mangled = BigInt(p.x) + PRIME1 * BigInt(p.y);
    return this.squirrel(mangled, seed);
  }
  
  squirrel3D(p: Vec3, seed: number = 0): number {
    const mangled = BigInt(p.x) + (PRIME1 * BigInt(p.y)) + (PRIME2 * BigInt(p.z));
    return this.squirrel(mangled, seed);
  }
  
  squirrel4D(p: Vec4, seed: number = 0): number {
    const mangled = BigInt(p.x) + (PRIME1 * BigInt(p.y)) + (PRIME2 * BigInt(p.z)) + (PRIME3 * BigInt(p.w));
    return this.squirrel(mangled, seed);
  }

  fSquirrel(p: number, seed: number = 0): number {
    return this.squirrel(BigInt(p), seed) / MAX_UINT;
  }

  fSquirrel2D(p: Vec2, seed: number = 0): number {
    return this.squirrel2D(p, seed) / MAX_UINT;
  }

  fSquirrel3D(p: Vec3, seed: number = 0): number {
    return this.squirrel3D(p, seed) / MAX_UINT;
  }

  fSquirrel4D(p: Vec4, seed: number = 0): number {
    return this.squirrel4D(p, seed) / MAX_UINT;
  }

  /**
   * Получение значения шума с аналитическими производными на двумерном пространстве в точке выборки
   * @param x - вектор выборки
   * @returns возвращает 3d вектор: 
   *   x - значение шума, 
   *   y - частная производная по x, 
   *   z - частная производная по y
   */
  noiseD(x: Vec2): AutoDiff2 {
    const p = x.floor();
    const f = x.copy().subMutable(p); // fract(x)

    //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    const u = new Vec2(3.,3.).subMutable(f.mul(2.)).mulElMutable(f).mulElMutable(f); //f*f*(3.0-2.0*f);
    const du = Vec2.ONE.subMutable(f).mulElMutable(f).mulMutable(6.); //6.0*f*(1.0-f);

    const a = this.fSquirrel2D(p);// * 2. - 1.;
    const b = this.fSquirrel2D(new Vec2(1.,0.).addMutable(p));// * 2. - 1.;
    const c = this.fSquirrel2D(new Vec2(0.,1.).addMutable(p));// * 2. - 1.;
    const d = this.fSquirrel2D(new Vec2(1.,1.).addMutable(p));// * 2. - 1.;
  
    return new AutoDiff2(
      a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,
      new Vec2(du.x*(u.y*(a-b-c+d) + b-a), du.y*(u.x*(a-b-c+d) + c-a))
    );
  }

 
  /**
   * расчет гладкого шума с первой и второй производной
   * возвращает:
   * n - шум с первыми производными
   * dx - первая производная по x и вторые производные
   * dy - первая производная по y и вторые производные
   */
  noiseD2(x: Vec2): [n: AutoDiff2, dx: AutoDiff2, dy: AutoDiff2] {

    const p = x.floor()
    const f = x.copy().subMutable(p) // fract(x)

    //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    const u = new Vec2(3.,3.).subMutable(f.mul(2.)).mulElMutable(f).mulElMutable(f); //f*f*(3.0-2.0*f);
    const du = Vec2.ONE.subMutable(f).mulElMutable(f).mulMutable(6.); //6.0*f*(1.0-f);

    const a = this.fSquirrel2D(p);// * 2. - 1.;
    const b = this.fSquirrel2D(new Vec2(1.,0.).addMutable(p));// * 2. - 1.;
    const c = this.fSquirrel2D(new Vec2(0.,1.).addMutable(p));// * 2. - 1.;
    const d = this.fSquirrel2D(new Vec2(1.,1.).addMutable(p));// * 2. - 1.;

    // f = (a-b-c+d)*(x*x*(3-2*x))*(y*y*(3-2*y)) + (b-a)*(x*x*(3-2*x)) + (c-a)*(y*y*(3-2*y)) + a 
    //   = abcd*u.x*u.y + (b-a)*u.x + (c-a)*u.y + a
    //
    // df/dx = ((a-b-c+d)*(3-2*y)*y^2 + b-a) * 6*x*(1-x) = (abcd*u.y + b-a) * du.x
    // df/dy = ((a-b-c+d)*(3-2*x)*x^2 + c-a) * 6*y*(1-y) = (abcd*u.x + c-a) * du.y
    //
    // d2f/dx2 = ((a-b-c+d)*(3-2*y)*y^2 + b-a) * 6*(1-2*x) = (abcd*u.y + b-a) * 6*(1-2*x)
    // d2f/dy2 = ((a-b-c+d)*(3-2*x)*x^2 + c-a) * 6*(1-2*y) = (abcd*u.x + c-a) * 6*(1-2*y)
    // d2f/dxdy = (a-b-c+d) * 6*y*(1-y) * 6*x*(1-x) = abcd * du.x * du.y

    const abcd = a-b-c+d
    const u2 = u.yx.mul(abcd).addMutable(new Vec2(b-a,c-a))
    const d1 = u2.mulEl(du)                                   // первые производные
    const d2 = u2.mulEl(new Vec2(6,6).subMutable(f.mul(12)))  // вторые производные d2/(dx dx) d2/(dy dy)
    const d2xy = abcd * du.x * du.y                           // вторые производные d2/(dx dy) = d2/(dy dx)
    
    const dx = new AutoDiff2(d1.x, new Vec2(d2.x, d2xy))
    const dy = new AutoDiff2(d1.y, new Vec2(d2xy, d2.y))
    const n = new AutoDiff2(abcd*u.x*u.y + (b-a)*u.x + (c-a)*u.y + a, d1)
    return [n, dx, dy]
  }
}
