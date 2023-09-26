import { AutoDiff2, AutoDiff3 } from 'src/shared/libs/AutoDiff'
import { Mat2, Vec2, Vec3 } from 'src/shared/libs/vectors'
import { NoiseSampler } from './NoiseSampler'

const im2 = new Mat2(new Vec2(0.8,-0.6), new Vec2(0.6,0.8));

export class InigoQuilezFBMNoise {
  private _noiseSampler: NoiseSampler

  constructor(nSampler: NoiseSampler) {
    this._noiseSampler = nSampler
  }

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

  // Генерация высоты с эррозией и c вычислением нормали
  // возвращает
  // w - значение
  // xyz - частные производные
  fbm(p: Vec2): AutoDiff3 {
    let a = 0.0
    let b = 1.0
    const d = Vec2.ZERO
    const g = AutoDiff2.ZERO
    const h = AutoDiff2.ZERO
    let m = Mat2.ID
    for(let i=0; i<11; i++) {
      const [f, tdx, tdy] = this._noiseSampler.noiseD2(m.mulVec(p))
      // определение деноминатора, определяющего эрозию
      g.addMutable(tdx)
      h.addMutable(tdy)
      const den = 1. + g.value*g.value + h.value*h.value
      const den2 = den*den;
      // накопление значения высоты
      a += b*f.value/den;
      // накопление величин производных с учетом эрозии (в последнем члене вторые производные)
      // b*fr = 1.0 поэтому производные не масштабируются
      // d += (f.xy/den - 2.*f.w*(g.w*g.xy+h.w*h.xy)/den2) * m;

      d.addMutable(m.mulVecLeft(
        f.diff.div(den).subMutable(
          (g.diff.mul(g.value).addMutable(h.diff.mul(h.value))).mul(2.*f.value/den2)
        )))
      b *= 0.5                      // уменьшение амплитуды следующей октавы
      p.addMutable(p)               // увеличение частоты следующей октавы
      m = im2.mulMat(m)             // вращение плоскости
    }
    return new AutoDiff3(a, new Vec3(-d.x, -d.y, 2))
  }
}