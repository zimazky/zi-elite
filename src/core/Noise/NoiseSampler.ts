import { AutoDiff2 } from "src/shared/libs/AutoDiff";
import { Vec2 } from "src/shared/libs/vectors";

/** Класс для выборки шума из текстуры */
export class NoiseSampler {
  private _data: ImageData;

  constructor(sample: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = sample.width;
    canvas.height = sample.height;
    const ctx = canvas.getContext('2d');
    if(ctx === null) throw new Error('Не удалось получить контекст');
    ctx.drawImage(sample, 0, 0, sample.width, sample.height);
    this._data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /** 
   * Получение значения из текстуры шума по заданному вектору положения выборки
   * Текстура отображается на пространство векторов с элементами в пределах от 0. до 1.
   * За пределами этого пространства текстура повторяется 
   * */
  getSample(v: Vec2): number {
    const p = v.fract();
    const x = Math.floor(p.x * this._data.width);
    const y = Math.floor(p.y * this._data.height);
    return this._data.data[(y*this._data.width + x)<<2]/255.;
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

    const a = this.getSample(new Vec2(0.5,0.5).addMutable(p).divMutable(256.));// * 2. - 1.;
    const b = this.getSample(new Vec2(1.5,0.5).addMutable(p).divMutable(256.));// * 2. - 1.;
    const c = this.getSample(new Vec2(0.5,1.5).addMutable(p).divMutable(256.));// * 2. - 1.;
    const d = this.getSample(new Vec2(1.5,1.5).addMutable(p).divMutable(256.));// * 2. - 1.;
  
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

    const a = this.getSample(new Vec2(0.5,0.5).addMutable(p).divMutable(256.));
    const b = this.getSample(new Vec2(1.5,0.5).addMutable(p).divMutable(256.));
    const c = this.getSample(new Vec2(0.5,1.5).addMutable(p).divMutable(256.));
    const d = this.getSample(new Vec2(1.5,1.5).addMutable(p).divMutable(256.));

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
