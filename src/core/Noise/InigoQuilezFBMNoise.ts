import { AutoDiff2, AutoDiff3 } from 'src/shared/libs/AutoDiff'
import { Mat2, Vec2, Vec3 } from 'src/shared/libs/vectors'
import { NoiseSampler } from './NoiseSampler'

const im2 = new Mat2(new Vec2(0.8,0.6), new Vec2(-0.6,0.8));

export class InigoQuilezFBMNoise {
  private _noiseSampler: NoiseSampler

  constructor(nSampler: NoiseSampler) {
    this._noiseSampler = nSampler
  }
/*
  // Генерация высоты с эррозией c производными (эталон)
  // возвращает
  // w - значение
  // xyz - частные производные
  fbmOriginal(p: Vec2): AutoDiff3 {
    let a = 0.0
    let b = 1.0
    let f = 1.0
    const d = Vec2.ZERO
    for(let i=0; i<11; i++) {
      const n = this._noiseSampler.noiseD(p.mul(f))
      d.addMutable(n.diff.mul(b*f)) // accumulate derivatives (note that in this case b*f=1.0)
      a += b*n.value;///(1.+dot(d,d)) // accumulate values
      b *= 0.5                     // amplitude decrease
      f *= 2.0                     // frequency increase
    }
    return new AutoDiff3(a, new Vec3(-d.x, -d.y, 2))
  }
*/


      /*
      f = noised2(m*p, tdx, tdy);
      // коррекция производных гладкого шума из-за наличия множителя у аргумента функции
      f.diff = m.mulVecLeft(f.diff);
      tdx.xy *= m; tdy.xy *= m;
      // накопление частных производных
      g += tdx; h += tdy;
      // определение деноминатора, определяющего эрозию
      vec4 den = ONE_D + square_d(g) + square_d(h);
      // накопление значения высоты 
      a += b*div_d(f, den);
      b *= 0.5;                  // уменьшение амплитуды следующей октавы
      m = im2 * m * 2.;          // вращение плоскости с одновременным увеличением частоты следующей октавы
  */

      
  // Генерация высоты с эррозией и c вычислением нормали
  // возвращает
  // w - значение
  // xyz - частные производные
  fbm(p: Vec2): AutoDiff3 {
    let b = 1.0
    const a = AutoDiff2.ZERO
    const g = AutoDiff2.ZERO
    const h = AutoDiff2.ZERO
    let m = Mat2.ID
    for(let i=0; i<12; i++) {
      const [f, tdx, tdy] = this._noiseSampler.noiseD2(m.mulVec(p))
      // коррекция производных гладкого шума из-за наличия множителя у аргумента функции
      f.diff = m.mulVecLeft(f.diff)
      tdx.diff = m.mulVecLeft(tdx.diff)
      tdy.diff = m.mulVecLeft(tdy.diff)
      // накопление частных производных
      g.addMutable(tdx)
      h.addMutable(tdy)
      // определение деноминатора, определяющего эрозию
      const den = AutoDiff2.ONE.addMutable(g.square()).addMutable(h.square())
      // накопление значения высоты и производных с учетом эрозии
      a.addMutable((f.div(den)).mulScalMutable(b))
      b *= 0.5                        // уменьшение амплитуды следующей октавы
      m = im2.mulMat(m).mulMutable(2) // вращение плоскости с одновременным увеличением частоты следующей октавы
    }
    return new AutoDiff3(a.value, new Vec3(-a.diff.x, -a.diff.y, 1))
  }
  
}