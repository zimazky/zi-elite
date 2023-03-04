// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------
import { Mat2, Vec2 } from "./vectors";

interface ValD2 {
  value: number;
  derivative: Vec2;
}

const im2 = new Mat2(new Vec2(0.8,-0.6), new Vec2(0.6,0.8)); // матрица поворота шума при генерации ландшафта
const W_SCALE = 3000.; // масштаб по горизонтали
const H_SCALE = 1100.; // масштаб по высоте

export class TerrainSampler {
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
    const x = p.x * this._data.width;
    const y = p.y * this._data.height;
    return this._data.data[(y*this._data.width + x)<<2];
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

    const a = this.getSample(new Vec2(0.5,0.5).divMutable(256.).addMutable(p));
    const b = this.getSample(new Vec2(1.5,0.5).divMutable(256.).addMutable(p));
    const c = this.getSample(new Vec2(0.5,1.5).divMutable(256.).addMutable(p));
    const d = this.getSample(new Vec2(1.5,1.5).divMutable(256.).addMutable(p));
  
    return {
      value: a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,
      derivative: new Vec2(du.x*(u.y*(a-b-c+d) + b-a), du.y*(u.x*(a-b-c+d) + c-a))
    };
  }

  /** Генерация высоты с эррозией с высокой детализацией без аналитических производных */
  terrainH(v: Vec2): number {
    let p = v.div(W_SCALE);
    let a = 0.;
    let b = 1.;
    const d = Vec2.ZERO();
    for(let i=0; i<16; i++) {
      const n = this.noiseD(p);
      d.addMutable(n.derivative);
      a += b*n.value/(1.+d.dot(d));
      b *= 0.5; 
      p = im2.mul(p.add(p));
    }
    return H_SCALE*a;
  }
  /** Генерация высоты с эррозией со средней детализацией без аналитических производных */
  terrainM(v: Vec2): number {
    let p = v.div(W_SCALE);
    let a = 0.;
    let b = 1.;
    const d = Vec2.ZERO();
    for(let i=0; i<9; i++) {
      const n = this.noiseD(p);
      d.addMutable(n.derivative);
      a += b*n.value/(1.+d.dot(d));
      b *= 0.5; 
      p = im2.mul(p.add(p));
    }
    return H_SCALE*a;
  }
  /** Генерация высоты с эррозией с низкой детализацией без аналитических производных */
  terrainS(v: Vec2): number {
    let p = v.div(W_SCALE);
    let a = 0.;
    let b = 1.;
    const d = Vec2.ZERO();
    for(let i=0; i<9; i++) {
      const n = this.noiseD(p);
      d.addMutable(n.derivative);
      a += b*n.value/(1.+d.dot(d));
      b *= 0.5; 
      p = im2.mul(p.add(p));
    }
    return H_SCALE*a;
  }
  
}


