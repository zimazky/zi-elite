import { Mat3, Quaternion, Vec3 } from "./vectors";
import { mat3, mat4, quat, vec3 } from "gl-matrix";

type TestParameters = { name: string, arg: any }[]


/**
 * Функция для замыкания аргументов внутри функции без аргументов
 * @param f функция для вызова
 * @param args аргументы, передаваемые в функцию f
 * @returns функция без аргументов
 */
function callf(f: (...args: any[])=>void, ...args:any[]) {
  return ()=>{ f(...args) }
}

function test(f: (...args: any[])=>void, args: TestParameters) {
  // наименование теста
  let title = 'test';
  let newargs: any[] = [];
  // параметры теста
  for(let i=0; i<args.length; i++) {
    title += ` ${args[i].name}=${args[i].arg}`;
    newargs.push(args[i].arg);
  }
  it(title, callf (f, ...newargs)
  )
}

describe('Mat3.MulVecLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const v2 = Vec3.RAND;
    test((a: Mat3, b: Vec3)=>{
      const re = a.mulVecLeft(b);
      const ta = mat3.fromValues(
        a.i.x, a.j.x, a.k.x,
        a.i.y, a.j.y, a.k.y,
        a.i.z, a.j.z, a.k.z
        );
      mat3.transpose(ta, ta);
      const tb = vec3.fromValues(b.x, b.y, b.z);
      const tr = vec3.create();
      vec3.transformMat3(tr, tb, ta);
      const ex = Vec3.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat3.MulVec', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const v2 = Vec3.RAND;
    test((a: Mat3, b: Vec3)=>{
      const re = a.mulVec(b);
      const ta = mat3.fromValues(
        a.i.x, a.j.x, a.k.x,
        a.i.y, a.j.y, a.k.y,
        a.i.z, a.j.z, a.k.z
        );
      const tb = vec3.fromValues(b.x, b.y, b.z);
      const tr = vec3.create();
      vec3.transformMat3(tr, tb, ta);
      const ex = Vec3.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'v2', arg: v2},
    ]);
  }
})

describe('Mat3.MulMatLeft', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const m2 = Mat3.RAND;
    test((a: Mat3, b: Mat3)=>{
      const re = a.mulMatLeft(b);
      const ta = mat3.fromValues(a.i.x, a.j.x, a.k.x, a.i.y, a.j.y, a.k.y, a.i.z, a.j.z, a.k.z);
      const tb = mat3.fromValues(b.i.x, b.j.x, b.k.x, b.i.y, b.j.y, b.k.y, b.i.z, b.j.z, b.k.z);
      const tr = mat3.create();
      mat3.mul(tr, tb, ta);
      const ex = Mat3.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat3.MulMat', ()=>{
  for(let i = 0; i < 100; i++) {
    const m1 = Mat3.RAND;
    const m2 = Mat3.RAND;
    test((a: Mat3, b: Mat3)=>{
      const re = a.mulMat(b);
      const ta = mat3.fromValues(a.i.x, a.j.x, a.k.x, a.i.y, a.j.y, a.k.y, a.i.z, a.j.z, a.k.z);
      const tb = mat3.fromValues(b.i.x, b.j.x, b.k.x, b.i.y, b.j.y, b.k.y, b.i.z, b.j.z, b.k.z);
      const tr = mat3.create();
      mat3.mul(tr, ta, tb);
      const ex = Mat3.fromArray(tr);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'm1', arg: m1},
      {name: 'm2', arg: m2},
    ]);
  }
})

describe('Mat3.fromQuat', ()=>{
  for(let i = 0; i < 100; i++) {
    const q1 = Quaternion.QRAND;
    test((q1: Quaternion)=>{
      const re = Mat3.fromQuat(q1);
      const q = quat.fromValues(q1.x, q1.y, q1.z, q1.w);
      const mt = mat3.create();
      mat3.fromQuat(mt, q);
      const ex = Mat3.fromArray(mt);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'Quat', arg: q1}
    ]);
  }
})

describe('Mat3.fromAxisAngle', ()=>{
  for(let i = 0; i < 100; i++) {
    const axis = Vec3.RAND;
    const theta = Math.random()*100.;
    test((a: Vec3, t:number)=>{
      const re = Mat3.fromAxisAngle(a,t)
      const m = mat4.create();
      const v = vec3.create();
      vec3.set(v,a.x,a.y,a.z);
      mat4.rotate(m,m,t,v);
      const ex = Mat3.fromArray([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);
      const equal = re.equals(ex)
      expect(equal).toEqual(true)
      //expect(re).toEqual(ex)
    }, [
        { name: 'axis', arg: axis },
        { name: 'theta', arg: theta }
      ]
    )
  }
})


describe('Mat3.getScaling', ()=>{
  for(let i = 0; i < 100; i++) {
    const m = Mat3.RAND;
    test((m1: Mat3)=>{
      const re = m1.getScaling();
      const mt = mat4.fromValues(
        m1.i.x, m1.j.x, m1.k.x, 0,
        m1.i.y, m1.j.y, m1.k.y, 0,
        m1.i.z, m1.j.z, m1.k.z, 0,
        0, 0, 0, 1 
        );
      const vt = vec3.create();
      mat4.getScaling(vt, mt);
      const ex = Vec3.fromArray(vt);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'Mat3', arg: m}
    ]);
  }
})

describe('Mat3.getQuaternion', ()=>{
  for(let i = 0; i < 100; i++) {
    const q1 = Quaternion.QRAND;
    const m1 = Mat3.fromQuat(q1);
    test((m1: Mat3)=>{
      const re = m1.getQuaternion();
      const mt = mat4.fromValues(
        m1.i.x, m1.j.x, m1.k.x, 0,
        m1.i.y, m1.j.y, m1.k.y, 0,
        m1.i.z, m1.j.z, m1.k.z, 0,
        0, 0, 0, 1
        );
      const q = quat.create();
      mat4.getRotation(q, mt);
      const ex = Quaternion.fromArray(q);
      const equal = re.equals(ex);
      expect(equal).toBeTrue();
      //expect(re).toEqual(ex)
    }, [
      {name: 'Mat3', arg: m1}
    ]);
  }
})
