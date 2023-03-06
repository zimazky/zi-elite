import { Vec2 } from "./vectors";

export interface ValD2 {
  value: number;
  derivative: Vec2;
}

/** Класс для выборки шума из текстуры */
export class NoiseSampler {
  private _data: ImageData;

  constructor(sample: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = sample.width;
    canvas.height = sample.height;
    const ctx = canvas.getContext('2d');
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
  noiseD(x: Vec2): ValD2 {
    const p = x.floor();
    const f = x.copy().subMutable(p); // fract(x)

    //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    const u = new Vec2(3.,3.).subMutable(f.mul(2.)).mulElMutable(f).mulElMutable(f); //f*f*(3.0-2.0*f);
    const du = new Vec2(1.,1.).subMutable(f).mulElMutable(f).mulMutable(6.); //6.0*f*(1.0-f);

    const a = this.getSample(new Vec2(0.5,0.5).addMutable(p).divMutable(256.));
    const b = this.getSample(new Vec2(1.5,0.5).addMutable(p).divMutable(256.));
    const c = this.getSample(new Vec2(0.5,1.5).addMutable(p).divMutable(256.));
    const d = this.getSample(new Vec2(1.5,1.5).addMutable(p).divMutable(256.));
  
    return {
      value: a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,
      derivative: new Vec2(du.x*(u.y*(a-b-c+d) + b-a), du.y*(u.x*(a-b-c+d) + c-a))
    };
  }
}
