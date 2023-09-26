import { mix } from "./mathutils"
import { Vec2, Vec3 } from "./vectors"

interface IAutoDiff<T, TVec> {
  value: number
  diff: TVec
  copy(): T
  addMutable(b: T): T
  add(b: T): T
  subMutable(b: T): T
  sub(b: T): T
  mulScalMutable(b: number): T
  mulScal(b: number): T
  divScalMutable(b: number): T
  divScal(b: number): T

  abs(): T
  asin(): T
  atan(): T
  atanh(): T
  cos(): T
  cosh(): T
  div(x: T): T
  exp(): T
  log(): T
  mul(b: T): T
  pow(b: number): T
  saturate(): T
  sin(): T
  sinh(): T
  smin1(S: number): T
  sqrt(): T
  square(): T
  tan(): T
  tanh(): T
}


export class AutoDiff2 implements IAutoDiff<AutoDiff2, Vec2>{

  /** Значение */
  value: number
  /** Производные */
  diff: Vec2

  constructor(value: number, diff: Vec2 = Vec2.ZERO) {
    this.value = value
    this.diff = diff
  }

  static get ZERO() { return new AutoDiff2(0) }
  static get HALF() { return new AutoDiff2(0.5) }
  static get ONE() { return new AutoDiff2(1) }
  static get TWO() { return new AutoDiff2(2) }

  // a.xyz * b.w - b.xyz * a.w ) / ( square( b.w ) * ( 1. + square( a.w / b.w ) ) ), atan( a.w, b.w )
  static atan2(a: AutoDiff2, b: AutoDiff2): AutoDiff2 {
  const t = a.value/b.value
    return new AutoDiff2(
      Math.atan2( a.value, b.value ),
      a.diff.mul(b.value).subMutable(b.diff.mul(a.value)).mul(1/(b.value*b.value*(1 + t*t)))
    )
  }

  // x.w < a.w ? a : x.w < b.w ? x : b
  static clamp(x: AutoDiff2, a: AutoDiff2, b: AutoDiff2): AutoDiff2 {
    return x.value < a.value ? a.copy() : x.value < b.value ? x.copy() : b.copy()
  }

  // float h = sqrt( a.w * a.w + b.w * b.w ); return vec4( ( a.xyz * a.w + b.xyz * b.w ) / h, h
  static hypot(a: AutoDiff2, b: AutoDiff2): AutoDiff2 {
    const h = Math.hypot(a.value, b.value)
    return new AutoDiff2(h, a.diff.mul(a.value).addMutable(b.diff.mul(b.value)).divMutable(h))
  }

  // b.w < a.w ? a : b
  static max(a: AutoDiff2, b: AutoDiff2): AutoDiff2 { return b.value < a.value ? a.copy() : b.copy() }

  // a.w < b.w ? a : b
  static min(a: AutoDiff2, b: AutoDiff2): AutoDiff2 { return a.value < b.value ? a.copy() : b.copy() }

  // mix( a, b, t.w ) + vec4( t.xyz, 0 ) * ( b.w - a.w )
  static mix(a: AutoDiff2, b: AutoDiff2, t: AutoDiff2): AutoDiff2 {
    const d = b.value-a.value
    return new AutoDiff2(
      mix(a.value, b.value, t.value),
      new Vec2(
        mix(a.diff.x, b.diff.x, t.value),
        mix(a.diff.y, b.diff.y, t.value)
      ).addMutable(t.diff.mul(b.value-a.value))
    )
  }


  copy(): AutoDiff2 { return new AutoDiff2(this.value, this.diff) }

  addMutable(b: AutoDiff2): AutoDiff2 { this.value += b.value; this.diff.addMutable(b.diff); return this }

  add(b: AutoDiff2): AutoDiff2 { return this.copy().addMutable(b) }

  subMutable(b: AutoDiff2): AutoDiff2 { this.value -= b.value; this.diff.subMutable(b.diff); return this }

  sub(b: AutoDiff2): AutoDiff2 { return this.copy().subMutable(b) }

  mulScalMutable(b: number): AutoDiff2 { this.value *= b; this.diff.mulMutable(b); return this }

  mulScal(b: number): AutoDiff2 { return this.copy().mulScalMutable(b) }

  divScalMutable(b: number): AutoDiff2 { this.value /= b; this.diff.divMutable(b); return this }

