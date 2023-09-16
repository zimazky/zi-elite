import { Vec2, Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'

/** масштаб по высоте */
const H_SCALE = 1100.
/** масштаб по горизонтали */
const W_SCALE = 1000.
/** максимальная высота ландшафта */
const MAX_TRN_ELEVATION = H_SCALE

const ONE_OVER_SQRT3 = 0.57735026918962576450914878050196

function pyramid(x: Vec2) {
  const f = Vec2.ONE.subMutable(x.fract().mulMutable(2).subMutable(Vec2.ONE).abs());
  return Math.min(f.x,f.y);
}

/** Генератор ландшафта в виде пирамид на кубосфере */
export class CubeSpherePyramidsTerrain implements ITerrainSampler {
  private _planet: Planet

  constructor(planet: Planet) {
    this._planet = planet
  }

  pyramidOnCubeSphere(r: Vec3) {
    // Размер куба на который проецируется вектор для позиционирования на кубосфере 
    const cubeRad = this._planet.radius*ONE_OVER_SQRT3
    const absR = r.abs()
    let f: Vec2
    if(absR.x > absR.y) {
      if(absR.x > absR.z) {
        const s = r.sub(r.mul((r.x-cubeRad)/r.x))
        if(r.x > 0.) f = new Vec2(s.y, s.z) // x+
        else f = new Vec2(s.y, s.z) // x-
      }
      else {
        const s = r.sub(r.mul((r.z-cubeRad)/r.z))
        if(r.z > 0.) f = new Vec2(s.x, s.y) // z+
        else f = new Vec2(s.x, s.y) // z-
      }
    }
    else {
      if(absR.y > absR.z) {
        const s = r.sub(r.mul((r.y-cubeRad)/r.y))
        if(r.y > 0.) f = new Vec2(s.x, s.z) // y+
        else f = new Vec2(s.x, s.z) // y-
      }
      else {
        const s = r.sub(r.mul((r.z-cubeRad)/r.z))
        if(r.z > 0.) f = new Vec2(s.x, s.y) // z+
        else f = new Vec2(s.x, s.y) // z-
      }
    }
    return pyramid(f.div(W_SCALE))
  }
  
  isHeightGreaterMax(p: Vec3): boolean {
    const lla = this._planet.lonLatAlt(p)
    return lla.z > MAX_TRN_ELEVATION
  }

  height(p: Vec3): number {
    const r = p.sub(this._planet.center)
    return H_SCALE * this.pyramidOnCubeSphere(r)
  }

  altitude(p: Vec3): number {
    const lla = this._planet.lonLatAlt(p)
    return lla.z - this.height(p)
  }

  zenith(p: Vec3): Vec3 {
    return p.sub(this._planet.center).normalizeMutable()
  }

  fromCenter(p: Vec3) {
    return p.sub(this._planet.center)
  }
  
  normal(p: Vec3) {
    const eps = 0.1
    return new Vec3(
      this.height(new Vec3(p.x-eps, p.y, p.z)) - this.height(new Vec3(p.x+eps, p.y, p.z)),
      this.height(new Vec3(p.x, p.y-eps, p.z)) - this.height(new Vec3(p.x, p.y+eps, p.z)),
      this.height(new Vec3(p.x, p.y, p.z-eps)) - this.height(new Vec3(p.x, p.y, p.z+eps))
    ).normalizeMutable();
  }
}