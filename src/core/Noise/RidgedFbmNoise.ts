import { AutoDiff2, AutoDiff3 } from 'src/shared/libs/AutoDiff'
import { Mat2, Vec2, Vec3 } from 'src/shared/libs/vectors'
import { NoiseSampler } from './NoiseSampler'
import { IFbmNoise } from './IFbmNoise'

const im2 = new Mat2(new Vec2(0.8,-0.6), new Vec2(0.6,0.8))

export class RidgedFbmNoise implements IFbmNoise{
  private _noiseSampler: NoiseSampler

  constructor(nSampler: NoiseSampler) {
    this._noiseSampler = nSampler
  }

  fbm(p: Vec2): AutoDiff3 {
    let a = 0
    let b = 1
    const d = Vec2.ZERO
    let m = Mat2.ID
    let i = 0
    
    for(; i<5; i++ ) {
      // низкие частоты
      let [f, tdx, tdy] = this._noiseSampler.noiseD2(m.mulVec(p))
      f = AutoDiff2.HALF.subMutable(f.mulScalMutable(2).subMutable(AutoDiff2.ONE).abs()) // приведение к диапазону [-1 ... +1] и вычисление ridged шума
      a += b*f.value            // накопление значения высоты
      d.addMutable(m.mulVecLeft(f.diff)) // накопление величин производных (b*fr = 1.0 поэтому производные не масштабируются)
      b *= 0.5                  // уменьшение амплитуды следующей октавы
      p.addMutable(p)           // увеличение частоты следующей октавы
      m = im2.mulMat(m)         // вращение плоскости
    }
    //a += 1.5;
    /*
    for(; i<9; i++ ) {
      // низкие частоты
      f = noised(m*p);
      mu = 1./(1.+a*a);
      f = mu * (HALF_D - abs_d(2.*f - ONE_D)); // приведение к диапазону [-1 ... +1] и вычисление ridged шума
      a += b*f.w;               // накопление значения высоты
      d += f.xy * m;            // накопление величин производных (b*fr = 1.0 поэтому производные не масштабируются)
      b *= 0.5;                 // уменьшение амплитуды следующей октавы
      p *= 2.0;                 // увеличение частоты следующей октавы
      m = im2 * m;              // вращение плоскости
    }
    */
    for(; i<12; i++) {
      // высокие частоты
      let [f, tdx, tdy] = this._noiseSampler.noiseD2(m.mulVec(p))
      const mu = 1./(1.+a*a)
      f.mulScalMutable(mu)      // сглаживание шума на высоких частотах
      a += b*f.value;           // накопление значения высоты
      d.addMutable(m.mulVecLeft(f.diff)) // накопление величин производных
      b *= 0.5;                 // уменьшение амплитуды следующей октавы
      p.addMutable(p)           // увеличение частоты следующей октавы
      m = im2.mulMat(m)         // вращение плоскости
    }
    return new AutoDiff3(a + 0.7, new Vec3(-d.x, -d.y, 1))
  }

}