  divScal(b: number): AutoDiff2 { return this.copy().divScalMutable(b) }



  // a * sign( a.w )
  abs(): AutoDiff2 { return new AutoDiff2(Math.abs(this.value), this.diff.mul(Math.sign(this.value))) }

  // a.xyz * inversesqrt( 1. - a.w * a.w ), asin( a.w )
  asin(): AutoDiff2 { return new AutoDiff2(Math.asin(this.value), this.diff.div(Math.sqrt(1 - this.value*this.value))) }

  // a.xyz / ( 1. + a.w * a.w ), atan( a.w )
  atan(): AutoDiff2 { return new AutoDiff2(Math.atan(this.value), this.diff.div(1 + this.value*this.value)) }

  // a.xyz / ( 1. - a.w * a.w ), atanh( a.w )
  atanh(): AutoDiff2 { return new AutoDiff2(Math.atanh(this.value), this.diff.div(1 - this.value*this.value)) }
  
  // -a.xyz * sin( a.w ), cos( a.w )
  cos(): AutoDiff2 { return new AutoDiff2(Math.cos(this.value), this.diff.mul(-Math.sin(this.value))) }
  
  // a.xyz * sinh( a.w ), cosh( a.w )
  cosh(): AutoDiff2 { return new AutoDiff2(Math.cosh(this.value), this.diff.mul(Math.sinh(this.value))) }

  // ( a.xyz * b.w - a.w * b.xyz ) / square( b.w ), a.w / b.w
  div(x: AutoDiff2): AutoDiff2 {
    return new AutoDiff2(
      this.value/x.value,
      this.diff.mul(x.value).subMutable(x.diff.mul(this.value)).divMutable(x.value*x.value)
    )
  }

  // exp( a.w ) * vec4( a.xyz, 1 )
  exp(): AutoDiff2 {
    const e = Math.exp(this.value)
    return new AutoDiff2(e, this.diff.mul(e))
  }

  // a.xyz / a.w, log( a.w )
  log(): AutoDiff2 { return new AutoDiff2(Math.log(this.value), this.diff.div(this.value)) }

  // a * b.w + vec4( a.w * b.xyz, 0 )
  mul(b: AutoDiff2): AutoDiff2 {
    return new AutoDiff2(this.value*b.value, this.diff.mul(b.value).addMutable(b.diff.mul(this.value)))
  }

  // a * pow( a.w, b - 1. ) * vec2( b, 1 ).xxxy
  pow(b: number): AutoDiff2 {
    const p = Math.pow(this.value, b-1)
    return new AutoDiff2(this.value*p, this.diff.mul(p*b))
  }

  // a.w < 0. ? ZERO_D : a.w < 1. ? a : ONE_D
  saturate(): AutoDiff2 { return this.value < 0. ? AutoDiff2.ZERO : this.value < 1. ? this.copy() : AutoDiff2.ONE; }

  // a.xyz * cos( a.w ), sin( a.w )
  sin(): AutoDiff2 { return new AutoDiff2(Math.sin(this.value), this.diff.mul(Math.cos(this.value))) }

  // a.xyz * cosh( a.w ), sinh( a.w )
  sinh(): AutoDiff2 { return new AutoDiff2(Math.sinh(this.value), this.diff.mul(Math.cosh(this.value))) }

  // arg = ( ONE_D - a ) / S;
  // return arg.w < 16. ? ONE_D - log_d( ONE_D + exp_d( arg ) ) * S : a
  smin1(S: number): AutoDiff2 {
    const arg = AutoDiff2.ONE.subMutable(this).divScalMutable(S)
    return arg.value < 16.
      ? AutoDiff2.ONE.subMutable(AutoDiff2.ONE.addMutable(arg.exp()).log().mulScalMutable(S))
      : this.copy()
  }

  // a * inversesqrt( a.w ) * vec2( .5, 1 ).xxxy
  sqrt(): AutoDiff2 {
    const t = 1/Math.sqrt(this.value)
    return new AutoDiff2(this.value*t, this.diff.mul(0.5*t)) }

  // a * a.w * vec2( 2, 1 ).xxxy
  square(): AutoDiff2 { return new AutoDiff2(this.value*this.value, this.diff.mul(2*this.value)) }

  // t = tan( a.w ); return vec4( a.xyz * ( 1. + t * t ), t )
  tan(): AutoDiff2 {
    const t = Math.tan(this.value)
    return new AutoDiff2(t, this.diff.mul(1 + t*t))
  }

  // t = tanh( a.w ); return vec4( a.xyz * ( 1. - t * t ), t )
  tanh(): AutoDiff2 {
    const t = Math.tanh(this.value)
    return new AutoDiff2(t, this.diff.mul(1 - t*t))
  }
}

export class AutoDiff3 implements IAutoDiff<AutoDiff3, Vec3> {

  /** Значение */
  value: number
  /** Производные */
  diff: Vec3

  constructor(value: number, diff: Vec3 = Vec3.ZERO) {
    this.value = value
    this.diff = diff
  }

  static get ZERO() { return new AutoDiff3(0) }
  static get HALF() { return new AutoDiff3(0.5) }
  static get ONE() { return new AutoDiff3(1) }
  static get TWO() { return new AutoDiff3(2) }

  // a.xyz * b.w - b.xyz * a.w ) / ( square( b.w ) * ( 1. + square( a.w / b.w ) ) ), atan( a.w, b.w )
  static atan2(a: AutoDiff3, b: AutoDiff3): AutoDiff3 {
  const t = a.value/b.value
    return new AutoDiff3(
      Math.atan2( a.value, b.value ),
      a.diff.mul(b.value).subMutable(b.diff.mul(a.value)).mul(1/(b.value*b.value*(1 + t*t)))
    )
  }

  // x.w < a.w ? a : x.w < b.w ? x : b
  static clamp(x: AutoDiff3, a: AutoDiff3, b: AutoDiff3): AutoDiff3 {
    return x.value < a.value ? a.copy() : x.value < b.value ? x.copy() : b.copy()
  }

  // float h = sqrt( a.w * a.w + b.w * b.w ); return vec4( ( a.xyz * a.w + b.xyz * b.w ) / h, h
  static hypot(a: AutoDiff3, b: AutoDiff3): AutoDiff3 {
    const h = Math.hypot(a.value, b.value)
    return new AutoDiff3(h, a.diff.mul(a.value).addMutable(b.diff.mul(b.value)).divMutable(h))
  }

  // b.w < a.w ? a : b
  static max(a: AutoDiff3, b: AutoDiff3): AutoDiff3 { return b.value < a.value ? a.copy() : b.copy() }

  // a.w < b.w ? a : b
  static min(a: AutoDiff3, b: AutoDiff3): AutoDiff3 { return a.value < b.value ? a.copy() : b.copy() }

  // mix( a, b, t.w ) + vec4( t.xyz, 0 ) * ( b.w - a.w )
  static mix(a: AutoDiff3, b: AutoDiff3, t: AutoDiff3): AutoDiff3 {
    const d = b.value-a.value
    return new AutoDiff3(
      mix(a.value, b.value, t.value),
      new Vec3(
        mix(a.diff.x, b.diff.x, t.value),
        mix(a.diff.y, b.diff.y, t.value),
        mix(a.diff.z, b.diff.z, t.value)
      ).addMutable(t.diff.mul(b.value-a.value))
    )
  }

  copy(): AutoDiff3 { return new AutoDiff3(this.value, this.diff) }

  addMutable(b: AutoDiff3): AutoDiff3 { this.value += b.value; this.diff.addMutable(b.diff); return this }

  add(b: AutoDiff3): AutoDiff3 { return this.copy().addMutable(b) }

  subMutable(b: AutoDiff3): AutoDiff3 { this.value -= b.value; this.diff.subMutable(b.diff); return this }

  sub(b: AutoDiff3): AutoDiff3 { return this.copy().subMutable(b) }

  mulScalMutable(b: number): AutoDiff3 { this.value *= b; this.diff.mulMutable(b); return this }

  mulScal(b: number): AutoDiff3 { return this.copy().mulScalMutable(b) }

  divScalMutable(b: number): AutoDiff3 { this.value /= b; this.diff.divMutable(b); return this }

  divScal(b: number): AutoDiff3 { return this.copy().divScalMutable(b) }



  // a * sign( a.w )
  abs(): AutoDiff3 { return new AutoDiff3(Math.abs(this.value), this.diff.mul(Math.sign(this.value))) }

  // a.xyz * inversesqrt( 1. - a.w * a.w ), asin( a.w )
  asin(): AutoDiff3 { return new AutoDiff3(Math.asin(this.value), this.diff.div(Math.sqrt(1 - this.value*this.value))) }

  // a.xyz / ( 1. + a.w * a.w ), atan( a.w )
  atan(): AutoDiff3 { return new AutoDiff3(Math.atan(this.value), this.diff.div(1 + this.value*this.value)) }

  // a.xyz / ( 1. - a.w * a.w ), atanh( a.w )
  atanh(): AutoDiff3 { return new AutoDiff3(Math.atanh(this.value), this.diff.div(1 - this.value*this.value)) }
  
  // -a.xyz * sin( a.w ), cos( a.w )
  cos(): AutoDiff3 { return new AutoDiff3(Math.cos(this.value), this.diff.mul(-Math.sin(this.value))) }
  
  // a.xyz * sinh( a.w ), cosh( a.w )
  cosh(): AutoDiff3 { return new AutoDiff3(Math.cosh(this.value), this.diff.mul(Math.sinh(this.value))) }

  // ( a.xyz * b.w - a.w * b.xyz ) / square( b.w ), a.w / b.w
  div(x: AutoDiff3): AutoDiff3 {
    return new AutoDiff3(
      this.value/x.value,
      this.diff.mul(x.value).subMutable(x.diff.mul(this.value)).divMutable(x.value*x.value)
    )
  }

  // exp( a.w ) * vec4( a.xyz, 1 )
  exp(): AutoDiff3 {
    const e = Math.exp(this.value)
    return new AutoDiff3(e, this.diff.mul(e))
  }

  // a.xyz / a.w, log( a.w )
  log(): AutoDiff3 { return new AutoDiff3(Math.log(this.value), this.diff.div(this.value)) }

  // a * b.w + vec4( a.w * b.xyz, 0 )
  mul(b: AutoDiff3): AutoDiff3 {
    return new AutoDiff3(this.value*b.value, this.diff.mul(b.value).addMutable(b.diff.mul(this.value)))
  }

  // a * pow( a.w, b - 1. ) * vec2( b, 1 ).xxxy
  pow(b: number): AutoDiff3 {
    const p = Math.pow(this.value, b-1)
    return new AutoDiff3(this.value*p, this.diff.mul(p*b))
  }

  // a.w < 0. ? ZERO_D : a.w < 1. ? a : ONE_D
  saturate(): AutoDiff3 { return this.value < 0. ? AutoDiff3.ZERO : this.value < 1. ? this.copy() : AutoDiff3.ONE; }

  // a.xyz * cos( a.w ), sin( a.w )
  sin(): AutoDiff3 { return new AutoDiff3(Math.sin(this.value), this.diff.mul(Math.cos(this.value))) }

  // a.xyz * cosh( a.w ), sinh( a.w )
  sinh(): AutoDiff3 { return new AutoDiff3(Math.sinh(this.value), this.diff.mul(Math.cosh(this.value))) }

  // arg = ( ONE_D - a ) / S;
  // return arg.w < 16. ? ONE_D - log_d( ONE_D + exp_d( arg ) ) * S : a
  smin1(S: number): AutoDiff3 {
    const arg = AutoDiff3.ONE.subMutable(this).divScalMutable(S)
    return arg.value < 16.
      ? AutoDiff3.ONE.subMutable(AutoDiff3.ONE.addMutable(arg.exp()).log().mulScalMutable(S))
      : this.copy()
  }

  // a * inversesqrt( a.w ) * vec2( .5, 1 ).xxxy
  sqrt(): AutoDiff3 {
    const t = 1/Math.sqrt(this.value)
    return new AutoDiff3(this.value*t, this.diff.mul(0.5*t)) }

  // a * a.w * vec2( 2, 1 ).xxxy
  square(): AutoDiff3 { return new AutoDiff3(this.value*this.value, this.diff.mul(2*this.value)) }

  // t = tan( a.w ); return vec4( a.xyz * ( 1. + t * t ), t )
  tan(): AutoDiff3 {
    const t = Math.tan(this.value)
    return new AutoDiff3(t, this.diff.mul(1 + t*t))
  }

  // t = tanh( a.w ); return vec4( a.xyz * ( 1. - t * t ), t )
  tanh(): AutoDiff3 {
    const t = Math.tanh(this.value)
    return new AutoDiff3(t, this.diff.mul(1 - t*t))
  }
}